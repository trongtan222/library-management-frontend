import { Component, OnDestroy, OnInit } from '@angular/core';
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

  private subscriptions: Subscription[] = [];

  constructor(
    private usersService: UsersService,
    private booksService: BooksService,
    private circulationService: CirculationService,
    private toastr: ToastrService,
    private router: Router,
    private route: ActivatedRoute,
    private chatbotService: ChatbotService
  ) {}

  ngOnInit(): void {
    this.subscriptions.push(
      this.userSearch$
        .pipe(debounceTime(250), distinctUntilChanged())
        .subscribe((term) => this.searchUsers(term)),
      this.bookSearch$
        .pipe(debounceTime(200), distinctUntilChanged())
        .subscribe((term) => this.searchBooks(term))
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
              u.name.toLowerCase().includes(lower)
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
          'Không thể tạo phiếu mượn cho người dùng này.'
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
          `Đã cấp ${success} sách cho ${this.selectedUser?.name}`
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
      (l) => l.status === 'ACTIVE' || l.status === 'OVERDUE'
    );
    const overdue = loans.filter(
      (l) =>
        l.status === 'OVERDUE' ||
        (!l.returnDate && new Date(l.dueDate) < new Date())
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
}
