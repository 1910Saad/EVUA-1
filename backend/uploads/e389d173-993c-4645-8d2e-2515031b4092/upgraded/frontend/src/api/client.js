import axios from 'axios';

const API_BASE = '/api';

// ─── Auth helpers ───────────────────────────────────────────────────────────────
function getHeaders() {
  const token = localStorage.getItem('dataflow_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ─── Upload ─────────────────────────────────────────────────────────────────────
export async function uploadFile(file) {
  const formData = new FormData();
  formData.append('file', file);
  try {
    const res = await axios.post(`${API_BASE}/upload`, formData, {
      headers: { ...getHeaders(), 'Content-Type': 'multipart/form-data' },
      timeout: 120000
    });
    return res.data;
  } catch (error) {
    if (error.response?.status === 401) {
      localStorage.removeItem('dataflow_token');
      throw new Error('Your session has expired. Please log in again.');
    }
    throw error;
  }
}

export async function uploadMultipleFiles(files) {
  const formData = new FormData();
  files.forEach(f => formData.append('file', f));
  try {
    const res = await axios.post(`${API_BASE}/upload`, formData, {
      headers: { ...getHeaders(), 'Content-Type': 'multipart/form-data' },
      timeout: 300000
    });
    return res.data;
  } catch (error) {
    if (error.response?.status === 401) {
      localStorage.removeItem('dataflow_token');
      throw new Error('Your session has expired. Please log in again.');
    }
    throw error;
  }
}

// ─── Upload with SSE Streaming ──────────────────────────────────────────────────
export async function uploadFileStream(file, onProgress) {
  const formData = new FormData();
  formData.append('file', file);

  const token = localStorage.getItem('dataflow_token');
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(`${API_BASE}/upload/stream`, {
    method: 'POST',
    body: formData,
    headers
  });

  // Handle authentication errors
  if (response.status === 401) {
    localStorage.removeItem('dataflow_token');
    throw new Error('Your session has expired. Please log in again.');
  }

  if (!response.ok) {
    throw new Error(`Upload failed with status ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let finalResult = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    let currentEvent = null;
    for (const line of lines) {
      if (line.startsWith('event: ')) {
        currentEvent = line.slice(7).trim();
      } else if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6));
          if (currentEvent === 'progress' && onProgress) {
            onProgress(data);
          } else if (currentEvent === 'complete') {
            finalResult = data;
          } else if (currentEvent === 'error') {
            throw new Error(data.message || 'Processing failed');
          }
        } catch (e) {
          if (e.message !== 'Processing failed') continue;
          throw e;
        }
      }
    }
  }

  return finalResult;
}

// ─── Auth ───────────────────────────────────────────────────────────────────────
export async function login(email, password) {
  const res = await axios.post(`${API_BASE}/auth/login`, { email, password });
  return res.data;
}

export async function register(email, password, name) {
  const res = await axios.post(`${API_BASE}/auth/register`, { email, password, name });
  return res.data;
}

export async function getProfile() {
  const res = await axios.get(`${API_BASE}/auth/me`, { headers: getHeaders() });
  return res.data;
}

// ─── Chat ───────────────────────────────────────────────────────────────────────
export async function sendChatMessage(datasetId, question) {
  const res = await axios.post(`${API_BASE}/chat`, { datasetId, question }, { headers: getHeaders() });
  return res.data;
}

// ─── History ────────────────────────────────────────────────────────────────────
export async function getHistory() {
  const res = await axios.get(`${API_BASE}/history`, { headers: getHeaders() });
  return res.data;
}

export async function getHistoryDetail(id) {
  const res = await axios.get(`${API_BASE}/history/${id}`, { headers: getHeaders() });
  return res.data;
}

export async function deleteHistory(id) {
  const res = await axios.delete(`${API_BASE}/history/${id}`, { headers: getHeaders() });
  return res.data;
}

// ─── Export ─────────────────────────────────────────────────────────────────────
export function getExportUrl(datasetId, format) {
  return `${API_BASE}/export/${datasetId}/${format}`;
}

// ─── Health ─────────────────────────────────────────────────────────────────────
export async function healthCheck() {
  const res = await axios.get(`${API_BASE}/health`);
  return res.data;
}
