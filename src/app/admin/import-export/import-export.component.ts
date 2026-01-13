import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { BooksService, ImportSummary } from '../../services/books.service';

@Component({
  selector: 'app-import-export',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './import-export.component.html',
  styleUrls: ['./import-export.component.css'],
})
export class ImportExportComponent {
  booksFile?: File;
  usersFile?: File;
  isUploadingBooks = false;
  isUploadingUsers = false;
  isExportingBooks = false;
  isExportingUsers = false;
  isDownloadingTemplate = false;
  booksSummary?: ImportSummary;
  usersSummary?: ImportSummary;

  constructor(
    private booksService: BooksService,
    private toastr: ToastrService
  ) {}

  onFileChange(event: Event, type: 'books' | 'users') {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (type === 'books') this.booksFile = file || undefined;
    else this.usersFile = file || undefined;
  }

  async importBooks() {
    if (!this.booksFile) {
      this.toastr.error('Chọn file sách (CSV/Excel)');
      return;
    }
    this.isUploadingBooks = true;
    this.booksService.importBooks(this.booksFile).subscribe({
      next: (summary) => {
        this.booksSummary = summary;
        this.toastr.success(
          `Nhập sách thành công: ${summary.successCount} dòng, lỗi ${summary.failedCount}`
        );
        this.booksFile = undefined;
      },
      error: () => this.toastr.error('Nhập sách thất bại'),
      complete: () => (this.isUploadingBooks = false),
    });
  }

  async importUsers() {
    if (!this.usersFile) {
      this.toastr.error('Chọn file người dùng (CSV/Excel)');
      return;
    }
    this.isUploadingUsers = true;
    this.booksService.importUsers(this.usersFile).subscribe({
      next: (summary) => {
        this.usersSummary = summary;
        this.toastr.success(
          `Nhập người dùng thành công: ${summary.successCount} dòng, lỗi ${summary.failedCount}`
        );
        this.usersFile = undefined;
      },
      error: () => this.toastr.error('Nhập người dùng thất bại'),
      complete: () => (this.isUploadingUsers = false),
    });
  }

  async exportBooks() {
    this.isExportingBooks = true;
    this.booksService.exportBooks().subscribe({
      next: (blob) => {
        this.downloadBlob(blob, 'books_export.xlsx');
        this.toastr.success('Xuất sách thành công');
      },
      error: () => this.toastr.error('Xuất sách thất bại'),
      complete: () => (this.isExportingBooks = false),
    });
  }

  async exportUsers() {
    this.isExportingUsers = true;
    this.booksService.exportUsers().subscribe({
      next: (blob) => {
        this.downloadBlob(blob, 'users_export.xlsx');
        this.toastr.success('Xuất người dùng thành công');
      },
      error: () => this.toastr.error('Xuất người dùng thất bại'),
      complete: () => (this.isExportingUsers = false),
    });
  }

  downloadTemplate(type: 'books' | 'users') {
    this.isDownloadingTemplate = true;
    const obs =
      type === 'books'
        ? this.booksService.downloadBooksTemplate()
        : this.booksService.downloadUsersTemplate();
    const filename =
      type === 'books' ? 'books_template.xlsx' : 'users_template.xlsx';
    obs.subscribe({
      next: (blob) => this.downloadBlob(blob, filename),
      error: () => this.toastr.error('Tải template thất bại'),
      complete: () => (this.isDownloadingTemplate = false),
    });
  }

  private downloadBlob(blob: Blob, filename: string) {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  }
}
