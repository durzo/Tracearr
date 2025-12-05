/**
 * Expo Push Notification Mock for Testing
 *
 * Mock implementation of push notification service.
 * Tracks all notifications sent and allows assertions.
 */

export interface PushTicket {
  id: string;
  status: 'ok' | 'error';
  message?: string;
  details?: {
    error?: string;
  };
}

export interface PushReceipt {
  id: string;
  status: 'ok' | 'error';
  message?: string;
  details?: {
    error?: string;
  };
}

export interface PushMessage {
  to: string | string[];
  title?: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: 'default' | null;
  badge?: number;
  channelId?: string;
  priority?: 'default' | 'normal' | 'high';
  ttl?: number;
}

export interface SentNotification {
  message: PushMessage;
  ticket: PushTicket;
  timestamp: Date;
}

export interface MockExpoPushOptions {
  defaultStatus?: 'ok' | 'error';
  errorMessage?: string;
  errorDetails?: { error: string };
  delay?: number;
}

export interface MockExpoPushClient {
  sendPushNotificationsAsync(messages: PushMessage[]): Promise<PushTicket[]>;
  getPushNotificationReceiptsAsync(ticketIds: string[]): Promise<Record<string, PushReceipt>>;

  _sentNotifications: SentNotification[];
  _receipts: Map<string, PushReceipt>;
  _setDefaultStatus: (status: 'ok' | 'error') => void;
  _setErrorMessage: (message: string) => void;
  _setErrorDetails: (details: { error: string }) => void;
  _setDelay: (delay: number) => void;
  _addReceipt: (ticketId: string, receipt: PushReceipt) => void;
  _reset: () => void;
  _getNotificationsByToken: (token: string) => SentNotification[];
  _getNotificationsByTitle: (title: string) => SentNotification[];
  _getNotificationCount: () => number;
}

let ticketCounter = 0;

/**
 * Create a mock Expo push client
 */
