import os from 'node:os';
import {
  acknowledgeAlert,
  acknowledgeAlertsBySourceKey,
  cdrSummary,
  createCdrRecord,
  listAlerts,
  openOrRefreshAlert
} from './db.service.js';
import { emitSocket } from './socket.service.js';

function getField(event, key) {
  if (!event || typeof event !== 'object') {
    return undefined;
  }

  return (
    event[key] ??
    event[key.toLowerCase()] ??
    event[key.toUpperCase()] ??
    event[key.charAt(0).toUpperCase() + key.slice(1)]
  );
}

function normalizeEventName(event) {
  const raw = getField(event, 'event');
  return raw ? String(raw).toLowerCase() : '';
}

function parseEndpointFromChannel(channel) {
  if (!channel) {
    return null;
  }

  const text = String(channel);
  const fromEndpointPattern = text.match(/ext-([a-zA-Z0-9_-]+)-endpoint/);
  if (fromEndpointPattern) {
    return fromEndpointPattern[1];
  }

  const genericPattern = text.match(/PJSIP\/([0-9]{2,6})/i);
  if (genericPattern) {
    return genericPattern[1];
  }

  return null;
}

function parseTrunkFromChannel(channel) {
  if (!channel) {
    return null;
  }

  const text = String(channel);
  const pattern = text.match(/trunk-([a-zA-Z0-9_-]+)-endpoint/i);
  return pattern ? pattern[1] : null;
}

class TelemetryService {
  constructor() {
    this.activeCalls = new Map();
    this.endpointStatuses = new Map();
    this.trunkStatuses = new Map();
  }

  getSystemResources() {
    return {
      cpuLoad: os.loadavg(),
      totalMem: os.totalmem(),
      freeMem: os.freemem(),
      uptimeSec: os.uptime()
    };
  }

  getRealtimeMetrics() {
    const endpointEntries = [...this.endpointStatuses.entries()].map(([extension, value]) => ({
      extension,
      status: value.status,
      updatedAt: value.updatedAt
    }));

    const trunkEntries = [...this.trunkStatuses.entries()].map(([name, value]) => ({
      name,
      status: value.status,
      updatedAt: value.updatedAt
    }));

    return {
      activeCalls: this.activeCalls.size,
      endpoints: {
        totalKnown: endpointEntries.length,
        registered: endpointEntries.filter((entry) => entry.status === 'registered').length,
        entries: endpointEntries
      },
      trunks: {
        totalKnown: trunkEntries.length,
        registered: trunkEntries.filter((entry) => entry.status === 'registered').length,
        entries: trunkEntries
      },
      resources: this.getSystemResources()
    };
  }

  getDashboardSnapshot(days = 7) {
    return {
      realtime: this.getRealtimeMetrics(),
      cdr: cdrSummary(days),
      alerts: listAlerts({ status: 'open', limit: 100 })
    };
  }

  getAlerts(status = 'open', limit = 100) {
    return listAlerts({ status, limit });
  }

  acknowledgeAlert(id) {
    acknowledgeAlert(id);
  }

  setEndpointStatus(extension, status, payload = {}) {
    if (!extension) {
      return;
    }

    this.endpointStatuses.set(String(extension), {
      status,
      updatedAt: new Date().toISOString(),
      payload
    });
  }

  setTrunkStatus(name, status, payload = {}) {
    if (!name) {
      return;
    }

    const trunkName = String(name);
    this.trunkStatuses.set(trunkName, {
      status,
      updatedAt: new Date().toISOString(),
      payload
    });

    if (status === 'unregistered' || status === 'offline') {
      const alertId = openOrRefreshAlert({
        severity: 'critical',
        source: 'trunk',
        key: trunkName,
        message: `Trunk ${trunkName} ist nicht registriert`,
        payload
      });
      emitSocket('alert', {
        type: 'created',
        alertId,
        source: 'trunk',
        key: trunkName
      });
      return;
    }

    if (status === 'registered') {
      acknowledgeAlertsBySourceKey('trunk', trunkName);
      emitSocket('alert', {
        type: 'resolved',
        source: 'trunk',
        key: trunkName
      });
    }
  }

