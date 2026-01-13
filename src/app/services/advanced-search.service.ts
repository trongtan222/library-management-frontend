import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface AdvancedSearchRequest {
  query?: string;
  authorIds?: number[];
  categoryIds?: number[];
  yearFrom?: number;
  yearTo?: number;
  availableOnly?: boolean;
  sortBy?: string;
  page?: number;
  size?: number;
}

export interface BookSearchResult {
  content: any[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

@Injectable({
  providedIn: 'root',
})
export class AdvancedSearchService {
  private apiUrl = `${environment.apiBaseUrl}/api/public/search`;

  constructor(private http: HttpClient) {}

  advancedSearch(request: AdvancedSearchRequest): Observable<BookSearchResult> {
    return this.http.post<BookSearchResult>(`${this.apiUrl}/advanced`, request);
  }

  getSimilarBooks(bookId: number, limit: number = 5): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/similar/${bookId}`, {
      params: { limit: limit.toString() },
    });
  }

  getSearchSuggestions(
    query: string,
    limit: number = 10
  ): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/suggestions`, {
      params: { q: query, limit: limit.toString() },
    });
  }

  getAuthorSuggestions(
    query: string,
    limit: number = 10
  ): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/author-suggestions`, {
      params: { q: query, limit: limit.toString() },
    });
  }

  getPopularSearches(limit: number = 10): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/popular`, {
      params: { limit: limit.toString() },
    });
  }
}
