import type { Condition, RuleV2, Action, Session, ServerUser, Server } from '@tracearr/shared';

export interface EvaluationContext {
  session: Session;
  serverUser: ServerUser;
  server: Server;
  activeSessions: Session[];
  recentSessions: Session[];
  rule: RuleV2;
}

export type ConditionEvaluator = (
  context: EvaluationContext,
  condition: Condition
) => boolean | Promise<boolean>;

export type ActionExecutor = (context: EvaluationContext, action: Action) => void | Promise<void>;

export interface EvaluationResult {
  ruleId: string;
  ruleName: string;
  matched: boolean;
  matchedGroups: number[];
  actions: Action[];
}
