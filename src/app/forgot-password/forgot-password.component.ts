import { Component } from '@angular/core';
import { NgForm } from '@angular/forms';
import { UsersService } from '../services/users.service';

@Component({
    selector: 'app-forgot-password',
    templateUrl: './forgot-password.component.html',
    styleUrls: ['./forgot-password.component.css'],
    standalone: false
})
export class ForgotPasswordComponent {
  email = '';
  loading = false;
  successMessage = '';
  errorMessage = '';

  constructor(private usersService: UsersService) {}

  onSubmit(form: NgForm): void {
    if (form.invalid) {
      return;
    }

    this.loading = true;
    this.successMessage = '';
    this.errorMessage = '';

    const payloadEmail = (this.email || '').trim();

    this.usersService.requestPasswordReset(payloadEmail).subscribe({
      next: () => {
        this.successMessage = 'Nếu email tồn tại trong hệ thống, hướng dẫn đặt lại mật khẩu đã được gửi.';
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || 'Không thể gửi yêu cầu lúc này. Vui lòng thử lại sau.';
      },
      complete: () => {
        this.loading = false;
      }
    });
  }
}
