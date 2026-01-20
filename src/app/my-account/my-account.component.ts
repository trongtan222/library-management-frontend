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
import { catchError, map } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';
import { ReviewService, Review } from '../services/review.service';
import {
  GamificationService,
  GamificationStats,
  Badge,
  UserBadge,
} from '../services/gamification.service';

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
    | 'REVIEWS'
    | 'STATS'
    | 'BADGES'
    | 'SETTINGS' = 'PROFILE';
  myReviews: Review[] = [];
  editingReview?: Review;
  savingReview = false;

  // Gamification Data
  gamificationStats: GamificationStats | null = null;
  myBadges: UserBadge[] = [];
  allBadges: Badge[] = [];

  // Level System
  levelTiers = [
    { level: 1, name: 'Đồng', minPoints: 0, maxPoints: 99, color: '#cd7f32' },
    { level: 2, name: 'Bạc', minPoints: 100, maxPoints: 299, color: '#c0c0c0' },
    {
      level: 3,
      name: 'Vàng',
      minPoints: 300,
      maxPoints: 599,
      color: '#ffd700',
    },
    {
      level: 4,
      name: 'Bạch kim',
      minPoints: 600,
      maxPoints: 999,
      color: '#e5e4e2',
    },
    {
      level: 5,
      name: 'Kim cương',
      minPoints: 1000,
      maxPoints: Infinity,
      color: '#b9f2ff',
    },
  ];

  // Reading Stats (calculated from loans)
  readingStats = {
    booksThisYear: 0,
    booksThisMonth: 0,
    totalPages: 0,
    averagePerMonth: 0,
    monthlyData: [] as { month: string; count: number }[],
  };

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
    private reviewService: ReviewService,
    private gamificationService: GamificationService,
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
        }),
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
      reviews: this.reviewService.getMyReviews().pipe(catchError(() => of([]))),
      // Gamification data
      gamificationStats: this.gamificationService
        .getMyStats()
        .pipe(catchError(() => of(null))),
      myBadges: this.gamificationService
        .getMyBadges()
        .pipe(catchError(() => of([]))),
      allBadges: this.gamificationService
        .getAllBadges()
        .pipe(catchError(() => of([]))),
    }).subscribe({
      next: (result) => {
        this.userProfile = result.user;

        // Xử lý mảng Loans an toàn
        const loans = Array.isArray(result.loans) ? result.loans : [];

        this.activeLoans = loans.filter(
          (l) => l.status === 'ACTIVE' || l.status === 'OVERDUE',
        );
        this.historyLoans = loans.filter((l) => l.status === 'RETURNED');

        // Xử lý mảng Fines an toàn
        this.myFines = Array.isArray(result.fines) ? result.fines : [];
        this.renewalRequests = Array.isArray(result.renewals)
          ? result.renewals
          : [];
        this.myReviews = Array.isArray(result.reviews) ? result.reviews : [];

        // Gamification data
        this.gamificationStats = result.gamificationStats;
        this.myBadges = Array.isArray(result.myBadges) ? result.myBadges : [];
        this.allBadges = Array.isArray(result.allBadges)
          ? result.allBadges
          : [];

        // Tính toán thống kê
        this.totalBorrowed = loans.length;
        this.totalReturned = this.historyLoans.length;
        this.totalFinesAmount = this.myFines.reduce(
          (sum, f) => sum + (f.fineAmount || 0),
          0,
        );

        // Calculate reading stats
        this.calculateReadingStats(loans);

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
    tab:
      | 'PROFILE'
      | 'ACTIVE'
      | 'HISTORY'
      | 'FINES'
      | 'RESERVATIONS'
      | 'REVIEWS'
      | 'STATS'
      | 'BADGES'
      | 'SETTINGS',
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
      (r) => r.loanId === loanId && r.status === 'PENDING',
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
          err.error?.message || 'Gửi yêu cầu gia hạn thất bại.',
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
        (r) => r.loanId === loanId && r.status === status,
      )
    );
  }

  isPendingRenewal(loanId: number): boolean {
    return this.isRenewalStatus(loanId, 'PENDING');
  }

  // === Gamification Methods ===

  // Get current level info
  get currentLevelInfo() {
    const points = this.gamificationStats?.totalPoints || 0;
    return (
      this.levelTiers.find(
        (tier) => points >= tier.minPoints && points <= tier.maxPoints,
      ) || this.levelTiers[0]
    );
  }

  // Get next level info
  get nextLevelInfo() {
    const currentLevel = this.currentLevelInfo.level;
    return this.levelTiers.find((tier) => tier.level === currentLevel + 1);
  }

  // Calculate level progress percentage
  get levelProgressPercent(): number {
    const current = this.currentLevelInfo;
    const points = this.gamificationStats?.totalPoints || 0;

    if (current.maxPoints === Infinity) return 100;

    const progress =
      ((points - current.minPoints) / (current.maxPoints - current.minPoints)) *
      100;
    return Math.min(Math.max(progress, 0), 100);
  }

  // Get points needed for next level
  get pointsToNextLevel(): number {
    const next = this.nextLevelInfo;
    if (!next) return 0;

    const points = this.gamificationStats?.totalPoints || 0;
    return next.minPoints - points;
  }

  // Check if user has a badge
  hasBadge(badgeCode: string): boolean {
    return this.myBadges.some((ub) => ub.badge.code === badgeCode);
  }

  // Get badge by code
  getBadgeInfo(badgeCode: string): UserBadge | undefined {
    return this.myBadges.find((ub) => ub.badge.code === badgeCode);
  }

  // Calculate reading statistics from loan history
  calculateReadingStats(loans: LoanDetails[]): void {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    // Books this year
    this.readingStats.booksThisYear = loans.filter((loan) => {
      const loanDate = new Date(loan.loanDate);
      return loanDate.getFullYear() === currentYear;
    }).length;

    // Books this month
    this.readingStats.booksThisMonth = loans.filter((loan) => {
      const loanDate = new Date(loan.loanDate);
      return (
        loanDate.getFullYear() === currentYear &&
        loanDate.getMonth() === currentMonth
      );
    }).length;

    // Average per month (last 12 months)
    const monthsToCheck = 12;
    const monthCounts: { [key: string]: number } = {};

    for (let i = 0; i < monthsToCheck; i++) {
      const date = new Date(currentYear, currentMonth - i, 1);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthCounts[monthKey] = 0;
    }

    loans.forEach((loan) => {
      const loanDate = new Date(loan.loanDate);
      const monthKey = `${loanDate.getFullYear()}-${String(loanDate.getMonth() + 1).padStart(2, '0')}`;
      if (monthCounts[monthKey] !== undefined) {
        monthCounts[monthKey]++;
      }
    });

    // Calculate average
    const totalBooks = Object.values(monthCounts).reduce(
      (sum, count) => sum + count,
      0,
    );
    this.readingStats.averagePerMonth = Math.round(totalBooks / monthsToCheck);

    // Prepare monthly data for chart
    this.readingStats.monthlyData = Object.entries(monthCounts)
      .sort()
      .map(([month, count]) => ({
        month: this.formatMonthLabel(month),
        count,
      }))
      .reverse();

    // Estimate total pages (assume average 250 pages per book)
    this.readingStats.totalPages = this.readingStats.booksThisYear * 250;
  }

  // Format month label for display
  formatMonthLabel(monthKey: string): string {
    const [year, month] = monthKey.split('-');
    const monthNames = [
      'T1',
      'T2',
      'T3',
      'T4',
      'T5',
      'T6',
      'T7',
      'T8',
      'T9',
      'T10',
      'T11',
      'T12',
    ];
    return `${monthNames[parseInt(month) - 1]}`;
  }

  // Get max count for chart scaling
  get maxMonthlyCount(): number {
    return Math.max(...this.readingStats.monthlyData.map((d) => d.count), 1);
  }

  // Get transaction history (fines with payment info)
  get transactionHistory() {
    return this.myFines.map((fine) => ({
      date: fine.returnDate,
      description: `Phí phạt: ${fine.bookName}`,
      amount: fine.fineAmount,
      status: 'PAID', // Assuming all fines in history are paid
    }));
  }
}
