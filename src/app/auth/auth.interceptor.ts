// auth.interceptor.ts
import { Injectable } from '@angular/core';
import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Observable } from 'rxjs';
import { UserAuthService } from '../services/user-auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private userAuth: UserAuthService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const token = this.userAuth.getToken();

    const isPreflight = req.method === 'OPTIONS';
    const isAuth      = req.url.endsWith('/authenticate') || req.url.includes('/auth/');
    const isOpenDocs  = req.url.includes('/swagger-ui') || req.url.includes('/v3/api-docs');
    const isH2        = req.url.includes('/h2-console');

    // ✅ Chỉ /books và /books/** là public (loại trừ admin)
    let isPublicBooks = false;
    try {
      const u = new URL(req.url);
      const p = u.pathname; // ví dụ: /admin/books, /books, /books/1
      isPublicBooks =
        req.method === 'GET' &&
        (p === '/books' || p.startsWith('/books/')) &&
        !p.startsWith('/admin/');
    } catch {
      // fallback khi req.url không phải URL tuyệt đối
      isPublicBooks =
        req.method === 'GET' &&
        /(^|\/)books(\/|\?|$)/.test(req.url) &&
        !/\/admin\/books/.test(req.url);
    }

    const isPublic = isPreflight || isAuth || isOpenDocs || isH2 || isPublicBooks;

    if (!isPublic && token) {
      req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
    }

    return next.handle(req);
  }
}
