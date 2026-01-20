import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { User } from '../models/user';
import { CirculationService } from '../services/circulation.service';
import { UsersService } from '../services/users.service';
import { LoanDetails } from '../services/admin.service';
import { ToastrService } from 'ngx-toastr';
import Swal from 'sweetalert2';

interface UserStats {
  totalLoans: number;
  currentLoans: number;
  overdueLoans: number;
  totalFines: number;
  onTimeReturns: number;
  totalReturns: number;
}

@Component({
  selector: 'app-user-details',
  templateUrl: './user-details.component.html',
  styleUrls: ['./user-details.component.css'],
  standalone: false,
})
export class UserDetailsComponent implements OnInit {
  id!: number;
  borrow: LoanDetails[] = [];
  paginatedLoans: LoanDetails[] = [];
  user!: User;
  isLoadingUser = false;
  isLoadingLoans = false;

  // Pagination
  currentPage = 1;
  pageSize = 10;
  totalPages = 1;

  // Stats
  stats: UserStats = {
    totalLoans: 0,
    currentLoans: 0,
    overdueLoans: 0,
    totalFines: 0,
    onTimeReturns: 0,
    totalReturns: 0,
  };

  constructor(
    private route: ActivatedRoute,
    private circulationService: CirculationService,
    public userService: UsersService,
    private toastr: ToastrService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.id = +this.route.snapshot.params['userId'];
    this.user = new User();
    this.isLoadingUser = true;
    this.userService.getUserById(this.id).subscribe({
      next: (data: User) => {
        this.user = data;
      },
      error: () => {
        this.toastr.error('Không tải được thông tin người dùng');
      },
      complete: () => (this.isLoadingUser = false),
    });

    this.getBorrowedByUser(this.id);
  }

  private getBorrowedByUser(userId: number) {
    this.isLoadingLoans = true;
    this.circulationService.getLoansByMemberId(userId).subscribe({
      next: (data: any[]) => {
        this.borrow = data.map((item: any) => ({
          loanId: item.loanId ?? item.id,
          bookId: item.bookId,
          bookName: item.bookName,
          userName: item.userName,
          loanDate: item.loanDate,
          dueDate: item.dueDate,
          returnDate: item.returnDate,
          status: item.status,
          fineAmount: item.fineAmount,
          overdueDays: item.overdueDays,
        })) as LoanDetails[];
        this.calculateStats();
        this.updatePagination();
      },
      error: () => {
        this.toastr.error('Không tải được lịch sử mượn');
      },
      complete: () => (this.isLoadingLoans = false),
    });
  }

  calculateStats(): void {
    this.stats.totalLoans = this.borrow.length;
    this.stats.currentLoans = this.borrow.filter(
      (l) => l.status === 'ACTIVE' || l.status === 'OVERDUE'
    ).length;
    this.stats.overdueLoans = this.borrow.filter(
      (l) => l.status === 'OVERDUE'
    ).length;
    this.stats.totalFines = this.borrow.reduce(
      (sum, l) => sum + (l.fineAmount || 0),
      0
    );

    const returned = this.borrow.filter((l) => l.returnDate);
    this.stats.totalReturns = returned.length;
    this.stats.onTimeReturns = returned.filter(
      (l) => (l.fineAmount || 0) === 0
    ).length;
  }

  getTrustScore(): {
    score: number;
    label: string;
    color: string;
    icon: string;
  } {
    if (this.stats.totalReturns === 0) {
      return {
        score: 0,
        label: 'Chưa đánh giá',
        color: 'secondary',
        icon: 'fa-question',
      };
    }

    const percentage =
      (this.stats.onTimeReturns / this.stats.totalReturns) * 100;

    if (percentage >= 90) {
      return {
        score: percentage,
        label: 'Xuất sắc',
        color: 'success',
        icon: 'fa-star',
      };
    } else if (percentage >= 70) {
      return {
        score: percentage,
        label: 'Tốt',
        color: 'info',
        icon: 'fa-thumbs-up',
      };
    } else if (percentage >= 50) {
      return {
        score: percentage,
        label: 'Bình thường',
        color: 'warning',
        icon: 'fa-meh',
      };
    } else {
      return {
        score: percentage,
        label: 'Cần cải thiện',
        color: 'danger',
        icon: 'fa-exclamation-triangle',
      };
    }
  }

