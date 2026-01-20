import { Component, OnInit } from '@angular/core';
import { AdminService, FineDetails } from 'src/app/services/admin.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-manage-fines',
  templateUrl: './manage-fines.component.html',
  styleUrls: ['./manage-fines.component.css'],
  standalone: false,
})
export class ManageFinesComponent implements OnInit {
  // Tab management
  activeTab: 'unpaid' | 'paid' = 'unpaid';

  // Data
  unpaidFines: FineDetails[] = [];
  paidFines: FineDetails[] = [];
  isLoading = true;

  // Payment modal
  isPaymentModalOpen = false;
  selectedFine: FineDetails | null = null;
  selectedPaymentMethod: string = 'CASH';
  paymentNote: string = '';
  isWaiving = false; // For waive option

  // Bulk payment
  selectedFineIds: Set<number> = new Set();
  isBulkPaymentModalOpen = false;
  bulkPaymentMethod: string = 'CASH';
  bulkPaymentNote: string = '';

  // Filters for history
  filterStartDate: string = '';
  filterEndDate: string = '';
  filterUser: string = '';
  filterMethod: string = '';

  // Daily summary
  dailySummary: any = null;
  selectedDate: string = new Date().toISOString().split('T')[0];

  constructor(
    private adminService: AdminService,
    private toastr: ToastrService,
  ) {}

  ngOnInit(): void {
    this.loadUnpaidFines();
    this.loadDailySummary();
  }

  loadUnpaidFines(): void {
    this.isLoading = true;
    this.adminService.getUnpaidFines().subscribe({
      next: (data) => {
        this.unpaidFines = data;
        this.isLoading = false;
      },
      error: () => {
        this.toastr.error('Không tải được danh sách phí phạt');
        this.isLoading = false;
      },
    });
  }

  loadPaidFines(): void {
    this.isLoading = true;
    this.adminService
      .getPaidFines(this.filterStartDate, this.filterEndDate)
      .subscribe({
        next: (data) => {
          this.paidFines = data;
          this.isLoading = false;
        },
        error: () => {
          this.toastr.error('Không tải được lịch sử giao dịch');
          this.isLoading = false;
        },
      });
  }

  loadDailySummary(): void {
    this.adminService.getDailySummary(this.selectedDate).subscribe({
      next: (data) => {
        this.dailySummary = data;
      },
      error: () => {
        console.error('Không tải được tổng kết');
      },
    });
  }

  switchTab(tab: 'unpaid' | 'paid'): void {
    this.activeTab = tab;
    if (tab === 'unpaid') {
      this.loadUnpaidFines();
    } else {
      this.loadPaidFines();
    }
  }

  openPaymentModal(fine: FineDetails): void {
    this.selectedFine = fine;
    this.selectedPaymentMethod = 'CASH';
    this.paymentNote = '';
    this.isPaymentModalOpen = true;
  }

  closePaymentModal(): void {
    this.isPaymentModalOpen = false;
    this.selectedFine = null;
    this.paymentNote = '';
  }

  confirmPayment(): void {
    if (!this.selectedFine) {
      return;
    }

    if (this.isWaiving) {
      // Waive fine (forgive debt)
      if (!this.paymentNote.trim()) {
        this.toastr.warning('Vui lòng nhập lý do miễn giảm');
        return;
      }
      this.adminService
        .waiveFine(this.selectedFine.loanId, this.paymentNote)
        .subscribe({
          next: () => {
            this.toastr.success('Đã miễn giảm phí phạt.');
            this.closePaymentModal();
            this.loadUnpaidFines();
            this.loadDailySummary();
          },
          error: () => this.toastr.error('Miễn giảm thất bại'),
        });
    } else {
      // Normal payment - Send payment info to backend
      this.adminService
        .markFineAsPaid(
          this.selectedFine.loanId,
          this.selectedPaymentMethod,
          this.paymentNote,
        )
        .subscribe({
          next: () => {
            this.toastr.success('Đã xác nhận thu tiền phạt.');
            this.closePaymentModal();
            this.loadUnpaidFines();
            this.loadDailySummary();
          },
          error: () => this.toastr.error('Thu tiền thất bại'),
        });
    }
  }

  // Bulk Payment
  toggleSelection(loanId: number): void {
    if (this.selectedFineIds.has(loanId)) {
      this.selectedFineIds.delete(loanId);
    } else {
      this.selectedFineIds.add(loanId);
    }
  }

  toggleAllSelection(): void {
    if (this.selectedFineIds.size === this.unpaidFines.length) {
      // Unselect all
      this.selectedFineIds.clear();
    } else {
      // Select all
      this.unpaidFines.forEach((f) => this.selectedFineIds.add(f.loanId));
    }
  }

  isSelected(loanId: number): boolean {
    return this.selectedFineIds.has(loanId);
  }

  canBulkPay(): boolean {
    return this.selectedFineIds.size > 0;
  }

