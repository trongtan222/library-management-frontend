import { Component, OnDestroy, OnInit, HostListener } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { Subject, Subscription, lastValueFrom } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Book } from 'src/app/models/book';
import { User } from 'src/app/models/user';
import { BooksService } from 'src/app/services/books.service';
import { CirculationService } from 'src/app/services/circulation.service';
import { UsersService } from 'src/app/services/users.service';
import { ChatbotService } from 'src/app/services/chatbot.service';

@Component({
  selector: 'app-create-loan',
  templateUrl: './create-loan.component.html',
  styleUrls: ['./create-loan.component.css'],
  standalone: false,
})
export class CreateLoanComponent implements OnInit, OnDestroy {
  // State tìm kiếm User
  users: User[] = [];
  selectedUser: User | null = null;
  userSearchTerm = '';
  userSearch$ = new Subject<string>();
  recentUsers: User[] = []; // Recent users cache
  showRecentUsers = false;
  userSummary = {
    activeLoans: 0,
    maxLoans: 5,
    overdueCount: 0,
    totalFine: 0,
    blocked: false,
    blockReason: '',
  };

  // State tìm kiếm Book
  books: Book[] = [];
  selectedBook: Book | null = null;
  bookSearchTerm = '';
  bookSearch$ = new Subject<string>();
  aiSuggestion = '';
  aiLoading = false;
  cartBooks: Book[] = [];

  // Loan config
  loanDays = 14;
  isLoading = false;

  // Bulk import
  bulkImporting = false;
  bulkResults: { total: number; success: number; errors: string[] } = {
    total: 0,
    success: 0,
    errors: [],
  };
  showBulkModal = false;

  private subscriptions: Subscription[] = [];

  constructor(
    private usersService: UsersService,
    private booksService: BooksService,
    private circulationService: CirculationService,
    private toastr: ToastrService,
    private router: Router,
    private route: ActivatedRoute,
    private chatbotService: ChatbotService,
  ) {}

  ngOnInit(): void {
    this.loadRecentUsers();
    this.subscriptions.push(
      this.userSearch$
        .pipe(debounceTime(250), distinctUntilChanged())
        .subscribe((term) => this.searchUsers(term)),
      this.bookSearch$
        .pipe(debounceTime(200), distinctUntilChanged())
        .subscribe((term) => this.searchBooks(term)),
    );

    // Nhận bookId từ query params (từ scanner)
    this.route.queryParams.subscribe((params) => {
      const bookId = Number(params['bookId']);
      if (!isNaN(bookId) && bookId > 0) {
        this.booksService.getBookById(bookId).subscribe({
          next: (book) => {
            this.selectBook(book);
          },
        });
      }
    });
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((s) => s.unsubscribe());
  }

  // --- KEYBOARD SHORTCUTS ---
  @HostListener('document:keydown', ['$event'])
  handleKeyboard(event: KeyboardEvent) {
    // Ctrl+S = Mở scanner
    if (event.ctrlKey && event.key === 's') {
      event.preventDefault();
      this.openScanner();
      this.toastr.info('Mở scanner...', '⌨️ Ctrl+S');
    }
    // F2 = Xóa giỏ sách
    if (event.key === 'F2') {
      event.preventDefault();
      if (this.cartBooks.length > 0) {
        this.resetBooksOnly();
        this.toastr.info('Đã xóa giỏ sách', '⌨️ F2');
      }
    }
    // F3 = Focus vào ô tìm kiếm user
    if (event.key === 'F3') {
      event.preventDefault();
      const userInput = document.querySelector<HTMLInputElement>(
        'input[placeholder*="tên hoặc username"]',
      );
      if (userInput) {
        userInput.focus();
        this.toastr.info('Focus vào tìm kiếm User', '⌨️ F3');
      }
    }
    // F4 = Focus vào ô tìm kiếm sách
    if (event.key === 'F4') {
      event.preventDefault();
      const bookInput = document.querySelector<HTMLInputElement>(
        'input[placeholder*="tên sách hoặc ISBN"]',
      );
      if (bookInput) {
        bookInput.focus();
        this.toastr.info('Focus vào tìm kiếm Sách', '⌨️ F4');
      }
    }
    // Ctrl+Enter = Submit form (nếu đủ điều kiện)
    if (event.ctrlKey && event.key === 'Enter') {
      event.preventDefault();
      if (
        this.selectedUser &&
        this.cartBooks.length > 0 &&
        !this.userSummary.blocked &&
        !this.isLoading
      ) {
        this.createLoan();
        this.toastr.info('Xác nhận tạo phiếu mượn', '⌨️ Ctrl+Enter');
      }
    }
  }

