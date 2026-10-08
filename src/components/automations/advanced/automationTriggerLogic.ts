export type AutomationTriggerLogic = 'AND' | 'OR';

interface TriggerLogicConfig {
  or_triggers?: string[];
  trigger_logics?: AutomationTriggerLogic[];
}

/**
 * Gatilhos que continuam verdadeiros depois que acontecem.
 * Eles podem participar de uma sequência com E sem depender da janela em memória.
 */
export const PERSISTENT_AUTOMATION_TRIGGERS = new Set([
  'on_task_created',
]);

/**
 * Avalia E/OU com precedência de E, mantendo automações antigas sem
 * trigger_logics como OU.
 */
export const isAutomationTriggerGroupSatisfied = (
  config: TriggerLogicConfig | null,
  primaryTrigger: string,
  firedEvent: string,
  occurredEvents: string[],
): boolean => {
  const triggers = [primaryTrigger, ...(config?.or_triggers || [])];
  if (triggers.length <= 1) return true;

  const logics = config?.trigger_logics || [];
  if (logics.length === 0 || logics.every((logic) => logic !== 'AND')) return true;

  const groups: string[][] = [];
  let currentGroup: string[] = [triggers[0]];

  for (let index = 1; index < triggers.length; index += 1) {
    if (logics[index - 1] === 'AND') {
      currentGroup.push(triggers[index]);
    } else {
      groups.push(currentGroup);
      currentGroup = [triggers[index]];
    }
  }
  groups.push(currentGroup);

  return groups
    .filter((group) => group.includes(firedEvent))
    .some((group) => group.every((trigger) => occurredEvents.includes(trigger)));
};