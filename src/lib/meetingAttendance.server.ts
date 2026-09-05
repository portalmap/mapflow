/**
 * Módulo Gestão — coleta de presença em reuniões do Google Meet.
 *
 * Isolado: não altera Agenda, sincronização de eventos, tarefas nem convites.
 * Apenas LÊ dados já consolidados pelo Google e grava nas tabelas
 * `meeting_attendance_conferences` / `meeting_attendance_sessions`.
 */
import {
  GATEWAY_BASE_URL,
  callAsAppUser,
} from '@/integrations/lovable/appUserConnector.server';
import { getConnectionKeyForUser } from '@/lib/appUserConnections.server';
import { GOOGLE_CONNECTOR_ID } from '@/lib/googleCalendarSync.server';

/** Chamada à Meet API v2 pelo gateway do conector do usuário. */
async function meetApi(
  connectionAPIKey: string,
  path: string,
): Promise<{ ok: boolean; status: number; body: any }> {
  const res = await callAsAppUser({
    gatewayBaseUrl: GATEWAY_BASE_URL,
    connectionAPIKey,
    connectorId: GOOGLE_CONNECTOR_ID,
    path: `/meet/v2${path.startsWith('/') ? path : `/${path}`}`,
    init: { headers: { 'Content-Type': 'application/json' } },
  });
  const text = await res.text();
  let body: any = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { ok: res.ok, status: res.status, body };
}

export interface CollectResult {
  conferences: number;
  sessions: number;
  message: string;
}

/** Diagnóstico: confirma se a Meet API responde para a conexão do usuário. */
export async function probeMeetApi(userId: string) {
  const key = await getConnectionKeyForUser(userId, GOOGLE_CONNECTOR_ID);
  if (!key) return { ok: false, status: 0, detail: 'Conta do Google não conectada.' };
  const res = await meetApi(key, '/conferenceRecords?pageSize=1');
  return {
    ok: res.ok,
    status: res.status,
    detail: typeof res.body === 'string' ? res.body.slice(0, 400) : JSON.stringify(res.body).slice(0, 400),
  };
}

function seconds(from?: string | null, to?: string | null) {
  if (!from || !to) return null;
  const a = new Date(from).getTime();
  const b = new Date(to).getTime();
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return Math.max(0, Math.round((b - a) / 1000));
}

/**
 * Coleta as reuniões encerradas nos últimos `lookbackDays` dias para o
 * usuário informado (precisa ter sido organizador/participante).
 */
