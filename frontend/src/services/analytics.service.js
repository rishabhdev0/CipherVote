import api from "./api";
export const analyticsService = {
  getPlatform: () => api.get("/analytics/platform"),
  getElectionOverview: (id) => api.get(`/analytics/elections/${id}/overview`),
  getRealTimeSnapshot: (id) => api.get(`/analytics/elections/${id}/snapshot`),
  getTally: (id) => api.get(`/analytics/elections/${id}/tally`),
  getBlockchainStats: () => api.get("/analytics/blockchain"),
  getVoterAnalytics: () => api.get("/analytics/voters"),
};
