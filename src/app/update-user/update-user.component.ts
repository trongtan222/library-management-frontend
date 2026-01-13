import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { UsersService } from '../services/users.service';
import { ToastrService } from 'ngx-toastr';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
    selector: 'app-update-user',
    templateUrl: './update-user.component.html',
    styleUrls: ['./update-user.component.css'],
    standalone: false
})
export class UpdateUserComponent implements OnInit {
  userId: number;
  user: { name: string; username: string; email: string; studentClass: string; phoneNumber: string } = { name: '', username: '', email: '', studentClass: '', phoneNumber: '' };
  rolesOptions: string[] = ['ROLE_USER', 'ROLE_ADMIN'];
  selectedRole: string = 'ROLE_USER';
  isLoading = false;
  
  constructor(
    private usersService: UsersService,
    private route: ActivatedRoute,
    private router: Router,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.userId = this.route.snapshot.params['userId'];
    this.isLoading = true;
    this.usersService.getUserById(this.userId).subscribe({
      next: (data: any) => {
        this.user = {
          name: data?.name || '',
          username: data?.username || '',
          email: data?.email || '',
          studentClass: data?.studentClass || '',
          phoneNumber: data?.phoneNumber || ''
        };
        // If backend returns roles as array
        if (Array.isArray(data?.roles) && data.roles.length > 0) {
          this.selectedRole = data.roles[0];
        }
        this.isLoading = false;
      },
      error: (err: HttpErrorResponse) => {
        this.toastr.error(err.error?.message || 'Không tìm thấy người dùng.');
        this.isLoading = false;
        this.router.navigate(['/users']);
      }
    });
  }

  onSubmit() {
    if (this.isLoading) return;

    const payload: any = {
      name: this.user.name,
      username: this.user.username,
      email: this.user.email,
      studentClass: this.user.studentClass,
      phoneNumber: this.user.phoneNumber,
      roles: [this.selectedRole]
    };

    this.isLoading = true;
    this.usersService.updateUser(this.userId, payload).subscribe({
      next: () => {
        this.toastr.success('Cập nhật người dùng thành công!');
        this.router.navigate(['/users']);
      },
      error: (err: HttpErrorResponse) => {
        this.toastr.error(err.error?.message || 'Cập nhật người dùng thất bại.');
        this.isLoading = false;
      }
    });
  }
}
