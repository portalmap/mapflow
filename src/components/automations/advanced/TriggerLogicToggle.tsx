import { cn } from '@/lib/utils';

interface TriggerLogicToggleProps {
  value: 'AND' | 'OR';
  onChange: (value: 'AND' | 'OR') => void;
}

/**
 * Conector E / OU entre dois gatilhos (ou duas condições) da automação.
 * "E" = ambos precisam acontecer na mesma alteração.
 * "OU" = qualquer um deles dispara.
 */
export const TriggerLogicToggle = ({ value, onChange }: TriggerLogicToggleProps) => (
  <div className="flex items-center justify-center my-1">
    <div className="inline-flex rounded-md border border-primary/30 overflow-hidden">
      {(['AND', 'OR'] as const).map(option => (
        <button
          key={option}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onChange(option);
          }}
          className={cn(
            'px-2 py-0.5 text-[10px] font-semibold transition-colors',
            value === option
              ? 'bg-primary text-primary-foreground'
              : 'bg-background text-muted-foreground hover:bg-accent'
          )}
        >
          {option === 'AND' ? 'E' : 'OU'}
        </button>
      ))}
    </div>
  </div>
);
