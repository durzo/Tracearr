import { useState } from 'react';
import { Plus, Save, Loader2 } from 'lucide-react';
import type {
  Condition,
  ConditionGroup as ConditionGroupType,
  RuleConditions,
  RuleActions,
  Action,
  ViolationSeverity,
  CreateRuleV2Input,
  UpdateRuleV2Input,
  RulesFilterOptions,
} from '@tracearr/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ConditionGroup } from './ConditionGroup';
import { ActionRow } from './ActionRow';
import {
  getDefaultOperatorForField,
  getDefaultValueForField,
  createDefaultAction,
  SEVERITY_OPTIONS,
} from '@/lib/rules';

// Combined rule type that can represent V1 or V2 rules from the API
// The API returns rules with optional V2 fields (conditions, actions, description)
interface RuleInput {
  id: string;
  name: string;
  description?: string | null;
  severity?: ViolationSeverity;
  isActive: boolean;
  // V2 fields
  conditions?: RuleConditions | null;
  actions?: RuleActions | null;
}

interface RuleBuilderProps {
  initialRule?: RuleInput;
  onSave: (data: CreateRuleV2Input | UpdateRuleV2Input) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  filterOptions?: RulesFilterOptions;
}

// Create default condition group
function createDefaultConditionGroup(): ConditionGroupType {
  const defaultField = 'concurrent_streams';
  return {
    conditions: [
      {
        field: defaultField,
        operator: getDefaultOperatorForField(defaultField),
        value: getDefaultValueForField(defaultField),
      } as Condition,
    ],
  };
}

// Create default action
function createDefaultRuleAction(): Action {
  return createDefaultAction('log_only');
}

// Extract conditions from existing rule (V1 or V2)
function extractConditions(rule?: RuleInput): RuleConditions {
  if (!rule) {
    return { groups: [createDefaultConditionGroup()] };
  }

  // V2 rule - has conditions object with groups
  if (rule.conditions && 'groups' in rule.conditions) {
    return rule.conditions;
  }

  // V1 rule or no conditions - return default
  return { groups: [createDefaultConditionGroup()] };
}

// Extract actions from existing rule (V1 or V2)
function extractActions(rule?: RuleInput): RuleActions {
  if (!rule) {
    return { actions: [createDefaultRuleAction()] };
  }

  // V2 rule - has actions object with actions array
  if (rule.actions && 'actions' in rule.actions) {
    return rule.actions;
  }

  // V1 rule or no actions - return default
  return { actions: [createDefaultRuleAction()] };
}

