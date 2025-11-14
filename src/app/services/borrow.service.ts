import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { LoanDetails } from './admin.service';

/** DTO tạo phiếu mượn – khớp backend */
export interface BorrowCreate {
  bookId: number;
  memberId: number;
  loanDays: number;
}

@Injectable({ providedIn: 'root' })
export class BorrowService {
  // SỬA LỖI: Bỏ /api khỏi đây
  private base = `${environment.apiRoot}/user/circulation`;

  constructor(private httpClient: HttpClient) {}

  /** Tạo phiếu mượn */
  borrowBook(body: BorrowCreate): Observable<any> {
    return this.httpClient.post<any>(`${this.base}/loans`, body);
  }

  /** Trả sách theo id phiếu mượn (loanId) */
  returnLoan(loanId: number): Observable<any> {
    return this.httpClient.put<any>(`${this.base}/loans/${loanId}/return`, {});
  }

  /** Lấy lịch sử mượn sách chi tiết của người dùng hiện tại */
  getMyLoanHistory(): Observable<LoanDetails[]> {
    return this.httpClient.get<LoanDetails[]>(`${this.base}/my-loans`);
  }
  
  /** Lấy danh sách phiếu mượn theo user (dành cho admin xem) */
  getLoansByMemberId(memberId: number): Observable<LoanDetails[]> {
    return this.httpClient.get<LoanDetails[]>(`${this.base}/loans?memberId=${memberId}`);
  }

  /** Lịch sử mượn theo sách (bookId) - giữ lại nếu cần */
  getLoanHistoryByBook(bookId: number): Observable<any[]> {
    return this.httpClient.get<any[]>(`${this.base}/loans?bookId=${bookId}`);
  }
}