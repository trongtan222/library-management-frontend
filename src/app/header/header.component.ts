import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { UserAuthService } from '../services/user-auth.service';
import { ThemeService } from '../services/theme.service';
import { NewsService } from '../services/news.service';
import {
  NotificationService,
  Notification,
} from '../services/notification.service';
import { GamificationService } from '../services/gamification.service';
import { BooksService } from '../services/books.service';
import { Book } from '../models/book';
import { Subject, Subscription } from 'rxjs';
import {
  debounceTime,
  distinctUntilChanged,
  switchMap,
  catchError,
} from 'rxjs/operators';
import { of } from 'rxjs';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css'],
  standalone: false,
})
export class HeaderComponent implements OnInit, OnDestroy {
  currentTheme: 'light' | 'dark' = 'dark';
  unreadNewsCount: number = 0;
  private lastReadNewsDate: Date | null = null;

  // Notifications
  notifications: Notification[] = [];
  unreadNotificationCount: number = 0;
  showNotificationDropdown: boolean = false;
  private notificationSubscription?: Subscription;

  // Wishlist
  wishlistCount: number = 0;

  // Language
  currentLanguage: 'vi' | 'en' = 'vi';
  showLanguageDropdown: boolean = false;

  // User profile & gamification
  userLevel: number = 1;
  userPoints: number = 0;
  userAvatar: string = '';

  // Global search
  globalSearchTerm: string = '';
  searchResults: Book[] = [];
  showSearchResults: boolean = false;
  private searchSubject = new Subject<string>();

  // Mobile menu
  isMobileMenuOpen: boolean = false;

  constructor(
    public userAuthService: UserAuthService,
    public themeService: ThemeService,
    private newsService: NewsService,
    private notificationService: NotificationService,
    private gamificationService: GamificationService,
    private booksService: BooksService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.currentTheme = this.themeService.getCurrentTheme();
    this.themeService.theme$.subscribe((theme) => {
      this.currentTheme = theme;
    });

    // Load language from localStorage
    const savedLang = localStorage.getItem('currentLanguage');
    this.currentLanguage = (savedLang as 'vi' | 'en') || 'vi';

    if (this.isLoggedIn()) {
      // Load unread news count
      this.loadUnreadNewsCount();
      setInterval(() => this.loadUnreadNewsCount(), 5 * 60 * 1000);

      // Temporarily disabled notification polling - need to fix backend endpoint first
      // this.loadNotifications();
      // this.notificationSubscription = this.notificationService
      //   .pollNotifications()
      //   .subscribe((notifications) => {
      //     this.notifications = notifications;
      //     this.updateUnreadNotificationCount();
      //   });

      // Load wishlist count
      this.loadWishlistCount();

      // Load user gamification data
      this.loadUserGamificationData();
    }

    // Setup global search autocomplete
    this.setupGlobalSearch();
  }

  ngOnDestroy(): void {
    if (this.notificationSubscription) {
      this.notificationSubscription.unsubscribe();
    }
    this.searchSubject.complete();
  }

  private loadUnreadNewsCount(): void {
    // Get last read timestamp from localStorage
    const lastReadStr = localStorage.getItem('lastReadNewsDate');
    this.lastReadNewsDate = lastReadStr ? new Date(lastReadStr) : null;

    this.newsService.getLatestNews(10).subscribe({
      next: (news) => {
        if (!this.lastReadNewsDate) {
          this.unreadNewsCount = news.length;
        } else {
          this.unreadNewsCount = news.filter(
            (n) => new Date(n.createdAt) > this.lastReadNewsDate!,
          ).length;
        }
      },
      error: () => {
        this.unreadNewsCount = 0;
      },
    });
  }

  public markNewsAsRead(): void {
    localStorage.setItem('lastReadNewsDate', new Date().toISOString());
    this.unreadNewsCount = 0;
  }

  public isLoggedIn(): boolean {
    return this.userAuthService.isLoggedIn();
  }

  public toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  public getUserName(): string | null {
    return this.userAuthService.getName();
  }

  public getUserInitial(): string {
    const name = this.getUserName();
    if (!name) {
      return '?';
    }
    return name.trim().charAt(0).toUpperCase();
  }

  public logout(): void {
    this.router.navigate(['/logout']);
  }

  public isAdmin(): boolean {
    return this.userAuthService.isAdmin();
  }

  public isUser(): boolean {
    return this.userAuthService.isUser();
  }

