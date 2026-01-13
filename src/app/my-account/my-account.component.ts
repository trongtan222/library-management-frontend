import { Component, OnInit } from '@angular/core';
import { UserAuthService } from '../services/user-auth.service';
import { HttpErrorResponse } from '@angular/common/http';
import {
  CirculationService,
  ReservationDTO,
} from '../services/circulation.service';
import { FineDetails, LoanDetails } from '../services/admin.service';
import { UsersService } from '../services/users.service';
import { User } from '../models/user';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators'; // Thêm map
import { ToastrService } from 'ngx-toastr';
import { ReviewService, Review } from '../services/review.service';

@Component({
  selector: 'app-my-account',
  templateUrl: './my-account.component.html',
  styleUrls: ['./my-account.component.css'],
  standalone: false,
})
export class MyAccountComponent implements OnInit {
  userProfile: User = { userId: 0, username: '', name: '', roles: [] } as User;
  activeLoans: LoanDetails[] = [];
  historyLoans: LoanDetails[] = [];
  myFines: FineDetails[] = [];
  myReservations: ReservationDTO[] = [];
  renewalRequests: Array<{
    id: number;
    loanId: number;
    memberId: number;
    extraDays: number;
    status: string;
    createdAt: string;
    decidedAt?: string;
    adminNote?: string;
  }> = [];

  isLoading = true;
  currentTab:
    | 'PROFILE'
    | 'ACTIVE'
    | 'HISTORY'
    | 'FINES'
    | 'RESERVATIONS'
    | 'REVIEWS' = 'PROFILE';
  myReviews: Review[] = [];
  editingReview?: Review;
  savingReview = false;

  // Stats
  totalBorrowed = 0;
  totalReturned = 0;
  totalFinesAmount = 0;

  // Pagination for history loans
  historyPage = 1;
  historyPageSize = 10;
  historyPageSizes = [10, 20, 50];

  // Change password form state
  oldPassword = '';
  newPassword = '';
  confirmPassword = '';
  changingPwd = false;

  constructor(
    private userAuthService: UserAuthService,
    private circulationService: CirculationService,
    private userService: UsersService,
    private toastr: ToastrService,
    private reviewService: ReviewService
  ) {}

  ngOnInit(): void {
    const userId = this.userAuthService.getUserId();
    if (userId) {
      this.loadAllData(userId);
    } else {
      this.isLoading = false;
      this.errorMessage = 'Bạn chưa đăng nhập.'; // Hiển thị lỗi nếu chưa login
    }
  }

  loadAllData(userId: number): void {
    this.isLoading = true;

    // 1. Xử lý User Profile riêng biệt để tránh gọi API Admin nếu không cần thiết
    const userObs = this.userAuthService.isAdmin()
      ? this.userService.getUserById(userId) // Admin được phép gọi API này
      : of(this.getLocalUserProfile(userId)); // User thường dùng thông tin local

    forkJoin({
      user: userObs.pipe(
        catchError((err) => {
          console.warn('Lỗi tải profile, dùng fallback local.', err);
          return of(this.getLocalUserProfile(userId));
        })
      ),
      loans: this.circulationService
        .getMyLoanHistory()
        .pipe(catchError(() => of([]))),
      fines: this.circulationService
        .getMyFines()
        .pipe(catchError(() => of([]))),
      renewals: this.circulationService
        .getMyRenewals()
        .pipe(catchError(() => of([]))),
      // reservations: this.circulationService.getMyReservations().pipe(catchError(() => of([]))) ,
      reviews: this.reviewService.getMyReviews().pipe(catchError(() => of([]))),
    }).subscribe({
      next: (result) => {
        this.userProfile = result.user;

        // Xử lý mảng Loans an toàn
        const loans = Array.isArray(result.loans) ? result.loans : [];

        this.activeLoans = loans.filter(
          (l) => l.status === 'ACTIVE' || l.status === 'OVERDUE'
        );
        this.historyLoans = loans.filter((l) => l.status === 'RETURNED');

        // Xử lý mảng Fines an toàn
        this.myFines = Array.isArray(result.fines) ? result.fines : [];
        this.renewalRequests = Array.isArray(result.renewals)
          ? result.renewals
          : [];
        this.myReviews = Array.isArray((result as any).reviews)
          ? (result as any).reviews
          : [];

        // this.myReservations = Array.isArray(result.reservations) ? result.reservations : [];

        // Tính toán thống kê
        this.totalBorrowed = loans.length;
        this.totalReturned = this.historyLoans.length;
        this.totalFinesAmount = this.myFines.reduce(
          (sum, f) => sum + (f.fineAmount || 0),
          0
        );

        this.isLoading = false;
      },
      error: (err) => {
        console.error('Lỗi tải dữ liệu tổng hợp:', err);
        this.isLoading = false;
        this.toastr.error('Có lỗi khi tải dữ liệu.');
      },
    });
  }

  // Hàm helper để tạo User object từ LocalStorage
  private getLocalUserProfile(userId: number): User {
    const u = new User();
    u.userId = userId;
    u.name = this.userAuthService.getName() || 'Người dùng';
    u.username = '---'; // Backend hiện tại chưa trả về username trong login response chuẩn
    u.roles = this.userAuthService.getRoles();
    return u;
  }

