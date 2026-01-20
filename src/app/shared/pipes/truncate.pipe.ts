import { Pipe, PipeTransform } from '@angular/core';

/**
 * Truncate text to specified length and add ellipsis.
 *
 * Usage:
 * ```html
 * <p>{{ book.description | truncate:100 }}</p>
 * <p>{{ book.description | truncate:50:'...' }}</p>
 * ```
 *
 * Examples:
 * - "This is a very long description" | truncate:20 → "This is a very lo..."
 * - "Short text" | truncate:100 → "Short text"
 */
@Pipe({
  name: 'truncate',
  standalone: false,
})
export class TruncatePipe implements PipeTransform {
  transform(
    value: string,
    limit: number = 50,
    ellipsis: string = '...',
  ): string {
    if (!value) {
      return '';
    }

    if (value.length <= limit) {
      return value;
    }

    // Find last space before limit to avoid cutting words
    let truncated = value.substring(0, limit);
    const lastSpace = truncated.lastIndexOf(' ');

    if (lastSpace > 0) {
      truncated = truncated.substring(0, lastSpace);
    }

    return truncated + ellipsis;
  }
}
