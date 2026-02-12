import type {
  Condition,
  RuleV2,
  Action,
  Session,
  ServerUser,
  Server,
  GroupEvidence,
} from '@tracearr/shared';

export interface EvaluationContext {
  session: Session;
  serverUser: ServerUser;
  server: Server;
  activeSessions: Session[];
  recentSessions: Session[];
  rule: RuleV2;
}

export interface EvaluatorResult {
  matched: boolean;
  actual: unknown;
  relatedSessionIds?: string[];
  details?: Record<string, unknown>;
}

export type ConditionEvaluator = (
  context: EvaluationContext,
  condition: Condition
) => EvaluatorResult | Promise<EvaluatorResult>;

export type ActionExecutor = (context: EvaluationContext, action: Action) => void | Promise<void>;

export interface EvaluationResult {
  ruleId: string;
  ruleName: string;
  matched: boolean;
  matchedGroups: number[];
  actions: Action[];
  evidence?: GroupEvidence[];
}
