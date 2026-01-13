import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NgForm } from '@angular/forms';
import { UsersService } from '../services/users.service';

@Component({
    selector: 'app-reset-password',
    templateUrl: './reset-password.component.html',
    styleUrls: ['./reset-password.component.css'],
    standalone: false
})
export class ResetPasswordComponent implements OnInit {
  token = '';
  newPassword = '';
  confirmPassword = '';
  loading = false;
  errorMessage = '';
  successMessage = '';
  tokenLocked = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private usersService: UsersService
  ) {}

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(params => {
      const tokenParam = params.get('token');
      if (tokenParam) {
        this.token = tokenParam;
        this.tokenLocked = true;
      }
    });
  }

  get passwordsMismatch(): boolean {
    return !!this.confirmPassword && this.confirmPassword !== this.newPassword;
  }

  onSubmit(form: NgForm): void {
    if (form.invalid || this.passwordsMismatch) {
      if (this.passwordsMismatch) {
        this.errorMessage = 'Mật khẩu xác nhận không khớp.';
      }
      return;
    }

    if (!this.token.trim()) {
      this.errorMessage = 'Token không hợp lệ. Vui lòng kiểm tra lại liên kết trong email.';
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.usersService.confirmPasswordReset({
      token: this.token.trim(),
      newPassword: this.newPassword
    }).subscribe({
      next: () => {
        this.successMessage = 'Đặt lại mật khẩu thành công. Bạn có thể đăng nhập với mật khẩu mới.';
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || 'Không thể đặt lại mật khẩu. Vui lòng thử lại.';
      },
      complete: () => {
        this.loading = false;
      }
    });
  }

  navigateToLogin(): void {
    this.router.navigate(['/login']);
  }
}
