import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: API_URL + '/api',
  headers: { 'Content-Type': 'application/json' }
});

// Attach JWT to every request
api.interceptors.request.use(config => {
  const token = localStorage.getItem('verynth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth
export const register = (name, email, password) =>
  api.post('/auth/register', { name, email, password });

export const login = (email, password) =>
  api.post('/auth/login', { email, password });

export const getMe = () => api.get('/auth/me');

// Projects
export const getProjects = () => api.get('/projects');
export const importProject = (name, description) =>
  api.post('/projects/import', { name, description });
export const analyzeProject = (projectId) =>
  api.post(`/projects/${projectId}/analyze`);

// Migrations
export const generateMigration = (projectId, targetVersion) =>
  api.post('/migrations/generate', { projectId, targetVersion });
export const getMigration = (migrationId) =>
  api.get(`/migrations/${migrationId}`);
export const getMigrations = () => api.get('/migrations');
export const runTests = (migrationId) =>
  api.post(`/migrations/${migrationId}/test`);
export const approveMigration = (migrationId) =>
  api.post(`/migrations/${migrationId}/approve`);
export const rejectMigration = (migrationId, reason) =>
  api.post(`/migrations/${migrationId}/reject`, { reason });

// History
export const getHistory = () => api.get('/history');

// Ollama
export const getOllamaStatus = () => api.get('/ollama/status');

export default api;
