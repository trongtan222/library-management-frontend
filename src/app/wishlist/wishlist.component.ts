import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { WishlistService, WishlistItem } from '../services/wishlist.service';
import { CirculationService } from '../services/circulation.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-wishlist',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './wishlist.component.html',
  styleUrls: ['./wishlist.component.css'],
})
export class WishlistComponent implements OnInit {
  wishlistItems: WishlistItem[] = [];
  isLoading = true;
  currentSort = 'recent';
  editingNotes: { [key: number]: boolean } = {};
  tempNotes: { [key: number]: string } = {};

  constructor(
    private wishlistService: WishlistService,
    private circulationService: CirculationService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.loadWishlist();
  }

  loadWishlist(sort: string = 'recent'): void {
    this.isLoading = true;
    this.currentSort = sort;
    this.wishlistService.getMyWishlist(sort).subscribe({
      next: (data) => {
        this.wishlistItems = data || [];
        this.isLoading = false;
        console.log('Wishlist data:', data);
      },
      error: (err) => {
        if (err.status !== 401) {
          this.toastr.error('Không thể tải danh sách yêu thích');
        }
        this.isLoading = false;
      },
    });
  }

  remove(bookId: number): void {
    if (!confirm('Bạn có chắc muốn bỏ sách này khỏi danh sách yêu thích?'))
      return;

    this.wishlistService.removeFromWishlist(bookId).subscribe({
      next: () => {
        this.toastr.success('Đã xóa khỏi danh sách yêu thích');
        this.wishlistItems = this.wishlistItems.filter(
          (item) => item.bookId !== bookId
        );
      },
      error: () => {
        this.toastr.error('Lỗi khi xóa sách');
      },
    });
  }

  startEditNotes(item: WishlistItem): void {
    this.editingNotes[item.bookId] = true;
    this.tempNotes[item.bookId] = item.notes || '';
  }

  saveNotes(item: WishlistItem): void {
    const notes = this.tempNotes[item.bookId] || '';
    this.wishlistService.updateNotes(item.bookId, notes).subscribe({
      next: () => {
        item.notes = notes;
        this.editingNotes[item.bookId] = false;
        this.toastr.success('Đã lưu ghi chú');
      },
      error: () => {
        this.toastr.error('Lỗi khi lưu ghi chú');
      },
    });
  }

  cancelEditNotes(bookId: number): void {
    this.editingNotes[bookId] = false;
    delete this.tempNotes[bookId];
  }

  borrowBook(item: WishlistItem): void {
    if (item.availableCopies <= 0) {
      this.toastr.warning('Sách này hiện đã hết, vui lòng chờ có sách trả về!');
      return;
    }

    // Get current user info from localStorage (assuming it's stored during login)
    const userStr = localStorage.getItem('currentUser');
    if (!userStr) {
      this.toastr.error('Vui lòng đăng nhập để mượn sách');
      return;
    }

    const user = JSON.parse(userStr);
    const borrowData = {
      bookId: item.bookId,
      memberId: user.userId || user.id,
      loanDays: 14, // Default loan period
      quantity: 1,
    };

    this.circulationService.loan(borrowData).subscribe({
      next: () => {
        this.toastr.success('Đã gửi yêu cầu mượn sách thành công!');
        this.remove(item.bookId); // Auto remove from wishlist
      },
      error: (err) => {
        if (err.status === 400) {
          this.toastr.error(
            'Bạn đã mượn quá số sách cho phép hoặc sách không khả dụng'
          );
        } else {
          this.toastr.error('Lỗi khi gửi yêu cầu mượn sách');
        }
      },
    });
  }

  getAvailabilityClass(availableCopies: number): string {
    return availableCopies > 0 ? 'badge bg-success' : 'badge bg-danger';
  }

  getAvailabilityText(availableCopies: number): string {
    return availableCopies > 0 ? `Còn ${availableCopies} cuốn` : 'Hết sách';
  }
}
