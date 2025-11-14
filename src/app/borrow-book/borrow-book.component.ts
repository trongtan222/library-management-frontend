import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { BooksService } from '../services/books.service';
import { BorrowService, BorrowCreate } from '../services/borrow.service';
import { UserAuthService } from '../services/user-auth.service';
import { Books } from '../models/books';
import { CirculationService } from '../services/circulation.service'; // Import CirculationService

@Component({
    selector: 'app-borrow-book',
    templateUrl: './borrow-book.component.html',
    styleUrls: ['./borrow-book.component.css'],
    standalone: false
})
export class BorrowBookComponent implements OnInit {
  
  books: Books[] = [];
  genres: string[] = [];
  
  searchTerm: string = '';
  selectedGenre: string = '';
  
  currentPage: number = 1;
  pageSize: number = 10;
  totalElements: number = 0;
  totalPages: number = 0;
  
  loading = new Set<number>();
  userId: number | null = null;
  userName: string | null = null;
  
  // State cho modals
  showModal = false;
  showReserveModal = false;
  selectedBook: Books | null = null;
  
  loanDays = 14;
  errorMessage = '';
  successMessage = '';

  constructor(
    private booksService: BooksService,
    private userAuthService: UserAuthService,
    private borrowService: BorrowService,
    private circulationService: CirculationService, // Inject CirculationService
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.userId = this.userAuthService.getUserId();
    this.userName = this.userAuthService.getName();
    if (this.userId == null) {
      this.router.navigate(['/login']);
      return;
    }
    
    this.route.queryParams.subscribe(params => {
        this.searchTerm = params['search'] || '';
        this.loadBooks();
    });

    this.loadAllGenres();
  }

  loadBooks(): void {
    this.booksService.getPublicBooks(
      true, 
      this.searchTerm, 
      this.selectedGenre,
      this.currentPage - 1,
      this.pageSize
    ).subscribe({
      next: (page) => {
        this.books = page.content;
        this.totalPages = page.totalPages;
        this.totalElements = page.totalElements;
      },
      error: (err) => {
        this.errorMessage = "Could not load books.";
      }
    });
  }
  
  loadAllGenres(): void {
    // SỬA LỖI TRONG HÀM NÀY
    this.booksService.getPublicBooks(false, '', '', 0, 1000).subscribe(page => {
        // b.genre không còn tồn tại, ta phải lặp qua b.categories
        const allGenres = page.content
          .flatMap(b => b.categories) // Lấy mảng categories từ mỗi book
          .map(c => c.name)            // Lấy tên
          .filter(Boolean);            // Lọc ra null/undefined
        this.genres = [...new Set(allGenres)]; // Lấy duy nhất
    });
  }

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

  // --- Logic Mượn Sách ---
  openBorrowModal(book: Books): void {
    this.selectedBook = book;
    this.showModal = true;
  }

  closeBorrowModal(): void {
    this.showModal = false;
    this.selectedBook = null;
    this.loanDays = 14;
  }

  confirmBorrow(): void {
    if (!this.selectedBook || !this.userId) return;

    this.loading.add(this.selectedBook.id);
    this.clearMessages();

    const payload: BorrowCreate = {
      bookId: this.selectedBook.id,
      memberId: this.userId,
      loanDays: this.loanDays
    };

    this.borrowService.borrowBook(payload).subscribe({
      next: () => {
        this.successMessage = `Successfully borrowed "${this.selectedBook?.name}".`;
        this.loadBooks();
        this.closeBorrowModal();
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage = err.error?.message || 'An error occurred while borrowing the book.';
        this.closeBorrowModal();
      },
      complete: () => {
        if (this.selectedBook) this.loading.delete(this.selectedBook.id);
      }
    });
  }

  // --- Logic Đặt Trước Sách ---
  openReserveModal(book: Books): void {
    this.selectedBook = book;
    this.showReserveModal = true;
  }

  closeReserveModal(): void {
    this.showReserveModal = false;
    this.selectedBook = null;
  }

  confirmReserve(): void {
    if (!this.selectedBook || !this.userId) return;

    this.loading.add(this.selectedBook.id);
    this.clearMessages();

    const payload = {
      bookId: this.selectedBook.id,
      memberId: this.userId
    };

    this.circulationService.reserve(payload).subscribe({
      next: () => {
        this.successMessage = `Successfully reserved "${this.selectedBook?.name}".`;
        this.closeReserveModal();
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage = err.error?.message || 'An error occurred while reserving the book.';
        this.closeReserveModal();
      },
      complete: () => {
        if (this.selectedBook) this.loading.delete(this.selectedBook.id);
      }
    });
  }

  private clearMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
  }
}