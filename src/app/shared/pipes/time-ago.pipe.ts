import { Pipe, PipeTransform } from '@angular/core';

/**
 * Convert date to relative time string (Vietnamese).
 *
 * Usage:
 * ```html
 * <p>{{ loan.borrowDate | timeAgo }}</p>
 * <p>{{ comment.createdAt | timeAgo }}</p>
 * ```
 *
 * Examples:
 * - 5 seconds ago → "Vừa xong"
 * - 2 minutes ago → "2 phút trước"
 * - 3 hours ago → "3 giờ trước"
 * - Yesterday → "Hôm qua"
 * - 5 days ago → "5 ngày trước"
 * - 2 months ago → "2 tháng trước"
 */
@Pipe({
  name: 'timeAgo',
  standalone: false,
})
export class TimeAgoPipe implements PipeTransform {
  transform(value: Date | string | number): string {
    if (!value) {
      return '';
    }

    const date = new Date(value);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    // Future date
    if (seconds < 0) {
      return this.getFutureTime(-seconds);
    }

    // Just now (< 10 seconds)
    if (seconds < 10) {
      return 'Vừa xong';
    }

    // Seconds
    if (seconds < 60) {
      return `${seconds} giây trước`;
    }

    // Minutes
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
      return `${minutes} phút trước`;
    }

    // Hours
    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      return `${hours} giờ trước`;
    }

    // Days
    const days = Math.floor(hours / 24);

    // Yesterday
    if (days === 1) {
      return 'Hôm qua';
    }

    // Days (< 30)
    if (days < 30) {
      return `${days} ngày trước`;
    }

    // Months
    const months = Math.floor(days / 30);
    if (months < 12) {
      return `${months} tháng trước`;
    }

    // Years
    const years = Math.floor(months / 12);
    return `${years} năm trước`;
  }

  /**
   * Format future time (for due dates, etc.)
   */
  private getFutureTime(seconds: number): string {
    if (seconds < 60) {
      return `Trong ${seconds} giây nữa`;
    }

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
      return `Trong ${minutes} phút nữa`;
    }

    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      return `Trong ${hours} giờ nữa`;
    }

    const days = Math.floor(hours / 24);
    if (days === 1) {
      return 'Ngày mai';
    }

    if (days < 30) {
      return `Trong ${days} ngày nữa`;
    }

    const months = Math.floor(days / 30);
    if (months < 12) {
      return `Trong ${months} tháng nữa`;
    }

    const years = Math.floor(months / 12);
    return `Trong ${years} năm nữa`;
  }
}
