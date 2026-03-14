import axios from 'axios';

const client = axios.create({
  baseURL: '/api',
  timeout: 15000
});

let refreshPromise = null;

client.interceptors.request.use((request) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    request.headers.Authorization = `Bearer ${token}`;
  }

  return request;
});

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;

    if (status !== 401 || originalRequest?._retry || originalRequest?.url?.includes('/auth/')) {
      throw error;
    }

    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      localStorage.removeItem('accessToken');
      throw error;
    }

    originalRequest._retry = true;

    if (!refreshPromise) {
      refreshPromise = client
        .post('/auth/refresh', { refreshToken })
        .then((response) => {
          const data = response.data.data;
          localStorage.setItem('accessToken', data.accessToken);
          localStorage.setItem('refreshToken', data.refreshToken);
          return data.accessToken;
        })
        .finally(() => {
          refreshPromise = null;
        });
    }

    const newToken = await refreshPromise;
    originalRequest.headers.Authorization = `Bearer ${newToken}`;
    return client(originalRequest);
  }
);

export default client;
