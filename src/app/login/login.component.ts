// src/app/login/login.component.ts
import { Component } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { NgForm } from '@angular/forms';
import { UsersService } from '../services/users.service';
import { UserAuthService } from '../services/user-auth.service';

@Component({
    selector: 'app-login',
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.css'],
    standalone: false
})
export class LoginComponent {
  username = '';
  password = '';
  remember = false;
  loading = false;
  error = '';

  constructor(
    private usersService: UsersService,
    private userAuth: UserAuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  private decodeJwtPayload(jwt: string): any | null {
    if (!jwt || typeof jwt !== 'string' || !jwt.includes('.')) return null;
    try {
      const base = jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      const json = atob(base.padEnd(base.length + (4 - (base.length % 4)) % 4, '='));
      return JSON.parse(json);
    } catch (e) {
      console.error('JWT decode error:', e);
      return null;
    }
  }

  private normalizeRole(r: string): string {
    const up = (r || '').toUpperCase();
    return up.startsWith('ROLE_') ? up : `ROLE_${up}`;
  }

  onSubmit(f: NgForm) {
    if (f.invalid) return;
    this.error = '';
    this.loading = true;

    const username = String(f.value.username || '').trim().toLowerCase();
    const password = String(f.value.password || '');

    this.usersService.login({ username, password }).subscribe({
      next: (res: any) => {
        // Backend có thể trả chuỗi token hoặc object
        const token = typeof res === 'string' ? res : (res?.token || res?.jwt || res?.jwtToken);
        if (!token) {
          this.error = 'Không nhận được token từ server.';
          this.loading = false;
          return;
        }

        this.userAuth.setToken(token);

        // Lấy info từ payload JWT (fallback khi body không có)
        const payload = this.decodeJwtPayload(token);

        const name =
          res?.name ??
          payload?.username ??
          payload?.name ??
          payload?.sub ??
          username;

        const rawRoles =
          res?.roles ??
          payload?.roles ??
          payload?.authorities ??
          (payload?.scope ? String(payload.scope).split(' ') : []);
        const roles = (Array.isArray(rawRoles) ? rawRoles : [rawRoles])
          .filter(Boolean)
          .map((r: any) =>
            typeof r === 'string'
              ? this.normalizeRole(r)
              : this.normalizeRole(r?.authority || r?.roleName || r?.name || '')
          );

        const id =
          Number(res?.userId ?? 0) ||
          Number(payload?.userId ?? payload?.id ?? payload?.uid ?? 0);

        this.userAuth.setRoles(roles);
        this.userAuth.setUserId(id);
        this.userAuth.setName(name);
        localStorage.setItem('memberId', String(id)); // tương thích chỗ cũ

        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '';
        const isAdmin = roles.includes('ROLE_ADMIN');
        this.router.navigateByUrl(returnUrl || (isAdmin ? '/books' : '/'));
      },
      error: () => {
        this.error = 'Sai tài khoản hoặc mật khẩu.';
        this.loading = false;
      },
      complete: () => (this.loading = false),
    });
  }
}
