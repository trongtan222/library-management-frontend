import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { LoanDetails } from './admin.service';

export interface BorrowCreate {
  bookId: number;
  memberId: number;
  loanDays: number;
  studentName?: string;
  studentClass?: string;
  quantity?: number;
}

export interface ReservationDTO {
  id: number;
  bookId: number;
  bookName: string;
  bookCover?: string; // Nếu backend có trả về
  reservationDate: string;
  status: 'PENDING' | 'FULFILLED' | 'CANCELLED';
}

@Injectable({
  providedIn: 'root'
})
export class CirculationService {

  constructor(
    private http: HttpClient,
    private apiService: ApiService
  ) { }

  // --- LOANS (MƯỢN TRẢ) ---

  loan(data: BorrowCreate): Observable<any> {
    return this.http.post(this.apiService.buildUrl('/user/circulation/loans'), data);
  }

  returnLoan(id: number): Observable<any> {
    return this.http.put(this.apiService.buildUrl(`/user/circulation/loans/${id}/return`), {});
  }

  renew(data: { loanId: number; extraDays: number }): Observable<any> {
    return this.http.put(this.apiService.buildUrl('/user/circulation/loans/renew'), data);
  }

  getMyRenewals(): Observable<Array<{ id: number; loanId: number; memberId: number; extraDays: number; status: string; createdAt: string; decidedAt?: string; adminNote?: string }>> {
    return this.http.get<Array<{ id: number; loanId: number; memberId: number; extraDays: number; status: string; createdAt: string; decidedAt?: string; adminNote?: string }>>(this.apiService.buildUrl('/user/circulation/my-renewals'));
  }

  getMyLoanHistory(): Observable<LoanDetails[]> {
    return this.http.get<LoanDetails[]>(this.apiService.buildUrl('/user/circulation/my-loans'));
  }
  
  getLoansByMemberId(memberId: number): Observable<LoanDetails[]> {
    return this.http.get<LoanDetails[]>(this.apiService.buildUrl(`/user/circulation/loans?memberId=${memberId}`));
  }

  // --- RESERVATIONS (ĐẶT TRƯỚC) ---

  reserve(data: { bookId: number; memberId: number; studentName?: string; studentClass?: string }): Observable<any> {
    return this.http.post(this.apiService.buildUrl('/user/circulation/reservations'), data);
  }
  
  placeReservation(data: any): Observable<any> {
    return this.reserve(data);
  }

  cancelReservation(id: number): Observable<any> {
    return this.http.delete(this.apiService.buildUrl(`/user/circulation/reservations/${id}`));
  }

  // Thêm hàm lấy danh sách đặt trước của tôi
  getMyReservations(): Observable<ReservationDTO[]> {
    return this.http.get<ReservationDTO[]>(this.apiService.buildUrl('/user/circulation/my-reservations'));
  }

  // --- FINES (PHÍ PHẠT) ---

  getMyFines(): Observable<any> {
    return this.http.get(this.apiService.buildUrl('/user/circulation/my-fines'));
  }
}