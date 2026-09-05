/**
 * Módulo Gestão — funções de servidor (isoladas dos demais módulos).
 * Acesso: administradores globais/do sistema e convidados do módulo.
 */
import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

async function assertAccess(context: any) {
  const { data, error } = await context.supabase.rpc('can_access_management', {
    _user_id: context.userId,
  });
  if (error) throw new Error('Não foi possível validar o acesso ao módulo Gestão.');
  if (!data) throw new Error('Você não tem acesso ao módulo Gestão.');
}

async function assertAdmin(context: any) {
  const [owner, sys] = await Promise.all([
    context.supabase.rpc('is_global_owner', { _user_id: context.userId }),
    context.supabase.rpc('is_system_admin', { _user_id: context.userId }),
  ]);
  if (!owner.data && !sys.data) {
    throw new Error('Apenas administradores globais podem alterar os convidados da Gestão.');
  }
}

/** O usuário atual pode ver o módulo Gestão? */
export const getManagementAccess = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [access, owner, sys] = await Promise.all([
      context.supabase.rpc('can_access_management', { _user_id: context.userId }),
      context.supabase.rpc('is_global_owner', { _user_id: context.userId }),
      context.supabase.rpc('is_system_admin', { _user_id: context.userId }),
    ]);
    return {
      canAccess: !!access.data,
      canManage: !!owner.data || !!sys.data,
    };
  });

/** Convidados do módulo + candidatos para convidar. */
export const listManagementMembers = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAccess(context);
    const { data: members } = await context.supabase
      .from('management_members')
      .select('id, user_id, created_at')
      .order('created_at', { ascending: true });

    const { data: users } = await context.supabase.rpc('get_all_users_with_emails');
    const byId = new Map<string, { full_name: string | null; email: string | null }>();
    for (const u of (users ?? []) as any[]) {
      byId.set(u.user_id, { full_name: u.full_name ?? null, email: u.email ?? null });
    }

    return {
      members: (members ?? []).map((m: any) => ({
        id: m.id,
        userId: m.user_id,
        createdAt: m.created_at,
        fullName: byId.get(m.user_id)?.full_name ?? null,
        email: byId.get(m.user_id)?.email ?? null,
      })),
      users: ((users ?? []) as any[]).map((u) => ({
        userId: u.user_id,
        fullName: u.full_name ?? null,
        email: u.email ?? null,
      })),
    };
  });

