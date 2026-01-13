import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface BookLocation {
  id: number;
  bookId: number;
  floor: number;
  zone: string;
  shelfCode: string;
  rowNumber: number;
  position: number;
  notes: string;
}

@Injectable({
  providedIn: 'root',
})
export class BookLocationService {
  private apiUrl = `${environment.apiBaseUrl}/api`;

  constructor(private http: HttpClient) {}

  // Public endpoints
  getLocationByBookId(bookId: number): Observable<BookLocation> {
    return this.http.get<BookLocation>(
      `${this.apiUrl}/public/locations/book/${bookId}`
    );
  }

  getLocationsByFloor(floor: number): Observable<BookLocation[]> {
    return this.http.get<BookLocation[]>(
      `${this.apiUrl}/public/locations/floor/${floor}`
    );
  }

  searchLocations(
    zone?: string,
    shelfCode?: string
  ): Observable<BookLocation[]> {
    let params: any = {};
    if (zone) params.zone = zone;
    if (shelfCode) params.shelfCode = shelfCode;

    return this.http.get<BookLocation[]>(
      `${this.apiUrl}/public/locations/search`,
      { params }
    );
  }

  // Admin endpoints
  createLocation(location: Partial<BookLocation>): Observable<BookLocation> {
    return this.http.post<BookLocation>(
      `${this.apiUrl}/admin/locations`,
      location
    );
  }

  updateLocation(
    id: number,
    location: Partial<BookLocation>
  ): Observable<BookLocation> {
    return this.http.put<BookLocation>(
      `${this.apiUrl}/admin/locations/${id}`,
      location
    );
  }

  deleteLocation(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(
      `${this.apiUrl}/admin/locations/${id}`
    );
  }
}
