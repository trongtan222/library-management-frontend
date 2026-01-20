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
  bookCard?: BookCard; // For interactive book responses
}

interface BookCard {
  id: number;
  title: string;
  author: string;
  imageUrl?: string;
  available: boolean;
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

  // Voice input
  isListening = false;
  recognition: any = null;
  voiceSupported = false;

  private destroy$ = new Subject<void>();
  private readonly STORAGE_KEY = 'chatbot_history';
  private readonly CONVERSATION_KEY = 'chatbot_conversation_id';

  constructor(
    private userAuthService: UserAuthService,
    private chatbotService: ChatbotService,
  ) {
    this.initializeVoiceRecognition();
  }

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

      // Try to load existing chat from localStorage
      const savedHistory = this.loadChatHistory();
      const savedConversationId = localStorage.getItem(this.CONVERSATION_KEY);

      if (savedHistory && savedHistory.length > 0 && savedConversationId) {
        this.messages = savedHistory;
        this.conversationId = savedConversationId;
      } else {
        // Start fresh conversation
        this.conversationId = this.generateUUID();
        this.messages.push({
          author: 'bot',
          text: 'Hello! How can I help you find a book today? You can ask about books, authors, genres, or borrowing information.',
          timestamp: new Date(),
        });
        this.saveChatHistory();
      }
    }
  }

  private initializeVoiceRecognition(): void {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      this.voiceSupported = true;
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.recognition.lang = 'vi-VN'; // Vietnamese

      this.recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        this.currentMessage = transcript;
        this.isListening = false;
      };

      this.recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        this.isListening = false;
      };

      this.recognition.onend = () => {
        this.isListening = false;
      };
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    // Clean up voice recognition
    if (this.recognition) {
      this.recognition.stop();
    }
  }

  toggleChat(): void {
    this.isOpen = !this.isOpen;
  }

  toggleVoiceInput(): void {
    if (!this.voiceSupported) {
      alert('Trình duyệt của bạn không hỗ trợ nhập liệu bằng giọng nói.');
      return;
    }

    if (this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    } else {
      this.recognition.start();
      this.isListening = true;
    }
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
    this.saveChatHistory();
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

          // Try to parse book card from response
          const bookCard = this.parseBookCard(botText);

          this.messages.push({
            author: 'bot',
            text: botText,
            timestamp: new Date(),
            bookCard: bookCard || undefined,
          });

          this.isLoading = false;
          this.saveChatHistory();
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
          this.saveChatHistory();
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
    this.saveChatHistory();
  }

  borrowBook(bookId: number): void {
    // Navigate to borrow page with book ID
    window.location.href = `/borrow-book?bookId=${bookId}`;
  }

  viewBookDetails(bookId: number): void {
    // Navigate to book details page
    window.location.href = `/book-details/${bookId}`;
  }

  private parseBookCard(text: string): BookCard | null {
    // Try to extract book information from bot response
    // Format: "BOOK_CARD:{id:123,title:'Clean Code',author:'Robert Martin',available:true}"
    const bookCardMatch = text.match(/BOOK_CARD:\{([^}]+)\}/);
    if (!bookCardMatch) return null;

    try {
      const cardData = bookCardMatch[1];
      const id = cardData.match(/id:(\d+)/)?.[1];
      const title = cardData.match(/title:'([^']+)'/)?.[1];
      const author = cardData.match(/author:'([^']+)'/)?.[1];
      const available =
        cardData.match(/available:(true|false)/)?.[1] === 'true';

      if (id && title && author) {
        return {
          id: parseInt(id),
          title,
          author,
          available,
        };
      }
    } catch (e) {
      console.error('Failed to parse book card:', e);
    }
    return null;
  }

  private saveChatHistory(): void {
    try {
      // Save messages (limit to last 50 to avoid storage issues)
      const messagesToSave = this.messages.slice(-50);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(messagesToSave));

      // Save conversation ID
      if (this.conversationId) {
        localStorage.setItem(this.CONVERSATION_KEY, this.conversationId);
      }
    } catch (e) {
      console.error('Failed to save chat history:', e);
    }
  }

  private loadChatHistory(): Message[] | null {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        const messages = JSON.parse(saved);
        // Convert timestamp strings back to Date objects
        return messages.map((msg: any) => ({
          ...msg,
          timestamp: msg.timestamp ? new Date(msg.timestamp) : undefined,
        }));
      }
    } catch (e) {
      console.error('Failed to load chat history:', e);
    }
    return null;
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
      },
    );
  }
}
