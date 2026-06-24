import api from "./api";

export const candidateService = {
  apply: (data) => api.post("/candidates/applications", data),
  mine: () => api.get("/candidates/applications/mine"),
  list: (params) => api.get("/candidates/applications", { params }),
  approve: (id, reason) =>
    api.put(`/candidates/applications/${id}/approve`, { reason }),
  reject: (id, reason) =>
    api.put(`/candidates/applications/${id}/reject`, { reason }),
  assignElection: (id, electionId) =>
    api.put(`/candidates/applications/${id}/assign-election`, { electionId }),
};
