import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { UsersService } from '../services/users.service';
import { ToastrService } from 'ngx-toastr';
import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-update-user',
  templateUrl: './update-user.component.html',
  styleUrls: ['./update-user.component.css'],
  standalone: false,
})
export class UpdateUserComponent implements OnInit {
  userId: number;
  userForm: FormGroup;
  rolesOptions: string[] = ['ROLE_USER', 'ROLE_ADMIN'];
  isLoading = false;
  isSaving = false;

  // Avatar upload
  selectedFile: File | null = null;
  avatarPreview: string | null = null;
  currentAvatar: string | null = null;

  // Audit log
  lastUpdatedBy: string = '';
  lastUpdatedAt: string = '';

  constructor(
    private usersService: UsersService,
    private route: ActivatedRoute,
    private router: Router,
    private toastr: ToastrService,
    private fb: FormBuilder,
  ) {
    // Initialize Reactive Form with validators
    this.userForm = this.fb.group({
      name: [
        '',
        [
          Validators.required,
          Validators.minLength(2),
          Validators.pattern(/^[a-zA-ZÀ-ỹ\s]+$/),
        ],
      ],
      username: [
        '',
        [
          Validators.required,
          Validators.minLength(3),
          Validators.pattern(/^[a-zA-Z0-9_]+$/),
        ],
      ],
      email: ['', [Validators.required, Validators.email]],
      studentClass: [''],
      phoneNumber: ['', [Validators.pattern(/^[0-9]{10,11}$/)]],
      role: ['ROLE_USER', Validators.required],
    });
  }

  ngOnInit(): void {
    this.userId = this.route.snapshot.params['userId'];
    this.loadUserData();
  }

  loadUserData(): void {
    this.isLoading = true;
    this.usersService.getUserById(this.userId).subscribe({
      next: (data: any) => {
        this.userForm.patchValue({
          name: data?.name || '',
          username: data?.username || '',
          email: data?.email || '',
          studentClass: data?.studentClass || data?.className || '',
          phoneNumber: data?.phoneNumber || data?.phone || '',
          role:
            Array.isArray(data?.roles) && data.roles.length > 0
              ? data.roles[0]
              : 'ROLE_USER',
        });

        this.currentAvatar = data?.avatarUrl || null;
        this.lastUpdatedBy = data?.updatedBy || 'System';
        this.lastUpdatedAt = data?.updatedAt || data?.createdAt || '';

        this.isLoading = false;
      },
      error: (err: HttpErrorResponse) => {
        this.toastr.error(err.error?.message || 'Không tìm thấy người dùng.');
        this.isLoading = false;
        this.router.navigate(['/users']);
      },
    });
  }

  // Validation error helpers
  hasError(controlName: string): boolean {
    const control = this.userForm.get(controlName);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  getErrorMessage(controlName: string): string {
    const control = this.userForm.get(controlName);
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
      if (controlName === 'name') {
        return 'Tên chỉ được chứa chữ cái và khoảng trắng';
      }
      if (controlName === 'username') {
        return 'Username chỉ được chứa chữ, số và dấu gạch dưới';
      }
      if (controlName === 'phoneNumber') {
        return 'Số điện thoại phải có 10-11 chữ số';
      }
    }
    return 'Dữ liệu không hợp lệ';
  }

  getFieldLabel(controlName: string): string {
    const labels: { [key: string]: string } = {
      name: 'Tên',
      username: 'Username',
      email: 'Email',
      studentClass: 'Lớp',
      phoneNumber: 'Số điện thoại',
      role: 'Vai trò',
    };
    return labels[controlName] || controlName;
  }

  // Avatar upload
  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        this.toastr.error('Chỉ chấp nhận file ảnh (jpg, png, gif)');
        return;
      }

      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        this.toastr.error('Kích thước ảnh không được vượt quá 2MB');
        return;
      }

      this.selectedFile = file;

      // Preview
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.avatarPreview = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  removeAvatar(): void {
    this.selectedFile = null;
    this.avatarPreview = null;
  }

  // Reset Password
  resetPassword(): void {
    Swal.fire({
      title: 'Đặt lại mật khẩu',
      text: `Đặt lại mật khẩu cho user "${this.userForm.get('username')?.value}"?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#f59e0b',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Có, đặt lại!',
      cancelButtonText: 'Hủy',
    }).then((result) => {
      if (result.isConfirmed) {
        this.usersService.resetPassword(this.userId).subscribe({
          next: (response) => {
            Swal.fire({
              title: 'Mật khẩu mới!',
              html: `Mật khẩu mới cho <strong>${this.userForm.get('username')?.value}</strong>:<br><code style="font-size:1.2em">${response.newPassword}</code>`,
              icon: 'info',
              confirmButtonText: 'OK',
            });
          },
          error: (err) => {
            this.toastr.error(
              err.error?.message || 'Không thể đặt lại mật khẩu',
            );
          },
        });
      }
    });
  }

  onSubmit(): void {
    // Mark all fields as touched to show validation errors
    Object.keys(this.userForm.controls).forEach((key) => {
      this.userForm.get(key)?.markAsTouched();
    });

    if (this.userForm.invalid) {
      this.toastr.warning('Vui lòng kiểm tra lại thông tin nhập vào');
      return;
    }

    if (this.isSaving) return;

    const formValue = this.userForm.value;
    const payload: any = {
      name: formValue.name,
      username: formValue.username,
      email: formValue.email,
      studentClass: formValue.studentClass,
      phoneNumber: formValue.phoneNumber,
      roles: [formValue.role],
    };

    this.isSaving = true;

    // If avatar selected, upload first (mock for now)
    if (this.selectedFile) {
      // TODO: Implement actual avatar upload to backend
      // For now, just proceed with user update
      console.log('Avatar upload would happen here:', this.selectedFile.name);
    }

    this.usersService.updateUser(this.userId, payload).subscribe({
      next: () => {
        this.toastr.success('Cập nhật người dùng thành công!');
        this.router.navigate(['/users']);
      },
      error: (err: HttpErrorResponse) => {
        this.toastr.error(
          err.error?.message || 'Cập nhật người dùng thất bại.',
        );
        this.isSaving = false;
      },
    });
  }

  cancel(): void {
    if (this.userForm.dirty) {
      Swal.fire({
        title: 'Hủy thay đổi?',
        text: 'Các thay đổi chưa lưu sẽ bị mất',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Có, hủy bỏ',
        cancelButtonText: 'Tiếp tục chỉnh sửa',
      }).then((result) => {
        if (result.isConfirmed) {
          this.router.navigate(['/users']);
        }
      });
    } else {
      this.router.navigate(['/users']);
    }
  }

  getAvatarDisplay(): string {
    if (this.avatarPreview) return this.avatarPreview;
    if (this.currentAvatar) return this.currentAvatar;
    return this.getDefaultAvatar();
  }

  getDefaultAvatar(): string {
    const name = this.userForm.get('name')?.value || 'U';
    const initials = name
      .split(' ')
      .map((n: string) => n.charAt(0))
      .join('')
      .toUpperCase()
      .substring(0, 2);

    // Generate SVG avatar with initials
    const colors = [
      '#ef4444',
      '#f59e0b',
      '#10b981',
      '#3b82f6',
      '#8b5cf6',
      '#ec4899',
    ];
    const color = colors[this.userId % colors.length];

    return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Crect fill='${encodeURIComponent(color)}' width='200' height='200'/%3E%3Ctext fill='%23ffffff' font-size='80' font-weight='bold' x='50%25' y='50%25' text-anchor='middle' dominant-baseline='central'%3E${initials}%3C/text%3E%3C/svg%3E`;
  }
}
