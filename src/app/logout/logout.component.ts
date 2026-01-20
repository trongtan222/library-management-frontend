import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { UserAuthService } from '../services/user-auth.service';
import { UsersService } from '../services/users.service';
import { InactivityService } from '../services/inactivity.service';
import { Subject, timer } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-logout',
  templateUrl: './logout.component.html',
  styleUrls: ['./logout.component.css'],
  standalone: false,
})
export class LogoutComponent implements OnInit, OnDestroy {
  userName: string = '';
  countdown: number = 10;
  isLoggingOut: boolean = false;
  private destroy$ = new Subject<void>();
  private countdownTimer$ = new Subject<void>();

  constructor(
    private router: Router,
    private auth: UserAuthService,
    private usersService: UsersService,
    private toastr: ToastrService,
    private inactivityService: InactivityService,
  ) {
    // Get user name for personalized message
    this.userName = this.auth.getName() || 'bạn';
    console.log('Logout Component đã được khởi tạo!');
  }

  ngOnInit(): void {
    // Stop inactivity monitoring when logout screen appears
    this.inactivityService.stopMonitoring();

    // Start auto-logout countdown
    this.startCountdown();
  }

  ngOnDestroy(): void {
    // Cleanup subscriptions
    this.destroy$.next();
    this.destroy$.complete();
    this.countdownTimer$.next();
    this.countdownTimer$.complete();
  }

  private startCountdown(): void {
    timer(0, 1000)
      .pipe(takeUntil(this.countdownTimer$))
      .subscribe(() => {
        this.countdown--;
        if (this.countdown <= 0) {
          this.performLogout();
        }
      });
  }

  onConfirm(): void {
    // Stop countdown and logout immediately
    this.countdownTimer$.next();
    this.performLogout();
  }

  onCancel(): void {
    // Stop countdown and navigate to home
    this.countdownTimer$.next();
    this.router.navigate(['/']);
  }

  private performLogout(): void {
    if (this.isLoggingOut) return;

    this.isLoggingOut = true;

    // Call backend to blacklist token
    this.usersService
      .logout()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          // Clear all local storage and states
          this.clearAllServices();

          // Show success message
          this.toastr.success('Đăng xuất thành công!', 'Tạm biệt!');

          // Navigate to login page
          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 500);
        },
        error: (err) => {
          console.error('Lỗi khi đăng xuất:', err);

          // Even if API fails, still clear local data and redirect
          this.clearAllServices();
          this.toastr.warning(
            'Đã đăng xuất (token vẫn có thể còn hiệu lực)',
            'Cảnh báo',
          );

          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 500);
        },
      });
  }

  private clearAllServices(): void {
    // Clear authentication data
    this.auth.clear();

    // Clear localStorage (cart, wishlist, notifications, etc.)
    const keysToKeep = ['theme', 'language']; // Keep user preferences
    const allKeys = Object.keys(localStorage);

    allKeys.forEach((key) => {
      if (!keysToKeep.includes(key)) {
        localStorage.removeItem(key);
      }
    });

    // Clear sessionStorage
    sessionStorage.clear();
  }
}
