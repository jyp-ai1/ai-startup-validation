import type { DomainEvent, JobEvent, WorkflowEvent } from '../types';

export type EventHandler<T extends DomainEvent = DomainEvent> = (event: T) => void;

/** Domain event bus for jobs and workflows. */
export class EventBus {
  private readonly handlers = new Map<string, EventHandler[]>();

  on<T extends DomainEvent>(type: T['type'] | '*', handler: EventHandler<T>): () => void {
    const key = type;
    const list = this.handlers.get(key) ?? [];
    list.push(handler as EventHandler);
    this.handlers.set(key, list);
    return () => {
      const idx = list.indexOf(handler as EventHandler);
      if (idx >= 0) list.splice(idx, 1);
    };
  }

  emit(event: DomainEvent): void {
    this.handlers.get(event.type)?.forEach((h) => h(event));
    this.handlers.get('*')?.forEach((h) => h(event));
  }

  emitJob(event: JobEvent): void {
    this.history.push(event);
    this.handlers.get(event.type)?.forEach((h) => h(event));
    this.handlers.get('*')?.forEach((h) => h(event));
  }

  emitWorkflow(event: WorkflowEvent): void {
    this.history.push(event);
    this.handlers.get(event.type)?.forEach((h) => h(event));
    this.handlers.get('*')?.forEach((h) => h(event));
  }

  getHistory(): DomainEvent[] {
    return [...this.history];
  }

  private readonly history: DomainEvent[] = [];

  record(event: DomainEvent): void {
    this.history.push(event);
    this.emit(event);
  }
}

export const eventBus = new EventBus();

export type { DomainEvent, JobEvent, WorkflowEvent } from '../types';
