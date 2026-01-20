import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { BooksService, Page } from '../services/books.service';
import {
  CirculationService,
  BorrowCreate,
} from '../services/circulation.service';
import { UserAuthService } from '../services/user-auth.service';
import { Book } from '../models/book';
import { Subject } from 'rxjs';
import {
  takeUntil,
  finalize,
  debounceTime,
  distinctUntilChanged,
} from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';
import { BarcodeFormat } from '@zxing/library';

interface CartItem {
  book: Book;
  addedAt: Date;
}

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

  // Borrow Cart
  cartItems: CartItem[] = [];
  showCartModal = false;

  // Debounce Search
  private searchSubject = new Subject<string>();

  // Skeleton Loading
  skeletonArray = Array(8).fill(0);

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
    private toastr: ToastrService,
  ) {}

  ngOnInit(): void {
    this.userId = this.userAuthService.getUserId();
    this.userName = this.userAuthService.getName();

    if (this.userName) this.borrowData.studentName = this.userName;

    if (this.userId == null) {
      this.router.navigate(['/login']);
      return;
    }

    // Setup debounce search
    this.searchSubject
      .pipe(debounceTime(500), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => {
        this.currentPage = 1;
        this.loadBooks();
      });

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
        this.pageSize,
      )
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.isLoadingPage = false)),
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
    // Use debounce for search
    this.searchSubject.next(this.searchTerm);
  }

  onGenreChange(): void {
    // Instant filter for dropdown
    this.currentPage = 1;
    this.loadBooks();
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.selectedGenre = '';
    this.currentPage = 1;
    this.loadBooks();
  }

  // --- Cart Functions ---
  addToCart(book: Book): void {
    // Check if already in cart
    if (this.isInCart(book.id)) {
      this.toastr.info('Sách này đã có trong giỏ!');
      return;
    }

    // Check availability
    if (book.numberOfCopiesAvailable <= 0) {
      this.toastr.warning('Sách này hiện không có sẵn!');
      return;
    }

    this.cartItems.push({
      book,
      addedAt: new Date(),
    });

    this.toastr.success(`Đã thêm "${book.name}" vào giỏ!`, '', {
      timeOut: 2000,
    });
  }

  removeFromCart(bookId: number): void {
    this.cartItems = this.cartItems.filter((item) => item.book.id !== bookId);
    this.toastr.info('Đã xóa khỏi giỏ');
  }

  isInCart(bookId: number): boolean {
    return this.cartItems.some((item) => item.book.id === bookId);
  }

  get cartCount(): number {
    return this.cartItems.length;
  }

  toggleCartModal(): void {
    this.showCartModal = !this.showCartModal;
  }

  clearCart(): void {
    this.cartItems = [];
    this.toastr.info('Đã xóa toàn bộ giỏ');
  }

  borrowAllFromCart(): void {
    if (this.cartItems.length === 0) {
      this.toastr.warning('Giỏ sách trống!');
      return;
    }

    if (!this.borrowData.studentName || !this.borrowData.studentClass) {
      this.toastr.warning('Vui lòng điền đầy đủ Họ tên và Lớp!');
      return;
    }

    const borrowPromises = this.cartItems.map((item) => {
      const payload: BorrowCreate = {
        bookId: item.book.id,
        memberId: this.userId!,
        loanDays: this.borrowData.loanDays,
      };
      return this.circulationService.loan(payload).toPromise();
    });

    Promise.all(borrowPromises)
      .then(() => {
        this.toastr.success(
          `Đã mượn thành công ${this.cartItems.length} cuốn sách!`,
        );
        this.cartItems = [];
        this.showCartModal = false;
        this.loadBooks();
      })
      .catch((err: HttpErrorResponse) => {
        const msg = err.error?.message || 'Lỗi khi mượn sách hàng loạt.';
        this.toastr.error(msg);
      });
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
            `Đã mượn thành công sách "${this.selectedBook?.name}".`,
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
            `Đã đặt trước thành công cuốn "${this.selectedBook?.name}".`,
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

    const bookId = Number(resultString);
    if (isNaN(bookId)) {
      this.playBeep('error');
      this.toastr.error('Mã QR không hợp lệ!');
      return;
    }

    this.booksService
      .getBookById(bookId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (book) => {
          if (book) {
            this.playBeep('success');
            this.addToCart(book);
            this.toastr.success(`✓ ${book.name}`, '', { timeOut: 1500 });
          } else {
            this.playBeep('error');
            this.toastr.error('Không tìm thấy sách với ID này.');
          }
        },
        error: () => {
          this.playBeep('error');
          this.toastr.error('Lỗi khi tìm sách từ mã QR.');
        },
      });
  }

  private playBeep(type: 'success' | 'error'): void {
    // Create audio context for beep sound
    try {
      const audioContext = new AudioContext();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      if (type === 'success') {
        oscillator.frequency.value = 800; // Higher pitch for success
        oscillator.type = 'sine';
      } else {
        oscillator.frequency.value = 400; // Lower pitch for error
        oscillator.type = 'square';
      }

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        audioContext.currentTime + 0.1,
      );

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    } catch (e) {
      console.warn('Cannot play beep sound:', e);
    }
  }
}
