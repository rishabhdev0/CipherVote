import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { electionService } from "../services/election.service";
import toast from "react-hot-toast";
export const useElections = (p) =>
  useQuery({
    queryKey: ["elections", p],
    queryFn: () => electionService.getAll(p).then((r) => r.data.data),
    staleTime: 30000,
  });
export const useElection = (id) =>
  useQuery({
    queryKey: ["election", id],
    queryFn: () => electionService.getById(id).then((r) => r.data.data),
    enabled: !!id,
    staleTime: 15000,
  });
export const useLiveTally = (id) =>
  useQuery({
    queryKey: ["election", id, "tally"],
    queryFn: () => electionService.getLiveTally(id).then((r) => r.data.data),
    enabled: !!id,
    refetchInterval: 10000,
  });
export const useElectionResults = (id) =>
  useQuery({
    queryKey: ["election", id, "results"],
    queryFn: () => electionService.getResults(id).then((r) => r.data.data),
    enabled: !!id,
  });
export const useCreateElection = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (d) => electionService.create(d),
    onSuccess: () => {
      toast.success("Created!");
      qc.invalidateQueries(["elections"]);
    },
    onError: (e) => toast.error(e.response?.data?.message || "Failed"),
  });
};
export const useActivateElection = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => electionService.activate(id),
    onSuccess: () => {
      toast.success("Activated!");
      qc.invalidateQueries(["elections"]);
    },
    onError: (e) => toast.error(e.response?.data?.message || "Failed"),
  });
};
export const usePauseElection = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }) => electionService.pause(id, reason),
    onSuccess: () => {
      toast.success("Paused");
      qc.invalidateQueries(["elections"]);
    },
    onError: (e) => toast.error(e.response?.data?.message || "Failed"),
  });
};
export const useCloseElection = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => electionService.close(id),
    onSuccess: () => {
      toast.success("Closed");
      qc.invalidateQueries(["elections"]);
    },
    onError: (e) => toast.error(e.response?.data?.message || "Failed"),
  });
};
export const useDeclareResults = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => electionService.declareResults(id),
    onSuccess: () => {
      toast.success("Results declared!");
      qc.invalidateQueries(["elections"]);
    },
    onError: (e) => toast.error(e.response?.data?.message || "Failed"),
  });
};
export const useAddCandidate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ electionId, formData }) =>
      electionService.addCandidate(electionId, formData),
    onSuccess: (_, { electionId }) => {
      toast.success("Candidate added");
      qc.invalidateQueries(["election", electionId]);
    },
    onError: (e) => toast.error(e.response?.data?.message || "Failed"),
  });
};