  // Pagination
  updatePagination(): void {
    this.totalPages = Math.ceil(this.borrow.length / this.pageSize);
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    this.paginatedLoans = this.borrow.slice(start, end);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePagination();
    }
  }

  // Admin Actions
  toggleLockStatus(): void {
    const newStatus = !this.user.isActive;
    const action = newStatus ? 'mở khóa' : 'khóa';

    Swal.fire({
      title: `${action.charAt(0).toUpperCase() + action.slice(1)} tài khoản?`,
      text: `Bạn có chắc muốn ${action} tài khoản "${this.user.username}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: newStatus ? '#10b981' : '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: `Có, ${action}!`,
      cancelButtonText: 'Hủy',
    }).then((result) => {
      if (result.isConfirmed) {
        // Call API to toggle lock status
        this.userService.toggleUserStatus(this.id, newStatus).subscribe({
          next: () => {
            this.user.isActive = newStatus;
            Swal.fire(
              'Thành công!',
              `Đã ${action} tài khoản thành công.`,
              'success'
            );
          },
          error: (err) => {
            this.toastr.error(
              err.error?.message || `Không thể ${action} tài khoản`
            );
          },
        });
      }
    });
  }

  resetUserPassword(): void {
    Swal.fire({
      title: 'Đặt lại mật khẩu',
      text: `Đặt lại mật khẩu cho "${this.user.username}"?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#f59e0b',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Có, đặt lại!',
      cancelButtonText: 'Hủy',
    }).then((result) => {
      if (result.isConfirmed) {
        this.userService.resetPassword(this.id).subscribe({
          next: (response) => {
            Swal.fire({
              title: 'Mật khẩu mới!',
              html: `Mật khẩu mới cho <strong>${this.user.username}</strong>:<br><code style="font-size:1.2em">${response.newPassword}</code>`,
              icon: 'info',
              confirmButtonText: 'OK',
            });
          },
          error: (err) => {
            this.toastr.error(
              err.error?.message || 'Không thể đặt lại mật khẩu'
            );
          },
        });
      }
    });
  }

  navigateToCreateLoan(): void {
    this.router.navigate(['/admin/create-loan'], {
      queryParams: { userId: this.id, userName: this.user.name },
    });
  }

  getAvatarInitials(): string {
    if (!this.user || !this.user.name) return '?';
    const names = this.user.name.trim().split(' ');
    if (names.length === 1) {
      return names[0].charAt(0).toUpperCase();
    }
    return (
      names[0].charAt(0).toUpperCase() +
      names[names.length - 1].charAt(0).toUpperCase()
    );
  }

  getAvatarColor(): string {
    const colors = [
      '#ef4444',
      '#f59e0b',
      '#10b981',
      '#3b82f6',
      '#8b5cf6',
      '#ec4899',
    ];
    const index = (this.user?.userId || 0) % colors.length;
    return colors[index];
  }

  getStatusBadgeClass(status: string): string {
    const map: { [key: string]: string } = {
      RETURNED: 'badge bg-success',
      ACTIVE: 'badge bg-primary',
      OVERDUE: 'badge bg-danger',
      CANCELLED: 'badge bg-secondary',
    };
    return map[status] || 'badge bg-secondary';
  }

  getStatusIcon(status: string): string {
    const map: { [key: string]: string } = {
      RETURNED: 'fa-check-circle',
      ACTIVE: 'fa-book',
      OVERDUE: 'fa-exclamation-triangle',
      CANCELLED: 'fa-ban',
    };
    return map[status] || 'fa-question-circle';
  }

  onReturnLoan(loanId: number): void {
    this.circulationService.returnLoan(loanId).subscribe({
      next: (updatedLoan) => {
        if (
          updatedLoan &&
          updatedLoan.fineAmount &&
          updatedLoan.fineAmount > 0
        ) {
          this.toastr.warning(
            `Trả sách trễ ${
              updatedLoan.overdueDays ?? ''
            } ngày. Tiền phạt: ${updatedLoan.fineAmount.toLocaleString(
              'vi-VN'
            )} đ`,
            'Trả sách quá hạn'
          );
        } else {
          this.toastr.success(
            'Trả sách thành công, không có tiền phạt.',
            'Trả sách'
          );
        }
        this.getBorrowedByUser(this.id);
      },
    });
  }

  backToList(): void {
    this.router.navigate(['/users']);
  }

  editUser(): void {
    this.router.navigate(['/update-user', this.id]);
  }

  getRoleDisplay(): string {
    if (!this.user) return '—';
    const r: any = (this.user as any).role;
    const rs: any[] = (this.user as any).roles;
    if (r && typeof r === 'string') return r;
    if (Array.isArray(rs) && rs.length) {
      return (
        rs
          .map((x) => (typeof x === 'string' ? x : x.name || x.role || ''))
          .filter(Boolean)
          .join(', ') || '—'
      );
    }
    return '—';
  }

  getPhoneDisplay(): string {
    const u: any = this.user;
    return u && (u.phoneNumber || u.phone) ? u.phoneNumber || u.phone : '—';
  }
}
