import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { Router } from '@angular/router';
import { UsersService } from '../services/users.service';
import { HttpErrorResponse } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';
import { Observable, of, timer } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-signup',
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.css'],
  standalone: false,
})
export class SignupComponent implements OnInit {
  signupForm: FormGroup;
  isLoading = false;
  showPassword = false;
  showConfirmPassword = false;

  // Password strength
  passwordStrength = {
    value: 0,
    label: '',
    color: '',
    requirements: {
      minLength: false,
      hasUpperCase: false,
      hasLowerCase: false,
      hasNumber: false,
      hasSpecial: false,
    },
  };

  constructor(
    private fb: FormBuilder,
    private usersService: UsersService,
    private router: Router,
    private toastr: ToastrService,
  ) {
    // Initialize Reactive Form
    this.signupForm = this.fb.group(
      {
        name: [
          '',
          [
            Validators.required,
            Validators.minLength(2),
            Validators.pattern(/^[a-zA-ZÀ-ỹ\s]+$/),
          ],
        ],
        studentClass: ['', [Validators.required, Validators.minLength(2)]],
        phoneNumber: [
          '',
          [Validators.required, Validators.pattern(/^[0-9]{10,11}$/)],
        ],
        email: [
          '',
          [Validators.required, Validators.email],
          [this.emailExistsValidator.bind(this)],
        ],
        username: [
          '',
          [
            Validators.required,
            Validators.minLength(3),
            Validators.pattern(/^[a-zA-Z0-9_]+$/),
          ],
        ],
        password: [
          '',
          [
            Validators.required,
            Validators.minLength(8),
            this.passwordStrengthValidator(),
          ],
        ],
        confirmPassword: ['', Validators.required],
      },
      {
        validators: this.passwordMatchValidator,
      },
    );
  }

  ngOnInit(): void {
    // Watch password changes for strength meter
    this.signupForm.get('password')?.valueChanges.subscribe((password) => {
      this.updatePasswordStrength(password || '');
    });
  }

  // Custom Validators
  passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password');
    const confirmPassword = control.get('confirmPassword');

    if (!password || !confirmPassword) return null;

