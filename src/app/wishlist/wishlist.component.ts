import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common'; // <--- Thêm import này (cho *ngIf, *ngFor, date pipe)
import { RouterModule } from '@angular/router'; // <--- Thêm import này (cho routerLink)
import { WishlistService } from '../services/wishlist.service';
import { BooksService } from '../services/books.service';
import { ToastrService } from 'ngx-toastr';
import { Book } from '../models/book'; // Đảm bảo bạn đã có model Book

@Component({
  selector: 'app-wishlist',
  standalone: true, // <--- Quan trọng: Xác định đây là Standalone Component
  imports: [CommonModule, RouterModule], // <--- Quan trọng: Khai báo các module cần dùng
  templateUrl: './wishlist.component.html',
  styleUrls: ['./wishlist.component.css']
})
export class WishlistComponent implements OnInit {
  wishlistItems: any[] = [];
  wishlistBooks: Book[] = [];
  isLoading = true;

  constructor(
    private wishlistService: WishlistService,
    private booksService: BooksService,
    private toastr: ToastrService
  ) { }

  ngOnInit(): void {
    this.loadWishlist();
  }

  loadWishlist(): void {
    this.isLoading = true;
    this.wishlistService.getMyWishlist().subscribe({
      next: (data) => {
        this.wishlistItems = data || [];
        // Chuẩn hoá thành danh sách Book để UI hiển thị ổn định
        const ids: number[] = [];
        for (const item of this.wishlistItems) {
          const id = (item?.book?.id) ?? item?.bookId ?? item?.id ?? item;
          if (typeof id === 'number' && !isNaN(id)) {
            ids.push(id);
          }
        }
        // Tải chi tiết từng sách (tuần tự để đảm bảo thứ tự)
        this.wishlistBooks = [];
        const loadNext = (index: number) => {
          if (index >= ids.length) {
            this.isLoading = false;
            return;
          }
          const bid = ids[index];
          this.booksService.getBookById(bid).subscribe({
            next: (book) => {
              this.wishlistBooks.push(book);
              loadNext(index + 1);
            },
            error: () => {
              // Nếu lỗi, vẫn tiếp tục để không chặn UI
              loadNext(index + 1);
            }
          });
        };
        loadNext(0);
        this.isLoading = false;
        console.log('Wishlist data:', data);
      },
      error: (err) => {
        // Chỉ hiện lỗi nếu không phải do chưa đăng nhập (401)
        if (err.status !== 401) {
            this.toastr.error('Không thể tải danh sách yêu thích');
        }
        this.isLoading = false;
      }
    });
  }

  remove(bookId: number): void {
    if(!confirm('Bạn có chắc muốn bỏ sách này khỏi danh sách yêu thích?')) return;

    this.wishlistService.removeFromWishlist(bookId).subscribe({
      next: () => {
        this.toastr.success('Đã xóa khỏi danh sách yêu thích');
        // Xoá khỏi danh sách Book hiển thị
        this.wishlistBooks = this.wishlistBooks.filter(b => b.id !== bookId);
        // Đồng bộ mảng thô nếu cần
        this.wishlistItems = this.wishlistItems.filter(item => {
          const id = (item?.book?.id) ?? item?.bookId ?? item?.id ?? item;
          return id !== bookId;
        });
      },
      error: () => {
        this.toastr.error('Lỗi khi xóa sách');
      }
    });
  }
}