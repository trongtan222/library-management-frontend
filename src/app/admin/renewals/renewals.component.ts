import { Component, OnInit } from '@angular/core';
import { AdminService, RenewalRequestDto } from '../../services/admin.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-admin-renewals',
  templateUrl: './renewals.component.html',
  styleUrls: ['./renewals.component.css'],
  standalone: false,
})
export class RenewalsComponent implements OnInit {
  loading = false;
  items: RenewalRequestDto[] = [];
  filter: 'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL' = 'PENDING';

  // Bulk actions
  selectedIds: Set<number> = new Set();

  constructor(
    private admin: AdminService,
    private toastr: ToastrService,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    const status = this.filter === 'ALL' ? undefined : this.filter;
    this.admin.listRenewals(status as any).subscribe({
      next: (res) => (this.items = res),
      error: () => this.toastr.error('Không tải được danh sách gia hạn'),
      complete: () => (this.loading = false),
    });
  }

  approve(id: number): void {
    this.admin.approveRenewal(id).subscribe({
      next: () => {
        this.toastr.success('Đã phê duyệt gia hạn');
        this.load();
      },
      error: (e) =>
        this.toastr.error(e?.error?.message || 'Phê duyệt thất bại'),
    });
  }

  reject(id: number): void {
    this.admin.rejectRenewal(id).subscribe({
      next: () => {
        this.toastr.info('Đã từ chối gia hạn');
        this.load();
      },
      error: (e) => this.toastr.error(e?.error?.message || 'Từ chối thất bại'),
    });
  }

  // === BULK ACTIONS ===
  toggleSelection(id: number): void {
    if (this.selectedIds.has(id)) {
      this.selectedIds.delete(id);
    } else {
      this.selectedIds.add(id);
    }
  }

  selectAll(): void {
    const pendingItems = this.items.filter((r) => r.status === 'PENDING');
    if (this.selectedIds.size === pendingItems.length) {
      this.selectedIds.clear();
    } else {
      pendingItems.forEach((r) => this.selectedIds.add(r.id));
    }
  }

  getPendingCount(): number {
    return this.items.filter((r) => r.status === 'PENDING').length;
  }

  isAllSelected(): boolean {
    const pendingCount = this.getPendingCount();
    return this.selectedIds.size === pendingCount && pendingCount > 0;
  }

  isSelected(id: number): boolean {
    return this.selectedIds.has(id);
  }

  getSelectedCount(): number {
    return this.selectedIds.size;
  }

  canBulkAction(): boolean {
    return this.selectedIds.size > 0;
  }

  bulkApprove(): void {
    if (!this.canBulkAction()) return;
    const ids = Array.from(this.selectedIds);
    if (!confirm(`Duyệt ${ids.length} yêu cầu đã chọn?`)) return;

    this.admin.bulkApproveRenewals(ids).subscribe({
      next: () => {
        this.toastr.success(`Đã duyệt ${ids.length} yêu cầu gia hạn`);
        this.selectedIds.clear();
        this.load();
      },
      error: () => this.toastr.error('Duyệt hàng loạt thất bại'),
    });
  }

  bulkReject(): void {
    if (!this.canBulkAction()) return;
    const ids = Array.from(this.selectedIds);
    if (!confirm(`TỪ CHỐI ${ids.length} yêu cầu đã chọn?`)) return;

    this.admin.bulkRejectRenewals(ids).subscribe({
      next: () => {
        this.toastr.info(`Đã từ chối ${ids.length} yêu cầu gia hạn`);
        this.selectedIds.clear();
        this.load();
      },
      error: () => this.toastr.error('Từ chối hàng loạt thất bại'),
    });
  }

  // === SMART SUGGESTIONS ===
  shouldApprove(item: RenewalRequestDto): boolean {
    // Auto-suggest approval if:
    // 1. User has good reputation (< 2 late returns)
    // 2. Book has no waitlist (or small waitlist)
    const goodReputation = (item.lateReturnCount ?? 0) < 2;
    const noCompetition = (item.bookWaitlistCount ?? 0) === 0;
    return goodReputation && noCompetition;
  }

  shouldReject(item: RenewalRequestDto): boolean {
    // Auto-suggest rejection if:
    // 1. User has bad reputation (>= 3 late returns)
    // 2. Book is in high demand (waitlist >= 2)
    const badReputation = (item.lateReturnCount ?? 0) >= 3;
    const highDemand = (item.bookWaitlistCount ?? 0) >= 2;
    return badReputation || highDemand;
  }

  getSuggestionBadge(
    item: RenewalRequestDto,
  ): { text: string; class: string } | null {
    if (item.status !== 'PENDING') return null;

    if (this.shouldApprove(item)) {
      return { text: '✅ Nên duyệt', class: 'badge bg-success' };
    }
    if (this.shouldReject(item)) {
      return { text: '❌ Nên từ chối', class: 'badge bg-danger' };
    }
    return null;
  }

  // === USER WARNINGS ===
  getUserWarning(item: RenewalRequestDto): string | null {
    const lateCount = item.lateReturnCount ?? 0;
    if (lateCount >= 3) return '⚠️ Hay trễ hẹn';
    if (lateCount >= 1) return '⚠️ Đã trễ hẹn';
    return null;
  }

  // === BOOK WARNINGS ===
  getBookWarning(item: RenewalRequestDto): string | null {
    const waitlist = item.bookWaitlistCount ?? 0;
    if (waitlist >= 3) return `🔥 ${waitlist} người đang chờ`;
    if (waitlist >= 1) return `👥 ${waitlist} người đang chờ`;
    return null;
  }
}
