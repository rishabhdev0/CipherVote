import api from "./api";
export const governanceService = {
  list: (limit) => api.get("/admin/governance/actions", { params: { limit } }),
  propose: (data) => api.post("/admin/governance/actions", data),
  approve: (id) => api.post(`/admin/governance/actions/${id}/approve`),
  execute: (id) => api.post(`/admin/governance/actions/${id}/execute`),
};
