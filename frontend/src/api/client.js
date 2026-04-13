import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});

export const projectApi = {
  uploadProject: async (file) => {
    const formData = new FormData();
    formData.append('project', file);
    const response = await api.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  getAllProjects: async () => {
    const response = await api.get('/projects');
    return response.data;
  },

  getProject: async (id) => {
    const response = await api.get(`/projects/${id}`);
    return response.data;
  },

  deleteProject: async (id) => {
    const response = await api.delete(`/projects/${id}`);
    return response.data;
  },

  getProjectTree: async (id, type = 'original') => {
    const response = await api.get(`/projects/${id}/tree?type=${type}`);
    return response.data;
  },

  getFileContent: async (id, filePath, type = 'original') => {
    const response = await api.get(`/projects/${id}/file?path=${encodeURIComponent(filePath)}&type=${type}`);
    return response.data;
  },
};

export const upgradeApi = {
  startUpgrade: async (id) => {
    const response = await api.post(`/upgrade/${id}`);
    return response.data;
  },

  getProgress: async (id) => {
    const response = await api.get(`/upgrade/${id}/progress`);
    return response.data;
  },

  getResults: async (id) => {
    const response = await api.get(`/upgrade/${id}/results`);
    return response.data;
  },
};

export const downloadApi = {
  downloadUpgraded: (id) => {
    const baseUrl = api.defaults.baseURL.replace(/\/$/, "");
    window.location.href = `${baseUrl}/download/${id}`;
  },
  downloadOriginal: (id) => {
    const baseUrl = api.defaults.baseURL.replace(/\/$/, "");
    window.location.href = `${baseUrl}/download/${id}/original`;
  },
};

export default api;
