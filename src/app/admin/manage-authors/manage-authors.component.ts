import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { BooksService } from '../../services/books.service';
import { Author } from '../../models/book';

@Component({
  selector: 'app-manage-authors',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './manage-authors.component.html',
  styleUrls: ['./manage-authors.component.css'],
})
export class ManageAuthorsComponent implements OnInit {
  authors: Author[] = [];
  isLoading = false;
  search = '';
  newName = '';
  editing: Author | null = null;

  // Merge functionality
  selectedForMerge: Set<number> = new Set();
  isMerging = false;

  // Portrait upload
  uploadingPortrait: number | null = null;

  constructor(
    private booksService: BooksService,
    private toastr: ToastrService,
    private router: Router,
  ) {}

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
      complete: () => (this.isLoading = false),
    });
  }

  filtered(): Author[] {
    const q = this.search.trim().toLowerCase();
    if (!q) return this.authors;
    return this.authors.filter((a) => a.name.toLowerCase().includes(q));
  }

  startEdit(a: Author) {
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
      error: () => this.toastr.error('Cập nhật thất bại'),
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
      error: () => this.toastr.error('Tạo tác giả thất bại'),
    });
  }

  remove(id: number) {
    if (!confirm('Xóa tác giả này? Hành động không thể hoàn tác.')) return;
    this.booksService.deleteAuthor(id).subscribe({
      next: () => {
        this.toastr.success('Đã xóa tác giả');
        this.load();
      },
      error: () => this.toastr.error('Xóa tác giả thất bại'),
    });
  }

  // Merge Authors
  toggleSelectForMerge(id: number) {
    if (this.selectedForMerge.has(id)) {
      this.selectedForMerge.delete(id);
    } else {
      this.selectedForMerge.add(id);
    }
    // Giới hạn chỉ chọn 2 tác giả
    if (this.selectedForMerge.size > 2) {
      const firstId = Array.from(this.selectedForMerge)[0];
      this.selectedForMerge.delete(firstId);
    }
  }

  isSelectedForMerge(id: number): boolean {
    return this.selectedForMerge.has(id);
  }

  canMerge(): boolean {
    return this.selectedForMerge.size === 2;
  }

  mergeSelected() {
    if (!this.canMerge()) {
      this.toastr.warning('Vui lòng chọn đúng 2 tác giả để gộp');
      return;
    }

    const ids = Array.from(this.selectedForMerge);
    const authors = ids
      .map((id) => this.authors.find((a) => a.id === id))
      .filter((a) => a) as Author[];

    const message = `Gộp "${authors[1].name}" vào "${authors[0].name}"?\n\nTất cả sách của "${authors[1].name}" sẽ chuyển sang "${authors[0].name}", sau đó xóa "${authors[1].name}".`;

    if (!confirm(message)) return;

    this.isMerging = true;
    this.booksService.mergeAuthors(ids[0], ids[1]).subscribe({
      next: () => {
        this.toastr.success('Đã gộp tác giả thành công!');
        this.selectedForMerge.clear();
        this.load();
        this.isMerging = false;
      },
      error: (err) => {
        this.toastr.error(
          'Gộp tác giả thất bại: ' +
            (err.error?.message || 'Lỗi không xác định'),
        );
        this.isMerging = false;
      },
    });
  }

  cancelMerge() {
    this.selectedForMerge.clear();
  }

  // Portrait Upload
  onPortraitSelected(event: any, authorId: number) {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.toastr.error('Vui lòng chọn file ảnh');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      // 2MB
      this.toastr.error('Ảnh không được vượt quá 2MB');
      return;
    }

    this.uploadingPortrait = authorId;
    this.booksService.uploadAuthorPortrait(authorId, file).subscribe({
      next: (updatedAuthor) => {
        this.toastr.success('Đã tải ảnh chân dung');
        // Cập nhật portraitUrl trong danh sách
        const index = this.authors.findIndex((a) => a.id === authorId);
        if (index !== -1) {
          this.authors[index] = updatedAuthor;
        }
        this.uploadingPortrait = null;
      },
      error: () => {
        this.toastr.error('Tải ảnh thất bại');
        this.uploadingPortrait = null;
      },
    });
  }

  // External Links
  saveExternalLinks(author: Author) {
    if (!this.editing || this.editing.id !== author.id) return;

    this.booksService
      .updateAuthorProfile(author.id, {
        wikipediaUrl: this.editing.wikipediaUrl,
        websiteUrl: this.editing.websiteUrl,
      })
      .subscribe({
        next: () => {
          this.toastr.success('Đã cập nhật liên kết');
          this.load();
        },
        error: () => this.toastr.error('Cập nhật thất bại'),
      });
  }

  // Navigate to Books by Author
  navigateToBooks(authorId: number) {
    this.router.navigate(['/books'], { queryParams: { authorId } });
  }
}
