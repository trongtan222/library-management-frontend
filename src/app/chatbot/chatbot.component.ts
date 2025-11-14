import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { UserAuthService } from '../services/user-auth.service';
import { ChatbotService } from '../services/chatbot.service';
import { HttpErrorResponse } from '@angular/common/http'; // Import thêm

interface Message {
  author: 'user' | 'bot';
  text: string;
}

@Component({
    selector: 'app-chatbot',
    templateUrl: './chatbot.component.html',
    styleUrls: ['./chatbot.component.css'],
    standalone: false
})
export class ChatbotComponent implements OnInit {
  @ViewChild('chatBody') private chatBody!: ElementRef;

  isUser = false;
  isOpen = false;
  isLoading = false;
  currentMessage = '';
  messages: Message[] = [];

  constructor(
    private userAuthService: UserAuthService,
    private chatbotService: ChatbotService
  ) { }

  ngOnInit(): void {
    this.isUser = this.userAuthService.isUser();
    if (this.isUser) {
      this.messages.push({ author: 'bot', text: 'Hello! How can I help you find a book today?' });
    }
  }

  toggleChat(): void {
    this.isOpen = !this.isOpen;
  }

  sendMessage(): void {
    const userMessage = this.currentMessage.trim();
    if (!userMessage || this.isLoading) return;

    this.messages.push({ author: 'user', text: userMessage });
    this.currentMessage = '';
    this.isLoading = true;
    this.scrollToBottom();

    this.chatbotService.ask(userMessage).subscribe({
      // SỬA HOÀN TOÀN KHỐI 'next'
      next: (response) => {
        let botText = '';
        // Kiểm tra xem đây là response lỗi (từ controller) hay response thành công (từ Gemini)
        if (response.error) {
            botText = response.error;
        } else {
            // Bỏ JSON.parse, vì 'response' đã là object
            botText = response.candidates[0].content.parts[0].text;
        }
        
        // Thay thế markdown đơn giản bằng HTML
        const formattedText = botText.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>');
        this.messages.push({ author: 'bot', text: formattedText });
        
        this.isLoading = false;
        this.scrollToBottom();
      },
      // SỬA KHỐI 'error'
      error: (err: HttpErrorResponse) => {
        // Bắt lỗi HTTP (như 401, 403, 500...)
        const errorMsg = err.error?.error || err.error?.message || 'Sorry, I am having trouble connecting.';
        this.messages.push({ author: 'bot', text: errorMsg });
        this.isLoading = false;
        this.scrollToBottom();
      }
    });
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      try {
        this.chatBody.nativeElement.scrollTop = this.chatBody.nativeElement.scrollHeight;
      } catch(err) { }
    }, 10);
  }
}