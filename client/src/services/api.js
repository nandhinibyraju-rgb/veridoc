import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 120000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: attach JWT
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('veridoc_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

// Response interceptor: handle 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('veridoc_token');
      localStorage.removeItem('veridoc_user');
      if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authService = {
  async register(name, email, password) {
    const res = await api.post('/auth/register', { name, email, password });
    return res.data;
  },
  async login(email, password) {
    const res = await api.post('/auth/login', { email, password });
    return res.data;
  },
  async getMe() {
    const res = await api.get('/auth/me');
    return res.data;
  },
  async updateProfile(profileData) {
    const res = await api.put('/auth/profile', profileData);
    return res.data;
  },
  async deleteAccount() {
    const res = await api.delete('/auth/account');
    return res.data;
  }
};

export const evidenceService = {
  async ask(question, patientContext, options = {}) {
    let modeVal = String(options.mode || 'quick').toLowerCase();
    if (modeVal.includes('deep')) modeVal = 'deep';
    else if (modeVal.includes('lit')) modeVal = 'literature';
    else if (modeVal.includes('gap')) modeVal = 'gaps';
    else modeVal = 'quick';

    let searchVal = String(options.searchType || 'ai').toLowerCase();
    if (searchVal.includes('drug')) searchVal = 'drug';
    else if (searchVal.includes('lit')) searchVal = 'literature';
    else searchVal = 'ai';

    const res = await api.post('/evidence/ask', {
      question,
      patientContext,
      mode: modeVal,
      searchType: searchVal,
      studentMode: Boolean(options.studentMode),
      studyFocus: options.studyFocus || ''
    });
    return res.data;
  },
  async getHistory() {
    const res = await api.get('/evidence/history');
    return res.data;
  },
  async getHistoryItem(id) {
    const res = await api.get(`/evidence/history/${id}`);
    return res.data;
  },
  async deleteHistoryItem(id) {
    const res = await api.delete(`/evidence/history/${id}`);
    return res.data;
  },
  async toggleFavorite(id) {
    const res = await api.patch(`/evidence/history/${id}/favorite`);
    return res.data;
  },
  async clearAllHistory() {
    const res = await api.delete('/evidence/history/clear-all');
    return res.data;
  },
  async getTrending() {
    const res = await api.get('/evidence/trending');
    return res.data;
  },
  async getAlerts() {
    const res = await api.get('/evidence/alerts');
    return res.data;
  },
  async recheck(id) {
    const res = await api.post(`/evidence/recheck/${id}`);
    return res.data;
  },
  async followup(id, followupQuestion) {
    const res = await api.post(`/evidence/followup/${id}`, { followupQuestion });
    return res.data;
  },
  async getLiveUpdates(params = {}) {
    const res = await api.get('/evidence/live-updates', { params });
    return res.data;
  },
  async refreshLiveUpdates() {
    const res = await api.post('/evidence/live-updates/refresh');
    return res.data;
  },
  async simulateLiveUpdate(data = {}) {
    const res = await api.post('/evidence/live-updates/simulate', data);
    return res.data;
  },
  async getNotifications() {
    const res = await api.get('/evidence/notifications');
    return res.data;
  },
  async markNotificationRead(id, all = false) {
    const res = await api.post('/evidence/notifications/mark-read', { id, all });
    return res.data;
  },
};

export default api;
