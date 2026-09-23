import { createFileRoute } from '@tanstack/react-router';

/**
 * Aviso do Google Agenda: chega quando algo muda na agenda de uma conta
 * conectada (convite recebido, alteração, cancelamento). Validamos canal +
 * token salvos e buscamos só o que mudou.
 */
export const Route = createFileRoute('/api/public/google-calendar/webhook')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const channelId = request.headers.get('x-goog-channel-id');
        const token = request.headers.get('x-goog-channel-token');
        const state = request.headers.get('x-goog-resource-state');
        if (!channelId || !token || channelId.length > 100 || token.length > 200) {
          return new Response('ignored', { status: 200 });
        }

        const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
        const { data: account } = await supabaseAdmin
          .from('calendar_google_accounts')
          .select('user_id, watch_token')
          .eq('watch_channel_id', channelId)
          .maybeSingle();
        const acc = account as { user_id: string; watch_token: string | null } | null;
        if (!acc || !acc.watch_token || acc.watch_token !== token) {
          return new Response('unknown channel', { status: 200 });
        }
        // "sync" é só a confirmação do cadastro do aviso.
        if (state === 'sync') return new Response('ok');

        try {
          const { syncUserGoogleCalendar } = await import('@/lib/googleCalendarSync.server');
          await syncUserGoogleCalendar(acc.user_id);
        } catch (e) {
          console.error('[agenda] webhook sync falhou', e);
        }
        return new Response('ok');
      },
    },
  },
});
