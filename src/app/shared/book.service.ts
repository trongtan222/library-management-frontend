import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Book {
  bookId?: number; id?: number;
  bookName?: string; name?: string;
  bookAuthor?: string; author?: string;
  bookGenre?: string; genre?: string;
  noOfCopies?: number;
}

@Injectable({ providedIn: 'root' })
export class BookService {
  // ưu tiên apiRoot, nếu không có thì dùng adminApi, cuối cùng fallback 8080
  private readonly base =
    (environment as any).apiRoot || (environment as any).adminApi || 'http://localhost:8080';

  constructor(private http: HttpClient) {}

  getBooks(): Observable<Book[]> {
    return this.http.get<Book[]>(`${this.base}/books`);
  }
}
