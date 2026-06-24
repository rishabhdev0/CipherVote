import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../services/api";
import toast from "react-hot-toast";
export const useFraudDashboard = () =>
  useQuery({
    queryKey: ["fraud", "dashboard"],
    queryFn: () => api.get("/fraud/dashboard").then((r) => r.data.data),
    refetchInterval: 15000,
  });
export const useFraudLogs = (p) =>
  useQuery({
    queryKey: ["fraud", "logs", p],
    queryFn: () =>
      api.get("/fraud/logs", { params: p }).then((r) => r.data.data),
  });
export const useEmergencyStatus = () =>
  useQuery({
    queryKey: ["fraud", "emergency"],
    queryFn: () => api.get("/fraud/emergency").then((r) => r.data.data),
    refetchInterval: 30000,
  });
export const useResolveFraudLog = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, resolutionNote }) =>
      api.put(`/fraud/logs/${id}/resolve`, { resolutionNote }),
    onSuccess: () => {
      toast.success("Resolved");
      qc.invalidateQueries(["fraud"]);
    },
    onError: (e) => toast.error(e.response?.data?.message || "Failed"),
  });
};
export const useTriggerEmergencyPause = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (r) => api.post("/fraud/emergency/pause", { reason: r }),
    onSuccess: () => {
      toast.success("System paused");
      qc.invalidateQueries(["fraud"]);
    },
    onError: (e) => toast.error(e.response?.data?.message || "Failed"),
  });
};
