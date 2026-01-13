import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { UserAuthService } from '../services/user-auth.service';

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
  constructor(
    private toastr: ToastrService,
    private router: Router,
    private authService: UserAuthService
  ) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(req).pipe(
      catchError((error: HttpErrorResponse) => {
        let errorMsg = 'Đã xảy ra lỗi không mong muốn';

        if (error.error instanceof ErrorEvent) {
          // Client-side error
          errorMsg = error.error.message;
        } else {
          // Server-side error
          if (error.status === 401) {
            errorMsg = 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.';
            this.authService.clear();
            this.router.navigate(['/login']);
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
      })
    );
  }
}
