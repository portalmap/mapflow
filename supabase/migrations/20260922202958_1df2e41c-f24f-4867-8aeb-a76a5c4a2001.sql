CREATE OR REPLACE FUNCTION public.apply_task_creation_automations(p_task_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_task record;
  v_list record;
  v_scope_ids uuid[];
  v_auto record;
  v_user_id uuid;
BEGIN
  SELECT id, workspace_id, list_id INTO v_task
  FROM public.tasks WHERE id = p_task_id;
  IF v_task.id IS NULL OR v_task.list_id IS NULL THEN
    RETURN;
  END IF;

  SELECT id, space_id, folder_id INTO v_list
  FROM public.lists WHERE id = v_task.list_id;
  IF v_list.id IS NULL THEN
    RETURN;
  END IF;

  v_scope_ids := ARRAY[v_task.workspace_id, v_list.space_id, v_list.id];
  IF v_list.folder_id IS NOT NULL THEN
    v_scope_ids := v_scope_ids || v_list.folder_id;
  END IF;

  FOR v_auto IN
    SELECT a.*
    FROM public.automations a
    WHERE a.enabled = true
      AND a.workspace_id = v_task.workspace_id
      AND a.action_type IN ('auto_assign_user','auto_add_follower','remove_all_assignees')
      AND (
        (a.scope_type = 'workspace' AND a.scope_id IS NULL)
        OR (a.scope_id IS NOT NULL AND a.scope_id = ANY(v_scope_ids))
      )
      AND (
        a.trigger::text IN ('on_task_created','on_task_moved_here','on_task_added_here')
        OR EXISTS (
          SELECT 1
          FROM jsonb_array_elements_text(
            CASE
              WHEN jsonb_typeof(a.action_config -> 'or_triggers') = 'array'
                THEN a.action_config -> 'or_triggers'
              ELSE '[]'::jsonb
            END
          ) t(val)
          WHERE t.val IN ('on_task_created','on_task_moved_here','on_task_added_here')
        )
      )
    ORDER BY a.created_at
  LOOP
    IF v_auto.action_type = 'remove_all_assignees' THEN
      DELETE FROM public.task_assignees WHERE task_id = p_task_id;

    ELSIF v_auto.action_type = 'auto_assign_user' THEN
      FOR v_user_id IN
        SELECT val::uuid FROM jsonb_array_elements_text(
          CASE
            WHEN jsonb_typeof(v_auto.action_config -> 'user_ids') = 'array'
              THEN v_auto.action_config -> 'user_ids'
            WHEN v_auto.action_config ->> 'user_id' IS NOT NULL
              THEN jsonb_build_array(v_auto.action_config ->> 'user_id')
            ELSE '[]'::jsonb
          END
        ) t(val)
      LOOP
        INSERT INTO public.task_assignees (task_id, user_id, source_type, source_id)
        VALUES (p_task_id, v_user_id, v_auto.scope_type::text, COALESCE(v_auto.scope_id, v_auto.workspace_id))
        ON CONFLICT (task_id, user_id) DO NOTHING;
      END LOOP;

    ELSIF v_auto.action_type = 'auto_add_follower' THEN
      FOR v_user_id IN
        SELECT val::uuid FROM jsonb_array_elements_text(
          CASE
            WHEN jsonb_typeof(v_auto.action_config -> 'user_ids') = 'array'
              THEN v_auto.action_config -> 'user_ids'
            WHEN v_auto.action_config ->> 'user_id' IS NOT NULL
              THEN jsonb_build_array(v_auto.action_config ->> 'user_id')
            ELSE '[]'::jsonb
          END
        ) t(val)
      LOOP
        INSERT INTO public.task_followers (task_id, user_id, source_type, source_id)
        VALUES (p_task_id, v_user_id, v_auto.scope_type::text, COALESCE(v_auto.scope_id, v_auto.workspace_id))
        ON CONFLICT (task_id, user_id) DO NOTHING;
      END LOOP;
    END IF;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_apply_task_creation_automations()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  BEGIN
    PERFORM public.apply_task_creation_automations(NEW.id);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'apply_task_creation_automations failed for task %: %', NEW.id, SQLERRM;
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tasks_apply_automations ON public.tasks;
CREATE TRIGGER trg_tasks_apply_automations
AFTER INSERT ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.trg_apply_task_creation_automations();

GRANT EXECUTE ON FUNCTION public.apply_task_creation_automations(uuid) TO authenticated, service_role;