export const addManagementMember = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string }) => {
    if (!input?.userId) throw new Error('Selecione uma pessoa.');
    return input;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { error } = await supabaseAdmin
      .from('management_members')
      .upsert({ user_id: data.userId, granted_by: context.userId }, { onConflict: 'user_id' });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removeManagementMember = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => {
    if (!input?.id) throw new Error('Registro inválido.');
    return input;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { error } = await supabaseAdmin.from('management_members').delete().eq('id', data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export interface AttendanceParticipant {
  key: string;
  name: string;
  type: string;
  firstJoin: string | null;
  lastLeave: string | null;
  totalSeconds: number;
  sessions: { join: string | null; leave: string | null; seconds: number | null }[];
}

export interface AttendanceMeeting {
  id: string;
  title: string;
  meetCode: string | null;
  startTime: string | null;
  endTime: string | null;
  collectedAt: string;
  participants: AttendanceParticipant[];
  invitedMissing: string[];
}

/** Relatório de presença nas reuniões do Meet em um período. */
export const listMeetingAttendance = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { days?: number }) => ({ days: Math.min(365, Math.max(1, input?.days ?? 30)) }))
  .handler(async ({ data, context }): Promise<AttendanceMeeting[]> => {
    await assertAccess(context);
    const since = new Date();
    since.setDate(since.getDate() - data.days);

    const { data: conferences } = await context.supabase
      .from('meeting_attendance_conferences')
      .select('id, event_id, title, meet_code, start_time, end_time, collected_at')
      .gte('start_time', since.toISOString())
      .order('start_time', { ascending: false });

    const list = (conferences ?? []) as any[];
    if (!list.length) return [];

    const { data: sessions } = await context.supabase
      .from('meeting_attendance_sessions')
      .select('conference_id, participant_key, display_name, participant_type, join_time, leave_time, duration_seconds')
      .in(
        'conference_id',
        list.map((c) => c.id),
      );

    const eventIds = list.map((c) => c.event_id).filter(Boolean);
    const invitedByEvent = new Map<string, string[]>();
    if (eventIds.length) {
      const { data: guests } = await context.supabase
        .from('calendar_event_guests')
        .select('event_id, display_name, email')
        .in('event_id', eventIds);
      for (const g of (guests ?? []) as any[]) {
        const label = g.display_name || g.email;
        if (!label) continue;
        const current = invitedByEvent.get(g.event_id) ?? [];
        current.push(label);
        invitedByEvent.set(g.event_id, current);
      }
    }

    return list.map((conf) => {
      const own = ((sessions ?? []) as any[]).filter((s) => s.conference_id === conf.id);
      const grouped = new Map<string, AttendanceParticipant>();
      for (const s of own) {
        const existing =
          grouped.get(s.participant_key) ??
          ({
            key: s.participant_key,
            name: s.display_name ?? 'Participante',
            type: s.participant_type ?? 'signed_in',
            firstJoin: null,
            lastLeave: null,
            totalSeconds: 0,
            sessions: [],
          } as AttendanceParticipant);
        existing.sessions.push({
          join: s.join_time,
          leave: s.leave_time,
          seconds: s.duration_seconds,
        });
        existing.totalSeconds += s.duration_seconds ?? 0;
        if (s.join_time && (!existing.firstJoin || s.join_time < existing.firstJoin)) {
          existing.firstJoin = s.join_time;
        }
        if (s.leave_time && (!existing.lastLeave || s.leave_time > existing.lastLeave)) {
          existing.lastLeave = s.leave_time;
        }
        grouped.set(s.participant_key, existing);
      }

      const participants = [...grouped.values()].map((p) => ({
        ...p,
        sessions: p.sessions.sort((a, b) => String(a.join).localeCompare(String(b.join))),
      }));
      const presentNames = new Set(participants.map((p) => p.name.trim().toLowerCase()));
      const invited = conf.event_id ? (invitedByEvent.get(conf.event_id) ?? []) : [];

      return {
        id: conf.id,
        title: conf.title ?? 'Reunião do Google Meet',
        meetCode: conf.meet_code,
        startTime: conf.start_time,
        endTime: conf.end_time,
        collectedAt: conf.collected_at,
        participants: participants.sort((a, b) => b.totalSeconds - a.totalSeconds),
        invitedMissing: invited.filter((label) => !presentNames.has(label.trim().toLowerCase())),
      };
    });
  });

/** Busca no Google a presença das reuniões encerradas recentemente. */
export const refreshMeetingAttendance = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input?: { days?: number }) => ({ days: Math.min(30, Math.max(1, input?.days ?? 2)) }))
  .handler(async ({ data, context }) => {
    await assertAccess(context);
    const { collectMeetAttendance } = await import('@/lib/meetingAttendance.server');
    return collectMeetAttendance(context.userId, data.days);
  });

/** Diagnóstico da permissão do Google Meet para a conta conectada. */
export const probeMeetingAttendanceApi = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAccess(context);
    const { probeMeetApi } = await import('@/lib/meetingAttendance.server');
    return probeMeetApi(context.userId);
  });

export interface LiveParticipant {
  key: string;
  name: string;
  type: string;
  firstJoin: string | null;
  lastLeave: string | null;
  totalSeconds: number;
  online: boolean;
  sessions: { join: string | null; leave: string | null }[];
}

export interface LiveMeeting {
  id: string;
  title: string;
  meetCode: string | null;
  startTime: string | null;
  fromAgenda: boolean;
  online: LiveParticipant[];
  left: LiveParticipant[];
  invitedNotJoined: string[];
}

