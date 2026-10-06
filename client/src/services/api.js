import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 45000,
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
};

export const evidenceService = {
  async ask(question, patientContext) {
    const res = await api.post('/evidence/ask', { question, patientContext });
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
  async recheck(id) {
    const res = await api.post(`/evidence/recheck/${id}`);
    return res.data;
  },
  async followup(id, followupQuestion) {
    const res = await api.post(`/evidence/followup/${id}`, { followupQuestion });
    return res.data;
  },
};

export default api;
