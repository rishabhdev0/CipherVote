import { useQuery } from "@tanstack/react-query";
import { analyticsService } from "../services/analytics.service";
export const usePlatformOverview = () =>
  useQuery({
    queryKey: ["analytics", "platform"],
    queryFn: () => analyticsService.getPlatform().then((r) => r.data.data),
    refetchInterval: 30000,
  });
export const useRealTimeSnapshot = (id, enabled = true) =>
  useQuery({
    queryKey: ["analytics", "snapshot", id],
    queryFn: () =>
      analyticsService.getRealTimeSnapshot(id).then((r) => r.data.data),
    enabled: !!id && enabled,
    refetchInterval: 5000,
  });
export const useBlockchainStats = () =>
  useQuery({
    queryKey: ["analytics", "blockchain"],
    queryFn: () =>
      analyticsService.getBlockchainStats().then((r) => r.data.data),
    refetchInterval: 60000,
  });
export const useVoterAnalytics = () =>
  useQuery({
    queryKey: ["analytics", "voters"],
    queryFn: () =>
      analyticsService.getVoterAnalytics().then((r) => r.data.data),
    staleTime: 30000,
  });
