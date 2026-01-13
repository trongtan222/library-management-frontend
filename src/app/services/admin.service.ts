import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
// SỬA: Import đúng tên và đường dẫn
import { Book } from '../models/book';
import { User } from '../models/user';

export interface DashboardStats {
  totalBooks: number;
  totalUsers: number;
  activeLoans: number;
  overdueLoans: number;
  totalFines?: number;
  totalUnpaidFines?: number;
}

export interface DashboardDetails {
  stats: DashboardStats;
  mostLoanedBooks: { bookId: number; loanCount: number }[];
  topBorrowers: { memberId: number; loanCount: number }[];
  recentActivities: any[];
  overdueLoans: any[];
}

export interface LoanDetails {
  loanId: number;
  bookId?: number;
  bookName: string;
  userName: string;
  loanDate: string;
  dueDate: string;
  returnDate?: string;
  status: 'ACTIVE' | 'RETURNED' | 'OVERDUE';
  fineAmount?: number;
  overdueDays?: number;
}

export interface FineDetails {
  loanId: number;
  bookName: string;
  userName: string;
  dueDate: string;
  returnDate: string;
  fineAmount: number;
  overdueDays?: number;
}

export interface ReportSummary {
  loansByMonth: { month: string; count: number }[];
  mostLoanedBooks: { bookName: string; loanCount: number }[];
  finesByMonth: { month: string; totalFines: number }[];
}

export interface RenewalRequestDto {
  id: number;
  loanId: number;
  memberId: number;
  extraDays: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  decidedAt?: string;
  adminNote?: string;
}

@Injectable({
  providedIn: 'root',
})
export class AdminService {
  // environment.apiBaseUrl already includes /api
  private API_URL = `${environment.apiBaseUrl}/admin`;

  constructor(private http: HttpClient) {}

  public getDashboardDetails(): Observable<DashboardDetails> {
    return this.http.get<DashboardDetails>(`${this.API_URL}/dashboard/details`);
  }

  public getAllLoans(): Observable<LoanDetails[]> {
    return this.http.get<LoanDetails[]>(`${this.API_URL}/loans`);
  }

  public getUnpaidFines(): Observable<FineDetails[]> {
    return this.http.get<FineDetails[]>(`${this.API_URL}/fines`);
  }

  public markFineAsPaid(loanId: number): Observable<any> {
    return this.http.post(`${this.API_URL}/fines/${loanId}/pay`, {});
  }

  public getReportSummary(
    start: string,
    end: string
  ): Observable<ReportSummary> {
    const params = { start, end };
    return this.http.get<ReportSummary>(`${this.API_URL}/reports/summary`, {
      params,
    });
  }

  public exportLoansExcel(
    startDate: string,
    endDate: string
  ): Observable<Blob> {
    const params = { startDate, endDate };
    return this.http.get(`${this.API_URL}/reports/export/loans/excel`, {
      params,
      responseType: 'blob',
    });
  }

  public exportBooksExcel(): Observable<Blob> {
    return this.http.get(`${this.API_URL}/reports/export/books/excel`, {
      responseType: 'blob',
    });
  }

  public exportUsersExcel(): Observable<Blob> {
    return this.http.get(`${this.API_URL}/reports/export/users/excel`, {
      responseType: 'blob',
    });
  }

  // ---------- SETTINGS ----------
  public getSettings(): Observable<
    Array<{ id: number; key: string; value: string }>
  > {
    return this.http.get<Array<{ id: number; key: string; value: string }>>(
      `${this.API_URL}/settings`
    );
  }

  public updateSetting(
    key: string,
    value: string
  ): Observable<{ id: number; key: string; value: string }> {
    return this.http.put<{ id: number; key: string; value: string }>(
      `${this.API_URL}/settings/${encodeURIComponent(key)}`,
      { value }
    );
  }

  // ---------- RENEWALS ----------
  public listRenewals(
    status?: 'PENDING' | 'APPROVED' | 'REJECTED'
  ): Observable<RenewalRequestDto[]> {
    const url = status
      ? `${environment.apiBaseUrl}/admin/renewals?status=${status}`
      : `${environment.apiBaseUrl}/admin/renewals`;
    return this.http.get<RenewalRequestDto[]>(url);
  }

  public approveRenewal(
    id: number,
    note?: string
  ): Observable<RenewalRequestDto> {
    return this.http.post<RenewalRequestDto>(
      `${environment.apiBaseUrl}/admin/renewals/${id}/approve`,
      { note }
    );
  }

  public rejectRenewal(
    id: number,
    note?: string
  ): Observable<RenewalRequestDto> {
    return this.http.post<RenewalRequestDto>(
      `${environment.apiBaseUrl}/admin/renewals/${id}/reject`,
      { note }
    );
  }
}
