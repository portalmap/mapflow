-- Módulo de notificações: resolver avisos quando o item de origem é resolvido

CREATE OR REPLACE FUNCTION public.mark_notifications_read_for_reference(
  _reference_type text,
  _reference_id uuid,
  _user_ids uuid[]
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.notifications
  SET is_read = true
  WHERE is_read = false
    AND reference_type = _reference_type
    AND reference_id = _reference_id
    AND user_id = ANY(_user_ids);
$$;

-- 1) Comentário de tarefa resolvido
CREATE OR REPLACE FUNCTION public.notif_resolve_on_task_comment_resolved()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  remaining int;
BEGIN
  IF OLD.resolved_at IS NULL AND NEW.resolved_at IS NOT NULL AND NEW.assignee_id IS NOT NULL THEN
    PERFORM public.mark_notifications_read_for_reference('comment', NEW.id, ARRAY[NEW.assignee_id]);

    SELECT count(*) INTO remaining
    FROM public.task_comments
    WHERE task_id = NEW.task_id
      AND assignee_id = NEW.assignee_id
      AND resolved_at IS NULL;

    IF remaining = 0 THEN
      UPDATE public.notifications
      SET is_read = true
      WHERE is_read = false
        AND user_id = NEW.assignee_id
        AND reference_type = 'task'
        AND reference_id = NEW.task_id
        AND type IN ('comment_assigned', 'comment_assignment');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notif_resolve_task_comment ON public.task_comments;
CREATE TRIGGER trg_notif_resolve_task_comment
AFTER UPDATE OF resolved_at ON public.task_comments
FOR EACH ROW EXECUTE FUNCTION public.notif_resolve_on_task_comment_resolved();

-- 2) Mensagem de chat resolvida
CREATE OR REPLACE FUNCTION public.notif_resolve_on_chat_message_resolved()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.resolved_at IS NULL AND NEW.resolved_at IS NOT NULL AND NEW.assignee_id IS NOT NULL THEN
    PERFORM public.mark_notifications_read_for_reference('chat_message', NEW.id, ARRAY[NEW.assignee_id]);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notif_resolve_chat_message ON public.chat_messages;
CREATE TRIGGER trg_notif_resolve_chat_message
AFTER UPDATE OF resolved_at ON public.chat_messages
FOR EACH ROW EXECUTE FUNCTION public.notif_resolve_on_chat_message_resolved();

-- 3) Tarefa concluída / arquivada / excluída
CREATE OR REPLACE FUNCTION public.notif_resolve_task_notifications(_task_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.notifications n
  SET is_read = true
  WHERE n.is_read = false
    AND n.reference_type = 'task'
    AND n.reference_id = _task_id
    AND EXISTS (
      SELECT 1 FROM public.task_assignees ta
      WHERE ta.task_id = _task_id AND ta.user_id = n.user_id
    );
$$;

CREATE OR REPLACE FUNCTION public.notif_resolve_on_task_closed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (OLD.completed_at IS NULL AND NEW.completed_at IS NOT NULL)
     OR (OLD.archived_at IS NULL AND NEW.archived_at IS NOT NULL) THEN
    PERFORM public.notif_resolve_task_notifications(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notif_resolve_task_closed ON public.tasks;
CREATE TRIGGER trg_notif_resolve_task_closed
AFTER UPDATE ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.notif_resolve_on_task_closed();

CREATE OR REPLACE FUNCTION public.notif_resolve_on_task_deleted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.notif_resolve_task_notifications(OLD.id);
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_notif_resolve_task_deleted ON public.tasks;
CREATE TRIGGER trg_notif_resolve_task_deleted
BEFORE DELETE ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.notif_resolve_on_task_deleted();