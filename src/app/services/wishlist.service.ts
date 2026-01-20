import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface WishlistItem {
  wishlistId: number;
  bookId: number;
  bookName: string;
  bookIsbn: string;
  coverUrl: string;
  authorName: string;
  categoryName: string;
  availableCopies: number;
  notes: string;
  addedDate: string;
  updatedDate: string;
}

@Injectable({
  providedIn: 'root',
})
export class WishlistService {
  // Đường dẫn API Backend (Cần tạo Controller tương ứng trong Spring Boot)
  private apiUrl = 'http://localhost:8080/api/wishlist';

  constructor(private http: HttpClient) {}

  // Lấy danh sách yêu thích của user đang đăng nhập với sorting
  getMyWishlist(sort: string = 'recent'): Observable<WishlistItem[]> {
    const params = new HttpParams().set('sort', sort);
    return this.http.get<WishlistItem[]>(`${this.apiUrl}/my-wishlist`, {
      params,
    });
  }

  // Thêm sách vào wishlist
  addToWishlist(bookId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/add/${bookId}`, {});
  }

  // Xóa sách khỏi wishlist
  removeFromWishlist(bookId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/remove/${bookId}`);
  }

  // Cập nhật ghi chú cá nhân
  updateNotes(bookId: number, notes: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/update/${bookId}`, { notes });
  }

  // Kiểm tra trạng thái (nếu cần check riêng lẻ)
  checkStatus(bookId: number): Observable<boolean> {
    return this.http.get<boolean>(`${this.apiUrl}/check/${bookId}`);
  }
}
