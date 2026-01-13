import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { BooksService } from '../../services/books.service';

@Component({
  selector: 'app-manage-authors',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './manage-authors.component.html',
  styleUrls: ['./manage-authors.component.css']
})
export class ManageAuthorsComponent implements OnInit {
  authors: Array<{ id: number; name: string }> = [];
  isLoading = false;
  search = '';
  newName = '';
  editing: { id: number; name: string } | null = null;

  constructor(private booksService: BooksService, private toastr: ToastrService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.isLoading = true;
    this.booksService.getAllAuthors().subscribe({
      next: (data) => {
        this.authors = data || [];
      },
      error: () => this.toastr.error('Không tải được tác giả'),
      complete: () => (this.isLoading = false)
    });
  }

  filtered(): Array<{ id: number; name: string }> {
    const q = this.search.trim().toLowerCase();
    if (!q) return this.authors;
    return this.authors.filter(a => a.name.toLowerCase().includes(q));
  }

  startEdit(a: { id: number; name: string }) {
    this.editing = { ...a };
  }

  cancelEdit() {
    this.editing = null;
  }

  saveEdit() {
    if (!this.editing) return;
    const name = this.editing.name.trim();
    if (!name) {
      this.toastr.warning('Tên tác giả không được để trống');
      return;
    }
    this.booksService.updateAuthor(this.editing.id, name).subscribe({
      next: () => {
        this.toastr.success('Đã cập nhật tác giả');
        this.load();
        this.editing = null;
      },
      error: () => this.toastr.error('Cập nhật thất bại')
    });
  }

  create() {
    const name = this.newName.trim();
    if (!name) {
      this.toastr.warning('Tên tác giả không được để trống');
      return;
    }
    this.booksService.createAuthor(name).subscribe({
      next: () => {
        this.toastr.success('Đã tạo tác giả');
        this.newName = '';
        this.load();
      },
      error: () => this.toastr.error('Tạo tác giả thất bại')
    });
  }

  remove(id: number) {
    if (!confirm('Xóa tác giả này? Hành động không thể hoàn tác.')) return;
    this.booksService.deleteAuthor(id).subscribe({
      next: () => {
        this.toastr.success('Đã xóa tác giả');
        this.load();
      },
      error: () => this.toastr.error('Xóa tác giả thất bại')
    });
  }
}
