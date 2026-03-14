<template>
  <section class="grid-2">
    <article class="card" style="margin: 0">
      <h2>Trunk-Wizard</h2>
      <p style="color: #486581">Schritt {{ step }} von 3</p>
      <form @submit.prevent="submitWizard">
        <div v-if="step === 1">
          <label>Name</label>
          <input v-model="form.name" required />
          <label>Host</label>
          <input v-model="form.host" required />
          <label>Transport</label>
          <select v-model="form.transport">
            <option>udp</option>
            <option>tcp</option>
            <option>tls</option>
            <option>ws</option>
            <option>wss</option>
          </select>
        </div>

        <div v-if="step === 2">
          <label>Username</label>
          <input v-model="form.username" />
          <label>Password</label>
          <input v-model="form.password" type="password" />
          <label>Context</label>
          <input v-model="form.context" />
          <label style="display: flex; align-items: center; gap: 0.45rem">
            <input v-model="form.registerEnabled" type="checkbox" style="width: auto" />
            Registrierung aktivieren
          </label>
        </div>

        <div v-if="step === 3">
          <h3>Zusammenfassung</h3>
          <p><strong>Name:</strong> {{ form.name }}</p>
          <p><strong>Host:</strong> {{ form.host }}</p>
          <p><strong>Transport:</strong> {{ form.transport }}</p>
          <p><strong>Context:</strong> {{ form.context }}</p>
          <p><strong>Register:</strong> {{ form.registerEnabled ? 'ja' : 'nein' }}</p>
        </div>

        <div class="actions-inline">
          <button type="button" class="ghost" @click="prevStep" :disabled="step === 1">Zurück</button>
          <button v-if="step < 3" type="button" @click="nextStep">Weiter</button>
          <button v-else type="submit">Trunk speichern</button>
        </div>
      </form>
    </article>

    <article class="card" style="margin: 0">
      <h2>Trunks</h2>
      <p v-if="error" style="color: #a02222">{{ error }}</p>
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Host</th>
            <th>Status</th>
            <th>Aktion</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="trunk in trunks" :key="trunk.id">
            <td>{{ trunk.id }}</td>
            <td>{{ trunk.name }}</td>
            <td>{{ trunk.host }}</td>
            <td><StatusBadge :value="trunk.status || 'unknown'" /></td>
            <td>
              <div class="actions-inline">
                <button class="ghost" @click="refreshStatus(trunk.id)">Status</button>
                <button class="ghost" @click="testTrunk(trunk.id)">Test</button>
                <button class="warn" @click="removeTrunk(trunk.id)">Löschen</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </article>
  </section>

  <section class="card" v-if="testDialogOpen">
    <h3>Trunk-Test Live-Ausgabe</h3>
    <p>Trunk ID: {{ currentTestId }}</p>
    <pre class="log">{{ testLines.join('\n') }}</pre>
    <div class="actions-inline">
      <button class="ghost" @click="testDialogOpen = false">Dialog schließen</button>
    </div>
  </section>
</template>

<script setup>
import { reactive, ref, onMounted, onUnmounted } from 'vue';
import { io } from 'socket.io-client';
import client from '../api/client';
import StatusBadge from '../components/StatusBadge.vue';

const trunks = ref([]);
const error = ref('');
const step = ref(1);
const socket = io();
const testDialogOpen = ref(false);
const currentTestId = ref(null);
const testLines = ref([]);

const form = reactive({
  name: '',
  host: '',
  username: '',
  password: '',
  transport: 'udp',
  context: 'from-trunk',
  registerEnabled: true
});

async function loadTrunks() {
  const response = await client.get('/trunks');
  trunks.value = response.data.data;
}

function nextStep() {
  if (step.value === 1 && (!form.name || !form.host)) {
    error.value = 'Name und Host sind Pflichtfelder';
    return;
  }

  error.value = '';
  step.value = Math.min(3, step.value + 1);
}

function prevStep() {
  step.value = Math.max(1, step.value - 1);
}

function resetWizard() {
  step.value = 1;
  form.name = '';
  form.host = '';
  form.username = '';
  form.password = '';
  form.transport = 'udp';
  form.context = 'from-trunk';
  form.registerEnabled = true;
}

async function submitWizard() {
  try {
    await client.post('/trunks', form);
    resetWizard();
    await loadTrunks();
  } catch (err) {
    error.value = err.response?.data?.message || err.message;
  }
}

async function refreshStatus(id) {
  const response = await client.get(`/trunks/${id}/status`);
  const row = trunks.value.find((item) => item.id === id);
  if (row) row.status = response.data.data.status;
}

async function testTrunk(id) {
  currentTestId.value = id;
  testDialogOpen.value = true;
  testLines.value = [`[${new Date().toLocaleTimeString()}] Test gestartet`];
  await client.post(`/trunks/${id}/test`);
  await refreshStatus(id);
}

async function removeTrunk(id) {
  if (!window.confirm('Trunk wirklich löschen?')) return;
  await client.delete(`/trunks/${id}`);
  await loadTrunks();
}

onMounted(async () => {
  socket.on('trunk-test-update', (payload) => {
    if (payload.trunkId !== currentTestId.value) {
      return;
    }

    const line = `[${new Date(payload.at).toLocaleTimeString()}] ${payload.stage}: ${payload.message}`;
    testLines.value.push(line);
    if (payload.result) {
      testLines.value.push(JSON.stringify(payload.result, null, 2));
    }
  });

  try {
    await loadTrunks();
  } catch (err) {
    error.value = err.response?.data?.message || err.message;
  }
});

onUnmounted(() => {
  socket.disconnect();
});
</script>
