import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { UsersService } from '../services/users.service';
import { ToastrService } from 'ngx-toastr';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-create-user',
  templateUrl: './create-user.component.html',
  styleUrls: ['./create-user.component.css'],
  standalone: false,
})
export class CreateUserComponent {
  user = {
    name: '',
    email: '',
    username: '',
    password: '',
  };
  confirmPassword = '';
  isLoading = false;
  rolesOptions: string[] = ['ROLE_USER', 'ROLE_ADMIN'];
  selectedRole: string = 'ROLE_USER';

  // New features
  sendInvitation = true; // Default to send invitation
  avatarFile: File | null = null;
  avatarPreview: string | null = null;
  emailChecking = false;
  emailExists = false;
  emailValid = false;
  private emailCheck$ = new Subject<string>();
  showPassword = false;
  passwordStrength: 'weak' | 'medium' | 'strong' | null = null;

  constructor(
    private usersService: UsersService,
    private router: Router,
    private toastr: ToastrService,
  ) {
    this.setupEmailValidation();
  }

  private setupEmailValidation(): void {
    this.emailCheck$
      .pipe(
        debounceTime(500),
        distinctUntilChanged(),
        switchMap((email) => this.usersService.checkEmailExists(email)),
      )
      .subscribe({
        next: (exists) => {
          this.emailExists = exists;
          this.emailChecking = false;
        },
        error: () => {
          this.emailChecking = false;
        },
      });
  }

  onEmailChange(email: string): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    this.emailValid = emailRegex.test(email);

    if (this.emailValid) {
      this.emailChecking = true;
      this.emailCheck$.next(email);
    } else {
      this.emailExists = false;
    }
  }

  generatePassword(): void {
    const length = 12;
    const charset =
      'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';

    // Ensure at least one of each type
    password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.charAt(
      Math.floor(Math.random() * 26),
    );
    password += 'abcdefghijklmnopqrstuvwxyz'.charAt(
      Math.floor(Math.random() * 26),
    );
    password += '0123456789'.charAt(Math.floor(Math.random() * 10));
    password += '!@#$%^&*'.charAt(Math.floor(Math.random() * 8));

    // Fill the rest
    for (let i = password.length; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }

    // Shuffle
    password = password
      .split('')
      .sort(() => Math.random() - 0.5)
      .join('');

    this.user.password = password;
    this.confirmPassword = password;
    this.checkPasswordStrength(password);
    this.toastr.success('Mật khẩu mạnh đã được tạo!', '', { timeOut: 2000 });
  }

  checkPasswordStrength(password: string): void {
    if (!password) {
      this.passwordStrength = null;
      return;
    }

    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;

    if (strength <= 2) this.passwordStrength = 'weak';
    else if (strength <= 3) this.passwordStrength = 'medium';
    else this.passwordStrength = 'strong';
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  onAvatarSelected(event: any): void {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      this.toastr.error('Vui lòng chọn tệp hình ảnh.');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      this.toastr.error('Kích thước ảnh không được vượt quá 2MB.');
      return;
    }

    this.avatarFile = file;

    // Create preview
    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.avatarPreview = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  removeAvatar(): void {
    this.avatarFile = null;
    this.avatarPreview = null;
  }

  onSubmit(): void {
    if (this.isLoading) return;

    if (this.emailExists) {
      this.toastr.error('Email này đã được sử dụng.');
      return;
    }

    if (!this.user.password || this.user.password !== this.confirmPassword) {
      this.toastr.error('Mật khẩu xác nhận không khớp.');
      return;
    }

    const rolesArray = [this.selectedRole].filter(Boolean);
    if (rolesArray.length === 0) {
      this.toastr.error('Vui lòng chọn ít nhất một vai trò.');
      return;
    }

    this.isLoading = true;

    // Create FormData if avatar is present
    if (this.avatarFile) {
      const formData = new FormData();
      formData.append('name', this.user.name);
      formData.append('email', this.user.email);
      formData.append('username', this.user.username);
      formData.append('password', this.user.password);
      formData.append('roles', rolesArray.join(','));
      formData.append('sendInvitation', this.sendInvitation.toString());
      formData.append('avatar', this.avatarFile);

      // TODO: Update usersService.createUser to handle FormData
      this.toastr.info('Upload ảnh đại diện sẽ được implement sau.');
    }

    const payload = {
      ...this.user,
      roles: rolesArray,
      sendInvitation: this.sendInvitation,
    };

    this.usersService.createUser(payload).subscribe({
      next: () => {
        if (this.sendInvitation) {
          this.toastr.success(
            'Tạo người dùng thành công! Email mời đã được gửi.',
          );
        } else {
          this.toastr.success('Tạo người dùng thành công!');
        }
        this.router.navigate(['/users']);
      },
      error: (err: HttpErrorResponse) => {
        const msg =
          err.error?.message || err.message || 'Không thể tạo người dùng.';
        this.toastr.error(msg);
        this.isLoading = false;
      },
    });
  }

  goToBulkImport(): void {
    this.router.navigate(['/admin']);
    this.toastr.info('Chức năng Import hàng loạt ở trang Admin.');
  }
}
