import axios from 'axios';

let baseUrl = import.meta.env.VITE_API_URL || '/api';
if (!baseUrl.endsWith('/api') && !baseUrl.endsWith('/api/')) {
  baseUrl = baseUrl.replace(/\/$/, '') + '/api';
}
baseUrl = baseUrl.replace(/\/$/, '') + '/';

const api = axios.create({
  baseURL: baseUrl,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authApi = {
  login: (username, password) => api.post('auth/login', { username, password }),
  register: (username, password) => api.post('auth/register', { username, password }),
  me: () => api.get('auth/me'),
};

export const projectApi = {
  uploadProject: async (file) => {
    const formData = new FormData();
    formData.append('project', file);
    const response = await api.post('upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  getAllProjects: async () => {
    const response = await api.get('projects');
    return response.data;
  },

  getProject: async (id) => {
    const response = await api.get(`projects/${id}`);
    return response.data;
  },

  deleteProject: async (id) => {
    const response = await api.delete(`projects/${id}`);
    return response.data;
  },

  getProjectTree: async (id, type = 'original') => {
    const response = await api.get(`projects/${id}/tree?type=${type}`);
    return response.data;
  },

  getFileContent: async (id, filePath, type = 'original') => {
    const response = await api.get(`projects/${id}/file?path=${encodeURIComponent(filePath)}&type=${type}`);
    return response.data;
  },
};

export const upgradeApi = {
  startUpgrade: async (id) => {
    const response = await api.post(`upgrade/${id}`);
    return response.data;
  },

  getProgress: async (id) => {
    const response = await api.get(`upgrade/${id}/progress`);
    return response.data;
  },

  getResults: async (id) => {
    const response = await api.get(`upgrade/${id}/results`);
    return response.data;
  },
};

export const downloadApi = {
  downloadUpgraded: (id) => {
    const baseUrl = api.defaults.baseURL.replace(/\/$/, "");
    const token = localStorage.getItem('token');
    window.location.href = `${baseUrl}/download/${id}?token=${token}`;
  },
  downloadOriginal: (id) => {
    const baseUrl = api.defaults.baseURL.replace(/\/$/, "");
    const token = localStorage.getItem('token');
    window.location.href = `${baseUrl}/download/${id}/original?token=${token}`;
  },
};

export default api;
