import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { RuleBuilder } from './RuleBuilder';
import type {
  CreateRuleV2Input,
  UpdateRuleV2Input,
  RuleConditions,
  RuleActions,
  RulesFilterOptions,
  ViolationSeverity,
} from '@tracearr/shared';

// Combined rule type that can represent V1 or V2 rules from the API
interface RuleInput {
  id: string;
  name: string;
  description?: string | null;
  severity?: ViolationSeverity;
  isActive: boolean;
  conditions?: RuleConditions | null;
  actions?: RuleActions | null;
}

interface RuleBuilderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rule?: RuleInput;
  onSave: (data: CreateRuleV2Input | UpdateRuleV2Input) => Promise<void>;
  isLoading?: boolean;
  filterOptions?: RulesFilterOptions;
}

export function RuleBuilderDialog({
  open,
  onOpenChange,
  rule,
  onSave,
  isLoading,
  filterOptions,
}: RuleBuilderDialogProps) {
  const isEditing = !!rule;

  const handleSave = async (data: CreateRuleV2Input | UpdateRuleV2Input) => {
    await onSave(data);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[900px] !max-w-[900px] overflow-y-auto">
        <DialogHeader className="sm:text-center">
          <DialogTitle className="text-xl">
            {isEditing ? 'Edit Rule' : 'Create Custom Rule'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Modify the rule conditions and actions.'
              : 'Build a custom rule with flexible conditions and actions.'}
          </DialogDescription>
        </DialogHeader>
        <RuleBuilder
          initialRule={rule}
          onSave={handleSave}
          onCancel={() => onOpenChange(false)}
          isLoading={isLoading}
          filterOptions={filterOptions}
        />
      </DialogContent>
    </Dialog>
  );
}

export default RuleBuilderDialog;
