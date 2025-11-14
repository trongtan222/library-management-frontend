import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { NgForm } from '@angular/forms';
import { BooksService, Author, Category } from '../services/books.service'; // Import thêm
import { Books } from '../models/books';
import { forkJoin } from 'rxjs'; // Import forkJoin

// Sửa lại interface cho model
interface BookCreateModel {
  name?: string;
  numberOfCopiesAvailable?: number;
  publishedYear?: number;
  isbn?: string;
  authorIds?: number[]; // Sửa
  categoryIds?: number[]; // Sửa
}

@Component({
    selector: 'app-create-book',
    templateUrl: './create-book.component.html',
    styleUrls: ['./create-book.component.css'],
    standalone: false
})
export class CreateBookComponent implements OnInit {

  book: BookCreateModel = { // Sửa
    authorIds: [],
    categoryIds: []
  }; 
  errorMessage = '';
  submitting = false;

  // Thêm 2 mảng để lưu danh sách
  allAuthors: Author[] = [];
  allCategories: Category[] = [];

  constructor(
    private booksService: BooksService,
    private router: Router
  ) { }

  ngOnInit(): void {
    // Tải danh sách authors và categories khi component khởi tạo
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

    // Payload bây giờ khớp với BookCreateDto
    const payload = {
      name: this.book.name,
      authorIds: this.book.authorIds,
      categoryIds: this.book.categoryIds,
      numberOfCopiesAvailable: this.book.numberOfCopiesAvailable,
      publishedYear: this.book.publishedYear,
      isbn: this.book.isbn
    };

    this.booksService.createBook(payload as any).subscribe({ // Dùng "as any" để tạm bỏ qua lỗi type
      next: () => {
        this.router.navigate(['/books']);
      },
      error: (err) => {
        console.error(err);
        this.errorMessage = err.error?.message || "An error occurred while creating the book.";
        this.submitting = false; 
      }
    });
  }
}