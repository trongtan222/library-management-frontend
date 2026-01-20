import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BooksService } from '../services/books.service';
import { ToastrService } from 'ngx-toastr';
import { forkJoin } from 'rxjs';
import Swal from 'sweetalert2';

interface Category {
  id: number;
  name: string;
}

@Component({
  selector: 'app-update-book',
  templateUrl: './update-book.component.html',
  styleUrls: ['./update-book.component.css'],
  standalone: false,
})
export class UpdateBookComponent implements OnInit {
  bookForm: FormGroup;
  bookId: number = 0;
  isLoading = false;
  isSaving = false;
  categories: Category[] = [];

  // Cover preview
  coverPreview: string = '';
  defaultCover = 'assets/books/default-book-cover.jpg';

  currentYear = new Date().getFullYear();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private booksService: BooksService,
    private toastr: ToastrService,
    private fb: FormBuilder,
  ) {
    // Initialize Reactive Form with validators
    this.bookForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(1)]],
      author: ['', [Validators.required, Validators.minLength(2)]],
      isbn: ['', [Validators.pattern(/^[0-9]{10}$|^[0-9]{13}$/)]],
      publishedYear: [
        null,
        [Validators.min(1000), Validators.max(this.currentYear)],
      ],
      pageCount: [null, [Validators.min(1)]],
      description: [''],
      coverUrl: [''],
      categoryIds: [[], Validators.required],
      totalCopies: [0, [Validators.required, Validators.min(0)]],
      genre: [''],
    });
  }

  ngOnInit(): void {
    const idStr =
      this.route.snapshot.paramMap.get('id') ??
      this.route.snapshot.paramMap.get('bookId');
    this.bookId = idStr ? Number(idStr) : NaN;

    if (Number.isNaN(this.bookId)) {
      this.toastr.error('ID sách không hợp lệ');
      this.router.navigate(['/books']);
      return;
    }

    this.loadData();
  }

  loadData(): void {
    this.isLoading = true;

    // Load book data and categories in parallel using forkJoin
    forkJoin({
      book: this.booksService.getBookById(this.bookId),
      categories: this.booksService.getAllCategories(),
    }).subscribe({
      next: ({ book, categories }) => {
        this.categories = categories;

        // Use type assertion to handle various backend property names
        const bookData = book as any;

        // Patch form with book data
        this.bookForm.patchValue({
          name: bookData.name || bookData.bookName || '',
          author: bookData.author || bookData.bookAuthor || '',
          isbn: bookData.isbn || '',
          publishedYear: bookData.publishedYear || null,
          pageCount: bookData.pageCount || null,
          description: bookData.description || '',
          coverUrl: bookData.coverUrl || bookData.coverImageUrl || '',
          categoryIds: bookData.categoryIds || [],
          totalCopies:
            bookData.numberOfCopiesAvailable || bookData.totalCopies || 0,
          genre: bookData.genre || bookData.bookGenre || '',
        });

        // Set cover preview
        this.coverPreview =
          this.bookForm.get('coverUrl')?.value || this.defaultCover;

        // Watch for cover URL changes
        this.bookForm.get('coverUrl')?.valueChanges.subscribe((url) => {
          this.updateCoverPreview(url);
        });

        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load data', err);
        this.toastr.error(err?.error?.message || 'Không tải được dữ liệu sách');
        this.isLoading = false;
        this.router.navigate(['/books']);
      },
    });
  }

  updateCoverPreview(url: string): void {
    if (!url || url.trim() === '') {
      this.coverPreview = this.defaultCover;
      return;
    }

    // Validate URL format
    try {
      new URL(url);
      this.coverPreview = url;
    } catch {
      // Invalid URL, use default
      this.coverPreview = this.defaultCover;
    }
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        this.toastr.error('Chỉ chấp nhận file ảnh (jpg, png, gif)');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        this.toastr.error('Kích thước ảnh không được vượt quá 5MB');
        return;
      }

      // Preview
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.coverPreview = e.target.result;
        // TODO: Upload to server and get URL
        // For now, just set preview
      };
      reader.readAsDataURL(file);
    }
  }

  // Validation helpers
  hasError(controlName: string): boolean {
    const control = this.bookForm.get(controlName);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  getErrorMessage(controlName: string): string {
    const control = this.bookForm.get(controlName);
    if (!control) return '';

    if (control.hasError('required')) {
      return `${this.getFieldLabel(controlName)} không được để trống`;
    }
    if (control.hasError('minlength')) {
      const minLength = control.errors?.['minlength'].requiredLength;
      return `${this.getFieldLabel(controlName)} phải có ít nhất ${minLength} ký tự`;
    }
    if (control.hasError('pattern')) {
      if (controlName === 'isbn') {
        return 'ISBN phải có 10 hoặc 13 chữ số';
      }
    }
    if (control.hasError('min')) {
      const min = control.errors?.['min'].min;
      if (controlName === 'publishedYear') {
        return `Năm xuất bản phải từ ${min} trở lên`;
      }
      return `Giá trị phải lớn hơn hoặc bằng ${min}`;
    }
    if (control.hasError('max')) {
      const max = control.errors?.['max'].max;
      if (controlName === 'publishedYear') {
        return `Năm xuất bản không được lớn hơn ${max}`;
      }
      return `Giá trị không được vượt quá ${max}`;
    }
    return 'Dữ liệu không hợp lệ';
  }

  getFieldLabel(controlName: string): string {
    const labels: { [key: string]: string } = {
      name: 'Tên sách',
      author: 'Tác giả',
      isbn: 'ISBN',
      publishedYear: 'Năm xuất bản',
      pageCount: 'Số trang',
      description: 'Mô tả',
      coverUrl: 'URL ảnh bìa',
      categoryIds: 'Danh mục',
      totalCopies: 'Số lượng',
      genre: 'Thể loại',
    };
    return labels[controlName] || controlName;
  }

  onSubmit(): void {
    // Mark all fields as touched to show validation errors
    Object.keys(this.bookForm.controls).forEach((key) => {
      this.bookForm.get(key)?.markAsTouched();
    });

    if (this.bookForm.invalid) {
      this.toastr.warning('Vui lòng kiểm tra lại thông tin nhập vào');
      return;
    }

    if (this.isSaving) return;

    const formValue = this.bookForm.value;

    // Build payload compatible with backend
    const payload: any = {
      id: this.bookId,
      bookId: this.bookId, // alias
      name: formValue.name,
      bookName: formValue.name, // alias
      author: formValue.author,
      bookAuthor: formValue.author, // alias
      isbn: formValue.isbn || null,
      publishedYear: formValue.publishedYear || null,
      pageCount: formValue.pageCount || null,
      description: formValue.description || '',
      coverUrl: formValue.coverUrl || '',
      coverImageUrl: formValue.coverUrl || '', // alias
      categoryIds: formValue.categoryIds || [],
      numberOfCopiesAvailable: formValue.totalCopies,
      totalCopies: formValue.totalCopies, // alias
      noOfCopies: formValue.totalCopies, // alias
      genre: formValue.genre || '',
      bookGenre: formValue.genre || '', // alias
    };

    this.isSaving = true;

    this.booksService.updateBook(this.bookId, payload).subscribe({
      next: () => {
        this.toastr.success('Cập nhật sách thành công!');
        this.router.navigate(['/books']);
      },
      error: (err) => {
        console.error('Update book failed', err);
        this.toastr.error(err?.error?.message || 'Cập nhật sách thất bại');
        this.isSaving = false;
      },
    });
  }

  cancel(): void {
    if (this.bookForm.dirty) {
      Swal.fire({
        title: 'Hủy thay đổi?',
        text: 'Các thay đổi chưa lưu sẽ bị mất',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Có, hủy bỏ',
        cancelButtonText: 'Tiếp tục chỉnh sửa',
      }).then((result) => {
        if (result.isConfirmed) {
          this.router.navigate(['/books']);
        }
      });
    } else {
      this.router.navigate(['/books']);
    }
  }

  getCategoryName(categoryId: number): string {
    const category = this.categories.find((c) => c.id === categoryId);
    return category ? category.name : `Category #${categoryId}`;
  }
}
