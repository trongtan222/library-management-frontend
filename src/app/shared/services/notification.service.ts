import { Injectable } from '@angular/core';
import { ToastrService } from 'ngx-toastr';

/**
 * Notification service wrapper for Toastr.
 * Provides consistent notification API across the app.
 *
 * Usage:
 * ```typescript
 * constructor(private notification: NotificationService) {}
 *
 * this.notification.success('Xóa sách thành công');
 * this.notification.error('Có lỗi xảy ra', error);
 * this.notification.warning('Cảnh báo', 'Sách sắp hết hạn');
 * this.notification.info('Thông tin', 'Có 3 tin nhắn mới');
 * ```
 */
@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  constructor(private toastr: ToastrService) {}

  /**
   * Show success notification
   */
  success(message: string, title?: string): void {
    this.toastr.success(message, title || 'Thành công', {
      timeOut: 3000,
      progressBar: true,
      closeButton: true,
    });
  }

  /**
   * Show error notification
   */
  error(message: string, error?: any, title?: string): void {
    // Extract error message if available
    let errorMessage = message;
    if (error) {
      if (typeof error === 'string') {
        errorMessage = error;
      } else if (error.error?.message) {
        errorMessage = error.error.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
    }

    this.toastr.error(errorMessage, title || 'Lỗi', {
      timeOut: 5000,
      progressBar: true,
      closeButton: true,
    });
  }

  /**
   * Show warning notification
   */
  warning(message: string, title?: string): void {
    this.toastr.warning(message, title || 'Cảnh báo', {
      timeOut: 4000,
      progressBar: true,
      closeButton: true,
    });
  }

  /**
   * Show info notification
   */
  info(message: string, title?: string): void {
    this.toastr.info(message, title || 'Thông tin', {
      timeOut: 3000,
      progressBar: true,
      closeButton: true,
    });
  }

  /**
   * Clear all notifications
   */
  clear(): void {
    this.toastr.clear();
  }
}