  // --- USER SEARCH ---
  onUserSearchChange(term: string) {
    this.userSearchTerm = term;
    this.userSearch$.next(term);
  }

  searchUsers(term: string) {
    const keyword = (term || '').trim();
    if (!keyword) {
      this.users = [];
      return;
    }

    this.usersService.getUsersList().subscribe({
      next: (data) => {
        const lower = keyword.toLowerCase();
        this.users = data
          .filter(
            (u) =>
              u.username.toLowerCase().includes(lower) ||
              u.name.toLowerCase().includes(lower),
          )
          .slice(0, 8);
      },
      error: () => (this.users = []),
    });
  }

  selectUser(user: User) {
    this.selectedUser = user;
    this.users = []; // Ẩn danh sách gợi ý
    this.userSearchTerm = '';
    this.showRecentUsers = false;
    this.saveToRecentUsers(user);
    this.fetchUserLoans(user.userId);
    this.loadAiSuggestion();
  }

  clearSelectedUser() {
    this.selectedUser = null;
    this.userSummary = {
      ...this.userSummary,
      activeLoans: 0,
      overdueCount: 0,
      totalFine: 0,
      blocked: false,
      blockReason: '',
    };
    this.aiSuggestion = '';
  }

  // --- BOOK SEARCH ---
  onBookSearchChange(term: string) {
    this.bookSearchTerm = term;
    this.bookSearch$.next(term);
  }

  searchBooks(term: string) {
    const keyword = (term || '').trim();
    if (!keyword) {
      this.books = [];
      return;
    }

    this.booksService.getPublicBooks(true, keyword, null, 0, 8).subscribe({
      next: (page) => {
        this.books = page.content;
      },
      error: () => (this.books = []),
    });
  }

  selectBook(book: Book) {
    this.selectedBook = book;
    this.books = []; // Ẩn danh sách gợi ý
    this.bookSearchTerm = '';
    this.addBookToCart(book);
    this.loadAiSuggestion();
  }

  clearSelectedBook() {
    this.selectedBook = null;
    this.aiSuggestion = '';
  }

  // --- SUBMIT ---
  createLoan() {
    if (!this.selectedUser || this.cartBooks.length === 0) {
      this.toastr.warning('Vui lòng chọn Người dùng và thêm ít nhất 1 sách.');
      return;
    }

    if (this.userSummary.blocked) {
      this.toastr.error(
        this.userSummary.blockReason ||
          'Không thể tạo phiếu mượn cho người dùng này.',
      );
      return;
    }

    if (
      this.userSummary.activeLoans + this.cartBooks.length >
      this.userSummary.maxLoans
    ) {
      this.toastr.error('Vượt giới hạn số sách đang mượn.');
      return;
    }

    this.isLoading = true;
    const userId = this.selectedUser.userId;
    const studentName = this.selectedUser.name;
    const studentClass = this.selectedUser.className || '';

    const process = async () => {
      let success = 0;
      const errors: string[] = [];
      for (const b of this.cartBooks) {
        if (b.numberOfCopiesAvailable === 0) {
          errors.push(`${b.name}: Sách đã hết`);
          continue;
        }
        const payload = {
          bookId: b.id,
          memberId: userId,
          loanDays: this.loanDays,
          studentName,
          studentClass,
        };
        try {
          await lastValueFrom(this.circulationService.loan(payload));
          success++;
        } catch (err: any) {
          errors.push(`${b.name}: ${err?.error?.message || 'Lỗi mượn'}`);
        }
      }

      if (success > 0) {
        this.toastr.success(
          `Đã cấp ${success} sách cho ${this.selectedUser?.name}`,
        );
      }
      if (errors.length) {
        this.toastr.error(`Có lỗi với ${errors.length} sách`, errors[0]);
      }
      this.afterLoanProcessed(success);
      this.isLoading = false;
    };

    process();
  }

