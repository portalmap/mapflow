CREATE TABLE public.automation_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_by_user_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  color text DEFAULT '#6366f1',
  target_type text NOT NULL,
  source_space_template_id uuid REFERENCES public.space_templates(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT automation_templates_target_type_check CHECK (target_type IN ('space', 'folder', 'list')),
  CONSTRAINT automation_templates_source_type_unique UNIQUE NULLS NOT DISTINCT (workspace_id, source_space_template_id, target_type)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.automation_templates TO authenticated;
GRANT ALL ON public.automation_templates TO service_role;

ALTER TABLE public.automation_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view automation templates"
ON public.automation_templates
FOR SELECT TO authenticated
USING (
  public.user_is_workspace_member(auth.uid(), workspace_id)
  OR public.is_app_admin(auth.uid())
);

CREATE POLICY "Workspace admins can create automation templates"
ON public.automation_templates
FOR INSERT TO authenticated
WITH CHECK (
  created_by_user_id = auth.uid()
  AND (
    public.is_workspace_admin(auth.uid(), workspace_id)
    OR public.is_app_admin(auth.uid())
  )
);

CREATE POLICY "Workspace admins can update automation templates"
ON public.automation_templates
FOR UPDATE TO authenticated
USING (
  public.is_workspace_admin(auth.uid(), workspace_id)
  OR public.is_app_admin(auth.uid())
)
WITH CHECK (
  public.is_workspace_admin(auth.uid(), workspace_id)
  OR public.is_app_admin(auth.uid())
);

CREATE POLICY "Workspace admins can delete automation templates"
ON public.automation_templates
FOR DELETE TO authenticated
USING (
  public.is_workspace_admin(auth.uid(), workspace_id)
  OR public.is_app_admin(auth.uid())
);

CREATE TABLE public.automation_template_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_template_id uuid NOT NULL REFERENCES public.automation_templates(id) ON DELETE CASCADE,
  description text,
  trigger public.automation_trigger NOT NULL DEFAULT 'on_task_created',
  action_type public.automation_action NOT NULL,
  action_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  enabled boolean NOT NULL DEFAULT true,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.automation_template_rules TO authenticated;
GRANT ALL ON public.automation_template_rules TO service_role;

ALTER TABLE public.automation_template_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view automation template rules"
ON public.automation_template_rules
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.automation_templates template
    WHERE template.id = automation_template_id
      AND (
        public.user_is_workspace_member(auth.uid(), template.workspace_id)
        OR public.is_app_admin(auth.uid())
      )
  )
);

CREATE POLICY "Workspace admins can create automation template rules"
ON public.automation_template_rules
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.automation_templates template
    WHERE template.id = automation_template_id
      AND (
        public.is_workspace_admin(auth.uid(), template.workspace_id)
        OR public.is_app_admin(auth.uid())
      )
  )
);

CREATE POLICY "Workspace admins can update automation template rules"
ON public.automation_template_rules
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.automation_templates template
    WHERE template.id = automation_template_id
      AND (
        public.is_workspace_admin(auth.uid(), template.workspace_id)
        OR public.is_app_admin(auth.uid())
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.automation_templates template
    WHERE template.id = automation_template_id
      AND (
        public.is_workspace_admin(auth.uid(), template.workspace_id)
        OR public.is_app_admin(auth.uid())
      )
  )
);

CREATE POLICY "Workspace admins can delete automation template rules"
ON public.automation_template_rules
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.automation_templates template
    WHERE template.id = automation_template_id
      AND (
        public.is_workspace_admin(auth.uid(), template.workspace_id)
        OR public.is_app_admin(auth.uid())
      )
  )
);

CREATE INDEX automation_templates_workspace_type_idx
ON public.automation_templates(workspace_id, target_type, name);

CREATE INDEX automation_template_rules_template_order_idx
ON public.automation_template_rules(automation_template_id, order_index, created_at);

CREATE TRIGGER automation_templates_set_updated_at
BEFORE UPDATE ON public.automation_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER automation_template_rules_set_updated_at
BEFORE UPDATE ON public.automation_template_rules
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();