import { Component, OnDestroy } from '@angular/core';
import { NgForm } from '@angular/forms';
import { UsersService } from '../services/users.service';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.css'],
  standalone: false,
})
export class ForgotPasswordComponent implements OnDestroy {
  email = '';
  loading = false;
  successMessage = '';
  errorMessage = '';
  emailSent = false; // Track if email was successfully sent
  resendCountdown = 0; // Countdown timer for resend
  private resendTimer?: ReturnType<typeof setInterval>;

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
        this.emailSent = true;
        this.successMessage =
          'Chúng tôi đã gửi link khôi phục đến email của bạn. Vui lòng kiểm tra cả hòm thư Spam.';
        this.startResendTimer();
      },
      error: (err) => {
        this.errorMessage =
          err?.error?.message ||
          'Không thể gửi yêu cầu lúc này. Vui lòng thử lại sau.';
      },
      complete: () => {
        this.loading = false;
      },
    });
  }

  startResendTimer(): void {
    this.resendCountdown = 60;
    this.clearTimer();
    this.resendTimer = setInterval(() => {
      this.resendCountdown--;
      if (this.resendCountdown <= 0) {
        this.clearTimer();
      }
    }, 1000);
  }

  clearTimer(): void {
    if (this.resendTimer) {
      clearInterval(this.resendTimer);
      this.resendTimer = undefined;
    }
  }

  resendEmail(): void {
    if (this.resendCountdown > 0 || this.loading) {
      return;
    }
    this.errorMessage = '';
    this.successMessage = '';
    this.loading = true;

    const payloadEmail = (this.email || '').trim();
    this.usersService.requestPasswordReset(payloadEmail).subscribe({
      next: () => {
        this.successMessage = 'Email đã được gửi lại!';
        this.startResendTimer();
      },
      error: (err) => {
        this.errorMessage =
          err?.error?.message ||
          'Không thể gửi lại email. Vui lòng thử lại sau.';
      },
      complete: () => {
        this.loading = false;
      },
    });
  }

  openGmail(): void {
    window.open('https://mail.google.com', '_blank');
  }

  resetForm(): void {
    this.emailSent = false;
    this.email = '';
    this.successMessage = '';
    this.errorMessage = '';
    this.clearTimer();
  }

  ngOnDestroy(): void {
    this.clearTimer();
  }
}
