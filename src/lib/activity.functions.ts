/**
 * Módulo de tempo de uso do Flow (isolado dos demais módulos).
 * Grava períodos de presença (ativo/inativo) e devolve os relatórios da Gestão.
 */
import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

/** Intervalo máximo entre sinais para considerar o mesmo período de uso. */
const MAX_GAP_MS = 5 * 60 * 1000;

type PingInput = { sessionId?: string | null; state: 'active' | 'idle'; userAgent?: string | null };

/** Sinal de presença: cria, prolonga ou troca o período de uso atual. */
export const pingActivity = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: PingInput) => ({
    sessionId: input.sessionId ?? null,
    state: input.state === 'idle' ? ('idle' as const) : ('active' as const),
    userAgent: input.userAgent ?? null,
  }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const now = new Date();

    if (data.sessionId) {
      const { data: current } = await supabase
        .from('user_activity_sessions')
        .select('id, state, last_seen_at, ended_at')
        .eq('id', data.sessionId)
        .eq('user_id', userId)
        .maybeSingle();

      if (current && !current.ended_at) {
        const gap = now.getTime() - new Date(current.last_seen_at).getTime();
        if (current.state === data.state && gap <= MAX_GAP_MS) {
          await supabase
            .from('user_activity_sessions')
            .update({ last_seen_at: now.toISOString() })
            .eq('id', current.id);
          return { sessionId: current.id };
        }
        // Troca de estado ou intervalo grande: fecha e abre um novo período.
        await supabase
          .from('user_activity_sessions')
          .update({ ended_at: current.last_seen_at })
          .eq('id', current.id);
      }
    }

    const { data: created, error } = await supabase
      .from('user_activity_sessions')
      .insert({
        user_id: userId,
        state: data.state,
        started_at: now.toISOString(),
        last_seen_at: now.toISOString(),
        user_agent: data.userAgent,
      })
      .select('id')
      .single();

    if (error) throw new Error(error.message);
    return { sessionId: created.id };
  });

/** Encerra o período de uso (saída do Flow). */
export const endActivitySession = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { sessionId: string }) => ({ sessionId: input.sessionId }))
  .handler(async ({ data, context }) => {
    await context.supabase
      .from('user_activity_sessions')
      .update({ ended_at: new Date().toISOString() })
      .eq('id', data.sessionId)
      .eq('user_id', context.userId)
      .is('ended_at', null);
    return { ok: true };
  });

export type FlowUsageUser = {
  userId: string;
  userName: string;
  avatarUrl: string | null;
  activeSeconds: number;
  idleSeconds: number;
  offlineSeconds: number;
  sessionCount: number;
  activeDays: number;
  lastSeenAt: string | null;
  avgPerDaySeconds: number;
  avgPerSessionSeconds: number;
  daysPerWeek: number;
};

export type FlowUsageReport = {
  from: string;
  to: string;
  spanSeconds: number;
  users: FlowUsageUser[];
};

/** Relatório agregado por pessoa (somente Gestão). */
export const getFlowUsageReport = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { from: string; to: string }) => ({ from: input.from, to: input.to }))
  .handler(async ({ data, context }) => {
    const { data: report, error } = await context.supabase.rpc('get_flow_usage_report', {
      _from: data.from,
      _to: data.to,
    });
    if (error) throw new Error(error.message);
    return report as unknown as FlowUsageReport;
  });

export type FlowUsageDetails = {
  days: { day: string; activeSeconds: number; idleSeconds: number }[];
  weeks: { week: string; activeSeconds: number; idleSeconds: number; days: number }[];
  months: { month: string; activeSeconds: number; idleSeconds: number; days: number }[];
};

/** Detalhe por pessoa: por dia, semana e mês (somente Gestão). */
export const getFlowUsageDetails = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string; from: string; to: string }) => ({
    userId: input.userId,
    from: input.from,
    to: input.to,
  }))
  .handler(async ({ data, context }) => {
    const { data: details, error } = await context.supabase.rpc('get_flow_usage_details', {
      _user_id: data.userId,
      _from: data.from,
      _to: data.to,
    });
    if (error) throw new Error(error.message);
    return details as unknown as FlowUsageDetails;
  });
