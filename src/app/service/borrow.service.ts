import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
// Define LoanDetails interface here if not available elsewhere
export interface LoanDetails {
  loanId: number;
  bookId: number;
  memberId: number;
  loanDate: string;
  returnDate?: string;
  // Add other fields as needed
}

/** DTO tạo phiếu mượn – khớp backend */
export interface BorrowCreate {
  bookId: number;
  memberId: number;
  loanDays: number;
}

@Injectable({ providedIn: 'root' })
export class BorrowService {
  /** Gốc circulation */
  private base = `${environment.apiRoot}/api/user/circulation`; // Cập nhật đường dẫn API

  constructor(private httpClient: HttpClient) {}

  /** Tạo phiếu mượn */
  borrowBook(body: BorrowCreate): Observable<any> {
    return this.httpClient.post<any>(`${this.base}/loans`, body);
  }

  /** Trả sách theo id phiếu mượn (loanId) */
  returnLoan(loanId: number): Observable<any> {
    return this.httpClient.put<any>(`${this.base}/loans/${loanId}/return`, {});
  }

  // === THAY THẾ PHƯƠNG THỨC CŨ BẰNG PHƯƠNG THỨC MỚI ===
  /** Lấy lịch sử mượn sách chi tiết của người dùng hiện tại */
  getMyLoanHistory(): Observable<LoanDetails[]> {
    // Endpoint này không cần tham số vì backend tự lấy user ID từ token
    return this.httpClient.get<LoanDetails[]>(`${this.base}/my-loans`);
  }

  /** Lịch sử mượn theo sách (bookId) - giữ lại nếu cần */
  getLoanHistoryByBook(bookId: number): Observable<any[]> {
    return this.httpClient.get<any[]>(`${this.base}/loans?bookId=${bookId}`);
  }
}
