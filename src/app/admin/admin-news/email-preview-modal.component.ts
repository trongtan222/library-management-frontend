import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

/**
 * Email Preview Modal Component
 * Shows HTML preview of email before sending mass notification
 */
@Component({
  selector: 'app-email-preview-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="modal-backdrop" *ngIf="show" (click)="onBackdropClick()"></div>
    <div class="modal" [class.show]="show" tabindex="-1" role="dialog">
      <div
        class="modal-dialog modal-lg modal-dialog-scrollable"
        role="document"
      >
        <div class="modal-content">
          <!-- Header -->
          <div class="modal-header bg-primary text-white">
            <h5 class="modal-title">
              <i class="fa-solid fa-eye"></i>
              Xem trước Email
            </h5>
            <button
              type="button"
              class="btn-close btn-close-white"
              (click)="cancel()"
              [disabled]="loading"
            ></button>
          </div>

          <!-- Body -->
          <div class="modal-body">
            <div *ngIf="loading" class="text-center py-4">
              <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Đang tải...</span>
              </div>
              <p class="mt-2 text-muted">Đang tạo preview...</p>
            </div>

            <div *ngIf="!loading && htmlContent" class="email-preview-content">
              <div class="alert alert-info mb-3">
                <i class="fa-solid fa-info-circle"></i>
                <strong>Lưu ý:</strong> Email sẽ được gửi đến
                <strong>{{ recipientCount || 0 }}</strong> người dùng có email.
              </div>

              <!-- Email Subject Preview -->
              <div class="mb-3 pb-3 border-bottom">
                <small class="text-muted d-block mb-1">Tiêu đề email:</small>
                <strong>{{ emailSubject }}</strong>
              </div>

              <!-- Email HTML Content -->
              <div class="email-html-wrapper" [innerHTML]="safeHtml"></div>
            </div>

            <div *ngIf="!loading && !htmlContent" class="alert alert-warning">
              <i class="fa-solid fa-exclamation-triangle"></i>
              Không thể tạo preview email
            </div>
          </div>

          <!-- Footer -->
          <div class="modal-footer">
            <button
              type="button"
              class="btn btn-secondary"
              (click)="cancel()"
              [disabled]="loading"
            >
              <i class="fa-solid fa-xmark"></i>
              Hủy
            </button>
            <button
              type="button"
              class="btn btn-success"
              (click)="confirm()"
              [disabled]="loading"
            >
              <i class="fa-solid fa-paper-plane"></i>
              Xác nhận gửi
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .modal-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
        z-index: 1040;
      }

      .modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 1050;
        display: none;
        overflow-x: hidden;
        overflow-y: auto;
      }

      .modal.show {
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .modal-dialog {
        max-width: 800px;
        margin: 1.75rem auto;
      }

      .email-preview-content {
        background: #f8f9fa;
        padding: 1.5rem;
        border-radius: 8px;
      }

      .email-html-wrapper {
        background: white;
        padding: 2rem;
        border-radius: 8px;
        border: 1px solid #dee2e6;
        min-height: 200px;
        font-family: Arial, sans-serif;
        line-height: 1.6;
      }

      /* Email content styling */
      .email-html-wrapper h1,
      .email-html-wrapper h2,
      .email-html-wrapper h3 {
        color: #2c3e50;
        margin-top: 1rem;
        margin-bottom: 0.5rem;
      }

      .email-html-wrapper img {
        max-width: 100%;
        height: auto;
        border-radius: 8px;
      }

      .email-html-wrapper p {
        margin-bottom: 1rem;
      }

      .email-html-wrapper ul,
      .email-html-wrapper ol {
        margin-bottom: 1rem;
        padding-left: 2rem;
      }

      @media (max-width: 768px) {
        .modal-dialog {
          max-width: 95%;
          margin: 0.5rem;
        }

        .email-html-wrapper {
          padding: 1rem;
        }
      }
    `,
  ],
})
export class EmailPreviewModalComponent {
  @Input() show = false;
  @Input() htmlContent = '';
  @Input() emailSubject = 'Tin tức mới';
  @Input() recipientCount = 0;
  @Input() loading = false;

  @Output() confirmed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  constructor(private sanitizer: DomSanitizer) {}

  get safeHtml(): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(this.htmlContent);
  }

  onBackdropClick() {
    if (!this.loading) {
      this.cancel();
    }
  }

  confirm() {
    this.confirmed.emit();
  }

  cancel() {
    this.cancelled.emit();
  }
}
