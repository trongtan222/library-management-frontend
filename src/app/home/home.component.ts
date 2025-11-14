import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { Books } from '../models/books';
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
export class HomeComponent implements OnInit {

  searchTerm: string = '';
  categories = [
    'Tiểu thuyết',
    'Khoa học',
    'Lịch sử',
    'Phát triển bản thân',
    'Khoa học máy tính',
    'Kinh doanh',
    'Giả tưởng',
    'Trinh thám'
  ];
  newestBooks$!: Observable<Books[]>;

  constructor(
    public userAuthService: UserAuthService,
    private booksService: BooksService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.newestBooks$ = this.booksService.getNewestBooks().pipe(
      // SỬA LỖI TRONG KHỐI MAP NÀY
      map((data: any[]) => (data || []).map(b => ({
          id: b.id,
          name: b.name,
          authors: b.authors || [], // Sửa từ author
          categories: b.categories || [], // Sửa từ genre
          publishedYear: b.publishedYear,
          isbn: b.isbn,
          numberOfCopiesAvailable: b.numberOfCopiesAvailable,
          coverUrl: b.coverUrl // Thêm coverUrl (nếu model Books có)
        } as Books) // Ép kiểu về Books
      )),
      catchError((err: HttpErrorResponse) => {
        console.error("Could not load newest books", err);
        return of([]);
      })
    );
  }

  searchBooks(): void {
    if (this.searchTerm.trim()) {
      this.router.navigate(['/borrow-book'], { queryParams: { search: this.searchTerm } });
    } else {
      this.router.navigate(['/borrow-book']);
    }
  }
}