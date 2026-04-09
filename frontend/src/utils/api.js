import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
});

export const healthCheck = () => api.get('/api/health');

export const generateKneeboard = (missionData) =>
  api.post('/api/generate', missionData);

export const previewPage = async (missionData, pageType = 'mission') => {
  const response = await api.post('/api/preview',
    { ...missionData, page_type: pageType },
    { responseType: 'blob' }
  );
  return URL.createObjectURL(response.data);
};

export const parseMizFile = (file, coalition = 'blue', groupName = '') => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('coalition', coalition);
  formData.append('group', groupName);
  return api.post('/api/parse-miz', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const generateReference = async (cardData) => {
  const response = await api.post('/api/generate-reference', cardData, {
    responseType: 'blob',
  });
  return URL.createObjectURL(response.data);
};

export const listTemplates = () => api.get('/api/templates');

export const getTemplate = (id) => api.get(`/api/templates/${id}`);

export default api;
