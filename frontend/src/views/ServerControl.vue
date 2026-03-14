<template>
  <section class="card">
    <h2>Server Control</h2>
    <div class="actions-inline">
      <button @click="reload">Soft Reload</button>
      <button class="warn" @click="restart">Asterisk Restart</button>
      <button class="ghost" @click="refresh">Aktualisieren</button>
    </div>
    <p v-if="message" style="margin-top: 0.7rem">{{ message }}</p>
  </section>

  <section class="grid-2">
    <article class="card" style="margin: 0">
      <h3>Status</h3>
      <pre class="log">{{ statusText }}</pre>
    </article>

    <article class="card" style="margin: 0">
      <h3>Backups</h3>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Created</th>
            <th>Aktion</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="backup in backups" :key="backup.name">
            <td>{{ backup.name }}</td>
            <td>{{ formatDate(backup.createdAt) }}</td>
            <td>
              <button class="ghost" @click="rollback(backup.name)">Rollback</button>
            </td>
          </tr>
        </tbody>
      </table>
    </article>
  </section>

  <section class="card">
    <h3>Live-Log-Viewer</h3>
    <div class="actions-inline" style="margin-bottom: 0.5rem">
      <select v-model="logSource" style="max-width: 200px">
        <option value="asterisk">Asterisk Log</option>
        <option value="error">Error Log</option>
      </select>
      <input v-model="logFilter" placeholder="Filter (Textsuche)" style="max-width: 280px" />
      <label style="display: inline-flex; align-items: center; gap: 0.4rem; width: auto">
        <input v-model="liveMode" type="checkbox" style="width: auto" />
        Live
      </label>
      <button class="ghost" @click="loadLogs" style="max-width: 180px">Logs neu laden</button>
    </div>
    <pre class="log">{{ filteredLogs.join('\n') }}</pre>
  </section>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue';
import { io } from 'socket.io-client';
import client from '../api/client';

const status = ref(null);
const backups = ref([]);
const logs = ref([]);
const message = ref('');
const liveMode = ref(true);
const logFilter = ref('');
const logSource = ref('asterisk');
const socket = io();

const statusText = computed(() => JSON.stringify(status.value, null, 2));
const filteredLogs = computed(() =>
  logs.value.filter((line) => line.toLowerCase().includes(logFilter.value.toLowerCase()))
);

function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleString();
}

async function loadStatus() {
  const response = await client.get('/server/status');
  status.value = response.data.data;
}

async function loadBackups() {
  const response = await client.get('/server/backups');
  backups.value = response.data.data;
}

async function loadLogs() {
  const response = await client.get(`/server/logs?lines=200&source=${logSource.value}`);
  logs.value = response.data.data.lines || [];
}

async function refresh() {
  await Promise.all([loadStatus(), loadBackups(), loadLogs()]);
}

async function reload() {
  await client.post('/server/reload');
  message.value = 'Reload ausgeführt';
  await refresh();
}

async function restart() {
  if (!window.confirm('Asterisk jetzt wirklich neu starten?')) return;
  await client.post('/server/restart', { confirm: true });
  message.value = 'Restart eingeleitet';
  await refresh();
}

async function rollback(name) {
  if (!window.confirm(`Backup ${name} wiederherstellen?`)) return;
  await client.post('/server/rollback', { backupName: name });
  message.value = `Rollback ausgeführt: ${name}`;
  await refresh();
}

onMounted(refresh);

onMounted(() => {
  socket.on('server-log-line', (entry) => {
    if (!liveMode.value || logSource.value !== 'asterisk') {
      return;
    }

    logs.value.push(entry.line);
    if (logs.value.length > 500) {
      logs.value = logs.value.slice(-500);
    }
  });
});

onUnmounted(() => {
  socket.disconnect();
});
</script>
