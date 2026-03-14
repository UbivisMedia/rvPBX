<template>
  <section class="grid-2">
    <article class="card" style="margin: 0">
      <h2>Call Group anlegen</h2>
      <form @submit.prevent="createCallGroup">
        <div>
          <label>Name</label>
          <input v-model="form.name" required />
        </div>
        <div>
          <label>Extension</label>
          <input v-model="form.extension" required />
        </div>
        <div>
          <label>Strategie</label>
          <select v-model="form.strategy">
            <option>simultaneous</option>
            <option>linear</option>
            <option>round-robin</option>
            <option>random</option>
          </select>
        </div>
        <div>
          <label>Timeout</label>
          <input v-model.number="form.timeout" type="number" min="5" max="120" />
        </div>
        <div>
          <label>Failover Target (optional)</label>
          <input v-model="form.failoverTarget" placeholder="z. B. 1000 oder andere Gruppe" />
        </div>
        <h3>Drag-and-Drop Mitglieder-Editor</h3>
        <div class="dnd-grid">
          <div>
            <p><strong>Pool</strong></p>
            <VueDraggable v-model="availableMembers" :animation="180" group="members" item-key="extension" class="dnd-list">
              <div v-for="entry in availableMembers" :key="entry.extension" class="dnd-item">
                {{ entry.extension }} - {{ entry.display_name || entry.username }}
              </div>
            </VueDraggable>
          </div>
          <div>
            <p><strong>Gruppe</strong></p>
            <VueDraggable v-model="selectedMembers" :animation="180" group="members" item-key="extension" class="dnd-list">
              <div v-for="entry in selectedMembers" :key="entry.extension" class="dnd-item">
                {{ entry.extension }} - {{ entry.display_name || entry.username }}
              </div>
            </VueDraggable>
          </div>
        </div>
        <button type="submit">Call Group speichern</button>
      </form>
    </article>

    <article class="card" style="margin: 0">
      <h2>Call Groups</h2>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Ext</th>
            <th>Strategie</th>
            <th>Mitglieder</th>
            <th>Aktion</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="group in groups" :key="group.id">
            <td>{{ group.name }}</td>
            <td>{{ group.extension }}</td>
            <td>{{ group.strategy }}</td>
            <td>{{ (group.members || []).join(', ') }}</td>
            <td>
              <button class="warn" @click="removeGroup(group.id)">Löschen</button>
            </td>
          </tr>
        </tbody>
      </table>
    </article>
  </section>

  <section class="card">
    <h3>Anruffluss-Visualisierung</h3>
    <svg viewBox="0 0 800 180" width="100%" height="180">
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#1f4f7f" />
        </marker>
      </defs>
      <rect x="20" y="60" width="160" height="60" rx="10" fill="#d9ebff" />
      <text x="100" y="95" text-anchor="middle" fill="#1f4f7f">Eingehender Call</text>
      <line x1="180" y1="90" x2="340" y2="90" stroke="#1f4f7f" stroke-width="3" marker-end="url(#arrow)" />
      <rect x="340" y="60" width="180" height="60" rx="10" fill="#eef7ff" />
      <text x="430" y="95" text-anchor="middle" fill="#1f4f7f">{{ form.strategy }}</text>
      <line x1="520" y1="90" x2="680" y2="90" stroke="#1f4f7f" stroke-width="3" marker-end="url(#arrow)" />
      <rect x="680" y="60" width="100" height="60" rx="10" fill="#d9fbe5" />
      <text x="730" y="95" text-anchor="middle" fill="#0f7a3c">{{ selectedMembers.length }} Ziele</text>
    </svg>
  </section>
</template>

<script setup>
import { reactive, ref, onMounted } from 'vue';
import { VueDraggable } from 'vue-draggable-plus';
import client from '../api/client';

const endpoints = ref([]);
const groups = ref([]);
const availableMembers = ref([]);
const selectedMembers = ref([]);
const form = reactive({
  name: '',
  extension: '',
  strategy: 'simultaneous',
  timeout: 20,
  failoverTarget: ''
});

async function loadAll() {
  const [endpointResp, groupsResp] = await Promise.all([
    client.get('/endpoints'),
    client.get('/callgroups')
  ]);

  endpoints.value = endpointResp.data.data;
  availableMembers.value = [...endpointResp.data.data];
  groups.value = groupsResp.data.data;
}

async function createCallGroup() {
  await client.post('/callgroups', {
    ...form,
    members: selectedMembers.value.map((entry) => entry.extension),
    failoverTarget: form.failoverTarget || null
  });
  form.name = '';
  form.extension = '';
  form.strategy = 'simultaneous';
  form.timeout = 20;
  form.failoverTarget = '';
  selectedMembers.value = [];
  availableMembers.value = [...endpoints.value];
  await loadAll();
}

async function removeGroup(id) {
  if (!window.confirm('Call Group wirklich löschen?')) return;
  await client.delete(`/callgroups/${id}`);
  await loadAll();
}

onMounted(loadAll);
</script>
