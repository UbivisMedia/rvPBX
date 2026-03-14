import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../store/auth';
import Login from '../views/Login.vue';
import Dashboard from '../views/Dashboard.vue';
import Trunks from '../views/Trunks.vue';
import Endpoints from '../views/Endpoints.vue';
import CallGroups from '../views/CallGroups.vue';
import ServerControl from '../views/ServerControl.vue';

const routes = [
  { path: '/login', name: 'login', component: Login },
  { path: '/', name: 'dashboard', component: Dashboard, meta: { requiresAuth: true } },
  { path: '/trunks', name: 'trunks', component: Trunks, meta: { requiresAuth: true } },
  { path: '/endpoints', name: 'endpoints', component: Endpoints, meta: { requiresAuth: true } },
  { path: '/callgroups', name: 'callgroups', component: CallGroups, meta: { requiresAuth: true } },
  {
    path: '/server-control',
    name: 'server-control',
    component: ServerControl,
    meta: { requiresAuth: true }
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

router.beforeEach((to) => {
  const authStore = useAuthStore();

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return { name: 'login' };
  }

  if (to.name === 'login' && authStore.isAuthenticated) {
    return { name: 'dashboard' };
  }

  return true;
});

export default router;
