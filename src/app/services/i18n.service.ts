import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export type Language = 'vi' | 'en';

@Injectable({
  providedIn: 'root',
})
export class I18nService {
  private apiUrl = `${environment.apiBaseUrl}/api/public/i18n`;
  private currentLang = new BehaviorSubject<Language>('vi');
  private messages: { [key: string]: string } = {};

  currentLang$ = this.currentLang.asObservable();

  constructor(private http: HttpClient) {
    // Load saved language from localStorage
    const savedLang = localStorage.getItem('language') as Language;
    if (savedLang) {
      this.setLanguage(savedLang);
    } else {
      this.loadMessages('vi');
    }
  }

  setLanguage(lang: Language): void {
    this.currentLang.next(lang);
    localStorage.setItem('language', lang);
    this.loadMessages(lang);
  }

  getLanguage(): Language {
    return this.currentLang.value;
  }

  loadMessages(lang: Language): void {
    this.http
      .get<{ [key: string]: string }>(`${this.apiUrl}/messages`, {
        params: { lang },
      })
      .subscribe((messages) => {
        this.messages = messages;
      });
  }

  translate(key: string, params?: { [key: string]: string }): string {
    let message = this.messages[key] || key;

    if (params) {
      Object.keys(params).forEach((param) => {
        message = message.replace(`{${param}}`, params[param]);
      });
    }

    return message;
  }

  t(key: string, params?: { [key: string]: string }): string {
    return this.translate(key, params);
  }

  getSupportedLanguages(): Observable<Language[]> {
    return this.http.get<Language[]>(`${this.apiUrl}/languages`);
  }
}