/** Reuniões do Meet acontecendo agora + quem está online. */
export const listLiveMeetings = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ meetings: LiveMeeting[]; refreshedAt: string; notice: string | null }> => {
    await assertAccess(context);
    const { collectLiveMeetAttendance } = await import('@/lib/meetingAttendance.server');
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');

    // Coleta com todas as contas do Google conectadas (cada conta vê as suas reuniões).
    const { data: accounts } = await supabaseAdmin
      .from('calendar_google_accounts')
      .select('user_id')
      .eq('status', 'online');
    const userIds = new Set<string>([context.userId, ...((accounts ?? []) as any[]).map((a) => a.user_id)]);

    let notice: string | null = null;
    for (const uid of userIds) {
      try {
        const res = await collectLiveMeetAttendance(uid, 12);
        if (uid === context.userId && res.message.startsWith('Não foi possível')) notice = res.message;
      } catch {
        /* uma conta com problema não deve derrubar o relatório */
      }
    }

    const since = new Date(Date.now() - 12 * 3600 * 1000).toISOString();
    const { data: conferences } = await supabaseAdmin
      .from('meeting_attendance_conferences')
      .select('id, event_id, title, meet_code, start_time')
      .is('end_time', null)
      .gte('start_time', since)
      .order('start_time', { ascending: false });

    const list = (conferences ?? []) as any[];
    if (!list.length) return { meetings: [], refreshedAt: new Date().toISOString(), notice };

    const { data: sessions } = await supabaseAdmin
      .from('meeting_attendance_sessions')
      .select('conference_id, participant_key, display_name, participant_type, join_time, leave_time, duration_seconds')
      .in(
        'conference_id',
        list.map((c) => c.id),
      );

    const eventIds = list.map((c) => c.event_id).filter(Boolean);
    const invitedByEvent = new Map<string, string[]>();
    if (eventIds.length) {
      const { data: guests } = await supabaseAdmin
        .from('calendar_event_guests')
        .select('event_id, display_name, email')
        .in('event_id', eventIds);
      for (const g of (guests ?? []) as any[]) {
        const label = g.display_name || g.email;
        if (!label) continue;
        const current = invitedByEvent.get(g.event_id) ?? [];
        current.push(label);
        invitedByEvent.set(g.event_id, current);
      }
    }

    const meetings: LiveMeeting[] = list.map((conf) => {
      const own = ((sessions ?? []) as any[]).filter((s) => s.conference_id === conf.id);
      const grouped = new Map<string, LiveParticipant>();
      for (const s of own) {
        const p =
          grouped.get(s.participant_key) ??
          ({
            key: s.participant_key,
            name: s.display_name ?? 'Participante',
            type: s.participant_type ?? 'signed_in',
            firstJoin: null,
            lastLeave: null,
            totalSeconds: 0,
            online: false,
            sessions: [],
          } as LiveParticipant);
        p.sessions.push({ join: s.join_time, leave: s.leave_time });
        if (!s.leave_time) {
          p.online = true;
          if (s.join_time) p.totalSeconds += Math.max(0, Math.round((Date.now() - new Date(s.join_time).getTime()) / 1000));
        } else {
          p.totalSeconds += s.duration_seconds ?? 0;
        }
        if (s.join_time && (!p.firstJoin || s.join_time < p.firstJoin)) p.firstJoin = s.join_time;
        if (s.leave_time && (!p.lastLeave || s.leave_time > p.lastLeave)) p.lastLeave = s.leave_time;
        grouped.set(s.participant_key, p);
      }

      const all = [...grouped.values()].map((p) => ({
        ...p,
        sessions: p.sessions.sort((a, b) => String(a.join).localeCompare(String(b.join))),
      }));
      const present = new Set(all.map((p) => p.name.trim().toLowerCase()));
      const invited = conf.event_id ? (invitedByEvent.get(conf.event_id) ?? []) : [];

      return {
        id: conf.id,
        title: conf.title ?? 'Reunião instantânea do Meet',
        meetCode: conf.meet_code,
        startTime: conf.start_time,
        fromAgenda: !!conf.event_id,
        online: all.filter((p) => p.online).sort((a, b) => b.totalSeconds - a.totalSeconds),
        left: all.filter((p) => !p.online).sort((a, b) => b.totalSeconds - a.totalSeconds),
        invitedNotJoined: invited.filter((l) => !present.has(l.trim().toLowerCase())),
      };
    });

    return { meetings, refreshedAt: new Date().toISOString(), notice };
  });
