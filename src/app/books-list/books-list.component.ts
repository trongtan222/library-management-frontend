import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { BooksService, Page } from '../services/books.service';
import { CirculationService } from '../services/circulation.service';
import { ToastrService } from 'ngx-toastr';
import { Book } from '../models/book';
import { Subject } from 'rxjs';
import {
  takeUntil,
  finalize,
  debounceTime,
  distinctUntilChanged,
} from 'rxjs/operators';

@Component({
  selector: 'app-books-list',
  templateUrl: './books-list.component.html',
  styleUrls: ['./books-list.component.css'],
  standalone: false,
})
export class BooksListComponent implements OnInit, OnDestroy {
  books: Book[] = [];
  loading = new Set<number>();
  listLoading = false;
  skeletonRows = Array.from({ length: 8 });
  page = 1;
  pageSize = 10;
  totalPages = 0;
  totalElements = 0;
  pageSizes = [5, 10, 20, 50];
  searchTerm = '';

  // View mode
  viewMode: 'table' | 'grid' = 'table';

  // Advanced filters
  filterStatus: 'all' | 'available' | 'outOfStock' = 'all';
  filterYear: 'all' | 'newest' | 'oldest' = 'all';
  filterCategory: string = '';
  categories: string[] = [];

  // Bulk actions
  selectedBooks = new Set<number>();
  selectAllChecked = false;

  // Debounce search
  private searchSubject = new Subject<string>();

  showBorrow = false;
  borrowingBook: Book | null = null;
  borrowForm = { memberId: 0, dueDate: '' };

  showReserve = false;
  reservingBook: Book | null = null;
  reserveForm = { memberId: 0 };

