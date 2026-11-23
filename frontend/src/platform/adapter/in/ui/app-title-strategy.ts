import { inject, Injectable } from '@angular/core';
import { Title } from '@angular/platform-browser';
import type { RouterStateSnapshot } from '@angular/router';
import { TitleStrategy } from '@angular/router';
import { TranslocoService } from '@jsverse/transloco';

/** "Page | App" (A11Y-21, NG-UI-31). The route `title` is a translation key from the shell catalog. */
@Injectable()
export class AppTitleStrategy extends TitleStrategy {
  private readonly title = inject(Title);
  private readonly transloco = inject(TranslocoService);

  override updateTitle(snapshot: RouterStateSnapshot): void {
    const key = this.buildTitle(snapshot);
    const app = this.transloco.translate('shell.appName');
    this.title.setTitle(key ? `${this.transloco.translate(key)} | ${app}` : app);
  }
}
