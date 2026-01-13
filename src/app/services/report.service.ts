import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ReportSummary {
  totalLoans: number;
  returnedLoans: number;
  overdueLoans: number;
  totalFines: number;
}

@Injectable({
  providedIn: 'root',
})
export class ReportService {
  private apiUrl = `${environment.apiBaseUrl}/api/admin/reports/export`;

  constructor(private http: HttpClient) {}

  getReportSummary(
    startDate: string,
    endDate: string
  ): Observable<ReportSummary> {
    return this.http.get<ReportSummary>(`${this.apiUrl}/summary`, {
      params: { startDate, endDate },
    });
  }

  downloadLoansExcel(startDate: string, endDate: string): void {
    this.http
      .get(`${this.apiUrl}/loans/excel`, {
        params: { startDate, endDate },
        responseType: 'blob',
      })
      .subscribe((blob) => {
        this.downloadFile(blob, `loans-report-${startDate}-${endDate}.xlsx`);
      });
  }

  downloadBooksExcel(): void {
    this.http
      .get(`${this.apiUrl}/books/excel`, {
        responseType: 'blob',
      })
      .subscribe((blob) => {
        this.downloadFile(
          blob,
          `books-inventory-${new Date().toISOString().split('T')[0]}.xlsx`
        );
      });
  }

  downloadUsersExcel(): void {
    this.http
      .get(`${this.apiUrl}/users/excel`, {
        responseType: 'blob',
      })
      .subscribe((blob) => {
        this.downloadFile(
          blob,
          `users-list-${new Date().toISOString().split('T')[0]}.xlsx`
        );
      });
  }

  private downloadFile(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }
}
