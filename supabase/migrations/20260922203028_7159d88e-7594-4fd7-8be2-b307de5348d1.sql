REVOKE ALL ON FUNCTION public.apply_task_creation_automations(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.apply_task_creation_automations(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.apply_task_creation_automations(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.apply_task_creation_automations(uuid) TO service_role;

REVOKE ALL ON FUNCTION public.trg_apply_task_creation_automations() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.trg_apply_task_creation_automations() FROM anon;
REVOKE ALL ON FUNCTION public.trg_apply_task_creation_automations() FROM authenticated;