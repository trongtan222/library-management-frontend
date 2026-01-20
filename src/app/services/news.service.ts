import { Injectable } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { IS_PUBLIC_API } from './api.service';

export interface News {
  id: number;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

@Injectable({
  providedIn: 'root',
})
export class NewsService {
  private apiUrl = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  // Public endpoint - get latest news for homepage
  getLatestNews(limit: number = 5): Observable<News[]> {
    return this.http.get<News[]>(`${this.apiUrl}/public/news/latest`, {
      params: { limit: limit.toString() },
      context: new HttpContext().set(IS_PUBLIC_API, true),
    });
  }

  // Admin endpoints
  getAllNews(): Observable<News[]> {
    return this.http.get<News[]>(`${this.apiUrl}/admin/news`);
  }

  createNews(
    news: Partial<News>,
    notifyEmail: boolean = false,
  ): Observable<News> {
    return this.http.post<News>(`${this.apiUrl}/admin/news`, news, {
      params: { notifyEmail: notifyEmail.toString() },
    });
  }

  updateNews(
    id: number,
    news: Partial<News>,
    notifyEmail: boolean = false,
  ): Observable<News> {
    return this.http.put<News>(`${this.apiUrl}/admin/news/${id}`, news, {
      params: { notifyEmail: notifyEmail.toString() },
    });
  }

  deleteNews(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/admin/news/${id}`);
  }
}
