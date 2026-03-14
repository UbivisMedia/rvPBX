<template>
  <router-view v-if="isLoginRoute" />

  <div v-else class="app-shell">
    <aside class="sidebar">
      <div class="brand">Asterisk Admin</div>
      <nav>
        <router-link to="/">Dashboard</router-link>
        <router-link to="/trunks">Trunks</router-link>
        <router-link to="/endpoints">Endpoints</router-link>
        <router-link to="/callgroups">Call Groups</router-link>
        <router-link to="/server-control">Server</router-link>
      </nav>

      <div style="margin-top: 1.3rem; font-size: 0.9rem">
        <div v-if="auth.user">User: <strong>{{ auth.user.username }}</strong></div>
        <button style="margin-top: 0.6rem" class="ghost" @click="logout">Logout</button>
      </div>
    </aside>

    <main class="content">
      <router-view />
    </main>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from './store/auth';

const auth = useAuthStore();
const route = useRoute();
const router = useRouter();

const isLoginRoute = computed(() => route.name === 'login');

function logout() {
  auth.logout();
  router.push({ name: 'login' });
}
</script>
