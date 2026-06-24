import api from "./api";
export const electionService = {
  getAll: (p) => api.get("/elections", { params: p }),
  getById: (id) => api.get(`/elections/${id}`),
  getLiveTally: (id) => api.get(`/elections/${id}/tally`),
  getResults: (id) => api.get(`/elections/${id}/results`),
  create: (d) => api.post("/elections", d),
  addCandidate: (eId, fd) =>
    api.post(`/elections/${eId}/candidates`, fd, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  activate: (id, governanceActionId, startNow = false) =>
    api.put(`/elections/${id}/activate`, { governanceActionId, startNow }),
  pause: (id, reason, governanceActionId) =>
    api.put(`/elections/${id}/pause`, { reason, governanceActionId }),
  resume: (id, governanceActionId) =>
    api.put(`/elections/${id}/resume`, { governanceActionId }),
  close: (id, governanceActionId) =>
    api.put(`/elections/${id}/close`, { governanceActionId }),
  quickResult: (id, certificationNotes) =>
    api.put(`/elections/${id}/quick-result`, { certificationNotes }),
  declareResults: (id, governanceActionId, certificationNotes) =>
    api.put(`/elections/${id}/declare`, {
      governanceActionId,
      certificationNotes,
    }),
  rebuildEligibility: (id, governanceActionId) =>
    api.post(`/elections/${id}/eligibility/rebuild`, { governanceActionId }),
  getSelectableVoters: (id, params) =>
    api.get(`/elections/${id}/roll/selectable`, { params }),
  getElectionRoll: (id, params) => api.get(`/elections/${id}/roll`, { params }),
  selectVoter: (id, voterId, reason) =>
    api.put(`/elections/${id}/roll/${voterId}/select`, { reason }),
  rejectVoter: (id, voterId, reason) =>
    api.put(`/elections/${id}/roll/${voterId}/reject`, { reason }),
  revokeVoter: (id, voterId, reason) =>
    api.put(`/elections/${id}/roll/${voterId}/revoke`, { reason }),
};
