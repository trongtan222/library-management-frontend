import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { BooksService, ImportSummary } from '../../services/books.service';
import * as XLSX from 'xlsx';

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

  // Drag & Drop state
  isDraggingBooks = false;
  isDraggingUsers = false;

  // Preview state
  booksPreviewData: any[] = [];
  usersPreviewData: any[] = [];
  showBooksPreview = false;
  showUsersPreview = false;

  // Column mapping state
  booksColumns: string[] = [];
  usersColumns: string[] = [];
  booksMapping: { [key: string]: string } = {};
  usersMapping: { [key: string]: string } = {};
  showBooksMapping = false;
  showUsersMapping = false;

  // Expected fields
  expectedBooksFields = [
    'name',
    'isbn',
    'publishedYear',
    'numberOfCopiesAvailable',
    'coverImageUrl',
  ];
  expectedUsersFields = ['studentId', 'name', 'email', 'className'];

  constructor(
    private booksService: BooksService,
    private toastr: ToastrService,
  ) {}

  onFileChange(event: Event, type: 'books' | 'users') {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.processFile(file, type);
  }

  // Drag & Drop handlers
  onDragOver(event: DragEvent, type: 'books' | 'users') {
    event.preventDefault();
    event.stopPropagation();
    if (type === 'books') this.isDraggingBooks = true;
    else this.isDraggingUsers = true;
  }

  onDragLeave(event: DragEvent, type: 'books' | 'users') {
    event.preventDefault();
    event.stopPropagation();
    if (type === 'books') this.isDraggingBooks = false;
    else this.isDraggingUsers = false;
  }

  onDrop(event: DragEvent, type: 'books' | 'users') {
    event.preventDefault();
    event.stopPropagation();
    if (type === 'books') this.isDraggingBooks = false;
    else this.isDraggingUsers = false;

    const file = event.dataTransfer?.files[0];
    if (file) this.processFile(file, type);
  }

  private processFile(file: File, type: 'books' | 'users') {
    if (type === 'books') this.booksFile = file;
    else this.usersFile = file;

    // Read file for preview
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData: any[] = XLSX.utils.sheet_to_json(firstSheet, {
          header: 1,
        });

        if (jsonData.length > 0) {
          const headers = jsonData[0];
          const rows = jsonData.slice(1, 6); // Lấy 5 dòng đầu
          const preview = rows.map((row) => {
            const obj: any = {};
            headers.forEach((h: any, i: number) => {
              obj[h] = row[i];
            });
            return obj;
          });

          if (type === 'books') {
            this.booksPreviewData = preview;
            this.booksColumns = headers;
            this.showBooksPreview = true;
            this.initializeMapping('books', headers);
          } else {
            this.usersPreviewData = preview;
            this.usersColumns = headers;
            this.showUsersPreview = true;
            this.initializeMapping('users', headers);
          }
        }
      } catch (err) {
        this.toastr.error('Không đọc được file. Vui lòng kiểm tra định dạng.');
      }
    };
    reader.readAsBinaryString(file);
  }

  private initializeMapping(type: 'books' | 'users', columns: string[]) {
    const expected =
      type === 'books' ? this.expectedBooksFields : this.expectedUsersFields;
    const mapping: { [key: string]: string } = {};

    // Auto-match exact names (case-insensitive)
    columns.forEach((col) => {
      const match = expected.find(
        (exp) => exp.toLowerCase() === col.toLowerCase(),
      );
      if (match) mapping[match] = col;
    });

    if (type === 'books') this.booksMapping = mapping;
    else this.usersMapping = mapping;
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
          `Nhập sách thành công: ${summary.successCount} dòng, lỗi ${summary.failedCount}`,
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
          `Nhập người dùng thành công: ${summary.successCount} dòng, lỗi ${summary.failedCount}`,
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

  downloadErrorReport(type: 'books' | 'users') {
    const summary = type === 'books' ? this.booksSummary : this.usersSummary;
    if (!summary || !summary.errors || summary.errors.length === 0) {
      this.toastr.warning('Không có lỗi để xuất');
      return;
    }

    // Tạo worksheet với các dòng lỗi
    const errorData = summary.errors.map((err, idx) => ({
      STT: idx + 1,
      Lỗi: err,
    }));

    const ws = XLSX.utils.json_to_sheet(errorData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Errors');

    // Xuất file
    const filename =
      type === 'books'
        ? 'books_import_errors.xlsx'
        : 'users_import_errors.xlsx';
    XLSX.writeFile(wb, filename);
    this.toastr.success(`Đã tải báo cáo lỗi: ${filename}`);
  }

  toggleMapping(type: 'books' | 'users') {
    if (type === 'books') this.showBooksMapping = !this.showBooksMapping;
    else this.showUsersMapping = !this.showUsersMapping;
  }
}
