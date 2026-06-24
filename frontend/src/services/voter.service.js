import api from "./api";

export const voterService = {
  getAll: (params) => api.get("/voters", { params }),
  getStats: () => api.get("/voters/stats"),
  getById: (id) => api.get(`/voters/${id}`),
  getReviewDetail: (id) => api.get(`/voters/${id}/review-detail`),
  getIdentityReviews: (id) => api.get(`/voters/${id}/identity-reviews`),
  verify: (id, data = {}) => api.put(`/voters/${id}/verify`, data),
  reject: (id, reason) => api.put(`/voters/${id}/reject`, { reason }),
  blacklist: (id, reason) => api.put(`/voters/${id}/blacklist`, { reason }),
};
