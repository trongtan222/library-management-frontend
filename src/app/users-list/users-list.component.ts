import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
// SỬA: Import từ users.ts
import { User } from '../models/user';
import { UsersService } from '../services/users.service';
import { ToastrService } from 'ngx-toastr';

@Component({
    selector: 'app-users-list',
    templateUrl: './users-list.component.html',
    styleUrls: ['./users-list.component.css'],
    standalone: false
})
export class UsersListComponent implements OnInit {
  users: User[] = [];

  userToAction: User | null = null;
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

  openConfirmModal(user: User, type: 'delete' | 'reset'): void {
    this.userToAction = user;
    this.actionType = type;
  }

  cancelAction(): void {
    this.userToAction = null;
    this.actionType = null;
  }

  confirmAction(): void {
    if (!this.userToAction || !this.actionType) return;

    if (this.actionType === 'delete') {
      this.usersService.deleteUser(this.userToAction.userId).subscribe({
        next: () => {
          this.toastr.success(`User "${this.userToAction?.username}" deleted successfully.`);
          this.getUsers(); 
        },
        error: (err) => this.toastr.error(err.error?.message || 'Failed to delete user.')
      });
    } else if (this.actionType === 'reset') {
      this.usersService.resetPassword(this.userToAction.userId).subscribe({
        next: (response) => {
          this.toastr.info(`Password for ${this.userToAction?.username} has been reset. New password: ${response.newPassword}`, 'Password Reset', { timeOut: 10000 });
        },
        error: (err) => this.toastr.error(err.error?.message || 'Failed to reset password.')
      });
    }

    this.cancelAction();
  }
}