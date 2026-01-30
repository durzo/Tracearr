import type { RuleConditions, ConditionGroup, Condition, RuleV2 } from '@tracearr/shared';
import type { EvaluationContext, EvaluationResult, ConditionEvaluator } from './types.js';
import { evaluatorRegistry } from './evaluators/index.js';
import { rulesLogger as logger } from '../../utils/logger.js';

/**
 * Evaluate a single condition using the appropriate evaluator.
 */
function evaluateCondition(context: EvaluationContext, condition: Condition): boolean {
  const evaluator: ConditionEvaluator | undefined = evaluatorRegistry[condition.field];

  if (!evaluator) {
    logger.warn(`No evaluator found for condition field: ${condition.field}`, {
      field: condition.field,
    });
    return false;
  }

  try {
    const result = evaluator(context, condition);
    // Handle sync and async evaluators
    if (result instanceof Promise) {
      logger.warn(`Async evaluator called synchronously for field: ${condition.field}`, {
        field: condition.field,
      });
      return false;
    }
    return result;
  } catch (error) {
    logger.error(`Error evaluating condition field ${condition.field}`, {
      field: condition.field,
      error,
    });
    return false;
  }
}

/**
 * Evaluate a condition group (conditions within a group are OR'd).
 * Returns true if ANY condition in the group matches.
 */
function evaluateConditionGroup(context: EvaluationContext, group: ConditionGroup): boolean {
  if (group.conditions.length === 0) {
    return true; // Empty group is always true
  }

  // OR logic - any condition matching makes the group true
  return group.conditions.some((condition) => evaluateCondition(context, condition));
}

/**
 * Evaluate all condition groups (groups are AND'd together).
 * Returns indices of matched groups, or null if any group fails.
 */
function evaluateAllGroups(
  context: EvaluationContext,
  conditions: RuleConditions
): number[] | null {
  if (conditions.groups.length === 0) {
    return []; // No conditions = always match
  }

  const matchedGroups: number[] = [];

  // AND logic - all groups must match
  for (let i = 0; i < conditions.groups.length; i++) {
    const group = conditions.groups[i];
    if (!group) continue;

    const groupMatched = evaluateConditionGroup(context, group);
    if (!groupMatched) {
      return null; // Any group failing = rule doesn't match
    }
    matchedGroups.push(i);
  }

  return matchedGroups;
}

/**
 * Evaluate a single rule against the given context.
 */
export function evaluateRule(context: EvaluationContext): EvaluationResult {
  const { rule } = context;

  // Check if rule has v2 conditions
  if (!rule.conditions?.groups) {
    return {
      ruleId: rule.id,
      ruleName: rule.name,
      matched: false,
      matchedGroups: [],
      actions: [],
    };
  }

  const matchedGroups = evaluateAllGroups(context, rule.conditions);
  const matched = matchedGroups !== null;

  return {
    ruleId: rule.id,
    ruleName: rule.name,
    matched,
    matchedGroups: matchedGroups ?? [],
    actions: matched ? (rule.actions?.actions ?? []) : [],
  };
}

/**
 * Evaluate multiple rules against the given session context.
 * Returns all matching rules with their actions.
 */
export function evaluateRules(
  baseContext: Omit<EvaluationContext, 'rule'>,
  rules: RuleV2[]
): EvaluationResult[] {
  const results: EvaluationResult[] = [];

  for (const rule of rules) {
    // Skip inactive rules
    if (!rule.isActive) {
      continue;
    }

    // Check server scope - if rule is server-specific, must match context server
    if (rule.serverId && rule.serverId !== baseContext.server.id) {
      continue;
    }

    const context: EvaluationContext = {
      ...baseContext,
      rule,
    };

    const result = evaluateRule(context);

    // Only include rules that matched
    if (result.matched) {
      results.push(result);
    }
  }

  return results;
}

/**
 * Async version of evaluateCondition for evaluators that require async operations.
 */
async function evaluateConditionAsync(
  context: EvaluationContext,
  condition: Condition
): Promise<boolean> {
  const evaluator: ConditionEvaluator | undefined = evaluatorRegistry[condition.field];

  if (!evaluator) {
    logger.warn(`No evaluator found for condition field: ${condition.field}`, {
      field: condition.field,
    });
    return false;
  }

  try {
    const result = evaluator(context, condition);
    // Handle both sync and async evaluators
    return result instanceof Promise ? await result : result;
  } catch (error) {
    logger.error(`Error evaluating condition field ${condition.field}`, {
      field: condition.field,
      error,
    });
    return false;
  }
}

/**
 * Async version of evaluateConditionGroup.
 */
async function evaluateConditionGroupAsync(
  context: EvaluationContext,
  group: ConditionGroup
): Promise<boolean> {
  if (group.conditions.length === 0) {
    return true;
  }

  // Evaluate all conditions in parallel, return true if any match (OR logic)
  const results = await Promise.all(
    group.conditions.map((condition) => evaluateConditionAsync(context, condition))
  );

  return results.some((result) => result);
}

/**
 * Async version of evaluateAllGroups.
 */
async function evaluateAllGroupsAsync(
  context: EvaluationContext,
  conditions: RuleConditions
): Promise<number[] | null> {
  if (conditions.groups.length === 0) {
    return [];
  }

  const matchedGroups: number[] = [];

  // Evaluate groups sequentially (AND logic requires early exit on failure)
  for (let i = 0; i < conditions.groups.length; i++) {
    const group = conditions.groups[i];
    if (!group) continue;

    const groupMatched = await evaluateConditionGroupAsync(context, group);
    if (!groupMatched) {
      return null;
    }
    matchedGroups.push(i);
  }

  return matchedGroups;
}

/**
 * Async version of evaluateRule.
 */
export async function evaluateRuleAsync(context: EvaluationContext): Promise<EvaluationResult> {
  const { rule } = context;

  if (!rule.conditions?.groups) {
    return {
      ruleId: rule.id,
      ruleName: rule.name,
      matched: false,
      matchedGroups: [],
      actions: [],
    };
  }

  const matchedGroups = await evaluateAllGroupsAsync(context, rule.conditions);
  const matched = matchedGroups !== null;

  return {
    ruleId: rule.id,
    ruleName: rule.name,
    matched,
    matchedGroups: matchedGroups ?? [],
    actions: matched ? (rule.actions?.actions ?? []) : [],
  };
}

/**
 * Async version of evaluateRules.
 */
export async function evaluateRulesAsync(
  baseContext: Omit<EvaluationContext, 'rule'>,
  rules: RuleV2[]
): Promise<EvaluationResult[]> {
  const results: EvaluationResult[] = [];

  for (const rule of rules) {
    if (!rule.isActive) {
      continue;
    }

    if (rule.serverId && rule.serverId !== baseContext.server.id) {
      continue;
    }

    const context: EvaluationContext = {
      ...baseContext,
      rule,
    };

    const result = await evaluateRuleAsync(context);

    if (result.matched) {
      results.push(result);
    }
  }

  return results;
}