  // Notification methods
  private loadNotifications(): void {
    this.notificationService.getNotifications(10).subscribe({
      next: (notifications) => {
        this.notifications = notifications;
        this.updateUnreadNotificationCount();
      },
      error: () => {
        this.notifications = [];
        this.unreadNotificationCount = 0;
      },
    });
  }

  private updateUnreadNotificationCount(): void {
    this.unreadNotificationCount = this.notifications.filter(
      (n) => !n.isRead,
    ).length;
  }

  public toggleNotificationDropdown(): void {
    this.showNotificationDropdown = !this.showNotificationDropdown;
    if (this.showNotificationDropdown) {
      this.showLanguageDropdown = false;
    }
  }

  public markNotificationAsRead(notification: Notification): void {
    if (!notification.isRead) {
      this.notificationService.markAsRead(notification.id).subscribe(() => {
        notification.isRead = true;
        this.updateUnreadNotificationCount();
      });
    }
    if (notification.actionUrl) {
      this.router.navigate([notification.actionUrl]);
    }
    this.showNotificationDropdown = false;
  }

  public markAllNotificationsAsRead(): void {
    this.notificationService.markAllAsRead().subscribe(() => {
      this.notifications.forEach((n) => (n.isRead = true));
      this.updateUnreadNotificationCount();
    });
  }

  // Wishlist methods
  private loadWishlistCount(): void {
    // Assuming wishlist is stored in localStorage for now
    const wishlist = JSON.parse(localStorage.getItem('wishlist') || '[]');
    this.wishlistCount = wishlist.length;
  }

  public navigateToWishlist(): void {
    this.router.navigate(['/wishlist']);
  }

  // Language methods
  public toggleLanguageDropdown(): void {
    this.showLanguageDropdown = !this.showLanguageDropdown;
    if (this.showLanguageDropdown) {
      this.showNotificationDropdown = false;
    }
  }

  public switchLanguage(lang: 'vi' | 'en'): void {
    this.currentLanguage = lang;
    localStorage.setItem('currentLanguage', lang);
    // TODO: Call I18nController to change backend language
    // this.http.post(`${apiUrl}/api/public/i18n/language`, { language: lang }).subscribe();
    this.showLanguageDropdown = false;
    window.location.reload(); // Reload to apply language changes
  }

  // User gamification methods
  private loadUserGamificationData(): void {
    const userId = this.userAuthService.getUserId();
    if (userId) {
      this.gamificationService.getMyStats().subscribe({
        next: (stats) => {
          this.userLevel = stats.currentLevel || 1;
          this.userPoints = stats.totalPoints || 0;
        },
        error: () => {
          this.userLevel = 1;
          this.userPoints = 0;
        },
      });
    }
  }

  public getLevelBadgeClass(): string {
    if (this.userLevel >= 5) return 'badge-diamond';
    if (this.userLevel >= 4) return 'badge-platinum';
    if (this.userLevel >= 3) return 'badge-gold';
    if (this.userLevel >= 2) return 'badge-silver';
    return 'badge-bronze';
  }

  public getLevelName(): string {
    if (this.userLevel >= 5) return 'Kim Cương';
    if (this.userLevel >= 4) return 'Bạch Kim';
    if (this.userLevel >= 3) return 'Vàng';
    if (this.userLevel >= 2) return 'Bạc';
    return 'Đồng';
  }

  // Global search methods
  private setupGlobalSearch(): void {
    this.searchSubject
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((term) => {
          if (term.length < 2) {
            return of([]);
          }
          return this.booksService.getPublicBooks(false, term, null, 0, 5).pipe(
            switchMap((page) => of(page.content)),
            catchError(() => of([])),
          );
        }),
      )
      .subscribe((books) => {
        this.searchResults = books;
        this.showSearchResults =
          books.length > 0 && this.globalSearchTerm.length >= 2;
      });
  }

  public onGlobalSearch(term: string): void {
    this.searchSubject.next(term);
  }

  public selectSearchResult(book: Book): void {
    this.showSearchResults = false;
    this.globalSearchTerm = '';
    this.router.navigate(['/books', book.id]);
  }

  public performFullSearch(): void {
    if (this.globalSearchTerm.trim()) {
      this.showSearchResults = false;
      this.router.navigate(['/borrow-book'], {
        queryParams: { search: this.globalSearchTerm },
      });
      this.globalSearchTerm = '';
    }
  }

  // Mobile menu
  public toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  public closeMobileMenu(): void {
    this.isMobileMenuOpen = false;
  }
}