export function createMockExpoPushClient(options: MockExpoPushOptions = {}): MockExpoPushClient {
  let defaultStatus = options.defaultStatus ?? 'ok';
  let errorMessage = options.errorMessage ?? 'Push notification failed';
  let errorDetails = options.errorDetails ?? { error: 'DeviceNotRegistered' };
  let delay = options.delay ?? 0;

  const sentNotifications: SentNotification[] = [];
  const receipts = new Map<string, PushReceipt>();

  return {
    _sentNotifications: sentNotifications,
    _receipts: receipts,

    async sendPushNotificationsAsync(messages: PushMessage[]): Promise<PushTicket[]> {
      if (delay > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      const tickets: PushTicket[] = [];

      for (const message of messages) {
        const ticketId = `ticket-${++ticketCounter}`;
        const ticket: PushTicket =
          defaultStatus === 'ok'
            ? { id: ticketId, status: 'ok' }
            : { id: ticketId, status: 'error', message: errorMessage, details: errorDetails };

        tickets.push(ticket);
        sentNotifications.push({
          message,
          ticket,
          timestamp: new Date(),
        });
      }

      return tickets;
    },

    async getPushNotificationReceiptsAsync(
      ticketIds: string[]
    ): Promise<Record<string, PushReceipt>> {
      if (delay > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      const result: Record<string, PushReceipt> = {};

      for (const ticketId of ticketIds) {
        if (receipts.has(ticketId)) {
          result[ticketId] = receipts.get(ticketId)!;
        } else {
          // Default receipt based on status
          result[ticketId] =
            defaultStatus === 'ok'
              ? { id: ticketId, status: 'ok' }
              : { id: ticketId, status: 'error', message: errorMessage, details: errorDetails };
        }
      }

      return result;
    },

    _setDefaultStatus(status: 'ok' | 'error') {
      defaultStatus = status;
    },

    _setErrorMessage(message: string) {
      errorMessage = message;
    },

    _setErrorDetails(details: { error: string }) {
      errorDetails = details;
    },

    _setDelay(newDelay: number) {
      delay = newDelay;
    },

    _addReceipt(ticketId: string, receipt: PushReceipt) {
      receipts.set(ticketId, receipt);
    },

    _reset() {
      sentNotifications.length = 0;
      receipts.clear();
      ticketCounter = 0;
      defaultStatus = 'ok';
      errorMessage = 'Push notification failed';
      errorDetails = { error: 'DeviceNotRegistered' };
      delay = 0;
    },

    _getNotificationsByToken(token: string): SentNotification[] {
      return sentNotifications.filter((n) => {
        const recipients = Array.isArray(n.message.to) ? n.message.to : [n.message.to];
        return recipients.includes(token);
      });
    },

    _getNotificationsByTitle(title: string): SentNotification[] {
      return sentNotifications.filter((n) => n.message.title === title);
    },

    _getNotificationCount(): number {
      return sentNotifications.length;
    },
  };
}

/**
 * Reset the ticket counter
 */
export function resetExpoPushCounter(): void {
  ticketCounter = 0;
}

/**
 * Mock PushNotificationService for testing
 * Wraps the Expo client mock with higher-level notification methods
 */
export interface MockPushNotificationService {
  notifyViolation(
    tokens: string[],
    data: { username: string; ruleName: string; severity: string }
  ): Promise<void>;
  notifySessionStarted(
    tokens: string[],
    data: { username: string; mediaTitle: string; serverName: string }
  ): Promise<void>;
  notifySessionStopped(
    tokens: string[],
    data: { username: string; mediaTitle: string; serverName: string }
  ): Promise<void>;
  notifyServerDown(tokens: string[], data: { serverName: string }): Promise<void>;
  notifyServerUp(tokens: string[], data: { serverName: string }): Promise<void>;

  _client: MockExpoPushClient;
  _calls: {
    notifyViolation: number;
    notifySessionStarted: number;
    notifySessionStopped: number;
    notifyServerDown: number;
    notifyServerUp: number;
  };
  _reset: () => void;
}

/**
 * Create a mock push notification service
 */
export function createMockPushNotificationService(
  options: MockExpoPushOptions = {}
): MockPushNotificationService {
  const client = createMockExpoPushClient(options);
  const calls = {
    notifyViolation: 0,
    notifySessionStarted: 0,
    notifySessionStopped: 0,
    notifyServerDown: 0,
    notifyServerUp: 0,
  };

  return {
    _client: client,
    _calls: calls,

    async notifyViolation(tokens, data) {
      calls.notifyViolation++;
      await client.sendPushNotificationsAsync(
        tokens.map((to) => ({
          to,
          title: '⚠️ Rule Violation',
          body: `${data.username} triggered ${data.ruleName} (${data.severity})`,
          data: { type: 'violation', ...data },
          sound: 'default',
          priority: 'high',
        }))
      );
    },

    async notifySessionStarted(tokens, data) {
      calls.notifySessionStarted++;
      await client.sendPushNotificationsAsync(
        tokens.map((to) => ({
          to,
          title: '▶️ Stream Started',
          body: `${data.username} started watching ${data.mediaTitle} on ${data.serverName}`,
          data: { type: 'session_started', ...data },
          sound: null,
          priority: 'normal',
        }))
      );
    },

    async notifySessionStopped(tokens, data) {
      calls.notifySessionStopped++;
      await client.sendPushNotificationsAsync(
        tokens.map((to) => ({
          to,
          title: '⏹️ Stream Ended',
          body: `${data.username} stopped watching ${data.mediaTitle} on ${data.serverName}`,
          data: { type: 'session_stopped', ...data },
          sound: null,
          priority: 'normal',
        }))
      );
    },

    async notifyServerDown(tokens, data) {
      calls.notifyServerDown++;
      await client.sendPushNotificationsAsync(
        tokens.map((to) => ({
          to,
          title: '🔴 Server Down',
          body: `${data.serverName} is not responding`,
          data: { type: 'server_down', ...data },
          sound: 'default',
          priority: 'high',
        }))
      );
    },

    async notifyServerUp(tokens, data) {
      calls.notifyServerUp++;
      await client.sendPushNotificationsAsync(
        tokens.map((to) => ({
          to,
          title: '🟢 Server Online',
          body: `${data.serverName} is back online`,
          data: { type: 'server_up', ...data },
          sound: 'default',
          priority: 'normal',
        }))
      );
    },

    _reset() {
      client._reset();
      calls.notifyViolation = 0;
      calls.notifySessionStarted = 0;
      calls.notifySessionStopped = 0;
      calls.notifyServerDown = 0;
      calls.notifyServerUp = 0;
    },
  };
}
