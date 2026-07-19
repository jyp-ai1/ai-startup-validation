import { InternalServerError } from '@repo/core/errors';
import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';

import type {
  RealtimeMessageHandler,
  RealtimePort,
  RealtimeSubscription,
} from '../../../realtime/realtime.port';
import { getServiceClient } from '../service';

let subscriptionCounter = 0;

/** Supabase Realtime implementation of RealtimePort. */
export class SupabaseRealtimeAdapter implements RealtimePort {
  private clientInstance: SupabaseClient | null = null;
  private readonly channels = new Map<string, RealtimeChannel>();

  constructor(private readonly clientOverride?: SupabaseClient) {}

  private get client(): SupabaseClient {
    if (this.clientOverride) return this.clientOverride;
    if (!this.clientInstance) {
      this.clientInstance = getServiceClient();
    }
    return this.clientInstance;
  }

  async subscribe(
    channel: string,
    event: string,
    handler: RealtimeMessageHandler,
  ): Promise<RealtimeSubscription> {
    let realtimeChannel = this.channels.get(channel);

    if (!realtimeChannel) {
      realtimeChannel = this.client.channel(channel);
      this.channels.set(channel, realtimeChannel);
      await realtimeChannel.subscribe();
    }

    realtimeChannel.on('broadcast', { event }, (payload) => {
      handler(payload.payload);
    });

    const id = `sub_${++subscriptionCounter}`;

    return {
      id,
      channel,
      unsubscribe: async () => {
        await this.unsubscribe({ id, channel, unsubscribe: async () => {} });
      },
    };
  }

  async unsubscribe(subscription: RealtimeSubscription): Promise<void> {
    const channel = this.channels.get(subscription.channel);
    if (channel) {
      await this.client.removeChannel(channel);
      this.channels.delete(subscription.channel);
    }
  }

  async publish(
    channel: string,
    event: string,
    payload: unknown,
  ): Promise<void> {
    let realtimeChannel = this.channels.get(channel);

    if (!realtimeChannel) {
      realtimeChannel = this.client.channel(channel);
      this.channels.set(channel, realtimeChannel);
      await realtimeChannel.subscribe();
    }

    const status = await realtimeChannel.send({
      type: 'broadcast',
      event,
      payload: payload as Record<string, unknown>,
    });

    if (status === 'error' || status === 'timed out') {
      throw new InternalServerError(`Realtime publish failed: ${status}`);
    }
  }
}
