import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { BooksService } from '../services/books.service';

type BookForm = {
  id: number;
  bookName: string;
  bookAuthor: string;
  bookGenre: string;
  noOfCopies: number;
  publishedYear: number | null;
  isbn: string | null;
};

@Component({
  selector: 'app-update-book',
  templateUrl: './update-book.component.html',
  styleUrls: ['./update-book.component.css']
})
export class UpdateBookComponent implements OnInit {
  loading = false;
  error = '';

  book: BookForm = {
    id: 0,
    bookName: '',
    bookAuthor: '',
    bookGenre: '',
    noOfCopies: 0,
    publishedYear: null,
    isbn: null
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private booksService: BooksService
  ) {}

  ngOnInit(): void {
    // Hỗ trợ cả /update-book/:id và /update-book/:bookId
    const idStr = this.route.snapshot.paramMap.get('id') ?? this.route.snapshot.paramMap.get('bookId');
    const id = idStr ? Number(idStr) : NaN;

    if (Number.isNaN(id)) {
      this.error = 'Invalid book id';
      return;
    }

    this.loading = true;
    this.booksService.getBookById(id).subscribe({
      next: (b: any) => {
        // Map từ backend -> form (nhận cả name/author/... lẫn bookName/...)
        this.book = {
          id: b.id ?? b.bookId ?? id,
          bookName: b.name ?? b.bookName ?? '',
          bookAuthor: b.author ?? b.bookAuthor ?? '',
          bookGenre: b.genre ?? b.bookGenre ?? '',
          noOfCopies: b.numberOfCopiesAvailable ?? b.noOfCopies ?? 0,
          publishedYear: b.publishedYear ?? null,
          isbn: b.isbn ?? null
        };
      },
      error: (err) => {
        console.error('GET /admin/books/{id} failed', err);
        this.error = err?.error?.message || 'Không tải được dữ liệu sách.';
        this.loading = false;
      },
      complete: () => (this.loading = false)
    });
  }

  onSubmit(): void {
    if (!this.book?.id) return;

    // Làm sạch & ép kiểu
    const copies = Number(this.book.noOfCopies ?? 0);

    if (!this.book.bookName?.trim() || !this.book.bookAuthor?.trim()) {
      this.error = 'Vui lòng nhập tên sách và tác giả.';
      return;
    }

    // Map form -> backend. Gửi cả 2 bộ key để tương thích tối đa.
    const payload: any = {
      id: this.book.id,

      // bộ “mới” (trùng entity backend Books.java sau khi chuẩn hóa)
      name: this.book.bookName,
      author: this.book.bookAuthor,
      genre: this.book.bookGenre,
      numberOfCopiesAvailable: copies,
      publishedYear: this.book.publishedYear,
      isbn: this.book.isbn,

      // bộ alias “cũ” (nếu backend controller còn dùng các tên này)
      bookId: this.book.id,
      bookName: this.book.bookName,
      bookAuthor: this.book.bookAuthor,
      bookGenre: this.book.bookGenre,
      noOfCopies: copies
    };

    this.loading = true;
    this.booksService.updateBook(this.book.id, payload).subscribe({
      next: () => this.router.navigate(['/books']),
      error: (err) => {
        console.error('PUT /admin/books/{id} failed', err);
        this.error = err?.error?.message || 'Cập nhật thất bại.';
        this.loading = false;
      }
    });
  }
}
