import type { NotificationPayload, NotificationPort, NotificationChannel } from '../types';

/** Notification adapter ports — implementations deferred. */
export abstract class BaseNotificationAdapter implements NotificationPort {
  abstract readonly channel: NotificationChannel;
  abstract send(payload: NotificationPayload): Promise<void>;
}

export class EmailNotificationAdapter extends BaseNotificationAdapter {
  readonly channel = 'email' as const;
  async send(payload: NotificationPayload): Promise<void> {
    // Future: SMTP / SendGrid
    void payload;
  }
}

export class SlackNotificationAdapter extends BaseNotificationAdapter {
  readonly channel = 'slack' as const;
  async send(payload: NotificationPayload): Promise<void> {
    void payload;
  }
}

export class DiscordNotificationAdapter extends BaseNotificationAdapter {
  readonly channel = 'discord' as const;
  async send(payload: NotificationPayload): Promise<void> {
    void payload;
  }
}

export class WebhookNotificationAdapter extends BaseNotificationAdapter {
  readonly channel = 'webhook' as const;
  async send(payload: NotificationPayload): Promise<void> {
    void payload;
  }
}

export class PushNotificationAdapter extends BaseNotificationAdapter {
  readonly channel = 'push' as const;
  async send(payload: NotificationPayload): Promise<void> {
    void payload;
  }
}

export type { NotificationPort, NotificationPayload, NotificationChannel } from '../types';
