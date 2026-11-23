import './zod-config';

import { bootstrapApplication } from '@angular/platform-browser';

import { App } from './app/app';
import { appConfig } from './app/app.config';

bootstrapApplication(App, appConfig).catch((error: unknown) => {
  // NG-CFG-03: no catalog and no error reporting exist yet; show the static message from index.html.
  document.getElementById('startup-error')?.removeAttribute('hidden');
  console.error('Bootstrap failed:', error); // bootstrap failed before the global error path exists
});
