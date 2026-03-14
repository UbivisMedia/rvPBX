<template>
  <section class="card">
    <h2>Dashboard</h2>
    <p style="color: #486581">
      Live-Status, aktive Calls, CDR-Statistiken und Alerts.
    </p>

    <div class="grid-2">
      <article class="card" style="margin: 0">
        <h3>Verbindung</h3>
        <p>AMI: <StatusBadge :value="snapshot?.asterisk?.ami?.connected ? 'registered' : 'offline'" /></p>
        <p>ARI: <StatusBadge :value="snapshot?.asterisk?.ari?.connected ? 'registered' : 'offline'" /></p>
        <p>Uptime: {{ snapshot?.app?.uptimeSec ?? '-' }}s</p>
        <p>Aktive Calls: <strong>{{ overview?.realtime?.activeCalls ?? 0 }}</strong></p>
        <p>CPU Load: {{ (overview?.realtime?.resources?.cpuLoad || []).join(' / ') || '-' }}</p>
        <p>
          RAM frei:
          {{ formatBytes(overview?.realtime?.resources?.freeMem) }} /
          {{ formatBytes(overview?.realtime?.resources?.totalMem) }}
        </p>
      </article>

      <article class="card" style="margin: 0">
        <h3>Objekte</h3>
        <p>Trunks: <strong>{{ snapshot?.stats?.trunks ?? '-' }}</strong></p>
        <p>Endpoints: <strong>{{ snapshot?.stats?.endpoints ?? '-' }}</strong></p>
        <p>Call Groups: <strong>{{ snapshot?.stats?.callgroups ?? '-' }}</strong></p>
        <p>
          Registrierte Endpoints:
          <strong>{{ overview?.realtime?.endpoints?.registered ?? 0 }}</strong>
        </p>
        <p>
          Registrierte Trunks:
          <strong>{{ overview?.realtime?.trunks?.registered ?? 0 }}</strong>
        </p>
      </article>
    </div>
  </section>

  <section class="grid-2">
    <article class="card" style="margin: 0">
      <h3>CDR (letzte {{ overview?.cdr?.days ?? 7 }} Tage)</h3>
      <div class="cdr-bars">
        <div class="cdr-bar" v-for="entry in overview?.cdr?.series || []" :key="entry.day">
          <div class="cdr-bar-fill" :style="{ height: `${barHeight(entry.total)}px` }"></div>
          <small>{{ entry.day.slice(5) }}</small>
        </div>
      </div>
      <p>
        Gesamt: {{ overview?.cdr?.totals?.total ?? 0 }} |
        Angenommen: {{ overview?.cdr?.totals?.answered ?? 0 }}
      </p>
    </article>

    <article class="card" style="margin: 0">
      <h3>Alerts</h3>
      <table>
        <thead>
          <tr>
            <th>Severity</th>
            <th>Quelle</th>
            <th>Text</th>
            <th>Aktion</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="alert in alerts" :key="alert.id">
            <td>{{ alert.severity }}</td>
            <td>{{ alert.source }}</td>
            <td>{{ alert.message }}</td>
            <td>
              <button class="ghost" @click="ackAlert(alert.id)">Acknowledge</button>
            </td>
          </tr>
          <tr v-if="alerts.length === 0">
            <td colspan="4">Keine offenen Alerts</td>
          </tr>
        </tbody>
      </table>
    </article>
  </section>

  <section class="card">
    <h3>Aktivität</h3>
    <table>
      <thead>
        <tr>
          <th>Zeit</th>
          <th>Typ</th>
          <th>Message</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in activity" :key="row.id">
          <td>{{ formatDate(row.created_at) }}</td>
          <td>{{ row.type }}</td>
          <td>{{ row.message }}</td>
        </tr>
      </tbody>
    </table>
  </section>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue';
import { io } from 'socket.io-client';
import client from '../api/client';
import StatusBadge from '../components/StatusBadge.vue';

const snapshot = ref(null);
const overview = ref(null);
const alerts = ref([]);
const activity = ref([]);
let socket;

function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleString();
}

function formatBytes(value) {
  if (!value) return '-';
  const gb = Number(value) / (1024 * 1024 * 1024);
  return `${gb.toFixed(2)} GB`;
}

function barHeight(total) {
  const value = Number(total || 0);
  return Math.max(6, Math.min(110, value * 8));
}

async function ackAlert(id) {
  await client.post(`/dashboard/alerts/${id}/ack`);
  await load();
}

async function load() {
  const [health, logs, overviewResp] = await Promise.all([
    client.get('/health'),
    client.get('/server/activity').catch(() => ({ data: { data: [] } })),
    client.get('/dashboard/overview').catch(() => ({ data: { data: null } }))
  ]);

  snapshot.value = health.data.data;
  activity.value = logs.data.data || [];
  overview.value = overviewResp.data.data || {};
  alerts.value = overview.value.alerts || [];
}

onMounted(async () => {
  await load();

  socket = io();
  socket.on('status-update', (data) => {
    snapshot.value = data;
  });
  socket.on('cdr-update', (data) => {
    if (!overview.value) {
      overview.value = {};
    }
    overview.value.cdr = data;
  });
  socket.on('alert', () => {
    load();
  });
});

onUnmounted(() => {
  if (socket) socket.disconnect();
});
</script>
