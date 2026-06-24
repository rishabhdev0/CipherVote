import api from "./api";
export const voteService = {
  generateProof: (electionId, candidateId) =>
    api.post(`/voting/${electionId}/proof`, { candidateId }),
  getEligibilityPackage: (id) => api.get(`/voting/${id}/eligibility-package`),
  cast: (d) => api.post("/voting/cast", d),
  castPrivate: (d) => api.post("/voting/cast-private", d),
  verify: (h) => api.get(`/voting/verify/${h}`),
  getHistory: () => api.get("/voting/history"),
  checkEligibility: (id) => api.get(`/voting/${id}/eligibility`),
};
