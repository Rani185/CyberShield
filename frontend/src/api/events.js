import client from './client';

/**
 * GET /api/events
 * @param {object} params - { page, limit, search, severity, category, status }
 */
export const getEvents = (params = {}) =>
  client.get('/api/events', { params }).then((r) => r.data);

/** GET /api/events/{id} */
export const getEvent = (id) =>
  client.get(`/api/events/${id}`).then((r) => r.data);
