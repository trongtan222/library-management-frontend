import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { BooksService } from '../../services/books.service';
import { Category } from '../../models/book';

@Component({
  selector: 'app-manage-categories',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './manage-categories.component.html',
  styleUrls: ['./manage-categories.component.css'],
})
export class ManageCategoriesComponent implements OnInit {
  categories: Category[] = [];
  isLoading = false;
  search = '';
  newName = '';
  newParentId: number | null = null;
  newColor = '#0d6efd'; // Default Bootstrap primary blue
  newIconClass = 'fa-solid fa-book';
  editing: Category | null = null;

  // Safe delete with migration
  isDeleting = false;
  categoryToDelete: Category | null = null;
  migrateTargetId: number | null = null;

  constructor(
    private booksService: BooksService,
    private toastr: ToastrService,
  ) {}

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
      complete: () => (this.isLoading = false),
    });
  }

  filtered(): Category[] {
    const q = this.search.trim().toLowerCase();
    if (!q) return this.categories;
    return this.categories.filter((c) => c.name.toLowerCase().includes(q));
  }

  startEdit(c: Category) {
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
    this.booksService
      .updateCategoryFull(this.editing.id, {
        name: this.editing.name,
        parentId: this.editing.parentId,
        color: this.editing.color,
        iconClass: this.editing.iconClass,
      })
      .subscribe({
        next: () => {
          this.toastr.success('Đã cập nhật danh mục');
          this.load();
          this.editing = null;
        },
        error: () => this.toastr.error('Cập nhật thất bại'),
      });
  }

  create() {
    const name = this.newName.trim();
    if (!name) {
      this.toastr.warning('Tên danh mục không được để trống');
      return;
    }
    // Create base category first, then update full profile
    this.booksService.createCategory(name).subscribe({
      next: (created) => {
        // Update with parentId, color, iconClass
        this.booksService
          .updateCategoryFull(created.id, {
            parentId: this.newParentId ?? undefined,
            color: this.newColor,
            iconClass: this.newIconClass,
          })
          .subscribe({
            next: () => {
              this.toastr.success('Đã tạo danh mục');
              this.newName = '';
              this.newParentId = null;
              this.newColor = '#0d6efd';
              this.newIconClass = 'fa-solid fa-book';
              this.load();
            },
            error: () => {
              this.toastr.warning(
                'Tạo danh mục thành công nhưng cập nhật thông tin thất bại',
              );
              this.load();
            },
          });
      },
      error: () => this.toastr.error('Tạo danh mục thất bại'),
    });
  }

  // Safe delete: Check bookCount first
  promptDelete(category: Category) {
    this.booksService.getCategoryBookCount(category.id).subscribe({
      next: (count) => {
        if (count === 0) {
          // Safe to delete
          if (
            !confirm(
              `Xóa danh mục "${category.name}"? Hành động không thể hoàn tác.`,
            )
          )
            return;
          this.booksService.deleteCategory(category.id).subscribe({
            next: () => {
              this.toastr.success('Đã xóa danh mục');
              this.load();
            },
            error: () => this.toastr.error('Xóa danh mục thất bại'),
          });
        } else {
          // Has books - require migration
          this.categoryToDelete = category;
          this.categoryToDelete.bookCount = count;
          this.isDeleting = true;
          this.toastr.warning(
            `Danh mục "${category.name}" có ${count} cuốn sách. Bạn phải chuyển sách sang danh mục khác trước khi xóa.`,
            'Không thể xóa',
            { timeOut: 5000 },
          );
        }
      },
      error: () => this.toastr.error('Không kiểm tra được số lượng sách'),
    });
  }

  // Confirm migration and delete
  confirmMigrationDelete() {
    if (!this.categoryToDelete || !this.migrateTargetId) {
      this.toastr.warning('Vui lòng chọn danh mục đích');
      return;
    }

    const fromName = this.categoryToDelete.name;
    const toCategory = this.categories.find(
      (c) => c.id === this.migrateTargetId,
    );
    if (!toCategory) return;

    const message = `Chuyển ${this.categoryToDelete.bookCount} cuốn sách từ "${fromName}" sang "${toCategory.name}", sau đó xóa "${fromName}"?`;
    if (!confirm(message)) return;

    // Migrate books then delete
    this.booksService
      .migrateBooksToCategory(this.categoryToDelete.id, this.migrateTargetId)
      .subscribe({
        next: () => {
          // Now delete the old category
          this.booksService
            .deleteCategory(this.categoryToDelete!.id)
            .subscribe({
              next: () => {
                this.toastr.success(`Đã chuyển sách và xóa "${fromName}"`);
                this.cancelDelete();
                this.load();
              },
              error: () => this.toastr.error('Xóa danh mục thất bại'),
            });
        },
        error: () => this.toastr.error('Chuyển sách thất bại'),
      });
  }

  cancelDelete() {
    this.isDeleting = false;
    this.categoryToDelete = null;
    this.migrateTargetId = null;
  }

  // Tree helpers
  buildTreeData(): Category[] {
    // Simple tree: Parents first, then children
    const parents = this.categories.filter((c) => !c.parentId);
    const children = this.categories.filter((c) => c.parentId);
    const result: Category[] = [];

    parents.forEach((parent) => {
      result.push(parent);
      const kids = children.filter((c) => c.parentId === parent.id);
      result.push(...kids);
    });

    return result;
  }

  getIndentClass(category: Category): string {
    return category.parentId ? 'tree-child' : '';
  }

  // Get parent categories for dropdown (exclude self when editing)
  getParentCategories(): Category[] {
    const parents = this.categories.filter((c) => !c.parentId);
    if (this.editing) {
      return parents.filter((p) => p.id !== this.editing!.id);
    }
    return parents;
  }

  // Helper to get parent name (avoid arrow function in template)
  getParentName(parentId: number | undefined): string {
    if (!parentId) return '-';
    const parent = this.categories.find((p) => p.id === parentId);
    return parent ? parent.name : '-';
  }
}
