import { Injectable } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { IS_PUBLIC_API } from './api.service';
import { Category } from '../models/book';

@Injectable({
  providedIn: 'root',
})
export class CategoryService {
  private apiUrl = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  // Get all categories (public endpoint)
  getAllCategories(): Observable<Category[]> {
    return this.http.get<Category[]>(`${this.apiUrl}/public/categories`, {
      context: new HttpContext().set(IS_PUBLIC_API, true),
    });
  }

  // Get category by ID (public endpoint)
  getCategoryById(id: number): Observable<Category> {
    return this.http.get<Category>(`${this.apiUrl}/public/categories/${id}`, {
      context: new HttpContext().set(IS_PUBLIC_API, true),
    });
  }
}
