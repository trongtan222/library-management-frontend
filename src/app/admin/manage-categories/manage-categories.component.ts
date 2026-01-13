import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { BooksService } from '../../services/books.service';

@Component({
  selector: 'app-manage-categories',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './manage-categories.component.html',
  styleUrls: ['./manage-categories.component.css']
})
export class ManageCategoriesComponent implements OnInit {
  categories: Array<{ id: number; name: string }> = [];
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
    this.booksService.getAllCategories().subscribe({
      next: (data) => {
        this.categories = data || [];
      },
      error: () => this.toastr.error('Không tải được danh mục'),
      complete: () => (this.isLoading = false)
    });
  }

  filtered(): Array<{ id: number; name: string }> {
    const q = this.search.trim().toLowerCase();
    if (!q) return this.categories;
    return this.categories.filter(c => c.name.toLowerCase().includes(q));
  }

  startEdit(c: { id: number; name: string }) {
    this.editing = { ...c };
  }

  cancelEdit() {
    this.editing = null;
  }

  saveEdit() {
    if (!this.editing) return;
    const name = this.editing.name.trim();
    if (!name) {
      this.toastr.warning('Tên danh mục không được để trống');
      return;
    }
    this.booksService.updateCategory(this.editing.id, name).subscribe({
      next: () => {
        this.toastr.success('Đã cập nhật danh mục');
        this.load();
        this.editing = null;
      },
      error: () => this.toastr.error('Cập nhật thất bại')
    });
  }

  create() {
    const name = this.newName.trim();
    if (!name) {
      this.toastr.warning('Tên danh mục không được để trống');
      return;
    }
    this.booksService.createCategory(name).subscribe({
      next: () => {
        this.toastr.success('Đã tạo danh mục');
        this.newName = '';
        this.load();
      },
      error: () => this.toastr.error('Tạo danh mục thất bại')
    });
  }

  remove(id: number) {
    if (!confirm('Xóa danh mục này? Hành động không thể hoàn tác.')) return;
    this.booksService.deleteCategory(id).subscribe({
      next: () => {
        this.toastr.success('Đã xóa danh mục');
        this.load();
      },
      error: () => this.toastr.error('Xóa danh mục thất bại')
    });
  }
}
