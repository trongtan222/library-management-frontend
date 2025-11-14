import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ChatbotService {
  private apiUrl = `${environment.apiRoot}/user/chat`;

  constructor(private http: HttpClient) { }

  // SỬA Ở ĐÂY: Bỏ responseType: 'text' và đổi kiểu trả về thành 'any'
  ask(prompt: string): Observable<any> {
    return this.http.post<any>(this.apiUrl, { prompt });
  }
}