  startCall(uniqueId, details = {}) {
    if (!uniqueId) {
      return;
    }

    this.activeCalls.set(String(uniqueId), {
      uniqueId: String(uniqueId),
      startedAt: Date.now(),
      answeredAt: null,
      caller: details.caller ?? null,
      callee: details.callee ?? null,
      endpoint: details.endpoint ?? null,
      trunk: details.trunk ?? null
    });
  }

  answerCall(uniqueId) {
    const entry = this.activeCalls.get(String(uniqueId));
    if (!entry) {
      return;
    }

    if (!entry.answeredAt) {
      entry.answeredAt = Date.now();
    }
  }

  endCall(uniqueId, disposition = 'UNKNOWN') {
    const key = String(uniqueId);
    const entry = this.activeCalls.get(key);
    if (!entry) {
      return;
    }

    const endedAtMs = Date.now();
    const durationSec = Math.max(0, Math.round((endedAtMs - entry.startedAt) / 1000));
    const billsec = entry.answeredAt
      ? Math.max(0, Math.round((endedAtMs - entry.answeredAt) / 1000))
      : 0;

    createCdrRecord({
      uniqueId: entry.uniqueId,
      caller: entry.caller,
      callee: entry.callee,
      endpoint: entry.endpoint,
      trunk: entry.trunk,
      disposition,
      durationSec,
      billsec,
      startedAt: new Date(entry.startedAt).toISOString(),
      endedAt: new Date(endedAtMs).toISOString()
    });

    this.activeCalls.delete(key);
    emitSocket('cdr-update', cdrSummary(7));
  }

  handleAmiEvent(event) {
    const eventName = normalizeEventName(event);
    const uniqueId = getField(event, 'uniqueid');
    const channel = getField(event, 'channel');
    const channelState = String(getField(event, 'channelstate') ?? '');
    const caller = getField(event, 'calleridnum') ?? getField(event, 'callerid');
    const callee = getField(event, 'exten') ?? getField(event, 'connectedlinenum');

    if (eventName === 'newchannel') {
      this.startCall(uniqueId, {
        caller,
        callee,
        endpoint: parseEndpointFromChannel(channel),
        trunk: parseTrunkFromChannel(channel)
      });
      return;
    }

    if (eventName === 'newstate' && channelState === '6') {
      this.answerCall(uniqueId);
      return;
    }

    if (eventName === 'hangup') {
      this.endCall(uniqueId, 'COMPLETED');
      return;
    }

    if (eventName === 'contactstatus') {
      const endpointName = getField(event, 'endpointname') ?? parseEndpointFromChannel(channel);
      const statusText = String(getField(event, 'contactstatus') ?? '').toLowerCase();
      if (endpointName) {
        this.setEndpointStatus(endpointName, statusText.includes('avail') ? 'registered' : 'offline', {
          event
        });
      }
      return;
    }

    if (eventName === 'registry' || eventName === 'registrystatus') {
      const trunkName = getField(event, 'channeltype') ?? parseTrunkFromChannel(channel);
      const statusRaw = String(getField(event, 'status') ?? getField(event, 'registry') ?? '').toLowerCase();
      if (trunkName) {
        this.setTrunkStatus(trunkName, statusRaw.includes('registered') ? 'registered' : 'unregistered', {
          event
        });
      }
      return;
    }

    if (eventName === 'peerstatus') {
      const peer = String(getField(event, 'peer') ?? '');
      const statusRaw = String(getField(event, 'peerstatus') ?? '').toLowerCase();
      const trunkName = parseTrunkFromChannel(peer) ?? peer.replace(/^pjsip\//i, '');
      if (trunkName) {
        this.setTrunkStatus(trunkName, statusRaw.includes('registered') ? 'registered' : 'offline', {
          event
        });
      }
    }
  }
}

export const telemetryService = new TelemetryService();
