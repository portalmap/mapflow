import { createServerFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

const CONNECTOR_ID = 'google_calendar';

/** Starts the per-user Google consent flow and returns the authorization URL. */
export const startGoogleCalendarConnect = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const clientApiKey = process.env['GOOGLE_CALENDAR_APP_USER_CONNECTOR_CLIENT_API_KEY'];
    if (!clientApiKey) {
      throw new Error('A integração com o Google ainda não foi configurada neste projeto.');
    }

    const { authorizeAppUserOAuth, GATEWAY_BASE_URL } = await import(
      '@/integrations/lovable/appUserConnector.server'
    );
    const { getConnectionKeyForUser } = await import('@/lib/appUserConnections.server');
    const { GOOGLE_SCOPES } = await import('@/lib/googleCalendarSync.server');

    const request = getRequest();
    if (!request) throw new Error('A conexão precisa iniciar a partir do aplicativo.');
    const url = new URL(request.url);
    const sandboxHost = url.hostname === 'localhost' ? request.headers.get('x-forwarded-host') : null;
    const returnUrl = new URL(
      '/oauth/google-calendar/return',
      sandboxHost ? `https://${sandboxHost}` : url.origin,
    ).toString();

    const existingKey = await getConnectionKeyForUser(context.userId, CONNECTOR_ID);

    const { authorizationUrl } = await authorizeAppUserOAuth({
      gatewayBaseUrl: GATEWAY_BASE_URL,
      connectorId: CONNECTOR_ID,
      appUserId: context.userId,
      clientAPIKey: clientApiKey,
      returnUrl,
      connectionAPIKey: existingKey ?? undefined,
      credentialsConfiguration: { scopes: GOOGLE_SCOPES },
    });

    return { authorizationUrl };
  });

/** Exchanges the one-time code for the per-user connection key and stores it. */
export const completeGoogleCalendarConnection = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { code: string }) => {
    if (!input?.code || typeof input.code !== 'string') throw new Error('Código inválido');
    return input;
  })
  .handler(async ({ data, context }) => {
    const { exchangeAppUserOAuthCode, GATEWAY_BASE_URL } = await import(
      '@/integrations/lovable/appUserConnector.server'
    );
    const { getConnectionKeyForUser, saveConnectionKeyForUser } = await import(
      '@/lib/appUserConnections.server'
    );

    let exchanged: { connectionAPIKey: string; connectorId: string };
    try {
      exchanged = await exchangeAppUserOAuthCode(GATEWAY_BASE_URL, data.code);
    } catch (error) {
      // Código de uso único já consumido (ex.: F5 na tela de retorno): se a conexão
      // já está salva, tratamos como sucesso em vez de erro.
      const already = await getConnectionKeyForUser(context.userId, CONNECTOR_ID);
      if (already) return { ok: true, alreadyConnected: true };
      const detail = error instanceof Error ? error.message : String(error);
      throw new Error(`Falha ao concluir a autorização do Google: ${detail}`);
    }
    const { connectionAPIKey, connectorId } = exchanged;
    if (connectorId !== CONNECTOR_ID) {
      throw new Error('A autorização retornou um serviço diferente do esperado.');
    }
    await saveConnectionKeyForUser(context.userId, connectorId, connectionAPIKey);

    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    await supabaseAdmin.from('calendar_google_accounts').upsert(
      {
        user_id: context.userId,
        status: 'online',
        last_error: null,
        sync_token: null,
        connected_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    );

    // A sincronização acontece depois, na Agenda, para não travar esta etapa.
    return { ok: true, alreadyConnected: false };
  });

/** Current user's Google connection status. */
export const getMyGoogleCalendarStatus = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { getConnectionKeyForUser } = await import('@/lib/appUserConnections.server');
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');

    const hasKey = !!(await getConnectionKeyForUser(context.userId, CONNECTOR_ID));
    const { data } = await supabaseAdmin
      .from('calendar_google_accounts')
      .select('google_email, status, last_synced_at, last_error')
      .eq('user_id', context.userId)
      .maybeSingle();

    return {
      connected: hasKey,
      googleEmail: data?.google_email ?? null,
      status: hasKey ? (data?.status ?? 'online') : 'disconnected',
      lastSyncedAt: data?.last_synced_at ?? null,
      lastError: data?.last_error ?? null,
    };
  });

/** Runs a two-way sync for the signed-in user. */
export const syncMyGoogleCalendar = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { syncUserGoogleCalendar } = await import('@/lib/googleCalendarSync.server');
    return syncUserGoogleCalendar(context.userId);
  });