  getTotalSelected(): number {
    let total = 0;
    this.unpaidFines.forEach((fine) => {
      if (this.selectedFineIds.has(fine.loanId)) {
        total += fine.fineAmount;
      }
    });
    return total;
  }

  openBulkPaymentModal(): void {
    if (!this.canBulkPay()) {
      this.toastr.warning('Vui lòng chọn ít nhất 1 khoản phí');
      return;
    }
    this.isBulkPaymentModalOpen = true;
    this.bulkPaymentMethod = 'CASH';
    this.bulkPaymentNote = '';
  }

  closeBulkPaymentModal(): void {
    this.isBulkPaymentModalOpen = false;
    this.bulkPaymentNote = '';
  }

  confirmBulkPayment(): void {
    if (!this.canBulkPay()) return;

    const loanIds = Array.from(this.selectedFineIds);
    this.adminService
      .bulkPayFines(loanIds, this.bulkPaymentMethod, this.bulkPaymentNote)
      .subscribe({
        next: () => {
          this.toastr.success(`Đã thu ${loanIds.length} khoản phí phạt`);
          this.selectedFineIds.clear();
          this.closeBulkPaymentModal();
          this.loadUnpaidFines();
          this.loadDailySummary();
        },
        error: () => this.toastr.error('Thanh toán gộp thất bại'),
      });
  }

  // Filters
  applyFilters(): void {
    this.loadPaidFines();
  }

  clearFilters(): void {
    this.filterStartDate = '';
    this.filterEndDate = '';
    this.filterUser = '';
    this.filterMethod = '';
    this.loadPaidFines();
  }

  getFilteredPaidFines(): FineDetails[] {
    let filtered = this.paidFines;

    if (this.filterUser) {
      const query = this.filterUser.toLowerCase();
      filtered = filtered.filter((f) =>
        f.userName.toLowerCase().includes(query),
      );
    }

    if (this.filterMethod) {
      filtered = filtered.filter((f) => f.paymentMethod === this.filterMethod);
    }

    return filtered;
  }

  // Print Receipt
  printReceipt(fine: FineDetails): void {
    const printWindow = window.open('', '', 'height=600,width=800');
    if (!printWindow) {
      this.toastr.error('Không thể mở cửa sổ in. Vui lòng cho phép popup.');
      return;
    }

    const receiptHtml = `
      <html>
        <head>
          <title>Biên lai thu phí phạt #${fine.loanId}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .header h1 { margin: 0; color: #333; }
            .header p { margin: 5px 0; color: #666; }
            .content { margin: 20px 0; }
            .row { display: flex; margin-bottom: 10px; }
            .label { font-weight: bold; width: 150px; }
            .value { flex: 1; }
            .total { font-size: 20px; font-weight: bold; color: #198754; margin-top: 20px; text-align: right; }
            .footer { margin-top: 50px; text-align: center; color: #666; font-size: 12px; border-top: 1px solid #ddd; padding-top: 10px; }
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>BIÊN LAI THU PHÍ PHẠT</h1>
            <p>Thư viện Số - Library Management System</p>
            <p>Mã giao dịch: #${fine.loanId}-${Date.now()}</p>
          </div>
          <div class="content">
            <div class="row">
              <div class="label">Người nộp:</div>
              <div class="value">${fine.userName}</div>
            </div>
            <div class="row">
              <div class="label">Tên sách:</div>
              <div class="value">${fine.bookName}</div>
            </div>
            <div class="row">
              <div class="label">Số ngày quá hạn:</div>
              <div class="value">${fine.overdueDays} ngày</div>
            </div>
            <div class="row">
              <div class="label">Ngày thu:</div>
              <div class="value">${new Date().toLocaleDateString('vi-VN')}</div>
            </div>
            <div class="row">
              <div class="label">Phương thức:</div>
              <div class="value">${this.getPaymentMethodLabel(fine.paymentMethod || this.selectedPaymentMethod)}</div>
            </div>
            ${
              fine.paymentNote || this.paymentNote
                ? `
            <div class="row">
              <div class="label">Ghi chú:</div>
              <div class="value">${fine.paymentNote || this.paymentNote}</div>
            </div>
            `
                : ''
            }
            <div class="total">
              Tổng tiền: ${fine.fineAmount.toLocaleString('vi-VN')} VNĐ
            </div>
          </div>
          <div class="footer">
            <p>Cảm ơn bạn đã nộp phí phạt đúng hạn.</p>
            <p>In lúc: ${new Date().toLocaleString('vi-VN')}</p>
          </div>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(receiptHtml);
    printWindow.document.close();
  }

  getPaymentMethodLabel(method: string): string {
    const labels: any = {
      CASH: 'Tiền mặt',
      TRANSFER: 'Chuyển khoản',
      WAIVED: 'Miễn giảm',
      OTHER: 'Khác',
    };
    return labels[method] || method;
  }
}
