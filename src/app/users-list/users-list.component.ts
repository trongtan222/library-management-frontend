import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Users } from '../models/users';
import { UsersService } from '../services/users.service';
import { ToastrService } from 'ngx-toastr';

@Component({
    selector: 'app-users-list',
    templateUrl: './users-list.component.html',
    styleUrls: ['./users-list.component.css'],
    standalone: false
})
export class UsersListComponent implements OnInit {
  users: Users[] = [];

  // State cho modal xác nhận
  userToAction: Users | null = null;
  actionType: 'delete' | 'reset' | null = null;

  constructor(
    private usersService: UsersService, 
    private router: Router,
    private toastr: ToastrService
  ) { }

  ngOnInit(): void {
    this.getUsers();
  }

  private getUsers() {
    this.usersService.getUsersList().subscribe(data => {
      this.users = data;
    });
  }

  updateUser(userId: number) {
    this.router.navigate(['update-user', userId]);
  }

  // Mở modal xác nhận
  openConfirmModal(user: Users, type: 'delete' | 'reset'): void {
    this.userToAction = user;
    this.actionType = type;
  }

  // Hủy hành động và đóng modal
  cancelAction(): void {
    this.userToAction = null;
    this.actionType = null;
  }

  // Xử lý sau khi người dùng xác nhận
  confirmAction(): void {
    if (!this.userToAction || !this.actionType) return;

    if (this.actionType === 'delete') {
      this.usersService.deleteUser(this.userToAction.userId).subscribe({
        next: () => {
          this.toastr.success(`User "${this.userToAction?.username}" deleted successfully.`);
          this.getUsers(); // Tải lại danh sách
        },
        error: (err) => this.toastr.error(err.error?.message || 'Failed to delete user.')
      });
    } else if (this.actionType === 'reset') {
      this.usersService.resetPassword(this.userToAction.userId).subscribe({
        next: (response) => {
          // Hiển thị mật khẩu mới cho admin một cách an toàn hơn
          this.toastr.info(`Password for ${this.userToAction?.username} has been reset. New password: ${response.newPassword}`, 'Password Reset', { timeOut: 10000 });
        },
        error: (err) => this.toastr.error(err.error?.message || 'Failed to reset password.')
      });
    }

    this.cancelAction(); // Đóng modal sau khi thực hiện
  }
}