/** Admin view: every user with a Google connection. */
export const listGoogleCalendarAccounts = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isGlobalOwner } = await context.supabase.rpc('is_global_owner', {
      _user_id: context.userId,
    });
    const { data: isSystemAdmin } = await context.supabase.rpc('is_system_admin', {
      _user_id: context.userId,
    });
    if (!isGlobalOwner && !isSystemAdmin) throw new Error('Acesso restrito');

    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { data: accounts } = await supabaseAdmin
      .from('calendar_google_accounts')
      .select('user_id, google_email, status, last_synced_at, last_error, connected_at')
      .order('connected_at', { ascending: false });

    const { data: connections } = await supabaseAdmin
      .from('app_user_connections')
      .select('user_id')
      .eq('connector_id', CONNECTOR_ID);
    const withKey = new Set((connections ?? []).map((c) => c.user_id));

    const ids = (accounts ?? []).map((a) => a.user_id);
    const { data: profiles } = ids.length
      ? await supabaseAdmin.from('profiles').select('id, full_name, avatar_url').in('id', ids)
      : { data: [] as { id: string; full_name: string | null; avatar_url: string | null }[] };

    return (accounts ?? []).map((a) => {
      const profile = (profiles ?? []).find((p) => p.id === a.user_id);
      return {
        userId: a.user_id,
        fullName: profile?.full_name ?? null,
        avatarUrl: profile?.avatar_url ?? null,
        googleEmail: a.google_email,
        status: withKey.has(a.user_id) ? a.status : 'offline',
        lastSyncedAt: a.last_synced_at,
        lastError: a.last_error,
        connectedAt: a.connected_at,
      };
    });
  });

/** Admin action: disconnect another user's Google account. */
export const disconnectGoogleCalendarAccount = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string }) => {
    if (!input?.userId) throw new Error('Usuário inválido');
    return input;
  })
  .handler(async ({ data, context }) => {
    const { data: isGlobalOwner } = await context.supabase.rpc('is_global_owner', {
      _user_id: context.userId,
    });
    const { data: isSystemAdmin } = await context.supabase.rpc('is_system_admin', {
      _user_id: context.userId,
    });
    if (!isGlobalOwner && !isSystemAdmin) throw new Error('Acesso restrito');

    const { getConnectionKeyForUser, deleteConnectionKeyForUser } = await import(
      '@/lib/appUserConnections.server'
    );
    const { disconnectAppUser, GATEWAY_BASE_URL } = await import(
      '@/integrations/lovable/appUserConnector.server'
    );

    const key = await getConnectionKeyForUser(data.userId, CONNECTOR_ID);
    if (key) {
      try {
        await disconnectAppUser({
          gatewayBaseUrl: GATEWAY_BASE_URL,
          connectionAPIKey: key,
          connectorId: CONNECTOR_ID,
        });
      } catch {
        /* segue com a limpeza local */
      }
      await deleteConnectionKeyForUser(data.userId, CONNECTOR_ID);
    }

    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    await supabaseAdmin.from('calendar_google_accounts').delete().eq('user_id', data.userId);

    // A Agenda é um espelho do Google: sem conexão, nada do Google fica salvo aqui.
    const { data: googleEvents } = await supabaseAdmin
      .from('calendar_events')
      .select('id')
      .eq('user_id', data.userId)
      .eq('source', 'google');

    const ids = (googleEvents ?? []).map((e) => e.id);
    if (ids.length) {
      await supabaseAdmin.from('calendar_event_guests').delete().in('event_id', ids);
      await supabaseAdmin.from('calendar_event_reminders').delete().in('event_id', ids);
      await supabaseAdmin.from('calendar_events').delete().in('id', ids);
    }

    return { ok: true, removed: ids.length, kept: 0 };

  });

/** Envia ao Google a resposta (Sim/Não/Talvez) do usuário para um compromisso. */
export const respondCalendarInvite = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { eventId: string; status: 'accepted' | 'declined' | 'tentative' }) => {
    if (!input?.eventId) throw new Error('Compromisso inválido');
    if (!['accepted', 'declined', 'tentative'].includes(input.status)) {
      throw new Error('Resposta inválida');
    }
    return input;
  })
  .handler(async ({ data, context }) => {
    // A leitura passa pelo cliente do usuário: as regras de acesso já garantem
    // que ele só responde a compromissos que pode ver.
    const { data: event, error } = await context.supabase
      .from('calendar_events')
      .select('id')
      .eq('id', data.eventId)
      .maybeSingle();
    if (error || !event) throw new Error('Compromisso não encontrado');

    const { pushRsvpToGoogle } = await import('@/lib/googleCalendarSync.server');
    return pushRsvpToGoogle(context.userId, data.eventId, data.status);
  });
