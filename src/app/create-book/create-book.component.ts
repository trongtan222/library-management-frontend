import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { NgForm } from '@angular/forms';
import { BooksService } from '../services/books.service'; 
// SỬA: Import Book, Author, Category từ model
import { Book, Author, Category } from '../models/book'; 
import { forkJoin } from 'rxjs';
import { ToastrService } from 'ngx-toastr';

interface BookCreateModel {
  name?: string;
  numberOfCopiesAvailable?: number;
  publishedYear?: number;
  isbn?: string;
  coverUrl?: string;
  authorIds?: number[];
  categoryIds?: number[];
}

@Component({
    selector: 'app-create-book',
    templateUrl: './create-book.component.html',
    styleUrls: ['./create-book.component.css'],
    standalone: false
})
export class CreateBookComponent implements OnInit {
  // ... (Phần logic còn lại giữ nguyên)
  book: BookCreateModel = {
    authorIds: [],
    categoryIds: []
  }; 
  errorMessage = '';
  submitting = false;
  showAddCategoryModal = false;
  newCategoryName = '';
  savingCategory = false;
  showAddAuthorModal = false;
  newAuthorName = '';
  savingAuthor = false;

  allAuthors: Author[] = [];
  allCategories: Category[] = [];

  constructor(
    private booksService: BooksService,
    private router: Router,
    private toastr: ToastrService
  ) { }

  ngOnInit(): void {
    forkJoin({
      authors: this.booksService.getAllAuthors(),
      categories: this.booksService.getAllCategories()
    }).subscribe({
      next: ({ authors, categories }) => {
        this.allAuthors = authors;
        this.allCategories = categories;
      },
      error: (err) => {
        this.errorMessage = "Không thể tải danh sách tác giả/thể loại.";
        console.error(err);
      }
    });
  }

  saveBook(bookForm: NgForm) {
    if (bookForm.invalid) {
      this.errorMessage = "Please fill in all required fields.";
      return;
    }
    
    this.errorMessage = '';
    this.submitting = true; 

    const payload = {
      name: this.book.name,
      authorIds: this.book.authorIds,
      categoryIds: this.book.categoryIds,
      numberOfCopiesAvailable: this.book.numberOfCopiesAvailable,
      publishedYear: this.book.publishedYear,
      isbn: this.book.isbn,
      coverUrl: this.book.coverUrl
    };

    // Cast payload cho đúng kiểu tham số của createBook
    this.booksService.createBook(payload as any).subscribe({
      next: () => {
        this.toastr.success('Tạo sách thành công!');
        this.router.navigate(['/books']);
      },
      error: (err) => {
        console.error(err);
        this.errorMessage = err.error?.message || "An error occurred while creating the book.";
        this.toastr.error(this.errorMessage);
        this.submitting = false; 
      }
    });
  }

  openAddCategory(): void {
    this.newCategoryName = '';
    this.showAddCategoryModal = true;
  }

  closeAddCategory(): void {
    if (this.savingCategory) return;
    this.showAddCategoryModal = false;
  }

  saveNewCategory(): void {
    const name = (this.newCategoryName || '').trim();
    if (!name) {
      this.errorMessage = 'Vui lòng nhập tên thể loại.';
      return;
    }
    this.errorMessage = '';
    this.savingCategory = true;
    this.booksService.createCategory(name).subscribe({
      next: (created) => {
        this.allCategories.push(created);
        if (created?.id != null) {
          // Auto-select newly created category
          this.book.categoryIds = [...(this.book.categoryIds || []), created.id];
        }
        this.toastr.success('Tạo thể loại thành công!');
        this.savingCategory = false;
        this.showAddCategoryModal = false;
      },
      error: (err) => {
        const msg = err?.error?.message || 'Không thể tạo thể loại.';
        this.errorMessage = msg;
        this.toastr.error(msg);
        this.savingCategory = false;
      }
    });
  }

  openAddAuthor(): void {
    this.newAuthorName = '';
    this.showAddAuthorModal = true;
  }

  closeAddAuthor(): void {
    if (this.savingAuthor) return;
    this.showAddAuthorModal = false;
  }

  saveNewAuthor(): void {
    const name = (this.newAuthorName || '').trim();
    if (!name) {
      this.errorMessage = 'Vui lòng nhập tên tác giả.';
      return;
    }
    this.errorMessage = '';
    this.savingAuthor = true;
    this.booksService.createAuthor(name).subscribe({
      next: (created) => {
        this.allAuthors.push(created);
        if (created?.id != null) {
          // Auto-select newly created author
          this.book.authorIds = [...(this.book.authorIds || []), created.id];
        }
        this.toastr.success('Tạo tác giả thành công!');
        this.savingAuthor = false;
        this.showAddAuthorModal = false;
      },
      error: (err) => {
        const msg = err?.error?.message || 'Không thể tạo tác giả.';
        this.errorMessage = msg;
        this.toastr.error(msg);
        this.savingAuthor = false;
      }
    });
  }
}