export async function collectMeetAttendance(
  userId: string,
  lookbackDays = 2,
): Promise<CollectResult> {
  const key = await getConnectionKeyForUser(userId, GOOGLE_CONNECTOR_ID);
  if (!key) return { conferences: 0, sessions: 0, message: 'Conta do Google não conectada.' };

  const { supabaseAdmin: admin } = await import('@/integrations/supabase/client.server');

  const since = new Date();
  since.setDate(since.getDate() - Math.max(1, lookbackDays));
  const filter = encodeURIComponent(`start_time>="${since.toISOString()}"`);

  let conferences = 0;
  let sessions = 0;
  let pageToken: string | null = null;
  const spaceCodeCache = new Map<string, string | null>();

  do {
    const listRes: { ok: boolean; status: number; body: any } = await meetApi(
      key,
      `/conferenceRecords?pageSize=50&filter=${filter}${pageToken ? `&pageToken=${pageToken}` : ''}`,
    );
    if (!listRes.ok) {
      const detail =
        typeof listRes.body === 'string'
          ? listRes.body.slice(0, 200)
          : (listRes.body?.error?.message ?? `HTTP ${listRes.status}`);
      return {
        conferences,
        sessions,
        message: `Não foi possível ler a presença no Google Meet: ${detail}`,
      };
    }

    const records = (listRes.body?.conferenceRecords ?? []) as any[];
    pageToken = listRes.body?.nextPageToken ?? null;

    for (const record of records) {
      const recordName: string = record.name;
      if (!recordName) continue;
      if (!record.endTime) continue; // reunião ainda em andamento

      // Código da reunião (para ligar ao evento da agenda).
      let meetCode: string | null = null;
      if (record.space) {
        if (spaceCodeCache.has(record.space)) {
          meetCode = spaceCodeCache.get(record.space) ?? null;
        } else {
          const spaceRes = await meetApi(key, `/${record.space}`);
          meetCode = spaceRes.ok ? (spaceRes.body?.meetingCode ?? null) : null;
          spaceCodeCache.set(record.space, meetCode);
        }
      }

      let eventId: string | null = null;
      let title: string | null = null;
      if (meetCode) {
        const { data: event } = await admin
          .from('calendar_events')
          .select('id, title')
          .eq('meet_code', meetCode)
          .order('starts_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        eventId = event?.id ?? null;
        title = event?.title ?? null;
      }

      const { data: conf, error: confError } = await admin
        .from('meeting_attendance_conferences')
        .upsert(
          {
            google_conference_record: recordName,
            event_id: eventId,
            organizer_user_id: userId,
            meet_code: meetCode,
            title,
            start_time: record.startTime ?? null,
            end_time: record.endTime ?? null,
            collected_at: new Date().toISOString(),
          },
          { onConflict: 'google_conference_record' },
        )
        .select('id')
        .maybeSingle();
      if (confError || !conf) continue;
      conferences += 1;

      // Participantes e cada trecho de presença.
      let partToken: string | null = null;
      do {
        const partRes: { ok: boolean; body: any } = await meetApi(
          key,
          `/${recordName}/participants?pageSize=100${partToken ? `&pageToken=${partToken}` : ''}`,
        );
        if (!partRes.ok) break;
        partToken = partRes.body?.nextPageToken ?? null;

        for (const participant of (partRes.body?.participants ?? []) as any[]) {
          const partName: string = participant.name;
          if (!partName) continue;
          const displayName =
            participant.signedinUser?.displayName ??
            participant.anonymousUser?.displayName ??
            participant.phoneUser?.displayName ??
            'Participante';
          const participantType = participant.signedinUser
            ? 'signed_in'
            : participant.phoneUser
              ? 'phone'
              : 'anonymous';
          const participantKey: string = participant.signedinUser?.user ?? partName;

          let sessionToken: string | null = null;
          const rows: any[] = [];
          do {
            const sesRes: { ok: boolean; body: any } = await meetApi(
              key,
              `/${partName}/participantSessions?pageSize=100${sessionToken ? `&pageToken=${sessionToken}` : ''}`,
            );
            if (!sesRes.ok) break;
            sessionToken = sesRes.body?.nextPageToken ?? null;
            for (const session of (sesRes.body?.participantSessions ?? []) as any[]) {
              if (!session.name) continue;
              rows.push({
                conference_id: conf.id,
                google_session_id: session.name,
                participant_key: participantKey,
                display_name: displayName,
                participant_type: participantType,
                join_time: session.startTime ?? null,
                leave_time: session.endTime ?? null,
                duration_seconds: seconds(session.startTime, session.endTime),
              });
            }
          } while (sessionToken);

          if (!rows.length) {
            rows.push({
              conference_id: conf.id,
              google_session_id: partName,
              participant_key: participantKey,
              display_name: displayName,
              participant_type: participantType,
              join_time: participant.earliestStartTime ?? null,
              leave_time: participant.latestEndTime ?? null,
              duration_seconds: seconds(participant.earliestStartTime, participant.latestEndTime),
            });
          }

          const { error } = await admin
            .from('meeting_attendance_sessions')
            .upsert(rows, { onConflict: 'google_session_id' });
          if (!error) sessions += rows.length;
        }
      } while (partToken);
    }
  } while (pageToken);

  return {
    conferences,
    sessions,
    message:
      conferences === 0
        ? 'Nenhuma reunião encerrada encontrada no período.'
        : `${conferences} reunião(ões) atualizada(s).`,
  };
}

/**
 * Coleta as reuniões AINDA EM ANDAMENTO (sem hora de término) das últimas
 * `lookbackHours` horas para o usuário informado. Inclui reuniões instantâneas.
 * Sessões sem `leave_time` significam "pessoa online agora".
 */
export async function collectLiveMeetAttendance(
  userId: string,
  lookbackHours = 12,
): Promise<{ live: number; message: string }> {
  const key = await getConnectionKeyForUser(userId, GOOGLE_CONNECTOR_ID);
  if (!key) return { live: 0, message: 'Conta do Google não conectada.' };

  const { supabaseAdmin: admin } = await import('@/integrations/supabase/client.server');

  const since = new Date(Date.now() - Math.max(1, lookbackHours) * 3600 * 1000);
  const filter = encodeURIComponent(`start_time>="${since.toISOString()}"`);

  const listRes = await meetApi(key, `/conferenceRecords?pageSize=50&filter=${filter}`);
  if (!listRes.ok) {
    const detail =
      typeof listRes.body === 'string'
        ? listRes.body.slice(0, 200)
        : (listRes.body?.error?.message ?? `HTTP ${listRes.status}`);
    return { live: 0, message: `Não foi possível ler as reuniões ao vivo: ${detail}` };
  }

  const records = ((listRes.body?.conferenceRecords ?? []) as any[]).filter((r) => !r.endTime);
  let live = 0;

  for (const record of records) {
    const recordName: string = record.name;
    if (!recordName) continue;

    let meetCode: string | null = null;
    if (record.space) {
      const spaceRes = await meetApi(key, `/${record.space}`);
      meetCode = spaceRes.ok ? (spaceRes.body?.meetingCode ?? null) : null;
    }

    let eventId: string | null = null;
    let title: string | null = null;
    if (meetCode) {
      const { data: event } = await admin
        .from('calendar_events')
        .select('id, title')
        .eq('meet_code', meetCode)
        .order('starts_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      eventId = event?.id ?? null;
      title = event?.title ?? null;
    }

    const { data: conf } = await admin
      .from('meeting_attendance_conferences')
      .upsert(
        {
          google_conference_record: recordName,
          event_id: eventId,
          organizer_user_id: userId,
          meet_code: meetCode,
          title,
          start_time: record.startTime ?? null,
          end_time: null,
          collected_at: new Date().toISOString(),
        },
        { onConflict: 'google_conference_record' },
      )
      .select('id')
      .maybeSingle();
    if (!conf) continue;
    live += 1;

    const partRes = await meetApi(key, `/${recordName}/participants?pageSize=100`);
    if (!partRes.ok) continue;

    for (const participant of (partRes.body?.participants ?? []) as any[]) {
      const partName: string = participant.name;
      if (!partName) continue;
      const displayName =
        participant.signedinUser?.displayName ??
        participant.anonymousUser?.displayName ??
        participant.phoneUser?.displayName ??
        'Participante';
      const participantType = participant.signedinUser
        ? 'signed_in'
        : participant.phoneUser
          ? 'phone'
          : 'anonymous';
      const participantKey: string = participant.signedinUser?.user ?? partName;

      const sesRes = await meetApi(key, `/${partName}/participantSessions?pageSize=100`);
      const rows: any[] = [];
      if (sesRes.ok) {
        for (const session of (sesRes.body?.participantSessions ?? []) as any[]) {
          if (!session.name) continue;
          rows.push({
            conference_id: conf.id,
            google_session_id: session.name,
            participant_key: participantKey,
            display_name: displayName,
            participant_type: participantType,
            join_time: session.startTime ?? null,
            leave_time: session.endTime ?? null,
            duration_seconds: seconds(session.startTime, session.endTime),
          });
        }
      }
      if (!rows.length) {
        rows.push({
          conference_id: conf.id,
          google_session_id: partName,
          participant_key: participantKey,
          display_name: displayName,
          participant_type: participantType,
          join_time: participant.earliestStartTime ?? null,
          leave_time: participant.latestEndTime ?? null,
          duration_seconds: seconds(participant.earliestStartTime, participant.latestEndTime),
        });
      }

      await admin
        .from('meeting_attendance_sessions')
        .upsert(rows, { onConflict: 'google_session_id' });
    }
  }

  return {
    live,
    message: live ? `${live} reunião(ões) em andamento.` : 'Nenhuma reunião em andamento agora.',
  };
}
