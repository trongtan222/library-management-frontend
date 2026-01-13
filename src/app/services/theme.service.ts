import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly THEME_KEY = 'app-theme';
  private readonly DEFAULT_THEME = 'dark';
  private themeSubject: BehaviorSubject<'light' | 'dark'>;
  public theme$: Observable<'light' | 'dark'>;

  constructor() {
    const savedTheme =
      (localStorage.getItem(this.THEME_KEY) as 'light' | 'dark') ||
      this.DEFAULT_THEME;
    this.themeSubject = new BehaviorSubject<'light' | 'dark'>(savedTheme);
    this.theme$ = this.themeSubject.asObservable();
    this.applyTheme(savedTheme);
  }

  getCurrentTheme(): 'light' | 'dark' {
    return this.themeSubject.value;
  }

  toggleTheme(): void {
    const newTheme = this.getCurrentTheme() === 'light' ? 'dark' : 'light';
    this.setTheme(newTheme);
  }

  setTheme(theme: 'light' | 'dark'): void {
    localStorage.setItem(this.THEME_KEY, theme);
    this.themeSubject.next(theme);
    this.applyTheme(theme);
  }

  private applyTheme(theme: 'light' | 'dark'): void {
    const htmlElement = document.documentElement;
    const body = document.body;

    if (theme === 'light') {
      htmlElement.setAttribute('data-bs-theme', 'light');
      body.classList.remove('dark-theme');
      body.classList.add('light-theme');
    } else {
      htmlElement.setAttribute('data-bs-theme', 'dark');
      body.classList.remove('light-theme');
      body.classList.add('dark-theme');
    }
  }
}
