import { Component } from '@angular/core';
import { NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { UsersService } from '../services/users.service'; // Giả sử bạn dùng UsersService
import { HttpErrorResponse } from '@angular/common/http';

@Component({
    selector: 'app-signup',
    templateUrl: './signup.component.html',
    styleUrls: ['./signup.component.css'],
    standalone: false
})
export class SignupComponent {
  // Model để binding với form
  public model = {
    name: '',
    email: '', // <-- THÊM TRƯỜNG EMAIL
    username: '',
    password: '',
    confirmPassword: ''
  };

  // State quản lý giao diện
  public isLoading = false;
  public showPassword = false;
  public showConfirmPassword = false;
  public errorMessage: string | null = null;
  public fieldErrors: { [key: string]: string } = {};

  constructor(
    private usersService: UsersService,
    private router: Router
  ) {}

  public signup(form: NgForm): void {
    if (form.invalid || this.model.password !== this.model.confirmPassword) {
      this.errorMessage = 'Please check the errors on the form.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;
    this.fieldErrors = {};

    // Cập nhật payload để bao gồm cả email
    const payload = {
      name: this.model.name,
      email: this.model.email, // <-- THÊM EMAIL VÀO PAYLOAD
      username: this.model.username,
      password: this.model.password
    };

    this.usersService.register(payload).subscribe({
      next: () => {
        this.router.navigate(['/login'], { queryParams: { registered: 'true' } });
      },
      error: (err: HttpErrorResponse) => {
        if (err.status === 400 && err.error?.errors) {
          this.fieldErrors = err.error.errors;
          this.errorMessage = 'Please correct the highlighted fields.';
        } else if (err.status === 409) {
          this.fieldErrors['username'] = err.error.message || 'This username is already taken.';
        } else {
          this.errorMessage = err.error?.message || 'An unexpected error occurred. Please try again.';
        }
        this.isLoading = false;
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }

  public toggleShowPassword(): void {
    this.showPassword = !this.showPassword;
  }

  public toggleShowConfirmPassword(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }
}