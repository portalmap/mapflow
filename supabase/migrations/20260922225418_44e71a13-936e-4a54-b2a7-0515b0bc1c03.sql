CREATE OR REPLACE FUNCTION public.guard_space_responsaveis_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (NEW.account_user_id IS DISTINCT FROM OLD.account_user_id)
     OR (NEW.head_projetos_user_id IS DISTINCT FROM OLD.head_projetos_user_id)
     OR (NEW.head_account_user_id IS DISTINCT FROM OLD.head_account_user_id) THEN
    IF NOT (
      public.is_system_admin(auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.workspace_members wm
        WHERE wm.workspace_id = NEW.workspace_id
          AND wm.user_id = auth.uid()
          AND wm.role = 'admin'::public.workspace_role
      )
    ) THEN
      RAISE EXCEPTION 'Apenas administradores podem alterar os responsáveis do space.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_spaces_guard_responsaveis ON public.spaces;
CREATE TRIGGER trg_spaces_guard_responsaveis
BEFORE UPDATE ON public.spaces
FOR EACH ROW
EXECUTE FUNCTION public.guard_space_responsaveis_update();