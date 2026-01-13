import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { BooksService, Page } from '../services/books.service';
import {
  CirculationService,
  BorrowCreate,
} from '../services/circulation.service';
import { UserAuthService } from '../services/user-auth.service';
import { Book } from '../models/book'; // Đảm bảo file model tên là book.ts hoặc books.ts
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';
import { BarcodeFormat } from '@zxing/library';

@Component({
  selector: 'app-borrow-book',
  templateUrl: './borrow-book.component.html',
  styleUrls: ['./borrow-book.component.css'],
  standalone: false,
})
export class BorrowBookComponent implements OnInit, OnDestroy {
  books: Book[] = [];
  filteredBooks: Book[] = [];
  genres: string[] = [];
  searchTerm: string = '';
  selectedGenre: string = '';

  // Cấu hình phân trang
  currentPage: number = 1;
  pageSize: number = 10; // Khởi tạo giá trị mặc định để tránh lỗi NaN
  totalElements: number = 0;
  totalPages: number = 0;
  pageSizes: number[] = [10, 20, 30, 50];

  // Trạng thái Loading
  loading = new Set<number>(); // Loading cho từng nút sách
  isLoadingPage = false; // Loading toàn trang

  // Thông tin User
  userId: number | null = null;
  userName: string | null = null;

  // State Modals
  showModal = false;
  showConfirmModal = false;
  showReserveModal = false;
  selectedBook: Book | null = null;

  // State Scanner
  enableScanner = false;
  allowedFormats = [
    BarcodeFormat.QR_CODE,
    BarcodeFormat.EAN_13,
    BarcodeFormat.CODE_128,
  ];
  hasPermission: boolean = false;

  // Form Data
  borrowData = {
    studentName: '',
    studentClass: '',
    quantity: 1,
    loanDays: 14,
  };

  successMessage: string = '';
  errorMessage: string = '';
  private destroy$ = new Subject<void>();

