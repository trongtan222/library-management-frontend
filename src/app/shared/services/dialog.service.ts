import {
  Injectable,
  ApplicationRef,
  ComponentRef,
  createComponent,
  EnvironmentInjector,
} from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { ConfirmDialogComponent } from '../components/confirm-dialog/confirm-dialog.component';

/**
 * Configuration for dialog
 */
export interface DialogConfig {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmClass?: string;
  icon?: string;
}

/**
 * Service to open confirmation dialogs programmatically.
 * Cleaner alternative to managing modals in every component.
 *
 * Usage:
 * ```typescript
 * constructor(private dialogService: DialogService) {}
 *
 * deleteBook(): void {
 *   this.dialogService.confirm({
 *     title: 'Xác nhận xóa',
 *     message: 'Bạn có chắc muốn xóa sách này? Hành động này không thể hoàn tác.',
 *     confirmText: 'Xóa',
 *     confirmClass: 'btn-danger',
 *     icon: 'bi-trash'
 *   }).subscribe(confirmed => {
 *     if (confirmed) {
 *       this.booksService.delete(id).subscribe();
 *     }
 *   });
 * }
 * ```
 */
@Injectable({
  providedIn: 'root',
})
export class DialogService {
  private componentRef?: ComponentRef<ConfirmDialogComponent>;

  constructor(
    private appRef: ApplicationRef,
    private injector: EnvironmentInjector,
  ) {}

  /**
   * Open confirmation dialog and return observable of user's choice
   */
  confirm(config: DialogConfig): Observable<boolean> {
    const subject = new Subject<boolean>();

    // Create component dynamically
    this.componentRef = createComponent(ConfirmDialogComponent, {
      environmentInjector: this.injector,
    });

    // Set inputs
    const instance = this.componentRef.instance;
    instance.show = true;
    instance.title = config.title || 'Xác nhận';
    instance.message = config.message;
    instance.confirmText = config.confirmText || 'Xác nhận';
    instance.cancelText = config.cancelText || 'Hủy';
    instance.confirmClass = config.confirmClass || 'btn-primary';
    instance.icon = config.icon || 'bi-question-circle';

    // Subscribe to outputs
    const confirmedSub = instance.confirmed.subscribe(() => {
      subject.next(true);
      subject.complete();
      this.closeDialog();
    });

    const cancelledSub = instance.cancelled.subscribe(() => {
      subject.next(false);
      subject.complete();
      this.closeDialog();
    });

    // Attach to DOM
    this.appRef.attachView(this.componentRef.hostView);
    const domElem = (this.componentRef.hostView as any)
      .rootNodes[0] as HTMLElement;
    document.body.appendChild(domElem);

    // Cleanup on completion
    subject.subscribe({
      complete: () => {
        confirmedSub.unsubscribe();
        cancelledSub.unsubscribe();
      },
    });

    return subject.asObservable();
  }

  /**
   * Close and cleanup dialog
   */
  private closeDialog(): void {
    if (this.componentRef) {
      this.appRef.detachView(this.componentRef.hostView);
      this.componentRef.destroy();
      this.componentRef = undefined;
    }
  }
}
