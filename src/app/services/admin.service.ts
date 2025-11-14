import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { Books } from '../models/books';
import { Users } from '../models/users';

// ... (các interface DashboardStats, DashboardDetails, etc. giữ nguyên) ...
export interface DashboardStats {
  totalBooks: number;
  totalUsers: number;
  activeLoans: number;
  overdueLoans: number;
}

export interface DashboardDetails {
  stats: DashboardStats;
  mostLoanedBooks: { bookId: number; loanCount: number; }[];
  topBorrowers: { memberId: number; loanCount: number; }[];
  recentActivities: any[];
  overdueLoans: any[];
}

export interface LoanDetails {
    loanId: number;
    bookName: string;
    userName: string;
    loanDate: string;
    dueDate: string;
    returnDate?: string;
    status: 'ACTIVE' | 'RETURNED' | 'OVERDUE';
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


@Injectable({
  providedIn: 'root'
})
export class AdminService {
  // SỬA LỖI: Bỏ /api khỏi đây vì nó đã có trong environment.apiRoot
  private API_URL = `${environment.apiRoot}/admin`;

  constructor(private http: HttpClient) { }

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

  public getReportSummary(start: string, end: string): Observable<ReportSummary> {
    const params = { start, end };
    return this.http.get<ReportSummary>(`${this.API_URL}/reports/summary`, { params });
  }
}

