import type { PageActivity } from './page-activity';

export type PollOutcome = 'ok' | 'failed';

export interface PollerConfig {
  /** Time between two polls while all is well. */
  readonly intervalMs: number;
  /** The longest wait after repeated failures (the wait doubles per failure). */
  readonly maxDelayMs: number;
  /** One poll; answers `failed` when the server could not be reached. */
  readonly run: () => Promise<PollOutcome>;
}

/**
 * Calls `run` every `intervalMs` while the page is visible (FR-SYNC-01 AC1). It never overlaps two polls, pauses while the
 * page is hidden (AC3), polls at once when the page gets back the focus, visibility or network (AC2, FR-FB-06 AC3) and
 * waits longer after failures, so an unreachable server is not hammered. A plain class: the owner calls `stop()`.
 */
export class Poller {
  private timer: ReturnType<typeof setTimeout> | undefined;
  private unsubscribe: (() => void) | undefined;
  private running = false;
  private stopped = true;
  private failures = 0;

  constructor(
    private readonly config: PollerConfig,
    private readonly activity: PageActivity,
  ) {}

  start(): void {
    this.stop();
    this.stopped = false;
    this.failures = 0;
    this.unsubscribe = this.activity.onResume(() => {
      void this.pollNow();
    });
    this.schedule();
  }

  stop(): void {
    this.stopped = true;
    clearTimeout(this.timer);
    this.timer = undefined;
    this.unsubscribe?.();
    this.unsubscribe = undefined;
  }

  /** One poll now, unless one is running or the page is hidden; the next one follows after the interval. */
  async pollNow(): Promise<void> {
    if (this.stopped || this.running || !this.activity.visible()) return;
    clearTimeout(this.timer);
    this.running = true;
    let outcome: PollOutcome = 'failed';
    try {
      outcome = await this.config.run();
    } finally {
      this.running = false;
      this.failures = outcome === 'failed' ? this.failures + 1 : 0;
      this.schedule();
    }
  }

  private schedule(): void {
    clearTimeout(this.timer);
    this.timer = undefined;
    if (this.stopped || !this.activity.visible()) return; // hidden: paused until the page is visible again
    const delay = Math.min(this.config.intervalMs * 2 ** this.failures, this.config.maxDelayMs);
    this.timer = setTimeout(() => {
      void this.pollNow();
    }, delay);
  }
}
