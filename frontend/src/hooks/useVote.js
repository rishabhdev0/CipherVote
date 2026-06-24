import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { voteService } from "../services/vote.service";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
export const useVoteHistory = () =>
  useQuery({
    queryKey: ["votes", "history"],
    queryFn: () => voteService.getHistory().then((r) => r.data.data),
    staleTime: 60000,
  });
export const useCastVote = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (d) => voteService.cast(d),
    onSuccess: () => {
      toast.success("Vote cast! 🗳️");
      qc.invalidateQueries(["votes"]);
      qc.invalidateQueries(["elections"]);
      qc.invalidateQueries(["voter", "me"]);
    },
    onError: (e) => toast.error(e.response?.data?.message || "Vote failed"),
  });
};
export const useVoterEligibilityForVote = (id) => {
  const { user, voter } = useAuth();
  const accountKey = voter?.id || user?.id || "anonymous";
  return useQuery({
    queryKey: ["vote", "eligibility", id, accountKey],
    queryFn: () => voteService.checkEligibility(id).then((r) => r.data.data),
    enabled: !!id && !!user,
  });
};
