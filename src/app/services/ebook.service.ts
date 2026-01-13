import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Ebook {
  id: number;
  title: string;
  author: string;
  description: string;
  filePath: string;
  fileType: string;
  fileSize: number;
  coverUrl: string;
  isPublic: boolean;
  downloadCount: number;
  viewCount: number;
  maxDownloadsPerUser: number;
  relatedBookId: number;
  createdAt: string;
}

export interface EbookDownload {
  id: number;
  ebook: Ebook;
  downloadedAt: string;
}

export interface EbookPage {
  content: Ebook[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

@Injectable({
  providedIn: 'root',
})
export class EbookService {
  private apiUrl = `${environment.apiBaseUrl}/api`;

  constructor(private http: HttpClient) {}

  // Public endpoints
  getPublicEbooks(page: number = 0, size: number = 10): Observable<EbookPage> {
    return this.http.get<EbookPage>(`${this.apiUrl}/public/ebooks`, {
      params: { page: page.toString(), size: size.toString() },
    });
  }

  getEbookById(id: number): Observable<Ebook> {
    return this.http.get<Ebook>(`${this.apiUrl}/public/ebooks/${id}`);
  }

  searchEbooks(
    search?: string,
    fileType?: string,
    page: number = 0,
    size: number = 10
  ): Observable<EbookPage> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    if (search) params = params.set('search', search);
    if (fileType) params = params.set('fileType', fileType);

    return this.http.get<EbookPage>(`${this.apiUrl}/public/ebooks/search`, {
      params,
    });
  }

  getTopDownloaded(limit: number = 10): Observable<Ebook[]> {
    return this.http.get<Ebook[]>(`${this.apiUrl}/public/ebooks/top`, {
      params: { limit: limit.toString() },
    });
  }

  getNewestEbooks(limit: number = 10): Observable<Ebook[]> {
    return this.http.get<Ebook[]>(`${this.apiUrl}/public/ebooks/newest`, {
      params: { limit: limit.toString() },
    });
  }

  // User endpoints
  canDownload(id: number): Observable<{ canDownload: boolean }> {
    return this.http.get<{ canDownload: boolean }>(
      `${this.apiUrl}/user/ebooks/${id}/can-download`
    );
  }

  downloadEbook(id: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/user/ebooks/${id}/download`, {
      responseType: 'blob',
    });
  }

  getMyDownloads(): Observable<EbookDownload[]> {
    return this.http.get<EbookDownload[]>(
      `${this.apiUrl}/user/ebooks/my-downloads`
    );
  }

  // Admin endpoints
  getAllEbooks(page: number = 0, size: number = 10): Observable<EbookPage> {
    return this.http.get<EbookPage>(`${this.apiUrl}/admin/ebooks`, {
      params: { page: page.toString(), size: size.toString() },
    });
  }

  uploadEbook(file: File, metadata: Partial<Ebook>): Observable<Ebook> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', metadata.title || '');
    if (metadata.author) formData.append('author', metadata.author);
    if (metadata.description)
      formData.append('description', metadata.description);
    if (metadata.coverUrl) formData.append('coverUrl', metadata.coverUrl);
    formData.append('isPublic', String(metadata.isPublic ?? true));
    formData.append(
      'maxDownloadsPerUser',
      String(metadata.maxDownloadsPerUser ?? 3)
    );

    return this.http.post<Ebook>(`${this.apiUrl}/admin/ebooks`, formData);
  }

  updateEbook(id: number, ebook: Partial<Ebook>): Observable<Ebook> {
    return this.http.put<Ebook>(`${this.apiUrl}/admin/ebooks/${id}`, ebook);
  }

  deleteEbook(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(
      `${this.apiUrl}/admin/ebooks/${id}`
    );
  }
}
