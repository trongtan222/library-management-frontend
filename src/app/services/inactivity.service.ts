import { Injectable, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { UserAuthService } from './user-auth.service';
import { ToastrService } from 'ngx-toastr';

/**
 * Service to automatically log out users after a period of inactivity.
 * Important for public library computers to prevent unauthorized access.
 *
 * Features:
 * - Tracks user activity (mouse, keyboard, touch, scroll)
 * - Auto logout after 15 minutes (configurable)
 * - Warning notification 30 seconds before logout
 * - Automatically starts on login, stops on logout
 */
@Injectable({
  providedIn: 'root',
})
export class InactivityService {
  private readonly INACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 minutes in milliseconds
  private readonly WARNING_TIME = 30 * 1000; // Show warning 30 seconds before logout

  private inactivityTimer: any = null;
  private warningTimer: any = null;
  private isMonitoring = false;
  private warningShown = false;

  private activityEvents = [
    'mousedown',
    'keydown',
    'touchstart',
    'scroll',
    'mousemove',
  ];

  constructor(
    private router: Router,
    private authService: UserAuthService,
    private toastr: ToastrService,
    private ngZone: NgZone,
  ) {}

  /**
   * Start monitoring user activity
   * Call this after successful login
   */
  startMonitoring(): void {
    if (this.isMonitoring) {
      return; // Already monitoring
    }

    this.isMonitoring = true;
    this.resetTimers();

    // Run outside Angular zone to avoid constant change detection
    this.ngZone.runOutsideAngular(() => {
      this.activityEvents.forEach((event) => {
        window.addEventListener(event, this.onUserActivity.bind(this), true);
      });
    });

    console.log(
      '[InactivityService] Monitoring started. Timeout:',
      this.INACTIVITY_TIMEOUT / 1000,
      'seconds',
    );
  }

  /**
   * Stop monitoring user activity
   * Call this on logout or when user navigates away
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;
    this.clearTimers();

    this.activityEvents.forEach((event) => {
      window.removeEventListener(event, this.onUserActivity.bind(this), true);
    });

    console.log('[InactivityService] Monitoring stopped');
  }

  /**
   * Handle user activity - reset timers
   */
  private onUserActivity(): void {
    if (!this.isMonitoring) {
      return;
    }

    // Reset timers on activity
    this.resetTimers();

    // Clear warning if it was shown
    if (this.warningShown) {
      this.warningShown = false;
      this.toastr.clear();
    }
  }

  /**
   * Reset all timers
   */
  private resetTimers(): void {
    this.clearTimers();

    // Set warning timer (show warning 30 seconds before logout)
    this.warningTimer = setTimeout(() => {
      this.showWarning();
    }, this.INACTIVITY_TIMEOUT - this.WARNING_TIME);

    // Set logout timer
    this.inactivityTimer = setTimeout(() => {
      this.logout();
    }, this.INACTIVITY_TIMEOUT);
  }

  /**
   * Clear all timers
   */
  private clearTimers(): void {
    if (this.warningTimer) {
      clearTimeout(this.warningTimer);
      this.warningTimer = null;
    }

    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = null;
    }
  }

  /**
   * Show warning notification before auto logout
   */
  private showWarning(): void {
    if (this.warningShown) {
      return;
    }

    this.warningShown = true;

    // Run inside Angular zone to trigger change detection for toast
    this.ngZone.run(() => {
      this.toastr.warning(
        'Bạn sẽ bị tự động đăng xuất sau 30 giây do không hoạt động. Di chuyển chuột để tiếp tục.',
        '⚠️ Cảnh báo',
        {
          timeOut: this.WARNING_TIME,
          closeButton: true,
          progressBar: true,
          positionClass: 'toast-top-center',
          tapToDismiss: false,
        },
      );
    });
  }

  /**
   * Auto logout user due to inactivity
   */
  private logout(): void {
    this.stopMonitoring();

    // Run inside Angular zone for navigation and state changes
    this.ngZone.run(() => {
      this.authService.clear();
      this.toastr.info(
        'Bạn đã bị tự động đăng xuất do không hoạt động trong 15 phút.',
        'Đăng xuất tự động',
      );
      this.router.navigate(['/login'], {
        queryParams: { reason: 'inactivity' },
      });
    });

    console.log('[InactivityService] Auto logout due to inactivity');
  }

  /**
   * Check if monitoring is active
   */
  isActive(): boolean {
    return this.isMonitoring;
  }
}
