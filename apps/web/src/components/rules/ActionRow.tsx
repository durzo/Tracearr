import {
  X,
  AlertTriangle,
  FileText,
  Bell,
  TrendingUp,
  Target,
  RotateCcw,
  XCircle,
  MessageSquare,
} from 'lucide-react';
import type { Action, ActionType } from '@tracearr/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ACTION_DEFINITIONS,
  getAllActionTypes,
  createDefaultAction,
  type ConfigField,
} from '@/lib/rules';
import { cn } from '@/lib/utils';

// Icon mapping
const ACTION_ICONS: Record<ActionType, React.ComponentType<{ className?: string }>> = {
  create_violation: AlertTriangle,
  log_only: FileText,
  notify: Bell,
  adjust_trust: TrendingUp,
  set_trust: Target,
  reset_trust: RotateCcw,
  kill_stream: XCircle,
  message_client: MessageSquare,
};

interface ActionRowProps {
  action: Action;
  onChange: (action: Action) => void;
  onRemove: () => void;
  showRemove?: boolean;
}

export function ActionRow({ action, onChange, onRemove, showRemove = true }: ActionRowProps) {
  const def = ACTION_DEFINITIONS[action.type];

  // Handle action type change
  const handleTypeChange = (newType: ActionType) => {
    onChange(createDefaultAction(newType));
  };

  // Handle config field change
  const handleFieldChange = (fieldName: string, value: unknown) => {
    onChange({
      ...action,
      [fieldName]: value,
    } as Action);
  };

  return (
    <div
      className={cn(
        'rounded-lg border p-4',
        def.color === 'destructive' && 'border-destructive/50 bg-destructive/5',
        def.color === 'warning' && 'border-yellow-500/50 bg-yellow-500/5',
        def.color === 'default' && 'border-border bg-card'
      )}
    >
      <div className="flex items-start gap-4">
        {/* Action Type Selector */}
        <Select value={action.type} onValueChange={handleTypeChange}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Select action" />
          </SelectTrigger>
          <SelectContent className="min-w-[200px]">
            {getAllActionTypes().map((type) => {
              const actionDef = ACTION_DEFINITIONS[type];
              const ActionIcon = ACTION_ICONS[type];
              return (
                <SelectItem key={type} value={type}>
                  <div className="flex items-center gap-2">
                    <ActionIcon className="h-4 w-4" />
                    {actionDef.label}
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>

        {/* Config Fields */}
        <div className="flex flex-1 items-center gap-6">
          {def.configFields.map((field) => (
            <ConfigFieldInput
              key={field.name}
              field={field}
              value={(action as unknown as Record<string, unknown>)[field.name]}
              onChange={(value) => handleFieldChange(field.name, value)}
            />
          ))}
        </div>

        {/* Remove Button */}
        {showRemove && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-destructive h-10 w-10 shrink-0"
            onClick={onRemove}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Description */}
      <p className="text-muted-foreground mt-2 text-xs">{def.description}</p>

      {/* Hint (if present) */}
      {def.hint && (
        <p className="mt-1 flex items-center gap-1 text-xs text-amber-600">
          <AlertTriangle className="h-3 w-3" />
          {def.hint}
        </p>
      )}
    </div>
  );
}

// Config field input component
interface ConfigFieldInputProps {
  field: ConfigField;
  value: unknown;
  onChange: (value: unknown) => void;
}

function ConfigFieldInput({ field, value, onChange }: ConfigFieldInputProps) {
  // Number input
  if (field.type === 'number') {
    return (
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground text-sm whitespace-nowrap">{field.label}:</span>
        <Input
          type="number"
          className="w-20"
          min={field.min}
          max={field.max}
          step={field.step}
          value={(value as number) ?? field.min ?? 0}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        {field.unit && <span className="text-muted-foreground text-sm">{field.unit}</span>}
      </div>
    );
  }

  // Text input
  if (field.type === 'text') {
    return (
      <div className="flex min-w-[200px] flex-1 items-center gap-2">
        <span className="text-muted-foreground text-sm whitespace-nowrap">{field.label}:</span>
        <Input
          type="text"
          placeholder={field.placeholder ?? field.label}
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    );
  }

  // Select input
  if (field.type === 'select') {
    return (
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground text-sm whitespace-nowrap">{field.label}:</span>
        <Select value={(value as string) ?? ''} onValueChange={onChange}>
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Select..." />
          </SelectTrigger>
          <SelectContent>
            {field.options?.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  // Multi-select (for channels)
  if (field.type === 'multi-select') {
    const selectedValues = (value as string[]) ?? [];
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-muted-foreground text-sm">{field.label}:</span>
        {field.options?.map((opt) => {
          const isSelected = selectedValues.includes(opt.value);
          return (
            <Button
              key={opt.value}
              type="button"
              variant={isSelected ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                if (isSelected) {
                  onChange(selectedValues.filter((v) => v !== opt.value));
                } else {
                  onChange([...selectedValues, opt.value]);
                }
              }}
            >
              {opt.label}
            </Button>
          );
        })}
      </div>
    );
  }

  // Slider
  if (field.type === 'slider') {
    const numValue = (value as number) ?? 50;
    return (
      <div className="flex min-w-[200px] flex-1 items-center gap-3">
        <span className="text-muted-foreground text-sm">{field.label}:</span>
        <input
          type="range"
          className="bg-muted h-2 flex-1 cursor-pointer appearance-none rounded-full"
          min={field.min ?? 0}
          max={field.max ?? 100}
          step={field.step ?? 1}
          value={numValue}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        <span className="w-8 text-sm font-medium">{numValue}</span>
      </div>
    );
  }

  return null;
}

export default ActionRow;