  bookToDelete: Book | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private booksService: BooksService,
    private circulation: CirculationService,
    private router: Router,
    private toastr: ToastrService,
  ) {}

  ngOnInit(): void {
    // Setup debounce search
    this.searchSubject
      .pipe(debounceTime(500), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => {
        this.loadBooks(1);
      });

    this.loadBooks();
    this.loadCategories();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  public loadBooks(goToPage: number = this.page) {
    this.page = goToPage;
    this.listLoading = true;

    // Ensure pageSize is valid
    if (isNaN(this.pageSize) || this.pageSize <= 0) {
      console.warn('Invalid pageSize detected, resetting to 10');
      this.pageSize = 10;
    }

    this.booksService
      .getPublicBooks(
        false,
        this.searchTerm.trim() || null,
        this.filterCategory || null,
        this.page - 1,
        this.pageSize,
      )
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.listLoading = false)),
      )
      .subscribe({
        next: (data: Page<Book>) => {
          console.log('API Response:', data);
          let books = data.content || [];

          // Apply client-side filters
          if (this.filterStatus === 'available') {
            books = books.filter((b) => b.numberOfCopiesAvailable > 0);
          } else if (this.filterStatus === 'outOfStock') {
            books = books.filter((b) => b.numberOfCopiesAvailable === 0);
          }

          // Apply year sorting
          if (this.filterYear === 'newest') {
            books = books.sort(
              (a, b) => (b.publishedYear || 0) - (a.publishedYear || 0),
            );
          } else if (this.filterYear === 'oldest') {
            books = books.sort(
              (a, b) => (a.publishedYear || 0) - (b.publishedYear || 0),
            );
          }

          this.books = books;
          this.totalPages = data.totalPages || 1;
          this.totalElements = data.totalElements || 0;
          console.log('Loaded books:', {
            page: this.page,
            totalPages: this.totalPages,
            totalElements: this.totalElements,
            booksCount: this.books.length,
          });
        },
        error: (err) => {
          console.error('API Error:', err);
          this.toastError(err);
        },
      });
  }

  setPage(p: number) {
    console.log('setPage called:', p);
    if (p >= 1 && p <= this.totalPages) {
      this.loadBooks(p);
    }
  }
  prevPage() {
    console.log('prevPage called, current page:', this.page);
    const newPage = this.page - 1;
    if (newPage >= 1) {
      this.loadBooks(newPage);
    }
  }
  nextPage() {
    console.log(
      'nextPage called, current page:',
      this.page,
      'totalPages:',
      this.totalPages,
    );
    const newPage = this.page + 1;
    this.loadBooks(newPage);
  }

  changePageSize(newSize: number | string) {
    const size = Number(newSize);
    if (isNaN(size) || size <= 0) {
      console.error('Invalid page size:', newSize);
      this.pageSize = 10; // Fallback to default
    } else {
      this.pageSize = size;
    }
    this.loadBooks(1);
  }

  updateBook(bookId: number) {
    this.router.navigate(['update-book', bookId]);
  }
  bookDetails(bookId: number) {
    this.router.navigate(['book-details', bookId]);
  }

  // --- Borrow Modal ---
  openBorrow(book: Book) {
    if (book.numberOfCopiesAvailable <= 0 || this.loading.has(book.id)) return;
    this.borrowingBook = book;
    this.borrowForm = { memberId: 0, dueDate: this.defaultDueDate(14) };
    this.showBorrow = true;
  }

  closeBorrow() {
    this.showBorrow = false;
    this.borrowingBook = null;
  }

  submitBorrow() {
    if (!this.borrowingBook) return;
    const { memberId, dueDate } = this.borrowForm;
    if (!memberId || !dueDate || memberId <= 0) {
      return this.toastError({
        message: 'Vui lòng nhập ID thành viên và ngày hết hạn hợp lệ.',
      });
    }

    const loanDays = this.daysFromToday(dueDate);
    if (loanDays <= 0)
      return this.toastError({ message: 'Ngày hết hạn phải ở tương lai.' });

    const bookId = this.borrowingBook.id;
    this.loading.add(bookId);

    this.circulation
      .loan({ bookId, memberId: Number(memberId), loanDays })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.loading.delete(bookId);
          this.toastOk(`Đã tạo phiếu mượn cho "${this.borrowingBook?.name}"`);
          this.closeBorrow();
          this.loadBooks(this.page);
        },
        error: (err) => {
          this.loading.delete(bookId);
          this.toastError(err);
        },
      });
  }

  // --- Reserve Modal ---
  openReserve(book: Book) {
    if (this.loading.has(book.id)) return;
    this.reservingBook = book;
    this.reserveForm = { memberId: 0 };
    this.showReserve = true;
  }

  closeReserve() {
    this.showReserve = false;
    this.reservingBook = null;
  }

  submitReserve() {
    if (!this.reservingBook) return;
    const { memberId } = this.reserveForm;
    if (!memberId || memberId <= 0)
      return this.toastError({
        message: 'Vui lòng nhập ID thành viên hợp lệ.',
      });

    const bookId = this.reservingBook.id;
    this.loading.add(bookId);

    this.circulation
      .reserve({ bookId, memberId: Number(memberId) })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.loading.delete(bookId);
          this.toastOk(
            `Đã đặt trước "${this.reservingBook?.name}" cho ID ${memberId}.`,
          );
          this.closeReserve();
        },
        error: (err) => {
          this.loading.delete(bookId);
          this.toastError(err);
        },
      });
  }

  isLoading(id: number) {
    return this.loading.has(id);
  }

  private defaultDueDate(addDays: number): string {
    const d = new Date();
    d.setDate(d.getDate() + addDays);
    return d.toISOString().slice(0, 10);
  }

  private daysFromToday(dateStr: string): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dateStr);
    return Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  }

  deleteBook(book: Book): void {
    this.bookToDelete = book;
  }

  confirmDelete(): void {
    if (!this.bookToDelete) return;
    const bookCopy = { ...this.bookToDelete };
    this.bookToDelete = null;

    this.booksService
      .deleteBook(bookCopy.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toastOk(`Đã xóa sách "${bookCopy.name}".`);
          this.loadBooks(this.page);
        },
        error: (err) => this.toastError(err),
      });
  }

  trackByBookId(index: number, book: Book): number {
    return book.id;
  }

  // --- Search & Filters ---
  onSearchChange(): void {
    this.searchSubject.next(this.searchTerm);
  }

  onFilterChange(): void {
    this.loadBooks(1);
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.filterStatus = 'all';
    this.filterYear = 'all';
    this.filterCategory = '';
    this.loadBooks(1);
  }

  loadCategories(): void {
    this.booksService
      .getPublicBooks(false, null, null, 0, 1000)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: Page<Book>) => {
          const allCategories = (data.content || [])
            .flatMap((b) => b.categories || [])
            .map((c) => c.name)
            .filter(Boolean);
          this.categories = [...new Set(allCategories)].sort();
        },
        error: (err) => console.error('Failed to load categories:', err),
      });
  }

  // --- View Mode ---
  toggleViewMode(): void {
    this.viewMode = this.viewMode === 'table' ? 'grid' : 'table';
  }

  // --- Bulk Actions ---
  toggleSelectAll(): void {
    if (this.selectAllChecked) {
      this.books.forEach((b) => this.selectedBooks.add(b.id));
    } else {
      this.selectedBooks.clear();
    }
  }

  toggleBookSelection(bookId: number): void {
    if (this.selectedBooks.has(bookId)) {
      this.selectedBooks.delete(bookId);
    } else {
      this.selectedBooks.add(bookId);
    }
    this.updateSelectAllState();
  }

  isBookSelected(bookId: number): boolean {
    return this.selectedBooks.has(bookId);
  }

  private updateSelectAllState(): void {
    this.selectAllChecked =
      this.books.length > 0 &&
      this.books.every((b) => this.selectedBooks.has(b.id));
  }

  bulkDelete(): void {
    if (this.selectedBooks.size === 0) {
      return this.toastError({ message: 'Chưa chọn sách nào để xóa.' });
    }

    if (
      !confirm(`Xác nhận xóa ${this.selectedBooks.size} cuốn sách đã chọn?`)
    ) {
      return;
    }

    const deletePromises = Array.from(this.selectedBooks).map((bookId) =>
      this.booksService.deleteBook(bookId).toPromise(),
    );

    Promise.all(deletePromises)
      .then(() => {
        this.toastOk(`Đã xóa ${this.selectedBooks.size} cuốn sách.`);
        this.selectedBooks.clear();
        this.loadBooks(this.page);
      })
      .catch((err) => this.toastError(err));
  }

  exportSelected(): void {
    if (this.selectedBooks.size === 0) {
      return this.toastError({ message: 'Chưa chọn sách nào để xuất.' });
    }

    const selectedBooksData = this.books.filter((b) =>
      this.selectedBooks.has(b.id),
    );

    // Convert to CSV
    const headers = [
      'ID',
      'Tên',
      'Tác giả',
      'ISBN',
      'Năm xuất bản',
      'Số lượng',
    ];
    const rows = selectedBooksData.map((b) => [
      b.id,
      b.name,
      b.authors?.map((a) => a.name).join('; ') || '',
      b.isbn || '',
      b.publishedYear || '',
      b.numberOfCopiesAvailable,
    ]);

    const csv = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    // Download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `books_export_${new Date().getTime()}.csv`;
    link.click();

    this.toastOk(`Đã xuất ${this.selectedBooks.size} cuốn sách.`);
  }

  navigateToImport(): void {
    this.router.navigate(['/admin/import-export']);
  }

  private toastOk(msg: string) {
    this.toastr.success(msg, 'Thành công');
  }
  private toastError(err: any) {
    const msg = err?.error?.message || err?.message || 'Đã có lỗi xảy ra.';
    this.toastr.error(msg, 'Lỗi');
  }
}
