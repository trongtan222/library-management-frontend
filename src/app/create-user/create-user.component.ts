import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { UsersService } from '../services/users.service';
import { ToastrService } from 'ngx-toastr';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
    selector: 'app-create-user',
    templateUrl: './create-user.component.html',
    styleUrls: ['./create-user.component.css'],
    standalone: false
})
export class CreateUserComponent {
  user = {
    name: '',
    email: '',
    username: '',
    password: ''
  };
  confirmPassword = '';
  isLoading = false;
  rolesOptions: string[] = ['ROLE_USER', 'ROLE_ADMIN'];
  selectedRole: string = 'ROLE_USER';

  constructor(
    private usersService: UsersService,
    private router: Router,
    private toastr: ToastrService
  ) { }

  onSubmit(): void {
    if (this.isLoading) return;

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
    const payload = { ...this.user, roles: rolesArray };

    this.usersService.createUser(payload).subscribe({
      next: () => {
        this.toastr.success('Tạo người dùng thành công!');
        this.router.navigate(['/users']);
      },
      error: (err: HttpErrorResponse) => {
        const msg = err.error?.message || err.message || 'Không thể tạo người dùng.';
        this.toastr.error(msg);
        this.isLoading = false;
      }
    });
  }
}