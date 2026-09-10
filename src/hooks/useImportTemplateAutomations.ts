import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { remapAutomationConfig, realMatchesTemplateName, templateNameBase } from '@/lib/templateAutomationMapping';

export interface ImportAutomationsResult {
  imported: number;
  skipped: number;
  warnings: string[];
}

type ImportSource =
  | { kind: 'scope'; scopeType: 'space' | 'folder' | 'list'; scopeId: string; label: string }
  | { kind: 'template'; sourceTemplateId: string; label: string };

interface ImportParams {
  templateId: string;
  source: ImportSource;
  /** Escopos válidos no modelo destino (modelos de pasta/lista não aceitam escopo de Space). */
  allowedScopes?: Array<'space' | 'folder' | 'list'>;
}

interface TemplateStructure {
  folders: { id: string; name: string }[];
  lists: { id: string; name: string; folder_ref_id: string | null; status_template_id: string | null }[];
  statusItems: { id: string; name: string; template_id: string }[];
}

async function loadTemplateStructure(templateId: string): Promise<TemplateStructure> {
  const [foldersRes, listsRes] = await Promise.all([
    supabase.from('space_template_folders').select('id, name').eq('template_id', templateId),
    supabase
      .from('space_template_lists')
      .select('id, name, folder_ref_id, status_template_id')
      .eq('template_id', templateId),
  ]);

  const lists = listsRes.data || [];
  const statusTemplateIds = Array.from(
    new Set(lists.map((l) => l.status_template_id).filter(Boolean) as string[]),
  );

  let statusItems: { id: string; name: string; template_id: string }[] = [];
  if (statusTemplateIds.length > 0) {
    const { data } = await supabase
      .from('status_template_items')
      .select('id, name, template_id')
      .in('template_id', statusTemplateIds);
    statusItems = data || [];
  }

  return { folders: foldersRes.data || [], lists, statusItems };
}

/** Automações reais dentro de um space, pasta ou lista. */
async function loadRealAutomations(scopeType: 'space' | 'folder' | 'list', scopeId: string) {
  const scopeIds: string[] = [scopeId];
  let realFolders: { id: string; name: string }[] = [];
  let realLists: { id: string; name: string; folder_id: string | null }[] = [];

  if (scopeType === 'space') {
    const [foldersRes, listsRes] = await Promise.all([
      supabase.from('folders').select('id, name').eq('space_id', scopeId),
      supabase.from('lists').select('id, name, folder_id').eq('space_id', scopeId),
    ]);
    realFolders = foldersRes.data || [];
    realLists = listsRes.data || [];
  } else if (scopeType === 'folder') {
    const { data: folder } = await supabase.from('folders').select('id, name').eq('id', scopeId).maybeSingle();
    realFolders = folder ? [folder] : [];
    const { data } = await supabase.from('lists').select('id, name, folder_id').eq('folder_id', scopeId);
    realLists = data || [];
  } else {
    const { data } = await supabase.from('lists').select('id, name, folder_id').eq('id', scopeId).maybeSingle();
    realLists = data ? [data] : [];
  }

  scopeIds.push(...realFolders.map((f) => f.id), ...realLists.map((l) => l.id));

  const { data: automations, error } = await supabase
    .from('automations')
    .select('*')
    .in('scope_id', Array.from(new Set(scopeIds)));
  if (error) throw error;

  return { automations: automations || [], realFolders, realLists };
}

