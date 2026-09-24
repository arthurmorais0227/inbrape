import api from './api';

export const getOrganizacoes = (page = 1, limit = 20) =>
  api.get(`/crm/organizacoes?page=${page}&limit=${limit}`).then(r => r.data);

export const getCotacoes = (page = 1, limit = 20) =>
  api.get(`/crm/cotacoes?page=${page}&limit=${limit}`).then(r => r.data);