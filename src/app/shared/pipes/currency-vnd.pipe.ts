import { Pipe, PipeTransform } from '@angular/core';

/**
 * Format number as Vietnamese currency (VND).
 *
 * Usage:
 * ```html
 * <p>{{ fine.amount | currencyVND }}</p>
 * <p>{{ price | currencyVND:'đồng' }}</p>
 * ```
 *
 * Examples:
 * - 50000 → "50.000 đ"
 * - 1234567 → "1.234.567 đ"
 * - 0 → "0 đ"
 */
@Pipe({
  name: 'currencyVND',
  standalone: false,
})
export class CurrencyVNDPipe implements PipeTransform {
  transform(value: number | string, suffix: string = 'đ'): string {
    if (value === null || value === undefined) {
      return '0 ' + suffix;
    }

    // Convert to number if string
    const numValue = typeof value === 'string' ? parseFloat(value) : value;

    if (isNaN(numValue)) {
      return '0 ' + suffix;
    }

    // Format with thousand separators (dot for VND)
    const formatted = numValue.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

    return formatted + ' ' + suffix;
  }
}