export const useImportTemplateAutomations = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      templateId,
      source,
      allowedScopes = ['space', 'folder', 'list'],
    }: ImportParams): Promise<ImportAutomationsResult> => {
      const result: ImportAutomationsResult = { imported: 0, skipped: 0, warnings: [] };
      const target = await loadTemplateStructure(templateId);

      const { data: existing } = await supabase
        .from('space_template_automations')
        .select('trigger, action_type, description')
        .eq('template_id', templateId);
      const existingKeys = new Set(
        (existing || []).map((a) => `${a.trigger}|${a.action_type}|${a.description ?? ''}`),
      );

      type Pending = {
        description: string | null;
        trigger: string;
        action_type: string;
        action_config: Record<string, unknown>;
        scope_type: 'space' | 'folder' | 'list';
        folder_ref_id: string | null;
        list_ref_id: string | null;
      };
      const pending: Pending[] = [];

      if (source.kind === 'scope') {
        const { automations, realFolders, realLists } = await loadRealAutomations(
          source.scopeType,
          source.scopeId,
        );

        if (automations.length === 0) {
          throw new Error('Nenhuma automação encontrada na origem selecionada.');
        }

        // real -> modelo
        const listIdMap: Record<string, string> = {};
        for (const real of realLists) {
          const match = target.lists.find((t) => realMatchesTemplateName(t.name, real.name));
          if (match) listIdMap[real.id] = match.id;
        }
        const folderIdMap: Record<string, string> = {};
        for (const real of realFolders) {
          const match = target.folders.find((t) => realMatchesTemplateName(t.name, real.name));
          if (match) folderIdMap[real.id] = match.id;
        }

        // status reais das listas -> itens do modelo de status (por nome)
        const realListIds = realLists.map((l) => l.id);
        let realStatuses: { id: string; name: string; scope_id: string | null }[] = [];
        if (realListIds.length > 0) {
          const { data } = await supabase
            .from('statuses')
            .select('id, name, scope_id')
            .in('scope_id', realListIds);
          realStatuses = data || [];
        }
        const statusIdMap: Record<string, string> = {};
        for (const status of realStatuses) {
          const templateListId = status.scope_id ? listIdMap[status.scope_id] : undefined;
          const templateList = target.lists.find((l) => l.id === templateListId);
          const candidates = templateList?.status_template_id
            ? target.statusItems.filter((i) => i.template_id === templateList.status_template_id)
            : target.statusItems;
          const match = candidates.find((i) => i.name.trim().toLowerCase() === status.name.trim().toLowerCase());
          if (match) statusIdMap[status.id] = match.id;
        }

        for (const automation of automations) {
          const key = `${automation.trigger}|${automation.action_type}|${automation.description ?? ''}`;
          if (existingKeys.has(key)) {
            result.skipped++;
            continue;
          }

          let scopeType: 'space' | 'folder' | 'list' = 'space';
          let folderRefId: string | null = null;
          let listRefId: string | null = null;

          if (automation.scope_type === 'list') {
            listRefId = automation.scope_id ? listIdMap[automation.scope_id] ?? null : null;
            if (!listRefId) {
              result.warnings.push(
                `"${automation.description || automation.trigger}": a lista de origem não existe neste modelo — importada como automação do Space.`,
              );
            } else {
              scopeType = 'list';
            }
          } else if (automation.scope_type === 'folder') {
            folderRefId = automation.scope_id ? folderIdMap[automation.scope_id] ?? null : null;
            if (folderRefId) scopeType = 'folder';
            else
              result.warnings.push(
                `"${automation.description || automation.trigger}": a pasta de origem não existe neste modelo — importada como automação do Space.`,
              );
          }

          const config = remapAutomationConfig(
            automation.action_config as Record<string, unknown>,
            listIdMap,
            statusIdMap,
          );

          pending.push({
            description: automation.description,
            trigger: automation.trigger,
            action_type: automation.action_type,
            action_config: config,
            scope_type: scopeType,
            folder_ref_id: folderRefId,
            list_ref_id: listRefId,
          });
          existingKeys.add(key);
        }
      } else {
        const sourceStructure = await loadTemplateStructure(source.sourceTemplateId);
        const { data: sourceAutomations, error } = await supabase
          .from('space_template_automations')
          .select('*')
          .eq('template_id', source.sourceTemplateId);
        if (error) throw error;
        if (!sourceAutomations || sourceAutomations.length === 0) {
          throw new Error('O modelo de origem não possui automações.');
        }

        const listIdMap: Record<string, string> = {};
        for (const src of sourceStructure.lists) {
          const match = target.lists.find((t) => templateNameBase(t.name) === templateNameBase(src.name));
          if (match) listIdMap[src.id] = match.id;
        }
        const folderIdMap: Record<string, string> = {};
        for (const src of sourceStructure.folders) {
          const match = target.folders.find((t) => templateNameBase(t.name) === templateNameBase(src.name));
          if (match) folderIdMap[src.id] = match.id;
        }
        const statusIdMap: Record<string, string> = {};
        for (const src of sourceStructure.statusItems) {
          const match = target.statusItems.find(
            (t) => t.name.trim().toLowerCase() === src.name.trim().toLowerCase(),
          );
          if (match) statusIdMap[src.id] = match.id;
        }

        for (const automation of sourceAutomations) {
          const key = `${automation.trigger}|${automation.action_type}|${automation.description ?? ''}`;
          if (existingKeys.has(key)) {
            result.skipped++;
            continue;
          }

          let scopeType = automation.scope_type as 'space' | 'folder' | 'list';
          let folderRefId: string | null = null;
          let listRefId: string | null = null;

          if (scopeType === 'list') {
            listRefId = automation.list_ref_id ? listIdMap[automation.list_ref_id] ?? null : null;
            if (!listRefId) {
              scopeType = 'space';
              result.warnings.push(
                `"${automation.description || automation.trigger}": a lista do modelo de origem não existe aqui — importada como automação do Space.`,
              );
            }
          } else if (scopeType === 'folder') {
            folderRefId = automation.folder_ref_id ? folderIdMap[automation.folder_ref_id] ?? null : null;
            if (!folderRefId) {
              scopeType = 'space';
              result.warnings.push(
                `"${automation.description || automation.trigger}": a pasta do modelo de origem não existe aqui — importada como automação do Space.`,
              );
            }
          }

          pending.push({
            description: automation.description,
            trigger: automation.trigger,
            action_type: automation.action_type,
            action_config: remapAutomationConfig(
              automation.action_config as Record<string, unknown>,
              listIdMap,
              statusIdMap,
            ),
            scope_type: scopeType,
            folder_ref_id: folderRefId,
            list_ref_id: listRefId,
          });
          existingKeys.add(key);
        }
      }

      // Modelos de pasta/lista não aceitam escopo de Space: converte para o escopo disponível.
      if (!allowedScopes.includes('space')) {
        for (const p of pending) {
          if (allowedScopes.includes(p.scope_type)) continue;
          if (allowedScopes.includes('folder') && target.folders.length > 0) {
            p.scope_type = 'folder';
            p.folder_ref_id = target.folders[0].id;
            p.list_ref_id = null;
          } else if (target.lists.length > 0) {
            p.scope_type = 'list';
            p.list_ref_id = p.list_ref_id ?? target.lists[0].id;
            p.folder_ref_id = null;
          }
        }
      }

      if (pending.length > 0) {
        const { error } = await supabase.from('space_template_automations').insert(
          pending.map((p) => ({
            template_id: templateId,
            description: p.description,
            trigger: p.trigger as never,
            action_type: p.action_type as never,
            action_config: p.action_config as never,
            scope_type: p.scope_type as never,
            folder_ref_id: p.folder_ref_id,
            list_ref_id: p.list_ref_id,
            enabled: true,
          })),
        );
        if (error) throw error;
        result.imported = pending.length;
      }

      return result;
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['template-automations', variables.templateId] });
      queryClient.invalidateQueries({ queryKey: ['space-template', variables.templateId] });
      if (result.imported === 0) {
        toast.info('Nenhuma automação nova para importar (todas já existiam no modelo).');
      } else if (result.warnings.length > 0) {
        toast.warning(`${result.imported} automação(ões) importada(s) com ${result.warnings.length} aviso(s).`);
      } else {
        toast.success(`${result.imported} automação(ões) importada(s) para o modelo!`);
      }
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Erro ao importar automações');
      console.error(error);
    },
  });
};
