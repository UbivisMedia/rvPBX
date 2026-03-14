<template>
  <section class="grid-2">
    <article class="card" style="margin: 0">
      <h2>Endpoint anlegen</h2>
      <form @submit.prevent="createEndpoint">
        <div>
          <label>Extension</label>
          <input v-model="form.extension" required />
        </div>
        <div>
          <label>Display Name</label>
          <input v-model="form.displayName" />
        </div>
        <div>
          <label>Username</label>
          <input v-model="form.username" required />
        </div>
        <div>
          <label>Password</label>
          <input v-model="form.password" type="password" required />
        </div>
        <div>
          <label>Codecs (Komma-getrennt)</label>
          <input v-model="form.codecs" />
        </div>
        <div>
          <label>Template</label>
          <select v-model="form.template">
            <option>softphone</option>
            <option>sip-phone</option>
            <option>webrtc</option>
          </select>
        </div>
        <label style="display: flex; align-items: center; gap: 0.45rem">
          <input v-model="form.voicemailEnabled" type="checkbox" style="width: auto" />
          Voicemail aktivieren
        </label>
        <div v-if="form.voicemailEnabled">
          <label>Voicemail Box</label>
          <input v-model="form.voicemailBox" placeholder="z. B. 1001" />
        </div>
        <button type="submit">Endpoint speichern</button>
      </form>
    </article>

    <article class="card" style="margin: 0">
      <h2>CSV Bulk-Import</h2>
      <p style="color: #486581">Format: extension,displayName,username,password,codecs</p>
      <div class="actions-inline">
        <button class="ghost" @click="downloadTemplate">CSV Vorlage herunterladen</button>
      </div>
      <input type="file" accept=".csv,text/csv" @change="handleCsvFile" />
      <p v-if="importResult">{{ importResult }}</p>
    </article>
  </section>

  <section class="card" style="margin-top: 1rem">
    <h2>Endpoints (Kartenansicht)</h2>
      <p v-if="error" style="color: #a02222">{{ error }}</p>
      <div class="endpoint-grid">
        <article class="endpoint-card" v-for="ep in endpoints" :key="ep.id">
          <div style="display: flex; justify-content: space-between; align-items: center">
            <h3 style="margin: 0">{{ ep.display_name || `Ext ${ep.extension}` }}</h3>
            <StatusBadge :value="ep.status || 'unknown'" />
          </div>
          <p><strong>Extension:</strong> {{ ep.extension }}</p>
          <p><strong>User:</strong> {{ ep.username }}</p>
          <p><strong>Codecs:</strong> {{ ep.codecs }}</p>
          <p><strong>Provisioning URL:</strong> {{ ep.provisioning_url }}</p>
          <div class="actions-inline">
            <button class="ghost" @click="refreshStatus(ep.id)">Status</button>
            <button class="ghost" @click="showQr(ep)">QR</button>
            <button class="warn" @click="removeEndpoint(ep.id)">Löschen</button>
          </div>
        </article>
      </div>
  </section>

  <section class="card" v-if="qrDialog.open">
    <h3>Provisioning QR - Ext {{ qrDialog.extension }}</h3>
    <img :src="qrDialog.dataUrl" alt="Provisioning QR" style="max-width: 280px" />
    <p>{{ qrDialog.url }}</p>
    <button class="ghost" style="max-width: 200px" @click="qrDialog.open = false">Schließen</button>
  </section>
</template>

<script setup>
import { reactive, ref, onMounted } from 'vue';
import QRCode from 'qrcode';
import client from '../api/client';
import StatusBadge from '../components/StatusBadge.vue';

const endpoints = ref([]);
const error = ref('');
const importResult = ref('');
const qrDialog = ref({
  open: false,
  extension: '',
  url: '',
  dataUrl: ''
});

const form = reactive({
  extension: '',
  displayName: '',
  username: '',
  password: '',
  codecs: 'ulaw,alaw',
  template: 'softphone',
  voicemailEnabled: false,
  voicemailBox: ''
});

async function loadEndpoints() {
  const response = await client.get('/endpoints');
  endpoints.value = response.data.data;
}

async function createEndpoint() {
  try {
    await client.post('/endpoints', {
      extension: form.extension,
      displayName: form.displayName,
      username: form.username,
      password: form.password,
      codecs: form.codecs.split(',').map((item) => item.trim()),
      template: form.template,
      voicemailEnabled: form.voicemailEnabled,
      voicemailBox: form.voicemailEnabled ? form.voicemailBox : null
    });

    form.extension = '';
    form.displayName = '';
    form.username = '';
    form.password = '';
    form.codecs = 'ulaw,alaw';
    form.template = 'softphone';
    form.voicemailEnabled = false;
    form.voicemailBox = '';
    await loadEndpoints();
  } catch (err) {
    error.value = err.response?.data?.message || err.message;
  }
}

async function refreshStatus(id) {
  const response = await client.get(`/endpoints/${id}/status`);
  const row = endpoints.value.find((item) => item.id === id);
  if (row) row.status = response.data.data.status;
}

async function removeEndpoint(id) {
  if (!window.confirm('Endpoint wirklich löschen?')) return;
  await client.delete(`/endpoints/${id}`);
  await loadEndpoints();
}

function parseCsv(csvText) {
  const lines = csvText.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const values = line.split(',').map((item) => item.trim());
    const row = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx] ?? '';
    });
    return {
      extension: row.extension,
      displayName: row.displayName || '',
      username: row.username,
      password: row.password,
      codecs: (row.codecs || 'ulaw,alaw').split(';').join(',').split(',').map((c) => c.trim())
    };
  });
}

async function handleCsvFile(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const text = await file.text();
  const rows = parseCsv(text);
  if (rows.length === 0) {
    importResult.value = 'CSV enthält keine Datenzeilen.';
    return;
  }

  const response = await client.post('/endpoints/import/csv', { rows });
  importResult.value = `Import fertig: ${response.data.data.success} erfolgreich, ${response.data.data.failed} fehlgeschlagen`;
  await loadEndpoints();
}

function downloadTemplate() {
  const csv =
    'extension,displayName,username,password,codecs\n1001,Empfang,empfang,secret123,ulaw;alaw\n1002,Support,support,secret123,ulaw;alaw';
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'endpoints-template.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

async function showQr(endpoint) {
  const url = endpoint.provisioning_url || '';
  const dataUrl = await QRCode.toDataURL(url);
  qrDialog.value = {
    open: true,
    extension: endpoint.extension,
    url,
    dataUrl
  };
}

onMounted(async () => {
  try {
    await loadEndpoints();
  } catch (err) {
    error.value = err.response?.data?.message || err.message;
  }
});
</script>
