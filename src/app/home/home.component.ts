import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Book } from '../models/book';
import { BooksService } from '../services/books.service';
import { UserAuthService } from '../services/user-auth.service';
import { CategoryService } from '../services/category.service';
import { NewsService, News } from '../services/news.service';
import { ApiService } from '../services/api.service';
import {
  GamificationService,
  LeaderboardEntry,
} from '../services/gamification.service';
import { Observable, of, Subject } from 'rxjs';
import {
  catchError,
  map,
  debounceTime,
  distinctUntilChanged,
  switchMap,
} from 'rxjs/operators';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
  standalone: false,
})
export class HomeComponent implements OnInit, OnDestroy {
  searchTerm: string = '';
  searchSuggestions: Book[] = [];
  showSuggestions: boolean = false;
  private searchSubject = new Subject<string>();

  // Dynamic data from backend
  categories$!: Observable<string[]>;
  news$!: Observable<News[]>;
  leaderboard$!: Observable<LeaderboardEntry[]>;
  newestBooks$!: Observable<Book[]>;
  recommendedBooks$!: Observable<Book[]>;

  currentTime: string = '';
  private timeIntervalId: any;

  // Loading states
  isLoadingNews: boolean = true;
  isLoadingLeaderboard: boolean = true;

  constructor(
    public userAuthService: UserAuthService,
    private booksService: BooksService,
    private categoryService: CategoryService,
    private newsService: NewsService,
    private gamificationService: GamificationService,
    private router: Router,
    private http: HttpClient,
    private apiService: ApiService,
  ) {}

  ngOnInit(): void {
    this.updateCurrentTime();
    this.timeIntervalId = setInterval(() => this.updateCurrentTime(), 1000);

    // Load dynamic categories from backend
    this.categories$ = this.categoryService.getAllCategories().pipe(
      map((categories: any[]) => categories.map((c) => c.name)),
      catchError(() => {
        console.warn('Could not load categories, using fallback');
        return of([
          'Sách Giáo Khoa',
          'Sách Tham Khảo',
          'Văn Học',
          'Toán Học',
          'Vật Lý - Hóa Học',
          'Sinh Học',
          'Lịch Sử - Địa Lý',
          'Ngoại Ngữ',
          'Kỹ Năng Sống',
          'Truyện Tranh - Thiếu Nhi',
          'Báo - Tạp Chí',
          'Pháp Luật',
        ]);
      }),
    );

    // Load latest news
    this.news$ = this.newsService.getLatestNews(3).pipe(
      map((news) => {
        this.isLoadingNews = false;
        return news;
      }),
      catchError(() => {
        this.isLoadingNews = false;
        return of([]);
      }),
    );

    // Load leaderboard
    this.leaderboard$ = this.gamificationService.getLeaderboard(5).pipe(
      map((leaderboard) => {
        this.isLoadingLeaderboard = false;
        return leaderboard;
      }),
      catchError(() => {
        this.isLoadingLeaderboard = false;
        return of([]);
      }),
    );

    // Load newest books
    this.newestBooks$ = this.booksService.getNewestBooks().pipe(
      map((data: any[]) =>
        (data || []).map(
          (b) =>
            ({
              id: b.id,
              name: b.name,
              authors: b.authors || [],
              categories: b.categories || [],
              publishedYear: b.publishedYear,
              isbn: b.isbn,
              numberOfCopiesAvailable: b.numberOfCopiesAvailable,
              coverUrl: b.coverUrl,
            }) as Book,
        ),
      ),
      catchError((err: HttpErrorResponse) => {
        console.error('Could not load newest books', err);
        return of([]);
      }),
    );

    // Load personalized recommendations (if user is logged in)
    if (this.userAuthService.isLoggedIn()) {
      this.loadPersonalizedRecommendations();
    } else {
      this.recommendedBooks$ = of([]);
    }

    // Setup autocomplete search
    this.setupSearchAutocomplete();
  }

