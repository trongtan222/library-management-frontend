import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Book } from '../models/book';
import { BooksService } from '../services/books.service';
import { UserAuthService } from '../services/user-auth.service';
import {
  ReviewService,
  BookReviewsSummary,
  Review,
  ReviewComment,
} from '../services/review.service';
import { WishlistService } from '../services/wishlist.service'; // <--- MỚI
import { CirculationService } from '../services/circulation.service';
import { SocialSharingService } from '../services/social-sharing.service';
import { GamificationService } from '../services/gamification.service';
import { UsersService } from '../services/users.service';
import { EbookService, Ebook } from '../services/ebook.service';
import { ToastrService } from 'ngx-toastr';
import { ApiService } from '../services/api.service';
import { finalize, takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-book-details',
  templateUrl: './book-details.component.html',
  styleUrls: ['./book-details.component.css'],
  standalone: false,
})
export class BookDetailsComponent implements OnInit, OnDestroy {
  book: Book | null = null;
  isLoading = true;
  isUser = false;
  relatedBooks: Book[] = [];
  isLoadingRelated = false;
  reviewsSummary: BookReviewsSummary | null = null;
  userCanReview = false;
  isCheckingPermission = true;
  newReview = { rating: 5, comment: '' };

  // Social features
  expandedReviewId: number | null = null;
  reviewComments: { [reviewId: number]: ReviewComment[] } = {};
  newCommentText: { [reviewId: number]: string } = {};

  // Borrow modal
  showBorrowModal = false;
  borrowData = {
    loanDays: 14,
  };
  borrowLoading = false;
  userFullProfile: any = null; // Full user profile from API

  // Reservation modal
  showReserveModal = false;
  reserveLoading = false;

  // E-book integration
  availableEbooks: Ebook[] = [];
  hasEbook = false;
  isCheckingEbook = false;

  private destroy$ = new Subject<void>();
  errorMessage: any;

  constructor(
    private route: ActivatedRoute,
    private booksService: BooksService,
    private userAuthService: UserAuthService,
    private wishlistService: WishlistService,
    private circulationService: CirculationService,
    private router: Router,
    private http: HttpClient,
    private reviewService: ReviewService,
    private toastr: ToastrService,
    private apiService: ApiService,
    private socialSharingService: SocialSharingService,
    private gamificationService: GamificationService,
    private usersService: UsersService,
    private ebookService: EbookService,
  ) {}

  ngOnInit(): void {
    this.isUser = this.userAuthService.isUser();
    const bookIdParam =
      this.route.snapshot.paramMap.get('id') ??
      this.route.snapshot.paramMap.get('bookId');
    const bookId = Number(bookIdParam);

    if (bookIdParam && !isNaN(bookId)) {
      this.loadBookDetails(bookId);
      this.loadReviewsAndCheckPermission(bookId);
    } else {
      this.errorMessage = 'Không tìm thấy ID sách.';
      this.toastr.error(this.errorMessage, 'Lỗi');
      this.isLoading = false;
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadBookDetails(id: number): void {
    this.isLoading = true;
    this.booksService
      .getBookById(id)
      .pipe(
        finalize(() => (this.isLoading = false)),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (data: Book) => {
          this.book = data;
          if (this.book && !this.book.coverUrl) {
            this.findAndSaveCover(this.book);
          }
          if (this.isUser && this.book) {
            this.checkWishlistStatus(this.book.id);
          }
          // Load related books based on category
          if (
            this.book &&
            this.book.categories &&
            this.book.categories.length > 0
          ) {
            this.loadRelatedBooks(this.book.categories[0].name, this.book.id);
          }
          // Check for ebook availability
          if (this.book) {
            this.checkEbookAvailability(this.book.id);
          }
        },
        error: (err) => {
          this.errorMessage =
            err?.error?.message || 'Không thể tải chi tiết sách.';
          this.toastr.error(this.errorMessage, 'Lỗi');
          this.book = null;
        },
      });
  }

  private loadRelatedBooks(category: string, currentBookId: number): void {
    this.isLoadingRelated = true;
    this.booksService
      .getPublicBooks(true, '', category, 0, 6) // Load 6 to ensure 5 after filtering
      .pipe(
        finalize(() => (this.isLoadingRelated = false)),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (response: any) => {
          const books = response.content || response;
          // Filter out current book and limit to 5
          this.relatedBooks = books
            .filter((b: Book) => b.id !== currentBookId)
            .slice(0, 5);
        },
        error: () => {
          this.relatedBooks = [];
        },
      });
  }