export function RuleBuilder({
  initialRule,
  onSave,
  onCancel,
  isLoading = false,
  filterOptions,
}: RuleBuilderProps) {
  const [name, setName] = useState(initialRule?.name ?? '');
  const [description, setDescription] = useState(initialRule?.description ?? '');
  const [severity, setSeverity] = useState<ViolationSeverity>(initialRule?.severity ?? 'warning');
  const [isActive, setIsActive] = useState(initialRule?.isActive ?? true);
  const [conditions, setConditions] = useState<RuleConditions>(extractConditions(initialRule));
  const [actions, setActions] = useState<RuleActions>(extractActions(initialRule));
  const [errors, setErrors] = useState<string[]>([]);

  // Validation
  const validate = (): boolean => {
    const newErrors: string[] = [];

    if (!name.trim()) {
      newErrors.push('Rule name is required');
    }

    if (conditions.groups.length === 0) {
      newErrors.push('At least one condition group is required');
    }

    for (const group of conditions.groups) {
      if (group.conditions.length === 0) {
        newErrors.push('Each condition group must have at least one condition');
      }
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  // Submit handler
  const handleSubmit = async () => {
    if (!validate()) return;

    const data: CreateRuleV2Input | UpdateRuleV2Input = {
      name: name.trim(),
      description: description.trim() || null,
      severity,
      isActive,
      conditions,
      actions,
    };

    await onSave(data);
  };

  // Condition group handlers
  const addConditionGroup = () => {
    setConditions({
      groups: [...conditions.groups, createDefaultConditionGroup()],
    });
  };

  const updateConditionGroup = (index: number, group: ConditionGroupType) => {
    const newGroups = [...conditions.groups];
    newGroups[index] = group;
    setConditions({ groups: newGroups });
  };

  const removeConditionGroup = (index: number) => {
    if (conditions.groups.length === 1) return; // Keep at least one group
    const newGroups = conditions.groups.filter((_, i) => i !== index);
    setConditions({ groups: newGroups });
  };

  // Action handlers
  const addAction = () => {
    setActions({
      actions: [...actions.actions, createDefaultRuleAction()],
    });
  };

  const updateAction = (index: number, action: Action) => {
    const newActions = [...actions.actions];
    newActions[index] = action;
    setActions({ actions: newActions });
  };

  const removeAction = (index: number) => {
    const newActions = actions.actions.filter((_, i) => i !== index);
    setActions({ actions: newActions });
  };

  return (
    <div className="space-y-6">
      {/* Errors */}
      {errors.length > 0 && (
        <div className="border-destructive/50 bg-destructive/5 rounded-lg border p-4">
          <p className="text-destructive font-medium">Please fix the following errors:</p>
          <ul className="text-destructive mt-2 list-inside list-disc text-sm">
            {errors.map((error, i) => (
              <li key={i}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Name, Description, Severity, and Active Toggle */}
      <div className="grid items-end gap-4 sm:grid-cols-[1fr_1fr_auto_auto]">
        <div className="space-y-2">
          <Label htmlFor="rule-name">Rule Name *</Label>
          <Input
            id="rule-name"
            placeholder="e.g., Block excessive streams"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="rule-description">Description</Label>
          <Input
            id="rule-description"
            placeholder="Optional description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="rule-severity">Severity</Label>
          <Select value={severity} onValueChange={(v) => setSeverity(v as ViolationSeverity)}>
            <SelectTrigger id="rule-severity" className="w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SEVERITY_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2 pb-2">
          <Switch id="rule-active" checked={isActive} onCheckedChange={setIsActive} />
          <Label htmlFor="rule-active" className="text-sm">
            Active
          </Label>
        </div>
      </div>

      {/* Conditions Section */}
      <div className="bg-muted/30 space-y-4 rounded-lg border p-4">
        <div className="flex items-center justify-between border-b pb-3">
          <div>
            <h3 className="text-base font-semibold">Conditions</h3>
            <p className="text-muted-foreground text-sm">
              Define when this rule should trigger. Groups are combined with{' '}
              <span className="font-bold">AND</span> logic.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {conditions.groups.map((group, index) => (
            <div key={index}>
              {index > 0 && (
                <div className="my-4 flex items-center gap-2">
                  <div className="bg-border h-px flex-1" />
                  <span className="text-muted-foreground bg-muted rounded-full px-3 py-1 text-sm font-bold">
                    AND
                  </span>
                  <div className="bg-border h-px flex-1" />
                </div>
              )}
              <ConditionGroup
                group={group}
                groupIndex={index}
                onChange={(g) => updateConditionGroup(index, g)}
                onRemove={() => removeConditionGroup(index)}
                showRemove={conditions.groups.length > 1}
                filterOptions={filterOptions}
              />
            </div>
          ))}
        </div>

        <Button type="button" variant="outline" onClick={addConditionGroup}>
          <Plus className="mr-2 h-4 w-4" />
          Add <span className="font-bold">AND</span> condition group
        </Button>
      </div>

      {/* Actions Section */}
      <div className="bg-muted/30 space-y-4 rounded-lg border p-4">
        <div className="border-b pb-3">
          <h3 className="text-base font-semibold">Additional Actions</h3>
          <p className="text-muted-foreground text-sm">
            Optional side-effects when conditions are met. A violation is always created
            automatically.
          </p>
        </div>

        {actions.actions.length > 0 && (
          <div className="space-y-3">
            {actions.actions.map((action, index) => (
              <ActionRow
                key={index}
                action={action}
                onChange={(a) => updateAction(index, a)}
                onRemove={() => removeAction(index)}
                showRemove
              />
            ))}
          </div>
        )}

        <Button type="button" variant="outline" onClick={addAction}>
          <Plus className="mr-2 h-4 w-4" />
          Add action
        </Button>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-3 border-t pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              {initialRule ? 'Update Rule' : 'Create Rule'}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

export default RuleBuilder;
