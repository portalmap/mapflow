import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InvitationRequest {
  workspaceId: string;
  email: string;
  role: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Verificar autenticação
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      throw new Error('Não autenticado');
    }

    const { workspaceId, email, role }: InvitationRequest = await req.json();

    console.log('Criando convite:', { workspaceId, email, role, userId: user.id });

    // Criar convite no banco de dados
    const { data: invitation, error: inviteError } = await supabaseClient
      .from('user_invitations')
      .insert({
        workspace_id: workspaceId,
        email: email.toLowerCase().trim(),
        role,
        invited_by_user_id: user.id,
      })
      .select()
      .single();

    if (inviteError) {
      console.error('Erro ao criar convite:', inviteError);
      throw inviteError;
    }

    console.log('Convite criado com sucesso:', invitation.id);

    // Buscar informações do workspace
    const { data: workspace } = await supabaseClient
      .from('workspaces')
      .select('name')
      .eq('id', workspaceId)
      .single();

    // URL do convite
    const appUrl = (Deno.env.get('PUBLIC_APP_URL') ?? 'https://flow.assessoriamap.com.br').replace(/\/+$/, '');
    const inviteUrl = `${appUrl}/accept-invite/${invitation.token}`;

    console.log('URL do convite gerado:', inviteUrl);

    // TODO: Integrar com serviço de email (Resend, SendGrid, etc)
    // Por enquanto, apenas retornamos o token e URL
    
    return new Response(
      JSON.stringify({
        success: true,
        invitation: {
          id: invitation.id,
          token: invitation.token,
          inviteUrl,
          email: invitation.email,
          role: invitation.role,
          workspaceName: workspace?.name,
        },
        message: 'Convite criado com sucesso. URL do convite gerado.',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Erro:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});