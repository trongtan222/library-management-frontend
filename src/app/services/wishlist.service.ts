import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class WishlistService {
  // Đường dẫn API Backend (Cần tạo Controller tương ứng trong Spring Boot)
  private apiUrl = 'http://localhost:8080/api/wishlist'; 

  constructor(private http: HttpClient) { }

  // Lấy danh sách yêu thích của user đang đăng nhập
  getMyWishlist(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/my-wishlist`);
  }

  // Thêm sách vào wishlist
  addToWishlist(bookId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/add/${bookId}`, {});
  }

  // Xóa sách khỏi wishlist
  removeFromWishlist(bookId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/remove/${bookId}`);
  }
  
  // Kiểm tra trạng thái (nếu cần check riêng lẻ)
  checkStatus(bookId: number): Observable<boolean> {
     return this.http.get<boolean>(`${this.apiUrl}/check/${bookId}`);
  }
}