  changeTab(
    tab: 'PROFILE' | 'ACTIVE' | 'HISTORY' | 'FINES' | 'RESERVATIONS' | 'REVIEWS'
  ) {
    this.currentTab = tab;
    if (tab === 'HISTORY') {
      this.historyPage = 1;
    }
  }

  get pagedHistoryLoans(): typeof this.historyLoans {
    const start = (this.historyPage - 1) * this.historyPageSize;
    return this.historyLoans.slice(start, start + this.historyPageSize);
  }

  get historyTotalPages(): number {
    return this.historyLoans.length > 0
      ? Math.ceil(this.historyLoans.length / this.historyPageSize)
      : 0;
  }

  setHistoryPage(p: number) {
    if (p < 1 || p > this.historyTotalPages) return;
    this.historyPage = p;
  }

  prevHistoryPage() {
    if (this.historyPage > 1) this.historyPage--;
  }

  nextHistoryPage() {
    if (this.historyPage < this.historyTotalPages) this.historyPage++;
  }

  changeHistoryPageSize(event: Event) {
    this.historyPageSize = Number((event.target as HTMLSelectElement).value);
    this.historyPage = 1;
  }
  startEditReview(r: Review) {
    this.editingReview = { ...r };
  }

  cancelEditReview() {
    this.editingReview = undefined;
  }

  saveMyReview() {
    if (!this.editingReview?.id) return;
    this.savingReview = true;
    this.reviewService
      .updateMyReview(this.editingReview.id, {
        rating: this.editingReview.rating,
        comment: this.editingReview.comment,
      })
      .subscribe({
        next: (updated) => {
          const idx = this.myReviews.findIndex((x) => x.id === updated.id);
          if (idx >= 0) this.myReviews[idx] = updated;
          this.toastr.success('Đã lưu đánh giá của bạn');
          this.editingReview = undefined;
        },
        error: () => this.toastr.error('Lưu đánh giá thất bại'),
        complete: () => {
          this.savingReview = false;
        },
      });
  }

  deleteMyReview(r: Review) {
    if (!r.id) return;
    if (!confirm('Xóa bình luận này?')) return;
    this.reviewService.deleteMyReview(r.id).subscribe({
      next: () => {
        this.myReviews = this.myReviews.filter((x) => x.id !== r.id);
        this.toastr.success('Đã xóa đánh giá');
      },
      error: () => this.toastr.error('Xóa đánh giá thất bại'),
    });
  }

  renewLoan(loanId: number): void {
    // Nếu đã có yêu cầu PENDING cho loan này thì chặn
    const pending = this.renewalRequests.find(
      (r) => r.loanId === loanId && r.status === 'PENDING'
    );
    if (pending) {
      this.toastr.warning('Đã có yêu cầu gia hạn đang chờ xử lý.');
      return;
    }
    this.circulationService.renew({ loanId: loanId, extraDays: 7 }).subscribe({
      next: () => {
        this.toastr.info('Đã gửi yêu cầu gia hạn, chờ admin phê duyệt.');
        if (this.userProfile) this.loadAllData(this.userProfile.userId);
      },
      error: (err: HttpErrorResponse) => {
        this.toastr.error(
          err.error?.message || 'Gửi yêu cầu gia hạn thất bại.'
        );
      },
    });
  }

  // Thêm biến errorMessage để template sử dụng nếu cần
  errorMessage = '';

  cancelReservation(id: number) {
    if (confirm('Bạn có chắc muốn hủy đặt trước cuốn sách này?')) {
      this.circulationService.cancelReservation(id).subscribe({
        next: () => {
          this.toastr.info('Đã hủy đặt trước.');
          // Reload reservations logic here if needed
        },
        error: () => this.toastr.error('Lỗi khi hủy.'),
      });
    }
  }

  // === Change Password ===
  get passwordsMismatch(): boolean {
    return !!this.confirmPassword && this.confirmPassword !== this.newPassword;
  }

  changePassword(): void {
    if (!this.oldPassword || !this.newPassword || this.passwordsMismatch) {
      this.toastr.warning('Vui lòng nhập đầy đủ và xác nhận đúng mật khẩu.');
      return;
    }
    this.changingPwd = true;
    this.userService
      .changePassword({
        oldPassword: this.oldPassword,
        newPassword: this.newPassword,
      })
      .subscribe({
        next: () => {
          this.toastr.success('Đổi mật khẩu thành công.');
          this.oldPassword = '';
          this.newPassword = '';
          this.confirmPassword = '';
        },
        error: (err) => {
          const msg = err?.error?.message || 'Đổi mật khẩu thất bại.';
          this.toastr.error(msg);
        },
        complete: () => {
          this.changingPwd = false;
        },
      });
  }

  // === Renewal Helpers ===
  isRenewalStatus(loanId: number, status: string): boolean {
    return (
      this.renewalRequests &&
      this.renewalRequests.some(
        (r) => r.loanId === loanId && r.status === status
      )
    );
  }

  isPendingRenewal(loanId: number): boolean {
    return this.isRenewalStatus(loanId, 'PENDING');
  }
}
