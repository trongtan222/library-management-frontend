import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { QuillModule } from 'ngx-quill';
import { EmailPreviewModalComponent } from './email-preview-modal.component';

interface NewsItem {
  id?: number;
  title: string;
  content: string;
  coverImageUrl?: string;
  isPinned?: boolean;
  publishedAt?: string;
  status?: 'DRAFT' | 'PUBLISHED';
  createdAt?: string;
}

@Component({
  selector: 'app-admin-news',
  standalone: true,
  imports: [CommonModule, FormsModule, QuillModule, EmailPreviewModalComponent],
  templateUrl: './admin-news.component.html',
  styleUrls: ['./admin-news.component.css'],
})
export class AdminNewsComponent implements OnInit {
  items: NewsItem[] = [];
  isLoading = false;
  editing?: NewsItem;
  newItem: NewsItem = {
    title: '',
    content: '',
    status: 'PUBLISHED',
    isPinned: false,
  };
  sendEmailOnCreate = false;
  sendEmailOnUpdate = false;
  previewImageUrl?: string;
  editingImageUrl?: string;
  uploadingImage = false;

  // Email preview modal state
  showEmailPreview = false;
  emailPreviewHtml = '';
  emailPreviewLoading = false;
  recipientCount = 0;
  previewingItem?: NewsItem;
  isCreatingNewItem = false;

  private apiUrl = environment.apiBaseUrl;

  // Quill editor configuration
  quillConfig = {
    toolbar: [
      ['bold', 'italic', 'underline', 'strike'],
      ['blockquote', 'code-block'],
      [{ header: 1 }, { header: 2 }],
      [{ list: 'ordered' }, { list: 'bullet' }],
      [{ indent: '-1' }, { indent: '+1' }],
      [{ size: ['small', false, 'large', 'huge'] }],
      [{ color: [] }, { background: [] }],
      [{ align: [] }],
      ['link', 'image'],
      ['clean'],
    ],
  };

  constructor(
    private http: HttpClient,
    private toastr: ToastrService,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load() {
    this.isLoading = true;
    this.http.get<NewsItem[]>(`${this.apiUrl}/admin/news`).subscribe({
      next: (items) => {
        this.items = items || [];
      },
      error: () => this.toastr.error('Tải tin tức thất bại'),
      complete: () => {
        this.isLoading = false;
      },
    });
  }

  startEdit(item: NewsItem) {
    this.editing = { ...item };
    this.editingImageUrl = item.coverImageUrl;
    this.sendEmailOnUpdate = false;
  }

  cancelEdit() {
    this.editing = undefined;
    this.editingImageUrl = undefined;
    this.sendEmailOnUpdate = false;
  }

  saveEdit() {
    if (!this.editing?.id) return;
    const params = { notifyEmail: String(this.sendEmailOnUpdate) };

    this.http
      .put<NewsItem>(
        `${this.apiUrl}/admin/news/${this.editing.id}`,
        this.editing,
        { params },
      )
      .subscribe({
        next: (updated) => {
          const idx = this.items.findIndex((i) => i.id === updated.id);
          if (idx >= 0) this.items[idx] = updated;
          this.toastr.success('Cập nhật tin tức thành công');
          this.editing = undefined;
          this.editingImageUrl = undefined;
        },
        error: () => this.toastr.error('Cập nhật thất bại'),
      });
  }

  create() {
    if (!this.newItem.title?.trim()) {
      this.toastr.error('Nhập tiêu đề');
      return;
    }
    const params = { notifyEmail: String(this.sendEmailOnCreate) };

    this.http
      .post<NewsItem>(`${this.apiUrl}/admin/news`, this.newItem, { params })
      .subscribe({
        next: (created) => {
          this.items.unshift(created);
          this.newItem = {
            title: '',
            content: '',
            status: 'PUBLISHED',
            isPinned: false,
          };
          this.previewImageUrl = undefined;
          this.sendEmailOnCreate = false;
          this.toastr.success('Tạo tin tức thành công');
        },
        error: () => this.toastr.error('Tạo tin thất bại'),
      });
  }

  delete(item: NewsItem) {
    if (!item.id) return;

    if (!confirm(`Xác nhận xóa tin tức: ${item.title}?`)) {
      return;
    }

    this.http.delete<void>(`${this.apiUrl}/admin/news/${item.id}`).subscribe({
      next: () => {
        this.items = this.items.filter((i) => i.id !== item.id);
        this.toastr.success('Xóa tin tức thành công');
      },
      error: () => this.toastr.error('Xóa thất bại'),
    });
  }

  onImageSelect(event: Event, isEditing: boolean = false) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    if (!file.type.startsWith('image/')) {
      this.toastr.error('Vui lòng chọn file ảnh');
      return;
    }

    this.uploadingImage = true;
    const formData = new FormData();
    formData.append('image', file);

    this.http
      .post<string>(`${this.apiUrl}/admin/news/upload-image`, formData, {
        responseType: 'text' as 'json',
      })
      .subscribe({
        next: (imageUrl) => {
          if (isEditing && this.editing) {
            this.editing.coverImageUrl = imageUrl;
            this.editingImageUrl = imageUrl;
          } else {
            this.newItem.coverImageUrl = imageUrl;
            this.previewImageUrl = imageUrl;
          }
          this.toastr.success('Upload ảnh thành công');
          this.uploadingImage = false;
        },
        error: () => {
          this.toastr.error('Upload ảnh thất bại');
          this.uploadingImage = false;
        },
      });
  }

