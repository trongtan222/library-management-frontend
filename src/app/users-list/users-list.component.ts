import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { User } from '../models/user';
import { UsersService } from '../services/users.service';
import { ToastrService } from 'ngx-toastr';
import Swal from 'sweetalert2';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

@Component({
  selector: 'app-users-list',
  templateUrl: './users-list.component.html',
  styleUrls: ['./users-list.component.css'],
  standalone: false,
})
export class UsersListComponent implements OnInit {
  users: User[] = [];
  filteredUsers: User[] = [];

  // Search & Filter
  searchTerm: string = '';
  private searchSubject = new Subject<string>();
  selectedRole: string = 'all';
  selectedStatus: string = 'all';

  // Sorting
  sortColumn: string = 'userId';
  sortDirection: 'asc' | 'desc' = 'asc';

  // Bulk Actions
  selectedUserIds = new Set<number>();
  selectAll: boolean = false;

  // View Mode
  viewMode: 'table' | 'card' = 'table';

  userToAction: User | null = null;
  actionType: 'delete' | 'reset' | null = null;

  constructor(
    private usersService: UsersService,
    private router: Router,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.getUsers();
    this.setupSearch();
    this.detectViewMode();
  }

  private setupSearch(): void {
    this.searchSubject
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe((searchTerm) => {
        this.searchTerm = searchTerm;
        this.applyFilters();
      });
  }

  private detectViewMode(): void {
    // Auto switch to card view on mobile
    if (window.innerWidth < 768) {
      this.viewMode = 'card';
    }
  }

  onSearchChange(term: string): void {
    this.searchSubject.next(term);
  }

  private getUsers() {
    this.usersService.getUsersList().subscribe((data) => {
      this.users = data;
      this.applyFilters();
    });
  }

  applyFilters(): void {
    let filtered = [...this.users];

    // Search filter
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(
        (u) =>
          u.name?.toLowerCase().includes(term) ||
          u.username?.toLowerCase().includes(term) ||
          u.userId?.toString().includes(term)
      );
    }

    // Role filter
    if (this.selectedRole !== 'all') {
      filtered = filtered.filter((u) =>
        u.roles?.some(
          (r) => r.toUpperCase() === this.selectedRole.toUpperCase()
        )
      );
    }

    // Status filter (assuming isActive field exists)
    if (this.selectedStatus !== 'all') {
      const isActive = this.selectedStatus === 'active';
      filtered = filtered.filter((u) => u.isActive === isActive);
    }

    this.filteredUsers = this.sortUsers(filtered);
  }

  sortBy(column: string): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
    this.applyFilters();
  }

  private sortUsers(users: User[]): User[] {
    return users.sort((a, b) => {
      let aVal: any = a[this.sortColumn as keyof User];
      let bVal: any = b[this.sortColumn as keyof User];

      if (this.sortColumn === 'roles') {
        aVal = a.roles?.join(',') || '';
        bVal = b.roles?.join(',') || '';
      }

      if (aVal === bVal) return 0;

      const comparison = aVal > bVal ? 1 : -1;
      return this.sortDirection === 'asc' ? comparison : -comparison;
    });
  }

  getSortIcon(column: string): string {
    if (this.sortColumn !== column) return 'fa-sort';
    return this.sortDirection === 'asc' ? 'fa-sort-up' : 'fa-sort-down';
  }

  // Bulk Actions
  toggleSelectAll(): void {
    this.selectAll = !this.selectAll;
    if (this.selectAll) {
      this.filteredUsers.forEach((u) => this.selectedUserIds.add(u.userId));
    } else {
      this.selectedUserIds.clear();
    }
  }

  toggleUserSelection(userId: number): void {
    if (this.selectedUserIds.has(userId)) {
      this.selectedUserIds.delete(userId);
    } else {
      this.selectedUserIds.add(userId);
    }
    this.selectAll = this.selectedUserIds.size === this.filteredUsers.length;
  }

  isSelected(userId: number): boolean {
    return this.selectedUserIds.has(userId);
  }

  bulkDelete(): void {
    if (this.selectedUserIds.size === 0) {
      this.toastr.warning('Please select users to delete');
      return;
    }

    Swal.fire({
      title: 'Bulk Delete',
      text: `Are you sure you want to delete ${this.selectedUserIds.size} users?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete them!',
      cancelButtonText: 'Cancel',
    }).then((result) => {
      if (result.isConfirmed) {
        const deletePromises = Array.from(this.selectedUserIds).map((id) =>
          this.usersService.deleteUser(id).toPromise()
        );

        Promise.all(deletePromises)
          .then(() => {
            this.toastr.success(
              `Deleted ${this.selectedUserIds.size} users successfully`
            );
            this.selectedUserIds.clear();
            this.selectAll = false;
            this.getUsers();
          })
          .catch((err) => {
            this.toastr.error('Some users could not be deleted');
          });
      }
    });
  }

  updateUser(userId: number) {
    this.router.navigate(['update-user', userId]);
  }

  openConfirmModal(user: User, type: 'delete' | 'reset'): void {
    const config =
      type === 'delete'
        ? {
            title: 'Confirm Deletion',
            text: `Are you sure you want to delete user "${user.username}"?`,
            icon: 'warning' as const,
            confirmButtonText: 'Yes, delete!',
            confirmButtonColor: '#d33',
          }
        : {
            title: 'Reset Password',
            text: `Reset password for user "${user.username}"?`,
            icon: 'question' as const,
            confirmButtonText: 'Yes, reset!',
            confirmButtonColor: '#f0ad4e',
          };

    Swal.fire({
      ...config,
      showCancelButton: true,
      cancelButtonColor: '#6c757d',
      cancelButtonText: 'Cancel',
    }).then((result) => {
      if (result.isConfirmed) {
        if (type === 'delete') {
          this.usersService.deleteUser(user.userId).subscribe({
            next: () => {
              Swal.fire(
                'Deleted!',
                `User "${user.username}" has been deleted.`,
                'success'
              );
              this.getUsers();
            },
            error: (err) =>
              this.toastr.error(err.error?.message || 'Failed to delete user.'),
          });
        } else {
          this.usersService.resetPassword(user.userId).subscribe({
            next: (response) => {
              Swal.fire({
                title: 'Password Reset!',
                html: `New password for <strong>${user.username}</strong>:<br><code style="font-size:1.2em">${response.newPassword}</code>`,
                icon: 'info',
                confirmButtonText: 'OK',
              });
            },
            error: (err) =>
              this.toastr.error(
                err.error?.message || 'Failed to reset password.'
              ),
          });
        }
      }
    });
  }

  cancelAction(): void {
    this.userToAction = null;
    this.actionType = null;
  }

  confirmAction(): void {
    // Legacy method - now using SweetAlert2 in openConfirmModal
    this.cancelAction();
  }

  getUserStatusBadge(user: User): {
    class: string;
    icon: string;
    text: string;
  } {
    if (!user.isActive) {
      return { class: 'bg-secondary', icon: 'fa-lock', text: 'Locked' };
    }
    return { class: 'bg-success', icon: 'fa-check-circle', text: 'Active' };
  }

  getRoleBadge(role: string): { class: string; icon: string } {
    if (role.toUpperCase().includes('ADMIN')) {
      return { class: 'bg-warning text-dark', icon: 'fa-crown' };
    }
    return { class: 'bg-primary', icon: 'fa-user' };
  }
}
