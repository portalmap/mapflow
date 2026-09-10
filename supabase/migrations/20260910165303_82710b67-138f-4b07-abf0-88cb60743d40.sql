REVOKE ALL ON FUNCTION public.mark_notifications_read_for_reference(text, uuid, uuid[]) FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.notif_resolve_task_notifications(uuid) FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.notif_resolve_on_task_comment_resolved() FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.notif_resolve_on_chat_message_resolved() FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.notif_resolve_on_task_closed() FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.notif_resolve_on_task_deleted() FROM anon, authenticated, public;