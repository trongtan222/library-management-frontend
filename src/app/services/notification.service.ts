import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, interval, of } from 'rxjs';
import { switchMap, catchError, map } from 'rxjs/operators';
import { ApiService } from './api.service';

export interface Notification {
  id: number;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  isRead: boolean;
  createdAt: string;
  actionUrl?: string;
}

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private apiUrl: string;

  constructor(
    private http: HttpClient,
    private apiService: ApiService,
  ) {
    this.apiUrl = this.apiService.getBaseUrl();
  }

  // Get user notifications
  getNotifications(limit: number = 10): Observable<Notification[]> {
    return this.http
      .get<Notification[]>(`${this.apiUrl}/user/notifications`, {
        params: { limit: limit.toString() },
      })
      .pipe(
        catchError((err) => {
          console.warn('Failed to load notifications:', err);
          return of([]);
        }),
      );
  }

  // Get unread count
  getUnreadCount(): Observable<number> {
    return this.http
      .get<{ count: number }>(`${this.apiUrl}/user/notifications/unread-count`)
      .pipe(
        map((res) => res.count),
        catchError(() => of(0)),
      );
  }

  // Mark as read
  markAsRead(notificationId: number): Observable<void> {
    return this.http.post<void>(
      `${this.apiUrl}/user/notifications/${notificationId}/read`,
      {},
    );
  }

  // Mark all as read
  markAllAsRead(): Observable<void> {
    return this.http.post<void>(
      `${this.apiUrl}/user/notifications/read-all`,
      {},
    );
  }

  // Poll for new notifications every 30 seconds
  pollNotifications(): Observable<Notification[]> {
    return interval(30000).pipe(switchMap(() => this.getNotifications(10)));
  }
}
