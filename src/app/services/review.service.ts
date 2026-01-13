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
  images?: string[]; // URLs ảnh
  approved: boolean;
  createdAt: string;
  likesCount?: number;
  commentsCount?: number;
  currentUserLiked?: boolean;
}

export interface ReviewComment {
  id: number;
  reviewId: number;
  userId: number;
  userName: string;
  content: string;
  createdAt: string;
}

export interface BookReviewsSummary {
  reviews: Review[];
  averageRating: number;
}

@Injectable({ providedIn: 'root' })
export class ReviewService {
  private apiUrl = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  // Lấy tất cả đánh giá cho một cuốn sách (công khai)
  getReviewsForBook(bookId: number): Observable<BookReviewsSummary> {
    return this.http.get<BookReviewsSummary>(
      `${this.apiUrl}/books/${bookId}/reviews`
    );
  }

  // Gửi một đánh giá mới (with images support)
  addReview(
    bookId: number,
    review: { rating: number; comment?: string; images?: string[] }
  ): Observable<Review> {
    return this.http.post<Review>(
      `${this.apiUrl}/books/${bookId}/reviews`,
      review
    );
  }

  // Lấy tất cả đánh giá (cho Admin)
  getAllReviews(): Observable<Review[]> {
    return this.http.get<Review[]>(`${this.apiUrl}/admin/reviews`);
  }

  checkIfUserHasReviewed(bookId: number): Observable<{ hasReviewed: boolean }> {
    return this.http.get<{ hasReviewed: boolean }>(
      `${this.apiUrl}/books/${bookId}/reviews/check`
    );
  }

  // Phê duyệt một đánh giá (cho Admin)
  approveReview(reviewId: number): Observable<Review> {
    return this.http.put<Review>(
      `${this.apiUrl}/admin/reviews/${reviewId}/approve`,
      {}
    );
  }

  deleteReview(reviewId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/admin/reviews/${reviewId}`);
  }

  // --- My reviews ---
  getMyReviews(): Observable<Review[]> {
    return this.http.get<Review[]>(`${this.apiUrl}/my/reviews`);
  }

  updateMyReview(
    id: number,
    payload: { rating: number; comment?: string }
  ): Observable<Review> {
    return this.http.put<Review>(`${this.apiUrl}/my/reviews/${id}`, payload);
  }

  deleteMyReview(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/my/reviews/${id}`);
  }

  // --- LIKE/UNLIKE ---
  likeReview(
    reviewId: number
  ): Observable<{ likesCount: number; liked: boolean }> {
    return this.http.post<{ likesCount: number; liked: boolean }>(
      `${this.apiUrl}/reviews/${reviewId}/like`,
      {}
    );
  }

  unlikeReview(
    reviewId: number
  ): Observable<{ likesCount: number; liked: boolean }> {
    return this.http.delete<{ likesCount: number; liked: boolean }>(
      `${this.apiUrl}/reviews/${reviewId}/like`
    );
  }

  // --- COMMENTS ---
  getCommentsForReview(reviewId: number): Observable<ReviewComment[]> {
    return this.http.get<ReviewComment[]>(
      `${this.apiUrl}/reviews/${reviewId}/comments`
    );
  }

  addCommentToReview(
    reviewId: number,
    content: string
  ): Observable<ReviewComment> {
    return this.http.post<ReviewComment>(
      `${this.apiUrl}/reviews/${reviewId}/comments`,
      { content }
    );
  }

  deleteComment(commentId: number): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}/reviews/comments/${commentId}`
    );
  }
}
