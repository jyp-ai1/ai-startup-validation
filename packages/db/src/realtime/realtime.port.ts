/** Active realtime subscription handle. */
export type RealtimeSubscription = {
  id: string;
  channel: string;
  unsubscribe: () => Promise<void>;
};

export type RealtimeMessageHandler = (payload: unknown) => void;

/** Port — pub/sub realtime operations (hexagonal). */
export interface RealtimePort {
  subscribe(
    channel: string,
    event: string,
    handler: RealtimeMessageHandler,
  ): Promise<RealtimeSubscription>;

  unsubscribe(subscription: RealtimeSubscription): Promise<void>;

  publish(channel: string, event: string, payload: unknown): Promise<void>;
}
