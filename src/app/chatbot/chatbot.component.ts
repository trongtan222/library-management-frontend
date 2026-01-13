import {
  Component,
  ElementRef,
  OnInit,
  OnDestroy,
  ViewChild,
} from '@angular/core';
import { UserAuthService } from '../services/user-auth.service';
import { ChatbotService } from '../services/chatbot.service';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

interface Message {
  author: 'user' | 'bot';
  text: string;
  timestamp?: Date;
}

@Component({
  selector: 'app-chatbot',
  templateUrl: './chatbot.component.html',
  styleUrls: ['./chatbot.component.css'],
  standalone: false,
})
export class ChatbotComponent implements OnInit, OnDestroy {
  @ViewChild('chatBody') private chatBody!: ElementRef;

  isOpen = false;
  isLoading = false;
  currentMessage = '';
  messages: Message[] = [];
  conversationId: string | null = null;
  private hasInitializedChat = false;

  private destroy$ = new Subject<void>();

  constructor(
    private userAuthService: UserAuthService,
    private chatbotService: ChatbotService
  ) {}

  // Dynamic getter so chatbot re-checks login state on each render/change detection
  get isUser(): boolean {
    return this.userAuthService.isLoggedIn();
  }

  ngOnInit(): void {
    // Initialize conversation only on first user login
    this.initializeChatIfNeeded();
  }

  private initializeChatIfNeeded(): void {
    if (!this.hasInitializedChat && this.isUser) {
      this.hasInitializedChat = true;
      // Generate new conversation ID
      this.conversationId = this.generateUUID();
      this.messages.push({
        author: 'bot',
        text: 'Hello! How can I help you find a book today? You can ask about books, authors, genres, or borrowing information.',
        timestamp: new Date(),
      });
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleChat(): void {
    this.isOpen = !this.isOpen;
  }

  sendMessage(): void {
    const userMessage = this.currentMessage.trim();
    if (!userMessage || this.isLoading || !this.conversationId) return;

    this.messages.push({
      author: 'user',
      text: userMessage,
      timestamp: new Date(),
    });
    this.currentMessage = '';
    this.isLoading = true;
    this.scrollToBottom();

    this.chatbotService
      .ask(userMessage, this.conversationId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          let botText = '';

          // Handle different response formats
          if (response.error) {
            botText = response.error;
          } else if (response.answer) {
            // Format: {"answer":"...", "status":"ok", "conversationId":"..."}
            botText = response.answer;
          } else if (response.candidates && response.candidates[0]) {
            botText = response.candidates[0].content.parts[0].text;
          } else {
            botText = 'Sorry, I could not process that response.';
          }

          this.messages.push({
            author: 'bot',
            text: botText,
            timestamp: new Date(),
          });

          this.isLoading = false;
          this.scrollToBottom();
        },
        error: (err: HttpErrorResponse) => {
          const errorMsg = this.extractErrorMessage(err);
          this.messages.push({
            author: 'bot',
            text: errorMsg,
            timestamp: new Date(),
          });
          this.isLoading = false;
          this.scrollToBottom();
        },
      });
  }

  fillMessage(text: string): void {
    this.currentMessage = text;
    // Gửi ngay sau khi gán để học sinh không phải bấm thêm
    this.sendMessage();
  }

  clearChat(): void {
    this.messages = [];
    this.conversationId = this.generateUUID();
    this.messages.push({
      author: 'bot',
      text: 'Chat cleared. Starting a new conversation. How can I help you?',
      timestamp: new Date(),
    });
  }

  private extractErrorMessage(err: HttpErrorResponse): string {
    if (err.error?.error) {
      return err.error.error;
    }
    if (err.error?.message) {
      return err.error.message;
    }
    if (err.status === 401) {
      return 'Session expired. Please log in again.';
    }
    if (err.status === 403) {
      return 'You do not have permission to use the chat feature.';
    }
    if (err.status === 429) {
      return 'Too many requests. Please wait a moment and try again.';
    }
    if (err.status >= 500) {
      return 'Server error. Please try again later.';
    }
    return 'Sorry, I encountered an error. Please try again.';
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      try {
        this.chatBody.nativeElement.scrollTop =
          this.chatBody.nativeElement.scrollHeight;
      } catch (err) {}
    }, 10);
  }

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(
      /[xy]/g,
      function (c) {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      }
    );
  }
}
