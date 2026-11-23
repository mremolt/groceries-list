import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { mock } from 'vitest-mock-extended';
import { describe, expect, it } from 'vitest';

import { LOGIN_PATH, PAGE_NAVIGATION } from '../../../platform.tokens';
import type { PageNavigation } from '../../../ports/out/page-navigation';
import { unauthenticatedInterceptor } from './unauthenticated-interceptor';

function setup() {
  const navigation = mock<PageNavigation>();
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(withInterceptors([unauthenticatedInterceptor])),
      provideHttpClientTesting(),
      { provide: PAGE_NAVIGATION, useValue: navigation },
    ],
  });
  return { navigation, http: TestBed.inject(HttpClient), controller: TestBed.inject(HttpTestingController) };
}

describe('unauthenticatedInterceptor', () => {
  it('sends the whole page to the login when the API answers 401', async () => {
    const { navigation, http, controller } = setup();
    const result = new Promise((resolve) => {
      http.get('/api/v1/lists').subscribe({ error: resolve });
    });

    controller.expectOne('/api/v1/lists').flush({}, { status: 401, statusText: 'Unauthorized' });
    await result;

    expect(navigation.assign).toHaveBeenCalledWith(LOGIN_PATH);
  });

  it('leaves other errors alone', async () => {
    const { navigation, http, controller } = setup();
    const result = new Promise((resolve) => {
      http.get('/api/v1/lists').subscribe({ error: resolve });
    });

    controller.expectOne('/api/v1/lists').flush({}, { status: 500, statusText: 'Server Error' });
    await result;

    expect(navigation.assign).not.toHaveBeenCalled();
  });

  it('ignores a 401 of something that is not the API', async () => {
    const { navigation, http, controller } = setup();
    const result = new Promise((resolve) => {
      http.get('/config.json').subscribe({ error: resolve });
    });

    controller.expectOne('/config.json').flush({}, { status: 401, statusText: 'Unauthorized' });
    await result;

    expect(navigation.assign).not.toHaveBeenCalled();
  });
});
