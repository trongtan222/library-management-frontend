import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { FineDetails } from './admin.service';

@Injectable({ providedIn: 'root' })
export class CirculationService {
    // SỬA LỖI: Bỏ /api khỏi đây
    private base = `${environment.apiRoot}/user/circulation`;

    constructor(private http: HttpClient) { }

    loan(body: { bookId: number; memberId: number; loanDays?: number }): Observable<any> {
        return this.http.post(`${this.base}/loans`, body);
    }

    returnLoan(id: number): Observable<any> {
        return this.http.put(`${this.base}/loans/${id}/return`, {});
    }

    renew(body: { loanId: number; extraDays?: number }): Observable<any> {
        return this.http.put(`${this.base}/loans/renew`, body);
    }

    reserve(body: { bookId: number; memberId: number }): Observable<any> {
        return this.http.post(`${this.base}/reservations`, body);
    }

    cancelReservation(id: number): Observable<any> {
        return this.http.delete(`${this.base}/reservations/${id}`);
    }

    getReservationsByUser(memberId: number): Observable<any[]> {
        return this.http.get<any[]>(`${this.base}/reservations?memberId=${memberId}`);
    }

    // Phương thức này giờ đã đúng, không cần tham số
    getMyFines(): Observable<FineDetails[]> {
        return this.http.get<FineDetails[]>(`${this.base}/my-fines`);
    }
}