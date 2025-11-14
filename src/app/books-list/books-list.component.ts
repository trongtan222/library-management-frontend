import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { BooksService, Page } from '../services/books.service'; // Sửa: Import thêm Page
import { CirculationService } from '../services/circulation.service';
import { ToastrService } from 'ngx-toastr';
import { Books } from '../models/books'; // Import model

type Row = Books; // Giữ nguyên: Row là bí danh của Books

@Component({
    selector: 'app-books-list',
    templateUrl: './books-list.component.html',
    styleUrls: ['./books-list.component.css'],
    standalone: false
})
export class BooksListComponent implements OnInit {

  // Sửa: Chỉ cần 1 mảng books
  books: Row[] = []; 
  
  // Bỏ: filteredRows và pagedRows

  loading = new Set<number>();
  page = 1;
  pageSize = 10; // Đổi default size
  totalPages = 0;
  totalElements = 0; // Thêm
  pageSizes = [5, 10, 20, 50];
  searchTerm = '';

  // State cho borrow modal
  showBorrow = false;
  borrowingRow: Row | null = null;
  borrowForm = {
    memberId: 0,
    dueDate: '',
  };

  // State cho reserve modal
  showReserve = false;
  reservingRow: Row | null = null;
  reserveForm = {
    memberId: 0
  };
  
  // State cho confirm delete modal
  bookToDelete: Row | null = null;

  constructor(
    private booksService: BooksService,
    private circulation: CirculationService,
    private router: Router,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void { this.loadBooks(); } // Đổi tên hàm

  // --- HÀM TẢI DỮ LIỆU ĐÃ SỬA (SERVER-SIDE) ---
  public loadBooks(goToPage: number = this.page) {
    this.page = goToPage;
    // Gọi getPublicBooks với availableOnly = false
    this.booksService.getPublicBooks(
      false, // Lấy tất cả sách (cả hết hàng)
      this.searchTerm.trim() || null,
      null, // Admin không cần lọc genre
      this.page - 1,
      this.pageSize
    ).subscribe({
      next: (data: Page<Books>) => {
        // SỬA: Không cần map, gán trực tiếp
        this.books = data.content; 
        this.totalPages = data.totalPages;
        this.totalElements = data.totalElements;
      },
      error: (err: any) => this.toastError(err)
    });
  }

  // --- XÓA CÁC HÀM LỌC CŨ ---
  // Xóa: private norm(s: string)
  // Xóa: private match(row: Row, term: string)
  // Xóa: applyFilters(goTo?: number)
  // Xóa: private rebuildPage(goTo: number)

  // --- SỬA CÁC HÀM PHÂN TRANG ---
  setPage(p: number) { this.loadBooks(p); }
  prevPage() { if (this.page > 1) this.loadBooks(this.page - 1); }
  nextPage() { if (this.page < this.totalPages) this.loadBooks(this.page + 1); }
  
  // Sửa: Lấy giá trị từ $event.target.value
  changePageSize(event: any) { 
    this.pageSize = +(event.target.value); 
    this.loadBooks(1); 
  }

  updateBook(bookId: number) { this.router.navigate(['update-book', bookId]); }

  bookDetails(bookId: number) { this.router.navigate(['book-details', bookId]); }

  // --- Logic Modal (giữ nguyên, chỉ sửa hàm callback) ---

  openBorrow(row: Row) {
    // Sửa: Dùng 'numberOfCopiesAvailable'
    if (row.numberOfCopiesAvailable <= 0 || this.loading.has(row.id)) return;
    this.borrowingRow = row;
    this.borrowForm = {
      memberId: 0,
      dueDate: this.defaultDueDate(14),
    };
    this.showBorrow = true;
  }

  closeBorrow() {
    this.showBorrow = false;
    this.borrowingRow = null;
  }

  submitBorrow() {
    if (!this.borrowingRow) return;
    const { memberId, dueDate } = this.borrowForm;
    if (!memberId || !dueDate || memberId <= 0) {
      return this.toastError({ message: 'Please enter a valid Member ID and due date.' });
    }
    const loanDays = this.daysFromToday(dueDate);
    if (loanDays <= 0) {
      return this.toastError({ message: 'Due date must be in the future.' });
    }

    const row = this.borrowingRow;
    this.loading.add(row.id);
    this.circulation.loan({ bookId: row.id, memberId: Number(memberId), loanDays }).subscribe({
      next: () => {
        this.loading.delete(row.id);
        this.toastOk(`Loan created for "${row.name}"`);
        this.closeBorrow();
        this.loadBooks(this.page); // Sửa: Tải lại trang hiện tại
      },
      error: (err: any) => {
        this.loading.delete(row.id);
        this.toastError(err);
      }
    });
  }

  // --- Reserve Modal Logic (giữ nguyên) ---
  openReserve(row: Row) {
    if (this.loading.has(row.id)) return;
    this.reservingRow = row;
    this.reserveForm = { memberId: 0 };
    this.showReserve = true;
  }

  closeReserve() {
    this.showReserve = false;
    this.reservingRow = null;
  }

  submitReserve() {
    if (!this.reservingRow) return;
    const { memberId } = this.reserveForm;
    if (!memberId || memberId <= 0) {
      return this.toastError({ message: 'Please enter a valid Member ID.' });
    }
    const row = this.reservingRow;
    this.loading.add(row.id);
    this.circulation.reserve({ bookId: row.id, memberId: Number(memberId) }).subscribe({
      next: () => {
        this.loading.delete(row.id);
        this.toastOk(`Reserved "${row.name}" for Member ID ${memberId}.`);
        this.closeReserve();
      },
      error: (err: any) => {
        this.loading.delete(row.id);
        this.toastError(err);
      }
    });
  }
  
  isLoading(id: number) { return this.loading.has(id); }

  private defaultDueDate(addDays: number): string {
    const d = new Date();
    d.setDate(d.getDate() + addDays);
    return d.toISOString().slice(0, 10);
  }

  private daysFromToday(dateStr: string): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dateStr);
    const diff = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  }

  deleteBook(book: Row): void {
    this.bookToDelete = book; // Mở modal xác nhận
  }

  confirmDelete(): void {
    if (!this.bookToDelete) return;
    
    const bookToDeleteCopy = { ...this.bookToDelete }; // Tạo bản sao để tránh lỗi
    this.bookToDelete = null; // Đóng modal ngay

    this.booksService.deleteBook(bookToDeleteCopy.id).subscribe({
      next: () => {
        this.toastOk(`Book "${bookToDeleteCopy.name}" was deleted.`);
        this.loadBooks(this.page); // Sửa: Tải lại trang hiện tại
      },
      error: (err: any) => this.toastError(err)
    });
  }

  private toastOk(msg: string) { 
    this.toastr.success(msg, 'Thành công'); 
  }

  private toastError(err: any) {
    const msg = err?.error?.message || err?.message || 'Đã có lỗi không mong muốn xảy ra.';
    this.toastr.error(msg, 'Lỗi');
    console.error(err);
  }
}