  ngOnDestroy(): void {
    if (this.timeIntervalId) {
      clearInterval(this.timeIntervalId);
    }
    this.searchSubject.complete();
  }

  private updateCurrentTime(): void {
    const now = new Date();
    const weekday = now.toLocaleDateString('vi-VN', { weekday: 'long' });
    const date = now.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    this.currentTime = `${weekday}, ${date}`;
  }

  private setupSearchAutocomplete(): void {
    this.searchSubject
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((term) => {
          if (term.length < 2) {
            this.showSuggestions = false;
            return of([]);
          }
          return this.booksService.getPublicBooks(false, term, null, 0, 5).pipe(
            map((page) => page.content),
            catchError(() => of([])),
          );
        }),
      )
      .subscribe((books) => {
        this.searchSuggestions = books;
        this.showSuggestions = books.length > 0;
      });
  }

  onSearchInput(term: string): void {
    this.searchSubject.next(term);
  }

  selectSuggestion(book: Book): void {
    this.showSuggestions = false;
    this.router.navigate(['/books', book.id]);
  }

  searchBooks(): void {
    this.showSuggestions = false;

    // Track search quest if user is logged in
    if (this.searchTerm.trim() && this.userAuthService.getUserId()) {
      this.gamificationService.updateQuestProgress('search').subscribe({
        next: () => console.log('Search quest tracked'),
        error: (err) => console.error('Failed to track search quest:', err),
      });
    }

    if (this.searchTerm.trim()) {
      this.router.navigate(['/borrow-book'], {
        queryParams: { search: this.searchTerm },
      });
    } else {
      this.router.navigate(['/borrow-book']);
    }
  }

  private loadPersonalizedRecommendations(): void {
    const userId = this.userAuthService.getUserId();

    if (userId) {
      // TODO: Enable AI recommendations when Gemini API key is configured
      // For now, use fallback recommendations
      console.info('AI recommendations disabled, using fallback');
      this.recommendedBooks$ = this.getFallbackRecommendations();

      /* ✨ AI-POWERED VERSION (requires GEMINI_API_KEY):
      const apiUrl = this.apiService.getBaseUrl();
      
      this.recommendedBooks$ = this.http
        .post<any>(`${apiUrl}/user/chat/recommend-books`, {})
        .pipe(
          map((response) => {
            if (response.status === 'ok' && response.recommendations) {
              try {
                const recommendations = JSON.parse(response.recommendations);
                const bookIds = recommendations.map((rec: any) => rec.bookId);
                
                return this.booksService
                  .getPublicBooks(true, null, null, 0, 50)
                  .pipe(
                    map((page) => {
                      const recommendedBooks = page.content.filter(
                        (book: Book) => bookIds.includes(book.id),
                      );
                      return recommendedBooks.slice(0, 6);
                    }),
                  );
              } catch (e) {
                console.warn('Failed to parse AI recommendations', e);
                return this.getFallbackRecommendations();
              }
            }
            return this.getFallbackRecommendations();
          }),
          switchMap((obs) => obs),
          catchError((error) => {
            console.error('AI recommendations failed:', error);
            return this.getFallbackRecommendations();
          }),
        );
      */
    } else {
      // Not logged in: show newest books
      this.recommendedBooks$ = this.newestBooks$;
    }
  }

  private getFallbackRecommendations(): Observable<Book[]> {
    return this.booksService.getPublicBooks(true, null, null, 0, 6).pipe(
      map((page) => {
        const shuffled = [...page.content].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, 6);
      }),
      catchError(() => of([])),
    );
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  getLevelBadgeClass(level: number): string {
    if (level >= 5) return 'badge-diamond';
    if (level >= 4) return 'badge-platinum';
    if (level >= 3) return 'badge-gold';
    if (level >= 2) return 'badge-silver';
    return 'badge-bronze';
  }
}
