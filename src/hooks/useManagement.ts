import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { toast } from 'sonner';
import {
  addManagementMember,
  getManagementAccess,
  listManagementMembers,
  listLiveMeetings,
  listMeetingAttendance,
  refreshMeetingAttendance,
  removeManagementMember,
} from '@/lib/management.functions';

export function useManagementAccess() {
  const fn = useServerFn(getManagementAccess);
  return useQuery({
    queryKey: ['management', 'access'],
    queryFn: () => fn(),
    staleTime: 60_000,
  });
}

export function useManagementMembers(enabled: boolean) {
  const fn = useServerFn(listManagementMembers);
  return useQuery({
    queryKey: ['management', 'members'],
    queryFn: () => fn(),
    enabled,
  });
}

export function useAddManagementMember() {
  const fn = useServerFn(addManagementMember);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => fn({ data: { userId } }),
    onSuccess: () => {
      toast.success('Acesso liberado.');
      qc.invalidateQueries({ queryKey: ['management', 'members'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useRemoveManagementMember() {
  const fn = useServerFn(removeManagementMember);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fn({ data: { id } }),
    onSuccess: () => {
      toast.success('Acesso removido.');
      qc.invalidateQueries({ queryKey: ['management', 'members'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useMeetingAttendance(days: number, enabled: boolean) {
  const fn = useServerFn(listMeetingAttendance);
  return useQuery({
    queryKey: ['management', 'attendance', days],
    queryFn: () => fn({ data: { days } }),
    enabled,
  });
}

export function useRefreshMeetingAttendance() {
  const fn = useServerFn(refreshMeetingAttendance);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (days?: number) => fn({ data: { days: days ?? 2 } }),
    onSuccess: (result) => {
      toast.success(result.message);
      qc.invalidateQueries({ queryKey: ['management', 'attendance'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useLiveMeetings(enabled: boolean) {
  const fn = useServerFn(listLiveMeetings);
  return useQuery({
    queryKey: ['management', 'live-meetings'],
    queryFn: () => fn({ data: {} }),
    enabled,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
}
