import client from './client';

/**
 * POST /api/reports/generate
 * @param {number} time_range_hours — e.g. 24, 48, 168
 */
export const generateReport = (time_range_hours = 24) =>
  client
    .post('/api/reports/generate', { time_range_hours })
    .then((r) => r.data);

/** GET /api/reports — list all generated reports */
export const getReports = (params = {}) =>
  client.get('/api/reports', { params }).then((r) => r.data);

/** GET /api/reports/{id} — single report detail */
export const getReport = (id) =>
  client.get(`/api/reports/${id}`).then((r) => r.data);
