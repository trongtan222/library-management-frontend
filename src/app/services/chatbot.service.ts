import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root'
})
export class ChatbotService {
  private apiUrl: string;

  constructor(
    private http: HttpClient,
    private apiService: ApiService
  ) {
    // Use centralized API service for URL management
    this.apiUrl = this.apiService.buildUrl('/user/chat');
  }

  /**
   * Send message with conversation support (RAG)
   */
  ask(prompt: string, conversationId?: string): Observable<any> {
    const payload = {
      prompt: prompt,
      conversationId: conversationId || undefined
    };
    
    return this.http.post<any>(this.apiUrl, payload);
  }

  /**
   * Get conversation history
   */
  getConversationHistory(conversationId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/history/${conversationId}`);
  }

  /**
   * Get all conversations for user
   */
  getUserConversations(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/conversations`);
  }
}