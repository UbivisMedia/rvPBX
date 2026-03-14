<template>
  <main style="display: grid; place-items: center; min-height: 100vh; padding: 1rem">
    <section class="card" style="width: min(420px, 100%)">
      <h2>Login</h2>
      <p style="margin-top: -0.2rem; color: #4d6480">
        Melde dich mit dem Admin-Benutzer aus `backend/.env` an.
      </p>

      <form @submit.prevent="submit">
        <div>
          <label for="username">Benutzername</label>
          <input id="username" v-model="username" required />
        </div>

        <div>
          <label for="password">Passwort</label>
          <input id="password" v-model="password" type="password" required />
        </div>

        <button :disabled="auth.loading" type="submit">{{ auth.loading ? '...' : 'Einloggen' }}</button>
      </form>

      <p v-if="auth.error" style="color: #a02222; margin-top: 0.75rem">{{ auth.error }}</p>
    </section>
  </main>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../store/auth';

const auth = useAuthStore();
const router = useRouter();

const username = ref(auth.user?.username || 'admin');
const password = ref('admin123');

async function submit() {
  const ok = await auth.login(username.value, password.value);
  if (ok) {
    router.push({ name: 'dashboard' });
  }
}
</script>