  constructor(
    private booksService: BooksService,
    private userAuthService: UserAuthService,
    private circulationService: CirculationService,
    private router: Router,
    private route: ActivatedRoute,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.userId = this.userAuthService.getUserId();
    this.userName = this.userAuthService.getName();

    if (this.userName) this.borrowData.studentName = this.userName;

    if (this.userId == null) {
      this.router.navigate(['/login']);
      return;
    }

    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe((params) => {
        this.searchTerm = params['search'] || '';
        this.loadBooks();
      });

    this.loadAllGenres();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadBooks(): void {
    this.isLoadingPage = true;
    this.booksService
      .getPublicBooks(
        true,
        this.searchTerm,
        this.selectedGenre,
        this.currentPage - 1,
        this.pageSize
      )
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.isLoadingPage = false))
      )
      .subscribe({
        next: (response: any) => {
          // Xử lý linh hoạt response (Page hoặc Array)
          if (response && response.content) {
            this.books = response.content;
            this.totalPages = response.totalPages;
            this.totalElements = response.totalElements;
          } else if (Array.isArray(response)) {
            this.books = response;
            this.totalPages = 1;
            this.totalElements = response.length;
          } else {
            this.books = [];
            this.totalPages = 0;
            this.totalElements = 0;
          }
          this.filteredBooks = [...this.books];
        },
        error: (err) => {
          console.error('Lỗi tải sách:', err);
          this.toastr.error('Không thể tải danh sách sách.');
        },
      });
  }

  loadAllGenres(): void {
    this.booksService
      .getPublicBooks(false, '', '', 0, 1000)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (page: any) => {
          const content = page.content || page;
          if (content && Array.isArray(content)) {
            const allGenres = content
              .flatMap((b: Book) => b.categories || [])
              .map((c: any) => c.name)
              .filter(Boolean);
            this.genres = [...new Set(allGenres)];
          }
        },
      });
  }

  // --- Filter Functions ---
  onFilterChange(): void {
    this.currentPage = 1;
    this.loadBooks();
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.selectedGenre = '';
    this.currentPage = 1;
    this.loadBooks();
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.loadBooks();
  }

  changePageSize(event: any): void {
    this.pageSize = Number(event.target.value);
    this.currentPage = 1;
    this.loadBooks();
  }

  // --- Borrow Logic ---
  openBorrowForm(book: Book) {
    this.selectedBook = book;
    this.showModal = true;
    this.showConfirmModal = true;

    // Reset form
    this.borrowData.quantity = 1;
    this.borrowData.loanDays = 14;
    this.borrowData.studentClass = '';
    if (this.userName) this.borrowData.studentName = this.userName;
  }

  closeModal() {
    this.showModal = false;
    this.showConfirmModal = false;
    this.showReserveModal = false;
    this.selectedBook = null;
    this.errorMessage = '';
    this.successMessage = '';
  }

  confirmBorrow(): void {
    if (!this.selectedBook || !this.userId) return;

    if (!this.borrowData.studentName || !this.borrowData.studentClass) {
      this.toastr.warning('Vui lòng điền đầy đủ Họ tên và Lớp!');
      return;
    }

    this.loading.add(this.selectedBook.id);

    const payload: BorrowCreate = {
      bookId: this.selectedBook.id,
      memberId: this.userId,
      loanDays: this.borrowData.loanDays,
      // studentName/Class sẽ được gửi nếu backend hỗ trợ,
      // nếu không backend sẽ lấy từ user profile
    };

    this.circulationService
      .loan(payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toastr.success(
            `Đã mượn thành công sách "${this.selectedBook?.name}".`
          );
          this.loadBooks();
          this.closeModal();
        },
        error: (err: HttpErrorResponse) => {
          this.errorMessage = err.error?.message || 'Lỗi khi mượn sách.';
          this.toastr.error(this.errorMessage);
          if (this.selectedBook) this.loading.delete(this.selectedBook.id);
        },
        complete: () => {
          if (this.selectedBook) this.loading.delete(this.selectedBook.id);
        },
      });
  }

  // --- Reserve Logic ---
  openReserveModal(book: Book): void {
    this.selectedBook = book;
    this.showReserveModal = true;
    if (this.userName) this.borrowData.studentName = this.userName;
  }

  closeReserveModal() {
    this.closeModal();
  }

  confirmReserve(): void {
    if (!this.selectedBook || !this.userId) return;

    if (!this.borrowData.studentName || !this.borrowData.studentClass) {
      this.toastr.warning('Vui lòng điền đầy đủ thông tin!');
      return;
    }

    this.loading.add(this.selectedBook.id);

    const payload = {
      bookId: this.selectedBook.id,
      memberId: this.userId,
      // Thêm thông tin phụ
      studentName: this.borrowData.studentName,
      studentClass: this.borrowData.studentClass,
    };

    this.circulationService
      .reserve(payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toastr.success(
            `Đã đặt trước thành công cuốn "${this.selectedBook?.name}".`
          );
          this.closeModal();
        },
        error: (err: HttpErrorResponse) => {
          this.errorMessage = err.error?.message || 'Lỗi khi đặt trước sách.';
          this.toastr.error(this.errorMessage);
          if (this.selectedBook) this.loading.delete(this.selectedBook.id);
        },
        complete: () => {
          if (this.selectedBook) this.loading.delete(this.selectedBook.id);
        },
      });
  }

  // --- Scanner Logic ---
  toggleScanner() {
    this.enableScanner = !this.enableScanner;
    if (!this.enableScanner) {
      this.hasPermission = false; // Reset trạng thái
    }
  }

  onPermissionResponse(permission: boolean) {
    this.hasPermission = permission;
    if (!permission) {
      this.toastr.warning('Bạn cần cấp quyền Camera để sử dụng tính năng này!');
      this.enableScanner = false;
    }
  }

  onCodeResult(resultString: string) {
    if (!resultString) return;

    // Tắt scanner ngay sau khi quét được
    this.enableScanner = false;

    const bookId = Number(resultString);
    if (isNaN(bookId)) {
      this.toastr.error('Mã QR không hợp lệ (Không phải ID sách)!');
      return;
    }

    this.booksService
      .getBookById(bookId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (book) => {
          if (book) {
            this.toastr.info(`Đã tìm thấy: ${book.name}`);
            this.openBorrowForm(book);
          } else {
            this.toastr.error('Không tìm thấy sách với ID này.');
          }
        },
        error: () => this.toastr.error('Lỗi khi tìm sách từ mã QR.'),
      });
  }
}