  private checkEbookAvailability(bookId: number): void {
    this.isCheckingEbook = true;
    // Search for ebooks with book title to find related ebooks
    // Since backend doesn't have direct /public/ebooks/by-book/{bookId} endpoint,
    // we'll use search with book name
    if (this.book?.name) {
      this.ebookService
        .searchEbooks(this.book.name, undefined, 0, 5)
        .pipe(
          finalize(() => (this.isCheckingEbook = false)),
          takeUntil(this.destroy$),
        )
        .subscribe({
          next: (response) => {
            this.availableEbooks = response.content || [];
            this.hasEbook = this.availableEbooks.length > 0;
          },
          error: () => {
            this.hasEbook = false;
            this.availableEbooks = [];
          },
        });
    } else {
      this.isCheckingEbook = false;
    }
  }

  openEbook(ebook: Ebook): void {
    if (!ebook.id) return;

    // Navigate to ebook viewer or download
    // For now, we'll download the ebook
    if (this.isUser) {
      this.ebookService.canDownload(ebook.id).subscribe({
        next: (result) => {
          if (result.canDownload) {
            this.downloadEbook(ebook.id!);
          } else {
            this.toastr.warning('Bạn đã đạt giới hạn tải xuống cho ebook này.');
          }
        },
        error: () => {
          this.toastr.error('Lỗi kiểm tra quyền tải xuống');
        },
      });
    } else {
      this.toastr.info('Vui lòng đăng nhập để đọc ebook');
    }
  }

