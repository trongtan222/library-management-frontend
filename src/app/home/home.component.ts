import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
// SỬA
import { Book } from '../models/book';
import { BooksService } from '../services/books.service';
import { UserAuthService } from '../services/user-auth.service';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

@Component({
    selector: 'app-home',
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.css'],
    standalone: false
})
export class HomeComponent implements OnInit, OnDestroy {

  searchTerm: string = '';
  
  categories = [
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
    'Pháp Luật'
  ];
  
  // SỬA
  newestBooks$!: Observable<Book[]>;

  currentTime: string = '';
  private timeIntervalId: any;

  constructor(
    public userAuthService: UserAuthService,
    private booksService: BooksService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.updateCurrentTime();
    this.timeIntervalId = setInterval(() => this.updateCurrentTime(), 1000);

    this.newestBooks$ = this.booksService.getNewestBooks().pipe(
      map((data: any[]) => (data || []).map(b => ({
          id: b.id,
          name: b.name,
          authors: b.authors || [],
          categories: b.categories || [],
          publishedYear: b.publishedYear,
          isbn: b.isbn,
          numberOfCopiesAvailable: b.numberOfCopiesAvailable,
          coverUrl: b.coverUrl 
        } as Book) 
      )),
      catchError((err: HttpErrorResponse) => {
        console.error("Could not load newest books", err);
        return of([]);
      })
    );
  }

  ngOnDestroy(): void {
    if (this.timeIntervalId) {
      clearInterval(this.timeIntervalId);
    }
  }

  private updateCurrentTime(): void {
    const now = new Date();
    const weekday = now.toLocaleDateString('vi-VN', { weekday: 'long' });
    const date = now.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    this.currentTime = `${weekday}, ${date}`;
  }

  searchBooks(): void {
    if (this.searchTerm.trim()) {
      this.router.navigate(['/borrow-book'], { queryParams: { search: this.searchTerm } });
    } else {
      this.router.navigate(['/borrow-book']);
    }
  }
}