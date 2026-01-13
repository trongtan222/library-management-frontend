import { Injectable } from '@angular/core';
import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Observable } from 'rxjs';
import { UserAuthService } from '../services/user-auth.service';
import { IS_PUBLIC_API } from '../services/api.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private userAuth: UserAuthService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Kiểm tra xem request có được đánh dấu là public qua context không
    const isPublic = req.context.get(IS_PUBLIC_API);
    
    // Kiểm tra thêm các trường hợp đặc biệt (như login/register)
    const isAuthEndpoint = req.url.includes('/auth/authenticate') || req.url.includes('/auth/register');
    
    // Nếu API là public hoặc là endpoint auth, bỏ qua việc thêm token
    if (isPublic || isAuthEndpoint) {
      return next.handle(req);
    }

    const token = this.userAuth.getToken();
    if (token) {
      req = req.clone({
        setHeaders: { Authorization: `Bearer ${token}` }
      });
    }

    return next.handle(req);
  }
}