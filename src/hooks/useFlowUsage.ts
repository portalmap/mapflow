import { useQuery } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { getFlowUsageDetails, getFlowUsageReport } from '@/lib/activity.functions';

export function useFlowUsageReport(from: string, to: string, enabled = true) {
  const fn = useServerFn(getFlowUsageReport);
  return useQuery({
    queryKey: ['flow-usage', 'report', from, to],
    queryFn: () => fn({ data: { from, to } }),
    enabled,
    refetchInterval: 60_000,
  });
}

export function useFlowUsageDetails(userId: string | null, from: string, to: string) {
  const fn = useServerFn(getFlowUsageDetails);
  return useQuery({
    queryKey: ['flow-usage', 'details', userId, from, to],
    queryFn: () => fn({ data: { userId: userId!, from, to } }),
    enabled: !!userId,
  });
}
