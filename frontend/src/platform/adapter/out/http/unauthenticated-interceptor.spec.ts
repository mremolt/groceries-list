import { HttpClient, HttpContext, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';

import { LOGIN_PATH, PAGE_NAVIGATION } from '../../../platform.tokens';
import type { PageNavigation } from '../../../ports/out/page-navigation';
import { ANONYMOUS_ALLOWED, unauthenticatedInterceptor } from './unauthenticated-interceptor';

function setup() {
  // NG-TOOL-11: explicit fake, `expect(mock.method)` trips unbound-method
  const assign = vi.fn<(url: string) => void>();
  const navigation: PageNavigation = { assign };
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(withInterceptors([unauthenticatedInterceptor])),
      provideHttpClientTesting(),
      { provide: PAGE_NAVIGATION, useValue: navigation },
    ],
  });
  return { assign, http: TestBed.inject(HttpClient), controller: TestBed.inject(HttpTestingController) };
}

describe('unauthenticatedInterceptor', () => {
  it('sends the whole page to the login when the API answers 401', async () => {
    const { assign, http, controller } = setup();
    const result = new Promise((resolve) => {
      http.get('/api/v1/lists').subscribe({ error: resolve });
    });

    controller.expectOne('/api/v1/lists').flush({}, { status: 401, statusText: 'Unauthorized' });
    await result;

    expect(assign).toHaveBeenCalledWith(LOGIN_PATH);
  });

  it('leaves other errors alone', async () => {
    const { assign, http, controller } = setup();
    const result = new Promise((resolve) => {
      http.get('/api/v1/lists').subscribe({ error: resolve });
    });

    controller.expectOne('/api/v1/lists').flush({}, { status: 500, statusText: 'Server Error' });
    await result;

    expect(assign).not.toHaveBeenCalled();
  });

  it('ignores a 401 of something that is not the API', async () => {
    const { assign, http, controller } = setup();
    const result = new Promise((resolve) => {
      http.get('/config.json').subscribe({ error: resolve });
    });

    controller.expectOne('/config.json').flush({}, { status: 401, statusText: 'Unauthorized' });
    await result;

    expect(assign).not.toHaveBeenCalled();
  });

  it('keeps the page when the caller marked the request as an anonymous-allowed probe (FR-AUTH-06)', async () => {
    const { assign, http, controller } = setup();
    const result = new Promise((resolve) => {
      http.get('/api/v1/me', { context: new HttpContext().set(ANONYMOUS_ALLOWED, true) }).subscribe({ error: resolve });
    });

    controller.expectOne('/api/v1/me').flush({}, { status: 401, statusText: 'Unauthorized' });
    await result;

    expect(assign).not.toHaveBeenCalled();
  });
});
