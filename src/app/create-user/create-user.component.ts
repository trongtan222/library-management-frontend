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
    email: '', // <-- THÊM DÒNG NÀY
    username: '',
    password: '',
    roles: 'ROLE_USER' // Mặc định
  };
  isLoading = false;

  constructor(
    private usersService: UsersService,
    private router: Router,
    private toastr: ToastrService
  ) { }

  onSubmit(): void {
    this.isLoading = true;
    const rolesArray = this.user.roles.split(',').map(role => role.trim()).filter(Boolean);
    // Payload đã bao gồm email do sử dụng spread operator (...)
    const payload = { ...this.user, roles: rolesArray };

    this.usersService.createUser(payload).subscribe({
      next: () => {
        this.toastr.success('User created successfully!');
        this.router.navigate(['/users']);
      },
      error: (err: HttpErrorResponse) => {
        this.toastr.error(err.error?.message || 'Failed to create user.');
        this.isLoading = false;
      }
    });
  }
}