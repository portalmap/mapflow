CREATE OR REPLACE FUNCTION public.can_manage_followers(_workspace_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT public.is_workspace_admin(auth.uid(), _workspace_id) OR public.is_global_owner(auth.uid()) OR public.is_system_admin(auth.uid())
$$;

DROP POLICY IF EXISTS "Members can remove space followers" ON public.space_followers;
CREATE POLICY "Admins can remove space followers" ON public.space_followers FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM spaces s WHERE s.id=space_followers.space_id AND public.can_manage_followers(s.workspace_id)));

DROP POLICY IF EXISTS "Members can remove folder followers" ON public.folder_followers;
CREATE POLICY "Admins can remove folder followers" ON public.folder_followers FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM folders f JOIN spaces s ON s.id=f.space_id WHERE f.id=folder_followers.folder_id AND public.can_manage_followers(s.workspace_id)));

DROP POLICY IF EXISTS "Members can remove list followers" ON public.list_followers;
CREATE POLICY "Admins can remove list followers" ON public.list_followers FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM lists l JOIN spaces s ON s.id=l.space_id WHERE l.id=list_followers.list_id AND public.can_manage_followers(s.workspace_id)));

DROP POLICY IF EXISTS "Members can remove task followers" ON public.task_followers;
CREATE POLICY "Admins can remove task followers" ON public.task_followers FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM tasks t WHERE t.id=task_followers.task_id AND public.can_manage_followers(t.workspace_id)));

-- Account do Space vira seguidor
CREATE OR REPLACE FUNCTION public.sync_space_account_follower()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF TG_OP='UPDATE' AND OLD.account_user_id IS NOT NULL AND OLD.account_user_id IS DISTINCT FROM NEW.account_user_id THEN
    DELETE FROM space_followers WHERE space_id=NEW.id AND user_id=OLD.account_user_id;
  END IF;
  IF NEW.account_user_id IS NOT NULL AND (TG_OP='INSERT' OR OLD.account_user_id IS DISTINCT FROM NEW.account_user_id) THEN
    IF NOT EXISTS (SELECT 1 FROM space_followers WHERE space_id=NEW.id AND user_id=NEW.account_user_id) THEN
      INSERT INTO space_followers(space_id,user_id) VALUES (NEW.id, NEW.account_user_id);
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_spaces_account_follower ON public.spaces;
CREATE TRIGGER trg_spaces_account_follower AFTER INSERT OR UPDATE OF account_user_id ON public.spaces
FOR EACH ROW EXECUTE FUNCTION public.sync_space_account_follower();

-- Impede remover o Account como seguidor (só trocando o Account)
CREATE OR REPLACE FUNCTION public.guard_space_account_follower_delete()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM spaces WHERE id=OLD.space_id AND account_user_id=OLD.user_id) THEN
    RAISE EXCEPTION 'O Account do Space é seguidor obrigatório. Troque o Account para removê-lo.';
  END IF;
  RETURN OLD;
END $$;
DROP TRIGGER IF EXISTS trg_space_followers_guard_account ON public.space_followers;
CREATE TRIGGER trg_space_followers_guard_account BEFORE DELETE ON public.space_followers
FOR EACH ROW EXECUTE FUNCTION public.guard_space_account_follower_delete();

-- Backfill
INSERT INTO public.space_followers(space_id,user_id)
SELECT s.id, s.account_user_id FROM public.spaces s
WHERE s.account_user_id IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM public.space_followers f WHERE f.space_id=s.id AND f.user_id=s.account_user_id);