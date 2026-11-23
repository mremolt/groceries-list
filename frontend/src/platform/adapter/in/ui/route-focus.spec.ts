import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { Router, TitleStrategy } from '@angular/router';
import { TranslocoService } from '@jsverse/transloco';
import { TestPage } from '@testing/test-page';
import { TestShell } from '@testing/test-shell';
import { provideTestTranslations } from '@testing/transloco';
import { render } from '@testing-library/angular';
import { firstValueFrom } from 'rxjs';
import { describe, expect, it } from 'vitest';

import { AppTitleStrategy } from './app-title-strategy';
import { RouteFocus } from './route-focus';

async function setup() {
  const rendered = await render(TestShell, {
    routes: [
      { path: 'a', component: TestPage, title: 'platform.title.lists' },
      { path: 'b', component: TestPage },
    ],
    providers: [
      RouteFocus,
      AppTitleStrategy,
      { provide: TitleStrategy, useExisting: AppTitleStrategy },
      ...provideTestTranslations(),
    ],
  });
  await firstValueFrom(TestBed.inject(TranslocoService).load('de'));
  TestBed.inject(RouteFocus).start();
  return rendered;
}

describe('route title and focus (A11Y-21)', () => {
  it('sets "Page | App" as the document title from the route title key', async () => {
    const { navigate } = await setup();

    await navigate('/a');

    expect(TestBed.inject(Title).getTitle()).toBe('Meine Listen | Einkaufsliste');
  });

  it('keeps the browser start on the first navigation', async () => {
    const { navigate, fixture } = await setup();

    await navigate('/a');
    await fixture.whenStable();

    expect(document.activeElement?.tagName).not.toBe('H1');
  });

  it('moves focus to the new main heading when the path changes', async () => {
    const { navigate, fixture } = await setup();
    await navigate('/a');

    await navigate('/b');
    await fixture.whenStable();

    expect(document.activeElement?.tagName).toBe('H1');
    expect(document.activeElement?.textContent).toBe('Einkaufsliste');
  });

  it('skips the focus move for navigations that replace the URL', async () => {
    const { navigate, fixture } = await setup();
    await navigate('/a');

    await TestBed.inject(Router).navigateByUrl('/b', { replaceUrl: true });
    await fixture.whenStable();

    expect(document.activeElement?.tagName).not.toBe('H1');
  });
});