  resetForm() {
    this.selectedBook = null;
    this.selectedUser = null;
    this.userSummary = {
      ...this.userSummary,
      activeLoans: 0,
      overdueCount: 0,
      totalFine: 0,
      blocked: false,
      blockReason: '',
    };
    this.loanDays = 14;
    this.isLoading = false;
  }

  resetBooksOnly() {
    this.selectedBook = null;
    this.cartBooks = [];
    this.aiSuggestion = '';
  }

  cancel() {
    this.router.navigate(['/admin/loans']);
  }

  openScanner() {
    this.router.navigate(['/admin/scanner'], {
      queryParamsHandling: 'preserve',
    });
  }

  private fetchUserLoans(userId: number) {
    // Lấy lịch sử mượn cho user này và tổng hợp dữ liệu cảnh báo
    this.circulationService.getLoansByMemberId(userId).subscribe({
      next: (loans) => {
        if (this.selectedUser) {
          this.selectedUser.loanHistory = loans.slice(0, 5).map((l) => ({
            bookName: l.bookName,
            loanDate: l.loanDate,
          }));
        }
        this.updateUserSummary(loans);
      },
      error: () => {
        this.updateUserSummary([]);
      },
    });
  }

  private updateUserSummary(loans: any[]) {
    const active = loans.filter(
      (l) => l.status === 'ACTIVE' || l.status === 'OVERDUE',
    );
    const overdue = loans.filter(
      (l) =>
        l.status === 'OVERDUE' ||
        (!l.returnDate && new Date(l.dueDate) < new Date()),
    );
    const totalFine = loans.reduce((sum, l) => sum + (l.fineAmount || 0), 0);

    const blockedReason =
      overdue.length > 0
        ? 'Có sách quá hạn, cần trả trước khi mượn mới.'
        : active.length >= this.userSummary.maxLoans
          ? `Đã đạt giới hạn ${this.userSummary.maxLoans} sách đang mượn.`
          : '';

    this.userSummary = {
      ...this.userSummary,
      activeLoans: active.length,
      overdueCount: overdue.length,
      totalFine: totalFine,
      blocked: Boolean(blockedReason),
      blockReason: blockedReason,
    };
  }

  private loadAiSuggestion() {
    if (!this.selectedUser || !this.selectedBook) {
      this.aiSuggestion = '';
      return;
    }

    const prompt = `Gợi ý 1-2 cuốn sách tương tự cho độc giả tên ${this.selectedUser.name} đang mượn cuốn "${this.selectedBook.name}". Trả về câu ngắn gọn tiếng Việt.`;
    this.aiLoading = true;
    this.aiSuggestion = '';

    const sub = this.chatbotService.ask(prompt).subscribe({
      next: (res) => {
        const reply = res?.answer || res?.message || '';
        this.aiSuggestion = reply || 'Chưa có gợi ý.';
      },
      error: () => {
        this.aiSuggestion = 'Không lấy được gợi ý AI lúc này.';
      },
      complete: () => {
        this.aiLoading = false;
      },
    });
    this.subscriptions.push(sub);
  }

  private addBookToCart(book: Book) {
    const exists = this.cartBooks.some((b) => b.id === book.id);
    if (!exists) {
      this.cartBooks = [...this.cartBooks, book];
    }
  }

  removeBookFromCart(bookId: number) {
    this.cartBooks = this.cartBooks.filter((b) => b.id !== bookId);
    if (this.selectedBook && this.selectedBook.id === bookId) {
      this.selectedBook = null;
      this.aiSuggestion = '';
    }
  }

  get cartCount(): number {
    return this.cartBooks.length;
  }

