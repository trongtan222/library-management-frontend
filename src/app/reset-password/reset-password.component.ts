import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { UsersService } from '../services/users.service';
import { ToastrService } from 'ngx-toastr';
import { Subject, takeUntil, timer } from 'rxjs';

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.css'],
  standalone: false,
})
export class ResetPasswordComponent implements OnInit, OnDestroy {
  resetForm!: FormGroup;
  token = '';
  loading = false;
  tokenValid = false;

  // Password visibility toggles
  showPassword = false;
  showConfirmPassword = false;

  // Password strength
  passwordStrength = 0;
  passwordStrengthLabel = '';
  passwordStrengthColor = '';

  // Success state
  resetSuccess = false;
  redirectCountdown = 3;

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private formBuilder: FormBuilder,
    private usersService: UsersService,
    private toastr: ToastrService,
  ) {}

  ngOnInit(): void {
    // Validate token from URL
    this.route.queryParamMap
      .pipe(takeUntil(this.destroy$))
      .subscribe((params) => {
        const tokenParam = params.get('token');
        if (!tokenParam || tokenParam.trim() === '') {
          this.toastr.error(
            'Token không hợp lệ. Vui lòng kiểm tra lại liên kết trong email.',
            'Lỗi',
          );
          this.router.navigate(['/']);
          return;
        }
        this.token = tokenParam.trim();
        this.tokenValid = true;
      });

    // Initialize form with Reactive Forms
    this.resetForm = this.formBuilder.group(
      {
        newPassword: [
          '',
          [
            Validators.required,
            Validators.minLength(6),
            this.passwordStrengthValidator(),
          ],
        ],
        confirmPassword: ['', [Validators.required]],
      },
      {
        validators: this.passwordMatchValidator,
      },
    );

    // Subscribe to password changes for strength meter
    this.resetForm
      .get('newPassword')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((password) => {
        this.updatePasswordStrength(password);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Custom validator for password strength
  passwordStrengthValidator() {
    return (control: AbstractControl): ValidationErrors | null => {
      const password = control.value;
      if (!password) return null;

      const hasUpperCase = /[A-Z]/.test(password);
      const hasLowerCase = /[a-z]/.test(password);
      const hasNumeric = /[0-9]/.test(password);
      const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

      const strengthCount = [
        hasUpperCase,
        hasLowerCase,
        hasNumeric,
        hasSpecialChar,
      ].filter(Boolean).length;

      // Require at least 3 out of 4 criteria for medium strength
      if (strengthCount < 2) {
        return { weakPassword: true };
      }

      return null;
    };
  }

  // Validator to check if passwords match
  passwordMatchValidator(group: AbstractControl): ValidationErrors | null {
    const password = group.get('newPassword')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;

    if (!confirmPassword) return null;

    return password === confirmPassword ? null : { passwordMismatch: true };
  }

  // Update password strength meter
  updatePasswordStrength(password: string): void {
    if (!password) {
      this.passwordStrength = 0;
      this.passwordStrengthLabel = '';
      this.passwordStrengthColor = '';
      return;
    }

    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumeric = /[0-9]/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    const isLongEnough = password.length >= 8;

    const criteria = [
      hasUpperCase,
      hasLowerCase,
      hasNumeric,
      hasSpecialChar,
      isLongEnough,
    ];
    const metCriteria = criteria.filter(Boolean).length;

    // Calculate strength percentage
    this.passwordStrength = (metCriteria / criteria.length) * 100;

    // Set label and color
    if (this.passwordStrength < 40) {
      this.passwordStrengthLabel = 'Yếu';
      this.passwordStrengthColor = 'danger';
    } else if (this.passwordStrength < 80) {
      this.passwordStrengthLabel = 'Trung bình';
      this.passwordStrengthColor = 'warning';
    } else {
      this.passwordStrengthLabel = 'Mạnh';
      this.passwordStrengthColor = 'success';
    }
  }

  // Toggle password visibility
  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  // Check if password meets specific criteria
  get hasUpperCase(): boolean {
    const password = this.resetForm.get('newPassword')?.value || '';
    return /[A-Z]/.test(password);
  }

  get hasLowerCase(): boolean {
    const password = this.resetForm.get('newPassword')?.value || '';
    return /[a-z]/.test(password);
  }

  get hasNumber(): boolean {
    const password = this.resetForm.get('newPassword')?.value || '';
    return /[0-9]/.test(password);
  }

  get hasSpecialChar(): boolean {
    const password = this.resetForm.get('newPassword')?.value || '';
    return /[!@#$%^&*(),.?":{}|<>]/.test(password);
  }

  get isLongEnough(): boolean {
    const password = this.resetForm.get('newPassword')?.value || '';
    return password.length >= 8;
  }

  // Block paste event on confirm password field
  preventPaste(event: ClipboardEvent): void {
    event.preventDefault();
    this.toastr.warning(
      'Vui lòng gõ lại mật khẩu để xác nhận',
      'Không thể dán',
    );
  }

  // Submit form
  onSubmit(): void {
    if (this.resetForm.invalid || !this.tokenValid) {
      this.resetForm.markAllAsTouched();

      if (this.resetForm.hasError('passwordMismatch')) {
        this.toastr.error('Mật khẩu xác nhận không khớp', 'Lỗi');
      } else if (this.resetForm.get('newPassword')?.hasError('weakPassword')) {
        this.toastr.error(
          'Mật khẩu quá yếu. Vui lòng chọn mật khẩu mạnh hơn',
          'Lỗi',
        );
      } else {
        this.toastr.error('Vui lòng kiểm tra lại thông tin', 'Lỗi');
      }
      return;
    }

    this.loading = true;

    const resetData = {
      token: this.token,
      newPassword: this.resetForm.get('newPassword')?.value,
    };

    this.usersService.confirmPasswordReset(resetData).subscribe({
      next: () => {
        this.toastr.success('Đặt lại mật khẩu thành công!', 'Thành công');
        this.resetSuccess = true;
        this.startRedirectCountdown();
      },
      error: (err) => {
        const errorMessage =
          err?.error?.message ||
          'Không thể đặt lại mật khẩu. Vui lòng thử lại.';
        this.toastr.error(errorMessage, 'Lỗi');
        this.loading = false;
      },
    });
  }

  // Start countdown and auto-redirect
  startRedirectCountdown(): void {
    timer(0, 1000)
      .pipe(takeUntil(this.destroy$))
      .subscribe((count) => {
        this.redirectCountdown = 3 - count;
        if (this.redirectCountdown <= 0) {
          this.router.navigate(['/login']);
        }
      });
  }

  // Manual navigation to login
  navigateToLogin(): void {
    this.router.navigate(['/login']);
  }
}
