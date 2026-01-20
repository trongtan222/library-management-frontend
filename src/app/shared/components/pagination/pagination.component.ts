import {
  Component,
  EventEmitter,
  Input,
  Output,
  OnChanges,
  SimpleChanges,
} from '@angular/core';

/**
 * Reusable pagination component with consistent UI.
 * Supports page navigation, page size selection, and displays stats.
 *
 * Usage:
 * ```html
 * <app-pagination
 *   [currentPage]="currentPage"
 *   [totalPages]="totalPages"
 *   [pageSize]="pageSize"
 *   [totalElements]="totalElements"
 *   [pageSizeOptions]="[10, 20, 50, 100]"
 *   (pageChange)="onPageChange($event)"
 *   (pageSizeChange)="onPageSizeChange($event)">
 * </app-pagination>
 * ```
 */
@Component({
  selector: 'app-pagination',
  templateUrl: './pagination.component.html',
  styleUrls: ['./pagination.component.css'],
  standalone: false,
})
export class PaginationComponent implements OnChanges {
  @Input() currentPage: number = 0; // 0-indexed
  @Input() totalPages: number = 0;
  @Input() pageSize: number = 10;
  @Input() totalElements: number = 0;
  @Input() pageSizeOptions: number[] = [10, 20, 50, 100];
  @Input() showPageSizeSelector: boolean = true;
  @Input() maxPagesToShow: number = 5; // Max page buttons to display

  @Output() pageChange = new EventEmitter<number>();
  @Output() pageSizeChange = new EventEmitter<number>();

  pages: number[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['currentPage'] || changes['totalPages']) {
      this.calculatePages();
    }
  }

  /**
   * Calculate which page numbers to show
   * Example: [1, 2, 3, 4, 5] or [1, ..., 8, 9, 10, ..., 20]
   */
  private calculatePages(): void {
    const pages: number[] = [];
    const half = Math.floor(this.maxPagesToShow / 2);

    let start = Math.max(0, this.currentPage - half);
    let end = Math.min(this.totalPages - 1, start + this.maxPagesToShow - 1);

    // Adjust start if we're near the end
    if (end - start < this.maxPagesToShow - 1) {
      start = Math.max(0, end - this.maxPagesToShow + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    this.pages = pages;
  }

  goToPage(page: number): void {
    if (page >= 0 && page < this.totalPages && page !== this.currentPage) {
      this.pageChange.emit(page);
    }
  }

  goToFirstPage(): void {
    this.goToPage(0);
  }

  goToLastPage(): void {
    this.goToPage(this.totalPages - 1);
  }

  goToPreviousPage(): void {
    this.goToPage(this.currentPage - 1);
  }

  goToNextPage(): void {
    this.goToPage(this.currentPage + 1);
  }

  onPageSizeSelected(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const newSize = parseInt(select.value, 10);
    if (newSize !== this.pageSize) {
      this.pageSizeChange.emit(newSize);
    }
  }

  get hasPrevious(): boolean {
    return this.currentPage > 0;
  }

  get hasNext(): boolean {
    return this.currentPage < this.totalPages - 1;
  }

  get startElement(): number {
    return this.currentPage * this.pageSize + 1;
  }

  get endElement(): number {
    return Math.min((this.currentPage + 1) * this.pageSize, this.totalElements);
  }

  get showFirstEllipsis(): boolean {
    return this.pages.length > 0 && this.pages[0] > 0;
  }

  get showLastEllipsis(): boolean {
    return (
      this.pages.length > 0 &&
      this.pages[this.pages.length - 1] < this.totalPages - 1
    );
  }
}
