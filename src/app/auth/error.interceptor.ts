import { Injectable } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, switchMap, filter, take } from 'rxjs/operators';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { UserAuthService } from '../services/user-auth.service';
import { environment } from 'src/environments/environment';
import { HttpClient } from '@angular/common/http';

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
  private isRefreshing = false;
  private refreshTokenSubject: BehaviorSubject<string | null> =
    new BehaviorSubject<string | null>(null);

  constructor(
    private toastr: ToastrService,
    private router: Router,
    private authService: UserAuthService,
    private http: HttpClient,
  ) {}

  intercept(
    req: HttpRequest<any>,
    next: HttpHandler,
  ): Observable<HttpEvent<any>> {
    return next.handle(req).pipe(
      catchError((error: HttpErrorResponse) => {
        let errorMsg = 'Đã xảy ra lỗi không mong muốn';

        if (error.error instanceof ErrorEvent) {
          // Client-side error
          errorMsg = error.error.message;
        } else {
          // Server-side error
          if (error.status === 401) {
            // Try refresh token before logging out
            return this.handle401Error(req, next);
          } else if (error.status === 403) {
            errorMsg = 'Bạn không có quyền truy cập tài nguyên này.';
            this.router.navigate(['/forbidden']);
          } else if (error.status === 404) {
            errorMsg = 'Không tìm thấy dữ liệu yêu cầu.';
          } else if (error.status === 400) {
            // Validation error
            if (error.error?.errors) {
              const errors = Object.values(error.error.errors) as string[];
              errorMsg = errors.join(', ');
            } else {
              errorMsg = error.error?.message || 'Dữ liệu không hợp lệ.';
            }
          } else if (error.status === 409) {
            errorMsg = error.error?.message || 'Xung đột dữ liệu.';
          } else if (error.status >= 500) {
            errorMsg = 'Lỗi máy chủ. Vui lòng thử lại sau.';
          }
        }

        this.toastr.error(errorMsg, 'Lỗi');
        return throwError(() => error);
      }),
    );
  }

  private handle401Error(
    request: HttpRequest<any>,
    next: HttpHandler,
  ): Observable<HttpEvent<any>> {
    // Don't refresh if it's already a refresh-token request (avoid infinite loop)
    if (request.url.includes('/auth/refresh-token')) {
      this.authService.clear();
      this.router.navigate(['/login']);
      return throwError(() => new Error('Refresh token expired'));
    }

    if (!this.isRefreshing) {
      this.isRefreshing = true;
      this.refreshTokenSubject.next(null);

      const refreshToken = this.authService.getRefreshToken();
      if (!refreshToken) {
        this.authService.clear();
        this.router.navigate(['/login']);
        return throwError(() => new Error('No refresh token available'));
      }

      return this.http
        .post<any>(`${environment.apiBaseUrl}/auth/refresh-token`, {
          refreshToken,
        })
        .pipe(
          switchMap((response: any) => {
            this.isRefreshing = false;
            this.authService.setToken(response.token);
            this.authService.setUserId(response.userId);
            this.authService.setName(response.name);
            this.authService.setRoles(response.roles);
            this.refreshTokenSubject.next(response.token);

            // Retry the original failed request with new token
            return next.handle(this.addTokenToRequest(request, response.token));
          }),
          catchError((err) => {
            this.isRefreshing = false;
            this.authService.clear();
            this.toastr.error(
              'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.',
              'Lỗi',
            );
            this.router.navigate(['/login']);
            return throwError(() => err);
          }),
        );
    } else {
      // Wait for refresh to complete, then retry request with new token
      return this.refreshTokenSubject.pipe(
        filter((token) => token !== null),
        take(1),
        switchMap((token) =>
          next.handle(this.addTokenToRequest(request, token!)),
        ),
      );
    }
  }

  private addTokenToRequest(
    request: HttpRequest<any>,
    token: string,
  ): HttpRequest<any> {
    return request.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
  }
}
