import client from './client';

/**
 * POST /api/simulate-events
 * @param {string} event_type — one of: normal_login, failed_login,
 *   multiple_failed_logins, authorization_failure,
 *   suspicious_network, config_change
 */
export const simulateEvent = (event_type) =>
  client.post('/api/simulate-events', { event_type }).then((r) => r.data);
