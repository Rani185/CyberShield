import client from './client';

/** GET /api/threats — all active threat rules with related alert/event counts */
export const getThreats = (params = {}) =>
  client.get('/api/threats', { params }).then((r) => r.data);

/** GET /api/threats/{id} */
export const getThreat = (id) =>
  client.get(`/api/threats/${id}`).then((r) => r.data);