  private downloadEbook(ebookId: number): void {
    this.ebookService.downloadEbook(ebookId).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `ebook_${ebookId}.pdf`;
        link.click();
        window.URL.revokeObjectURL(url);
        this.toastr.success('Tải ebook thành công!');
      },
      error: () => {
        this.toastr.error('Lỗi khi tải ebook');
      },
    });
  }

  // <--- MỚI: Kiểm tra trạng thái Wishlist
  private checkWishlistStatus(bookId: number): void {
    this.wishlistService
      .checkStatus(bookId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (isWishlisted: boolean) => {
          if (this.book) {
            this.book.isWishlisted = isWishlisted;
          }
        },
        error: () => console.warn('Không thể kiểm tra trạng thái Wishlist'),
      });
  }

  // <--- MỚI: Xử lý nút bấm Wishlist
  toggleWishlist(): void {
    if (!this.book) return;

    if (this.book.isWishlisted) {
      // Đang thích -> Xóa
      this.wishlistService
        .removeFromWishlist(this.book.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.book!.isWishlisted = false;
            this.toastr.info('Đã xóa khỏi danh sách yêu thích');
          },
          error: () => this.toastr.error('Lỗi khi xóa khỏi wishlist'),
        });
    } else {
      // Chưa thích -> Thêm
      this.wishlistService
        .addToWishlist(this.book.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.book!.isWishlisted = true;
            this.toastr.success('Đã thêm vào danh sách yêu thích');
          },
          error: () => this.toastr.error('Lỗi khi thêm vào wishlist'),
        });
    }
  }

  loadReviewsAndCheckPermission(bookId: number): void {
    this.reviewService
      .getReviewsForBook(bookId)
      .pipe(takeUntil(this.destroy$))
      .subscribe((summary) => (this.reviewsSummary = summary));

    if (this.isUser) {
      this.isCheckingPermission = true;
      this.reviewService
        .checkIfUserHasReviewed(bookId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            this.userCanReview = !response.hasReviewed;
            this.isCheckingPermission = false;
          },
          error: () => {
            this.isCheckingPermission = false;
            this.userCanReview = false;
          },
        });
    } else {
      this.isCheckingPermission = false;
    }
  }

  submitReview(): void {
    if (!this.book?.id || this.newReview.rating < 1) {
      this.toastr.error('Vui lòng chọn ít nhất 1 sao.');
      return;
    }

    this.reviewService
      .addReview(this.book.id, this.newReview)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toastr.success(
            'Cảm ơn bạn đã đánh giá! Đánh giá sẽ hiển thị sau khi duyệt.',
          );
          this.userCanReview = false;

          // Track review quest
          this.gamificationService.updateQuestProgress('review').subscribe({
            next: () => console.log('Review quest tracked'),
            error: (err) => console.error('Failed to track review quest:', err),
          });
        },
        error: (err) =>
          this.toastr.error(err.error?.message || 'Gửi đánh giá thất bại.'),
      });
  }

  private findAndSaveCover(book: Book): void {
    const apiKey = this.apiService.GOOGLE_BOOKS_API_KEY;
    let url = '';

    if (book.isbn) {
      url = `https://www.googleapis.com/books/v1/volumes?q=isbn:${book.isbn}&key=${apiKey}`;
    } else {
      const title = encodeURIComponent(book.name);
      const author =
        book.authors?.length > 0
          ? encodeURIComponent(book.authors[0].name)
          : '';
      url = `https://www.googleapis.com/books/v1/volumes?q=intitle:${title}+inauthor:${author}&key=${apiKey}`;
    }

    this.http
      .get<any>(url)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          const coverUrl =
            response?.items?.[0]?.volumeInfo?.imageLinks?.thumbnail;
          if (coverUrl) {
            this.setAndSaveCover(book, coverUrl);
          }
        },
        error: () =>
          console.warn('Không thể tìm thấy bìa sách từ Google Books.'),
      });
  }

  private setAndSaveCover(book: Book, coverUrl: string): void {
    if (this.book) {
      this.book.coverUrl = coverUrl;
      if (this.userAuthService.isAdmin()) {
        this.booksService
          .updateBook(book.id, { coverUrl: coverUrl })
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            error: (err) => console.error('Lỗi khi lưu bìa sách:', err),
          });
      }
    }
  }

  navigateToBorrow(): void {
    if (!this.book) return;

    const userId = this.userAuthService.getUserId();
    if (!userId) {
      this.toastr.error('Vui lòng đăng nhập để mượn sách');
      return;
    }

    // Load full user profile from API for read-only display
    this.borrowLoading = true;
    this.usersService
      .getUserById(userId)
      .pipe(
        finalize(() => (this.borrowLoading = false)),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (profile) => {
          this.userFullProfile = profile;
          this.borrowData.loanDays = 14;
          this.showBorrowModal = true;
        },
        error: () => {
          // Fallback to localStorage data if API fails
          this.userFullProfile = {
            name: this.userAuthService.getName() || 'Người dùng',
            studentClass: 'Chưa cập nhật',
            username: '---',
          };
          this.borrowData.loanDays = 14;
          this.showBorrowModal = true;
        },
      });
  }

  closeBorrowModal(): void {
    this.showBorrowModal = false;
  }

  // --- RESERVATION METHODS ---
  navigateToReserve(): void {
    if (!this.book) return;

    const userId = this.userAuthService.getUserId();
    if (!userId) {
      this.toastr.error('Vui lòng đăng nhập để đặt trước');
      return;
    }

    // Load full user profile from API for read-only display
    this.reserveLoading = true;
    this.usersService
      .getUserById(userId)
      .pipe(
        finalize(() => (this.reserveLoading = false)),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (profile) => {
          this.userFullProfile = profile;
          this.showReserveModal = true;
        },
        error: () => {
          // Fallback to localStorage data if API fails
          this.userFullProfile = {
            name: this.userAuthService.getName() || 'Người dùng',
            studentClass: 'Chưa cập nhật',
            username: '---',
          };
          this.showReserveModal = true;
        },
      });
  }

  closeReserveModal(): void {
    this.showReserveModal = false;
  }

  confirmReserve(): void {
    if (!this.book) {
      this.toastr.warning('Không tìm thấy thông tin sách!');
      return;
    }

    const userId = this.userAuthService.getUserId();
    if (!userId) {
      this.toastr.error('Vui lòng đăng nhập để đặt trước');
      return;
    }

    this.reserveLoading = true;
    const payload = {
      bookId: this.book.id,
      memberId: userId,
    };

    this.circulationService
      .reserve(payload)
      .pipe(
        finalize(() => (this.reserveLoading = false)),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: () => {
          this.toastr.success(
            `Đã đặt trước sách "${this.book?.name}". Bạn sẽ nhận được thông báo khi sách có sẵn.`,
            'Thành công',
            { timeOut: 5000 },
          );
          this.closeReserveModal();
        },
        error: (err) => {
          const errorMsg = err?.error?.message || 'Lỗi khi đặt trước sách.';
          this.toastr.error(errorMsg);
        },
      });
  }

  confirmBorrow(): void {
    if (!this.book) {
      this.toastr.warning('Không tìm thấy thông tin sách!');
      return;
    }

    const userId = this.userAuthService.getUserId();
    if (!userId) {
      this.toastr.error('Vui lòng đăng nhập để mượn sách');
      return;
    }

    this.borrowLoading = true;
    const payload = {
      bookId: this.book.id,
      memberId: userId,
      loanDays: this.borrowData.loanDays,
    };

    this.circulationService
      .loan(payload)
      .pipe(
        finalize(() => (this.borrowLoading = false)),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: () => {
          this.toastr.success(`Đã mượn thành công sách "${this.book?.name}".`);
          this.closeBorrowModal();
          if (this.book) {
            this.book.numberOfCopiesAvailable--;
          }
        },
        error: (err) => {
          const errorMsg = err?.error?.message || 'Lỗi khi mượn sách.';
          this.toastr.error(errorMsg);
        },
      });
  }

  // --- SOCIAL FEATURES ---

  toggleLike(review: Review): void {
    if (!review.id) return;

    if (review.currentUserLiked) {
      this.reviewService
        .unlikeReview(review.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (res) => {
            review.likesCount = res.likesCount;
            review.currentUserLiked = false;
          },
          error: () => this.toastr.error('Lỗi khi unlike'),
        });
    } else {
      this.reviewService
        .likeReview(review.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (res) => {
            review.likesCount = res.likesCount;
            review.currentUserLiked = true;
            this.toastr.success('Đã like!');
          },
          error: () => this.toastr.error('Lỗi khi like'),
        });
    }
  }

  toggleComments(review: Review): void {
    if (!review.id) return;

    if (this.expandedReviewId === review.id) {
      this.expandedReviewId = null;
    } else {
      this.expandedReviewId = review.id;
      if (!this.reviewComments[review.id]) {
        this.loadComments(review.id);
      }
    }
  }

  loadComments(reviewId: number): void {
    this.reviewService
      .getCommentsForReview(reviewId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (comments) => {
          this.reviewComments[reviewId] = comments;
        },
        error: () => this.toastr.error('Không thể tải bình luận'),
      });
  }

  addComment(reviewId: number): void {
    const content = this.newCommentText[reviewId]?.trim();
    if (!content) return;

    this.reviewService
      .addCommentToReview(reviewId, content)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (comment) => {
          if (!this.reviewComments[reviewId]) {
            this.reviewComments[reviewId] = [];
          }
          this.reviewComments[reviewId].push(comment);
          this.newCommentText[reviewId] = '';

          // Update comment count in review
          const review = this.reviewsSummary?.reviews.find(
            (r) => r.id === reviewId,
          );
          if (review && review.commentsCount !== undefined) {
            review.commentsCount++;
          }

          this.toastr.success('Đã thêm bình luận');
        },
        error: () => this.toastr.error('Lỗi khi thêm bình luận'),
      });
  }

  // --- SOCIAL SHARING ---

  shareOnFacebook(): void {
    if (!this.book) return;
    const url = window.location.href;
    this.socialSharingService.shareOnFacebook(this.book.name, url);
  }

  shareOnTwitter(): void {
    if (!this.book) return;
    const url = window.location.href;
    this.socialSharingService.shareOnTwitter(this.book.name, url);
  }

  async downloadShareImage(): Promise<void> {
    if (!this.book) return;

    try {
      this.toastr.info('Đang tạo ảnh...', '', { timeOut: 2000 });

      const coverUrl = this.book.coverUrl || '/assets/images/placeholder.png';
      const quote = this.book.description
        ? this.book.description.substring(0, 150) + '...'
        : 'Khám phá tri thức tại Thư viện THCS Phương Tú';

      const imageDataUrl = await this.socialSharingService.generateShareImage(
        this.book.name,
        coverUrl,
        quote,
      );

      this.socialSharingService.downloadImage(
        imageDataUrl,
        `${this.book.name}-share.png`,
      );
      this.toastr.success('Đã tải ảnh thành công!');
    } catch (error) {
      console.error('Error generating share image:', error);
      this.toastr.error('Không thể tạo ảnh chia sẻ');
    }
  }
}
