import { Component } from '@angular/core';
import { NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { UsersService } from '../services/users.service';
import { HttpErrorResponse } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-signup',
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.css'],
  standalone: false
})
export class SignupComponent {
  public model = {
    name: '',
    studentClass: '',
    phoneNumber: '',
    email: '', 
    username: '',
    password: '',
    confirmPassword: ''
  };

  public isLoading = false;
  public showPassword = false;
  public showConfirmPassword = false;
  public fieldErrors: { [key: string]: string } = {};
errorMessage: any;

  constructor(
    private usersService: UsersService,
    private router: Router,
    private toastr: ToastrService
  ) {}

  public signup(form: NgForm): void {
    if (form.invalid || this.model.password !== this.model.confirmPassword) {
      this.toastr.warning('Vui lòng kiểm tra lại thông tin trên form.', 'Thông báo');
      return;
    }

    this.isLoading = true;
    this.fieldErrors = {};

    const payload = {
      name: this.model.name,
      studentClass: this.model.studentClass,
      phoneNumber: this.model.phoneNumber,
      email: this.model.email,
      username: this.model.username,
      password: this.model.password
    };

    this.usersService.register(payload).subscribe({
      next: () => {
        this.toastr.success('Đăng ký tài khoản thành công!');
        this.router.navigate(['/login'], { queryParams: { registered: 'true' } });
      },
      error: (err: HttpErrorResponse) => {
        if (err.status === 400 && err.error?.errors) {
          this.fieldErrors = err.error.errors;
          this.toastr.error('Vui lòng sửa các lỗi được đánh dấu.', 'Lỗi nhập liệu');
        } else if (err.status === 409) {
          this.toastr.error(err.error.message || 'Tên đăng nhập đã tồn tại.', 'Lỗi đăng ký');
        } else {
          this.toastr.error(err.error?.message || 'Đã có lỗi xảy ra. Vui lòng thử lại.', 'Lỗi hệ thống');
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