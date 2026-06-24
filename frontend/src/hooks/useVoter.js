import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../services/api";
import toast from "react-hot-toast";
export const useMyVoterProfile = (enabled = true) =>
  useQuery({
    queryKey: ["voter", "me"],
    queryFn: () => api.get("/voters/me").then((r) => r.data.data),
    enabled,
    retry: 1,
  });
export const useVoterEligibility = (id) =>
  useQuery({
    queryKey: ["voter", "eligibility", id],
    queryFn: () =>
      api.get(`/voters/eligibility/${id}`).then((r) => r.data.data),
    enabled: !!id,
  });
export const useVoterStats = () =>
  useQuery({
    queryKey: ["voter", "stats"],
    queryFn: () => api.get("/voters/stats").then((r) => r.data.data),
  });
export const useAllVoters = (p) =>
  useQuery({
    queryKey: ["voters", p],
    queryFn: () => api.get("/voters", { params: p }).then((r) => r.data.data),
  });
export const useVerifyVoter = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.put(`/voters/${id}/verify`),
    onSuccess: () => {
      toast.success("Verified!");
      qc.invalidateQueries(["voters"]);
    },
    onError: (e) => toast.error(e.response?.data?.message || "Failed"),
  });
};
export const useRejectVoter = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }) => api.put(`/voters/${id}/reject`, { reason }),
    onSuccess: () => {
      toast.success("Rejected");
      qc.invalidateQueries(["voters"]);
    },
    onError: (e) => toast.error(e.response?.data?.message || "Failed"),
  });
};
export const useBlacklistVoter = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }) =>
      api.put(`/voters/${id}/blacklist`, { reason }),
    onSuccess: () => {
      toast.success("Blacklisted");
      qc.invalidateQueries(["voters"]);
    },
    onError: (e) => toast.error(e.response?.data?.message || "Failed"),
  });
};
