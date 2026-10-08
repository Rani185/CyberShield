import client from './client';

/**
 * GET /api/ip-monitor
 * Returns per-IP statistics: event counts, failed logins, risk score, etc.
 */
export const getIPStats = (params = {}) =>
  client.get('/api/ip-monitor', { params }).then((r) => r.data);
