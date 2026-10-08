import client from './client';

/** GET /api/dashboard/stats — overall security metrics */
export const getDashboardStats = () =>
  client.get('/api/dashboard/stats').then((r) => r.data);

/** GET /api/dashboard/threat-activity — hourly events/alerts for 24 h */
export const getThreatActivity = () =>
  client.get('/api/dashboard/threat-activity').then((r) => r.data);

/** GET /api/dashboard/threat-distribution — category breakdown */
export const getThreatDistribution = () =>
  client.get('/api/dashboard/threat-distribution').then((r) => r.data);

/** GET /api/dashboard/system-status — API / DB / engine health */
export const getSystemStatus = () =>
  client.get('/api/dashboard/system-status').then((r) => r.data);

/** GET /api/dashboard/score-history — historical score snapshots */
export const getScoreHistory = () =>
  client.get('/api/dashboard/score-history').then((r) => r.data);
