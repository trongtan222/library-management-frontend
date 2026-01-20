import { Component, EventEmitter, Input, Output } from '@angular/core';

/**
 * Reusable confirmation dialog component.
 * Can be used directly in templates or via DialogService.
 *
 * Template usage:
 * ```html
 * <app-confirm-dialog
 *   [show]="showDialog"
 *   [title]="'Xác nhận xóa'"
 *   [message]="'Bạn có chắc muốn xóa sách này?'"
 *   [confirmText]="'Xóa'"
 *   [cancelText]="'Hủy'"
 *   [confirmClass]="'btn-danger'"
 *   (confirmed)="handleDelete()"
 *   (cancelled)="closeDialog()">
 * </app-confirm-dialog>
 * ```
 *
 * Service usage (recommended):
 * ```typescript
 * this.dialogService.confirm({
 *   title: 'Xác nhận xóa',
 *   message: 'Bạn có chắc muốn xóa?'
 * }).subscribe(confirmed => {
 *   if (confirmed) this.delete();
 * });
 * ```
 */
@Component({
  selector: 'app-confirm-dialog',
  templateUrl: './confirm-dialog.component.html',
  styleUrls: ['./confirm-dialog.component.css'],
  standalone: false,
})
export class ConfirmDialogComponent {
  @Input() show: boolean = false;
  @Input() title: string = 'Xác nhận';
  @Input() message: string = 'Bạn có chắc chắn muốn thực hiện hành động này?';
  @Input() confirmText: string = 'Xác nhận';
  @Input() cancelText: string = 'Hủy';
  @Input() confirmClass: string = 'btn-primary'; // btn-danger, btn-warning, etc.
  @Input() icon: string = 'bi-question-circle'; // Bootstrap icon class
  @Input() loading: boolean = false;

  @Output() confirmed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  onConfirm(): void {
    if (!this.loading) {
      this.confirmed.emit();
    }
  }

  onCancel(): void {
    if (!this.loading) {
      this.cancelled.emit();
    }
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget && !this.loading) {
      this.onCancel();
    }
  }
}
