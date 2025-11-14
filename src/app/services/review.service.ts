// src/app/_service/review.service.ts

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface Review {
  id: number;
  bookId: number;
  bookName: string;
  userId: number;
  userName: string;
  rating: number;
  comment: string;
  approved: boolean;
  createdAt: string;
}

export interface BookReviewsSummary {
  reviews: Review[];
  averageRating: number;
}

@Injectable({ providedIn: 'root' })
export class ReviewService {
  hasUserReviewed(bookId: number) {
    throw new Error('Method not implemented.');
  }
  private apiUrl = environment.apiRoot;

  constructor(private http: HttpClient) {}

  // Lấy tất cả đánh giá cho một cuốn sách (công khai)
  getReviewsForBook(bookId: number): Observable<BookReviewsSummary> {
    return this.http.get<BookReviewsSummary>(`${this.apiUrl}/api/books/${bookId}/reviews`);
  }

  // Gửi một đánh giá mới
  addReview(bookId: number, review: { rating: number; comment?: string }): Observable<Review> {
    return this.http.post<Review>(`${this.apiUrl}/api/books/${bookId}/reviews`, review);
  }

  // Lấy tất cả đánh giá (cho Admin)
  getAllReviews(): Observable<Review[]> {
    return this.http.get<Review[]>(`${this.apiUrl}/admin/reviews`);
  }

  checkIfUserHasReviewed(bookId: number): Observable<{ hasReviewed: boolean }> {
    return this.http.get<{ hasReviewed: boolean }>(`${this.apiUrl}/api/books/${bookId}/reviews/check`);
  }

  // Phê duyệt một đánh giá (cho Admin)
  approveReview(reviewId: number): Observable<Review> {
    return this.http.put<Review>(`${this.apiUrl}/admin/reviews/${reviewId}/approve`, {});
  }
}