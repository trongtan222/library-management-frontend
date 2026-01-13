import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpContext } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Book, Author, Category } from '../models/book';
import { ApiService, IS_PUBLIC_API } from './api.service';
import { map } from 'rxjs/operators';

export interface ImportSummary {
  successCount: number;
  failedCount: number;
  skippedCount: number;
  errors: string[];
}

export interface Page<T> {
  content: T[];
  totalPages: number;
  totalElements: number;
  number: number;
  size: number;
}

@Injectable({
  providedIn: 'root',
})
export class BooksService {
  getBooksList() {
    throw new Error('Method not implemented.');
  }

  constructor(private http: HttpClient, private apiService: ApiService) {}

  // --- PUBLIC METHODS ---

  public getPublicBooks(
    availableOnly: boolean,
    search?: string | null,
    genre?: string | null,
    page: number = 0,
    size: number = 10
  ): Observable<Page<Book>> {
    let params = new HttpParams()
      .set('availableOnly', availableOnly.toString())
      .set('page', page.toString())
      .set('size', size.toString());

    if (search) params = params.set('search', search);
    if (genre) params = params.set('genre', genre);

    // Sử dụng context để báo cho Interceptor biết đây là public API
    return this.http.get<Page<Book>>(
      this.apiService.buildUrl('/public/books'),
      {
        params,
        context: new HttpContext().set(IS_PUBLIC_API, true),
      }
    );
  }

  public getBookById(id: number): Observable<Book> {
    return this.http.get<Book>(
      this.apiService.buildUrl(`/public/books/${id}`),
      {
        context: new HttpContext().set(IS_PUBLIC_API, true),
      }
    );
  }

  public getNewestBooks(): Observable<Book[]> {
    return this.http.get<Book[]>(
      this.apiService.buildUrl('/public/books/newest'),
      {
        context: new HttpContext().set(IS_PUBLIC_API, true),
      }
    );
  }

  // --- ADMIN METHODS ---

  public createBook(
    book: Partial<Book> & { authorIds: number[]; categoryIds: number[] }
  ): Observable<Book> {
    return this.http.post<Book>(this.apiService.buildUrl('/admin/books'), book);
  }

  public updateBook(id: number, bookData: any): Observable<Book> {
    return this.http.put<Book>(
      this.apiService.buildUrl(`/admin/books/${id}`),
      bookData
    );
  }

  public deleteBook(id: number): Observable<void> {
    return this.http.delete<void>(
      this.apiService.buildUrl(`/admin/books/${id}`)
    );
  }

  public getAllAuthors(): Observable<Author[]> {
    return this.http.get<Author[]>(
      this.apiService.buildUrl('/admin/books/authors')
    );
  }

  public getAllCategories(): Observable<Category[]> {
    return this.http.get<Category[]>(
      this.apiService.buildUrl('/admin/books/categories')
    );
  }

  public createCategory(name: string): Observable<Category> {
    return this.http.post<Category>(
      this.apiService.buildUrl('/admin/books/categories'),
      { name }
    );
  }

  public createAuthor(name: string): Observable<Author> {
    return this.http.post<Author>(
      this.apiService.buildUrl('/admin/books/authors'),
      { name }
    );
  }

  public updateCategory(id: number, name: string): Observable<Category> {
    return this.http.put<Category>(
      this.apiService.buildUrl(`/admin/books/categories/${id}`),
      { name }
    );
  }

  public deleteCategory(id: number): Observable<void> {
    return this.http.delete<void>(
      this.apiService.buildUrl(`/admin/books/categories/${id}`)
    );
  }

  public updateAuthor(id: number, name: string): Observable<Author> {
    return this.http.put<Author>(
      this.apiService.buildUrl(`/admin/books/authors/${id}`),
      { name }
    );
  }

  public deleteAuthor(id: number): Observable<void> {
    return this.http.delete<void>(
      this.apiService.buildUrl(`/admin/books/authors/${id}`)
    );
  }

  // --- IMPORT/EXPORT ---
  public importBooks(file: File): Observable<ImportSummary> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<ImportSummary>(
      this.apiService.buildUrl('/admin/import/books'),
      form
    );
  }

  public importUsers(file: File): Observable<ImportSummary> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<ImportSummary>(
      this.apiService.buildUrl('/admin/import/users'),
      form
    );
  }

  public exportBooks(): Observable<Blob> {
    return this.http.get(this.apiService.buildUrl('/admin/export/books'), {
      responseType: 'blob',
    });
  }

  public exportUsers(): Observable<Blob> {
    return this.http.get(this.apiService.buildUrl('/admin/export/users'), {
      responseType: 'blob',
    });
  }

  public downloadUsersTemplate(): Observable<Blob> {
    return this.http.get(
      this.apiService.buildUrl('/admin/import/template/users'),
      { responseType: 'blob' }
    );
  }

  public downloadBooksTemplate(): Observable<Blob> {
    return this.http.get(
      this.apiService.buildUrl('/admin/import/template/books'),
      { responseType: 'blob' }
    );
  }
}