  removeImage(isEditing: boolean = false) {
    if (isEditing && this.editing) {
      this.editing.coverImageUrl = undefined;
      this.editingImageUrl = undefined;
    } else {
      this.newItem.coverImageUrl = undefined;
      this.previewImageUrl = undefined;
    }
  }

  sendTestEmail(item: NewsItem) {
    this.http
      .post<string>(`${this.apiUrl}/admin/news/test-email`, item, {
        responseType: 'text' as 'json',
      })
      .subscribe({
        next: (message) => {
          this.toastr.success(message);
        },
        error: (err) => {
          const errorMsg = err.error || 'Gửi email thất bại';
          this.toastr.error(errorMsg);
        },
      });
  }

  // Email preview methods
  openEmailPreview(item: NewsItem, isNewItem: boolean = false) {
    this.previewingItem = item;
    this.isCreatingNewItem = isNewItem;
    this.showEmailPreview = true;
    this.emailPreviewLoading = true;

    // Fetch preview HTML
    this.http
      .post<string>(`${this.apiUrl}/admin/news/preview-email`, item, {
        responseType: 'text' as 'json',
      })
      .subscribe({
        next: (html) => {
          this.emailPreviewHtml = html;
          this.emailPreviewLoading = false;
        },
        error: () => {
          this.toastr.error('Không thể tạo preview');
          this.emailPreviewLoading = false;
          this.showEmailPreview = false;
        },
      });

    // Get recipient count (users with email)
    this.http.get<any[]>(`${this.apiUrl}/admin/users`).subscribe({
      next: (users) => {
        this.recipientCount = users.filter(
          (u) => u.email && u.email.trim(),
        ).length;
      },
      error: () => {
        this.recipientCount = 0;
      },
    });
  }

  onEmailPreviewConfirmed() {
    this.showEmailPreview = false;

    if (this.isCreatingNewItem) {
      // Proceed with create
      this.create();
    } else if (this.editing) {
      // Proceed with update
      this.saveEdit();
    }
  }

  onEmailPreviewCancelled() {
    this.showEmailPreview = false;
    this.previewingItem = undefined;
    // Keep sendEmail flags intact so user can preview again
  }

  // Modified create to check for email preview
  createWithCheck() {
    if (!this.newItem.title?.trim()) {
      this.toastr.error('Nhập tiêu đề');
      return;
    }

    if (this.sendEmailOnCreate) {
      // Show preview modal first
      this.openEmailPreview(this.newItem, true);
    } else {
      // Create directly without preview
      this.create();
    }
  }

  // Modified saveEdit to check for email preview
  saveEditWithCheck() {
    if (!this.editing?.id) return;

    if (this.sendEmailOnUpdate) {
      // Show preview modal first
      this.openEmailPreview(this.editing, false);
    } else {
      // Update directly without preview
      this.saveEdit();
    }
  }

  getImageUrl(path?: string): string {
    if (!path) return '';
    return path.startsWith('http') ? path : `${this.apiUrl}${path}`;
  }
}
