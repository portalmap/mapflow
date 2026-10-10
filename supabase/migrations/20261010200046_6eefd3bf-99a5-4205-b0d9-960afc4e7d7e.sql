DROP FUNCTION IF EXISTS public.expire_old_invitations();
DROP TABLE IF EXISTS public.user_invitations;

CREATE OR REPLACE FUNCTION public.list_users_available_for_workspace(_workspace_id uuid)
RETURNS TABLE(id uuid, full_name text, email text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT (public.user_is_workspace_admin(auth.uid(), _workspace_id) OR public.is_global_owner(auth.uid())) THEN
    RAISE EXCEPTION 'Sem permissão para liberar acesso';
  END IF;
  RETURN QUERY
    SELECT p.id, p.full_name::text, p.email::text
    FROM public.profiles p
    WHERE NOT EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = _workspace_id AND wm.user_id = p.id
    )
    ORDER BY coalesce(p.full_name, p.email);
END;
$$;
REVOKE ALL ON FUNCTION public.list_users_available_for_workspace(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.list_users_available_for_workspace(uuid) TO authenticated;