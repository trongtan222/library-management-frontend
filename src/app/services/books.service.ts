import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Books } from '../models/books';
import { environment } from 'src/environments/environment';

export interface Page<T> {
  content: T[];
  totalPages: number;
  totalElements: number;
  number: number;
  size: number;
}

// THÊM 2 INTERFACE NÀY
export interface Author {
  id: number;
  name: string;
}
export interface Category {
  id: number;
  name: string;
}

@Injectable({
  providedIn: 'root'
})
export class BooksService {
  private API_URL = `${environment.apiRoot}`;
  // SỬA LỖI: Bỏ /api khỏi các đường dẫn con
  private ADMIN_URL = `${this.API_URL}/admin/books`;
  private PUBLIC_URL = `${this.API_URL}/public/books`;

  constructor(private httpClient: HttpClient) { }

  public getPublicBooks(
    availableOnly: boolean,
    search?: string | null,
    genre?: string | null,
    page: number = 0,
    size: number = 10
  ): Observable<Page<Books>> {
    let params = new HttpParams()
      .set('availableOnly', availableOnly.toString())
      .set('page', page.toString())
      .set('size', size.toString());

    if (search) {
      params = params.set('search', search);
    }
    if (genre) {
      params = params.set('genre', genre);
    }

    return this.httpClient.get<Page<Books>>(this.PUBLIC_URL, { params });
  }

  public getAllBooksForGenres(): Observable<Books[]> {
    return this.httpClient.get<Books[]>(this.PUBLIC_URL);
  }

  public getBookById(id: number): Observable<Books> {
    return this.httpClient.get<Books>(`${this.PUBLIC_URL}/${id}`);
  }

  public getNewestBooks(): Observable<Books[]> {
    return this.httpClient.get<Books[]>(`${this.PUBLIC_URL}/newest`);
  }

  // --- ADMIN METHODS ---
  public getBooksList(): Observable<Books[]> {
    return this.httpClient.get<Books[]>(this.ADMIN_URL);
  }

  public createBook(book: Partial<Books>): Observable<Books> {
    return this.httpClient.post<Books>(this.ADMIN_URL, book);
  }

  public updateBook(id: number, bookData: Partial<Books>): Observable<Books> {
    return this.httpClient.put<Books>(`${this.ADMIN_URL}/${id}`, bookData);
  }

  public deleteBook(id: number): Observable<Object> {
    return this.httpClient.delete(`${this.ADMIN_URL}/${id}`);
  }

  // --- SỬA LỖI BẰNG CÁCH THÊM 2 HÀM NÀY ---
  public getAllAuthors(): Observable<Author[]> {
    return this.httpClient.get<Author[]>(`${this.ADMIN_URL}/authors`);
  }

  public getAllCategories(): Observable<Category[]> {
    return this.httpClient.get<Category[]>(`${this.ADMIN_URL}/categories`);
  }
}