    return password.value === confirmPassword.value
      ? null
      : { passwordMismatch: true };
  }

  passwordStrengthValidator() {
    return (control: AbstractControl): ValidationErrors | null => {
      const password = control.value;
      if (!password) return null;

      const hasUpperCase = /[A-Z]/.test(password);
      const hasLowerCase = /[a-z]/.test(password);
      const hasNumber = /[0-9]/.test(password);
      const minLength = password.length >= 8;

      const isStrong = hasUpperCase && hasLowerCase && hasNumber && minLength;

      return isStrong ? null : { weakPassword: true };
    };
  }

  emailExistsValidator(
    control: AbstractControl,
  ): Observable<ValidationErrors | null> {
    if (!control.value) {
      return of(null);
    }

    // Debounce 500ms before checking
    return timer(500).pipe(
      switchMap(() => this.usersService.checkEmailExists(control.value)),
      map((exists) => (exists ? { emailExists: true } : null)),
      catchError(() => of(null)),
    );
  }

  // Password Strength Meter
  updatePasswordStrength(password: string): void {
    const requirements = {
      minLength: password.length >= 8,
      hasUpperCase: /[A-Z]/.test(password),
      hasLowerCase: /[a-z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    };

    this.passwordStrength.requirements = requirements;

    // Calculate strength (0-100)
    const fulfilled = Object.values(requirements).filter(Boolean).length;
    const strength = (fulfilled / 5) * 100;

    this.passwordStrength.value = strength;

    if (strength < 40) {
      this.passwordStrength.label = 'Yếu';
      this.passwordStrength.color = 'danger';
    } else if (strength < 70) {
      this.passwordStrength.label = 'Trung bình';
      this.passwordStrength.color = 'warning';
    } else if (strength < 100) {
      this.passwordStrength.label = 'Tốt';
      this.passwordStrength.color = 'info';
    } else {
      this.passwordStrength.label = 'Mạnh';
      this.passwordStrength.color = 'success';
    }
  }

  // Validation helpers
  hasError(controlName: string): boolean {
    const control = this.signupForm.get(controlName);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  getErrorMessage(controlName: string): string {
    const control = this.signupForm.get(controlName);
    if (!control) return '';

    if (control.hasError('required')) {
      return `${this.getFieldLabel(controlName)} không được để trống`;
    }
    if (control.hasError('email')) {
      return 'Email không đúng định dạng (vd: user@example.com)';
    }
    if (control.hasError('minlength')) {
      const minLength = control.errors?.['minlength'].requiredLength;
      return `${this.getFieldLabel(controlName)} phải có ít nhất ${minLength} ký tự`;
    }
    if (control.hasError('pattern')) {
      if (controlName === 'name')
        return 'Tên chỉ được chứa chữ cái và khoảng trắng';
      if (controlName === 'username')
        return 'Tên đăng nhập chỉ được chứa chữ, số và dấu gạch dưới';
      if (controlName === 'phoneNumber')
        return 'Số điện thoại phải có 10-11 chữ số';
    }
    if (control.hasError('weakPassword')) {
      return 'Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường và số';
    }
    if (control.hasError('emailExists')) {
      return 'Email này đã được sử dụng';
    }

    // Password mismatch at form level
    if (
      controlName === 'confirmPassword' &&
      this.signupForm.hasError('passwordMismatch')
    ) {
      return 'Mật khẩu xác nhận không khớp';
    }

    return 'Dữ liệu không hợp lệ';
  }

  getFieldLabel(controlName: string): string {
    const labels: { [key: string]: string } = {
      name: 'Họ và tên',
      studentClass: 'Lớp',
      phoneNumber: 'Số điện thoại',
      email: 'Email',
      username: 'Tên đăng nhập',
      password: 'Mật khẩu',
      confirmPassword: 'Xác nhận mật khẩu',
    };
    return labels[controlName] || controlName;
  }

  public signup(): void {
    // Mark all fields as touched to show validation errors
    Object.keys(this.signupForm.controls).forEach((key) => {
      this.signupForm.get(key)?.markAsTouched();
    });

    if (this.signupForm.invalid) {
      this.toastr.warning(
        'Vui lòng kiểm tra lại thông tin trên form.',
        'Thông báo',
      );
      return;
    }

    if (this.isLoading) return;

    this.isLoading = true;

    const formValue = this.signupForm.value;
    const payload = {
      name: formValue.name,
      studentClass: formValue.studentClass,
      phoneNumber: formValue.phoneNumber,
      email: formValue.email,
      username: formValue.username,
      password: formValue.password,
    };

    this.usersService.register(payload).subscribe({
      next: () => {
        this.toastr.success(
          'Đăng ký tài khoản thành công! Vui lòng đăng nhập.',
          'Thành công',
          {
            timeOut: 3000,
          },
        );
        // Smooth transition to login
        setTimeout(() => {
          this.router.navigate(['/login'], {
            queryParams: { registered: 'true' },
            state: { username: formValue.username },
          });
        }, 500);
      },
      error: (err: HttpErrorResponse) => {
        if (err.status === 400 && err.error?.errors) {
          const errors = err.error.errors;
          Object.keys(errors).forEach((key) => {
            const control = this.signupForm.get(key);
            if (control) {
              control.setErrors({ serverError: errors[key] });
            }
          });
          this.toastr.error(
            'Vui lòng sửa các lỗi được đánh dấu.',
            'Lỗi nhập liệu',
          );
        } else if (err.status === 409) {
          this.toastr.error(
            err.error.message || 'Tên đăng nhập hoặc email đã tồn tại.',
            'Lỗi đăng ký',
          );
        } else {
          this.toastr.error(
            err.error?.message || 'Đã có lỗi xảy ra. Vui lòng thử lại.',
            'Lỗi hệ thống',
          );
        }
        this.isLoading = false;
      },
    });
  }

  public toggleShowPassword(): void {
    this.showPassword = !this.showPassword;
  }

  public toggleShowConfirmPassword(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }
}
