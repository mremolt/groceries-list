import { BreakpointObserver } from '@angular/cdk/layout';
import { inject, Injectable, type Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';

/** Material window size classes (UI-01): compact < 600 px, medium 600-839 px, expanded >= 840 px. */
export type SizeClass = 'compact' | 'medium' | 'expanded';

const MEDIUM_UP = '(min-width: 600px)';
const EXPANDED_UP = '(min-width: 840px)';

/** Pure mapping from the two breakpoint matches to the size class (NG-TEST-10). */
export function toSizeClass(mediumUp: boolean, expandedUp: boolean): SizeClass {
  if (expandedUp) return 'expanded';
  return mediumUp ? 'medium' : 'compact';
}

/**
 * UI-adapter state (UI-04, NG-UI-19): the size class, used for structure only (drawer mode); columns and gaps are CSS
 * (NG-UI-21). Never injected into use cases or stores (NG-UI-20).
 */
export abstract class WindowSize {
  abstract readonly sizeClass: Signal<SizeClass>;
}

@Injectable()
export class BreakpointWindowSize extends WindowSize {
  private readonly breakpoints = inject(BreakpointObserver);

  readonly sizeClass: Signal<SizeClass> = toSignal(
    this.breakpoints
      .observe([MEDIUM_UP, EXPANDED_UP])
      .pipe(
        map((state) => toSizeClass(state.breakpoints[MEDIUM_UP] ?? false, state.breakpoints[EXPANDED_UP] ?? false)),
      ),
    {
      initialValue: toSizeClass(this.breakpoints.isMatched(MEDIUM_UP), this.breakpoints.isMatched(EXPANDED_UP)),
    },
  );
}
