/**
 * S11 Surface Contract — UI consumes only this shape.
 * Knowledge Engine internals must not leak to UI.
 * Confidence is for Presenter phrasing only — never shown as enum labels.
 */
export type SurfaceAssumption = {
  value: string;
  confidence: 'assumed';
  /** Why it is not yet confirmed — Founder language */
  reason: string;
};

export type SurfacePresenter = {
  understanding: {
    confirmed: string[];
    assumptions: SurfaceAssumption[];
  };
  decision: {
    summary: string;
    blockingReason?: string;
  };
  question: {
    text: string;
    /** 답하면 무엇을 알 수 있는가 */
    purpose: string;
  };
  action: {
    /** 지금 해야 하는 행동 */
    current: string;
    /** 이후 이어질 행동 */
    next?: string;
    /** Action과 동일한 철학 — 왜 이 행동인가 */
    reason: string;
  };
};

export function emptySurfacePresenter(): SurfacePresenter {
  return {
    understanding: { confirmed: [], assumptions: [] },
    decision: { summary: '' },
    question: { text: '', purpose: '' },
    action: { current: '', reason: '' },
  };
}
