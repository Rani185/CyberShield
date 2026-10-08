import client from './client';

/** GET /api/rules — all detection rules */
export const getRules = (params = {}) =>
  client.get('/api/rules', { params }).then((r) => r.data);

/** GET /api/rules/{id} */
export const getRule = (id) =>
  client.get(`/api/rules/${id}`).then((r) => r.data);

/**
 * PUT /api/rules/{id} — update a rule (enable/disable or full update)
 * @param {string|number} id
 * @param {object} payload  e.g. { enabled: true }
 */
export const updateRule = (id, payload) =>
  client.put(`/api/rules/${id}`, payload).then((r) => r.data);

/**
 * POST /api/rules — create a new detection rule
 * @param {object} payload — rule fields
 */
export const createRule = (payload) =>
  client.post('/api/rules', payload).then((r) => r.data);
