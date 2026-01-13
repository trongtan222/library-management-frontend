import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface NewsItem {
  id?: number;
  title: string;
  content: string;
  createdAt?: string;
}

@Component({
  selector: 'app-admin-news',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-news.component.html',
  styleUrls: ['./admin-news.component.css'],
})
export class AdminNewsComponent implements OnInit {
  items: NewsItem[] = [];
  isLoading = false;
  editing?: NewsItem;
  newItem: NewsItem = { title: '', content: '' };
  sendEmailOnCreate = false;
  sendEmailOnUpdate = false;
  private apiUrl = environment.apiBaseUrl;

  constructor(private http: HttpClient, private toastr: ToastrService) {}

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
    this.sendEmailOnUpdate = false;
  }
  cancelEdit() {
    this.editing = undefined;
    this.sendEmailOnUpdate = false;
  }

  saveEdit() {
    if (!this.editing?.id) return;
    const params = { notifyEmail: String(this.sendEmailOnUpdate) };

    this.http
      .put<NewsItem>(
        `${this.apiUrl}/admin/news/${this.editing.id}`,
        this.editing,
        { params }
      )
      .subscribe({
        next: (updated) => {
          const idx = this.items.findIndex((i) => i.id === updated.id);
          if (idx >= 0) this.items[idx] = updated;
          this.toastr.success('Cập nhật tin tức thành công');
          this.editing = undefined;
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
          this.newItem = { title: '', content: '' };
          this.sendEmailOnCreate = false;
          this.toastr.success('Tạo tin tức thành công');
        },
        error: () => this.toastr.error('Tạo tin thất bại'),
      });
  }

  delete(item: NewsItem) {
    if (!item.id) return;
    this.http.delete<void>(`${this.apiUrl}/admin/news/${item.id}`).subscribe({
      next: () => {
        this.items = this.items.filter((i) => i.id !== item.id);
        this.toastr.success('Xóa tin tức thành công');
      },
      error: () => this.toastr.error('Xóa thất bại'),
    });
  }
}