  private afterLoanProcessed(successCount: number) {
    // Giữ nguyên user để quét tiếp; chỉ làm sạch danh sách sách sau khi mượn
    if (successCount > 0) {
      this.cartBooks = [];
      this.selectedBook = null;
      this.aiSuggestion = '';
      // Cập nhật lại summary (giả định success đã tăng activeLoans)
      this.userSummary = {
        ...this.userSummary,
        activeLoans: this.userSummary.activeLoans + successCount,
      };
    }
  }

  // --- RECENT USERS CACHE ---
  private loadRecentUsers() {
    try {
      const stored = localStorage.getItem('recentUsers');
      if (stored) {
        this.recentUsers = JSON.parse(stored);
      }
    } catch (e) {
      this.recentUsers = [];
    }
  }

  private saveToRecentUsers(user: User) {
    // Loại bỏ user trùng (nếu có)
    this.recentUsers = this.recentUsers.filter((u) => u.userId !== user.userId);
    // Thêm user vào đầu danh sách
    this.recentUsers.unshift(user);
    // Giới hạn 10 user
    this.recentUsers = this.recentUsers.slice(0, 10);
    // Lưu vào localStorage
    try {
      localStorage.setItem('recentUsers', JSON.stringify(this.recentUsers));
    } catch (e) {
      console.error('Failed to save recent users:', e);
    }
  }

  toggleRecentUsers() {
    this.showRecentUsers = !this.showRecentUsers;
    if (this.showRecentUsers) {
      this.users = []; // Ẩn kết quả tìm kiếm
    }
  }

  clearRecentUsers() {
    this.recentUsers = [];
    this.showRecentUsers = false;
    localStorage.removeItem('recentUsers');
    this.toastr.success('Đã xóa danh sách User gần đây');
  }

  // --- BULK IMPORT ---
  onBulkImportFile(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    if (!file.name.endsWith('.csv')) {
      this.toastr.error('Chỉ chấp nhận file CSV');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      this.processBulkImport(text);
    };
    reader.readAsText(file);
    input.value = ''; // Reset input
  }

  private async processBulkImport(csvText: string) {
    const lines = csvText.split('\n').filter((l) => l.trim());
    if (lines.length === 0) {
      this.toastr.error('File CSV rỗng');
      return;
    }

    // Parse CSV (format: userId,bookId,loanDays)
    const rows = lines.slice(1).map((line) => {
      const [userId, bookId, loanDays] = line.split(',').map((s) => s.trim());
      return {
        userId: Number(userId),
        bookId: Number(bookId),
        loanDays: Number(loanDays) || 14,
      };
    });

    if (rows.length === 0) {
      this.toastr.error('Không tìm thấy dữ liệu hợp lệ trong CSV');
      return;
    }

    this.bulkImporting = true;
    this.bulkResults = { total: rows.length, success: 0, errors: [] };
    this.showBulkModal = true;

    for (const row of rows) {
      if (isNaN(row.userId) || isNaN(row.bookId)) {
        this.bulkResults.errors.push(
          `Dòng không hợp lệ: userId=${row.userId}, bookId=${row.bookId}`,
        );
        continue;
      }

      try {
        // Lấy thông tin user
        const user = await lastValueFrom(
          this.usersService.getUserById(row.userId),
        );
        const payload = {
          bookId: row.bookId,
          memberId: row.userId,
          loanDays: row.loanDays,
          studentName: user.name,
          studentClass: (user as any).className || '',
        };
        await lastValueFrom(this.circulationService.loan(payload));
        this.bulkResults.success++;
      } catch (err: any) {
        const msg = err?.error?.message || err?.message || 'Lỗi không xác định';
        this.bulkResults.errors.push(
          `User ${row.userId} - Book ${row.bookId}: ${msg}`,
        );
      }
    }

    this.bulkImporting = false;
    this.toastr.success(
      `Hoàn tất: ${this.bulkResults.success}/${this.bulkResults.total} thành công`,
    );
  }

  closeBulkModal() {
    this.showBulkModal = false;
    this.bulkResults = { total: 0, success: 0, errors: [] };
  }

  downloadBulkTemplate() {
    const template = `userId,bookId,loanDays\n1,101,14\n2,102,7\n3,103,30`;
    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bulk_loan_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
    this.toastr.success('Đã tải file mẫu CSV');
  }
}
