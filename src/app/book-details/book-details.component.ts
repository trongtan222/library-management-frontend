import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Books, Author, Category } from '../models/books'; // Import thêm Author, Category
import { BooksService } from '../services/books.service';
import { UserAuthService } from '../services/user-auth.service';
import { finalize } from 'rxjs/operators';
import { ReviewService, BookReviewsSummary, Review } from '../services/review.service';
import { ToastrService } from 'ngx-toastr';

@Component({
    selector: 'app-book-details',
    templateUrl: './book-details.component.html',
    styleUrls: ['./book-details.component.css'],
    standalone: false
})
export class BookDetailsComponent implements OnInit {

  book: Books | null = null;
  isLoading = true;
  errorMessage = '';
  isUser = false;
  private readonly googleApiKey = 'AIzaSyB2Yrs1oWkbIirD3BmF2lOM7bIE9d3Zn40'; // (Lưu ý: API key không nên để public)
  reviewsSummary: BookReviewsSummary | null = null;
  userCanReview = false;
  isCheckingPermission = true; 
  newReview = { rating: 5, comment: '' };

  constructor(
    private route: ActivatedRoute,
    private booksService: BooksService,
    private userAuthService: UserAuthService,
    private router: Router,
    private http: HttpClient,
    private reviewService: ReviewService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.isUser = this.userAuthService.isUser();
    
    const bookIdParam = this.route.snapshot.paramMap.get('id') || this.route.snapshot.paramMap.get('bookId');
    const bookId = Number(bookIdParam);

    if (bookId) {
      this.loadBookDetails(bookId);
      this.loadReviewsAndCheckPermission(bookId);
    } else {
      this.errorMessage = "Không tìm thấy ID sách trong URL.";
      this.isLoading = false;
    }
  }

  private loadBookDetails(id: number): void {
    this.isLoading = true;
    this.booksService.getBookById(id)
      .pipe(finalize(() => this.isLoading = false))
      .subscribe({
        next: (data: Books) => { // data đã là kiểu Books
          // SỬA LỖI TRONG KHỐI NÀY
          this.book = {
            id: data.id,
            name: data.name,
            authors: data.authors || [], // Sửa từ author
            categories: data.categories || [], // Sửa từ genre
            publishedYear: data.publishedYear,
            isbn: data.isbn,
            numberOfCopiesAvailable: data.numberOfCopiesAvailable,
            coverUrl: data.coverUrl
          };
          if (this.book && !this.book.coverUrl) {
            this.findAndSaveCover(this.book);
          }
        },
        error: (err) => { this.errorMessage = 'Không thể tải chi tiết sách.'; console.error(err); }
      });
  }

  loadReviewsAndCheckPermission(bookId: number): void {
    // 1. Tải các đánh giá công khai và điểm trung bình
    this.reviewService.getReviewsForBook(bookId).subscribe(summary => {
      this.reviewsSummary = summary;
    });

    // 2. Nếu là user, gọi API mới để kiểm tra quyền đánh giá
    if (this.isUser) {
      this.isCheckingPermission = true; // Bắt đầu kiểm tra
      this.reviewService.checkIfUserHasReviewed(bookId).subscribe({
        next: response => {
          this.userCanReview = !response.hasReviewed;
          this.isCheckingPermission = false; // Hoàn tất kiểm tra
        },
        error: () => {
          this.isCheckingPermission = false; // Hoàn tất ngay cả khi có lỗi
          this.userCanReview = false; // Mặc định không cho review nếu có lỗi
        }
      });
    } else {
      this.isCheckingPermission = false; // Không phải user, không cần kiểm tra
    }
  }
  
  submitReview(): void {
    const bookId = this.book?.id;
    if (!bookId || this.newReview.rating < 1) {
        this.toastr.error('Vui lòng chọn ít nhất 1 sao.');
        return;
    }

    this.reviewService.addReview(bookId, this.newReview).subscribe({
        next: () => {
            this.toastr.success('Cảm ơn bạn đã gửi đánh giá! Đánh giá của bạn sẽ được hiển thị sau khi quản trị viên phê duyệt.');
            this.userCanReview = false; // Ẩn form sau khi gửi
        },
        error: (err) => this.toastr.error(err.error?.message || 'Gửi đánh giá thất bại.')
    });
  }

  private findAndSaveCover(book: Books): void {
    const isbn = book.isbn?.trim();
    if (isbn) {
      const url = `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&key=${this.googleApiKey}`;
      this.http.get<any>(url).subscribe({
        next: (response) => {
          const coverUrl = response?.items?.[0]?.volumeInfo?.imageLinks?.thumbnail;
          if (coverUrl) {
            this.setAndSaveCover(book, coverUrl);
          } else {
            console.warn(`Không tìm thấy bìa sách với ISBN ${isbn}. Thử tìm bằng tên và tác giả.`);
            this.searchByTitleAndAuthor(book);
          }
        },
        error: () => this.searchByTitleAndAuthor(book)
      });
    } else {
      this.searchByTitleAndAuthor(book);
    }
  }

  private searchByTitleAndAuthor(book: Books): void {
    const title = encodeURIComponent(book.name);
    // SỬA LỖI Ở ĐÂY: Lấy tên tác giả đầu tiên (nếu có)
    const authorName = book.authors && book.authors.length > 0 ? book.authors[0].name : '';
    const author = encodeURIComponent(authorName);
    const url = `https://www.googleapis.com/books/v1/volumes?q=intitle:${title}+inauthor:${author}&key=${this.googleApiKey}`;
    
    this.http.get<any>(url).subscribe({
      next: (response) => {
        const coverUrl = response?.items?.[0]?.volumeInfo?.imageLinks?.thumbnail;
        if (coverUrl) {
          this.setAndSaveCover(book, coverUrl);
        } else {
          console.warn(`Không tìm thấy bìa sách cho "${book.name}".`);
        }
      },
      error: (err) => console.error('Lỗi khi tìm kiếm bằng tên/tác giả:', err)
    });
  }

  private setAndSaveCover(book: Books, coverUrl: string): void {
    if (this.book) {
      this.book.coverUrl = coverUrl;
      if (this.userAuthService.isAdmin()) {
        this.booksService.updateBook(book.id, { coverUrl: coverUrl }).subscribe({
          next: () => console.log('Đã lưu URL bìa sách vào backend.'),
          error: (saveErr) => console.error('Lỗi khi lưu URL bìa sách:', saveErr)
        });
      }
    }
  }

  navigateToBorrow(): void {
    this.router.navigate(['/borrow-book']);
  }
}