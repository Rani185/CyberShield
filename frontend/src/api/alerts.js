import client from './client';

/**
 * GET /api/alerts
 * @param {object} params - { page, limit, search, severity, category, status }
 */
export const getAlerts = (params = {}) =>
  client.get('/api/alerts', { params }).then((r) => r.data);

/** GET /api/alerts/{id} */
export const getAlert = (id) =>
  client.get(`/api/alerts/${id}`).then((r) => r.data);

/**
 * PUT /api/alerts/{id}/investigate
 * @param {string|number} id
 * @param {string} notes - investigation notes
 */
export const investigateAlert = (id, notes = '', assigned_to = 'Analyst') =>
  client
    .post(`/api/alerts/${id}/investigate`, { notes, assigned_to })
    .then((r) => r.data);

/**
 * POST /api/alerts/{id}/resolve
 * @param {string|number} id
 */
export const resolveAlert = (id) =>
  client.post(`/api/alerts/${id}/resolve`).then((r) => r.data);
