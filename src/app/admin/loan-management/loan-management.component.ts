import { Component, OnInit } from '@angular/core';
import { AdminService, LoanDetails } from 'src/app/services/admin.service';
import { CirculationService } from 'src/app/services/circulation.service';
import * as XLSX from 'xlsx';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-loan-management',
  templateUrl: './loan-management.component.html',
  styleUrls: ['./loan-management.component.css'],
  standalone: false,
})
export class LoanManagementComponent implements OnInit {
  allLoans: LoanDetails[] = [];
  filteredLoans: LoanDetails[] = [];

  isLoading = true;
  errorMessage = '';

  // Filter & Search
  currentFilter: string = 'ALL';
  dateFrom: string = '';
  dateTo: string = '';
  searchText: string = '';

  // Sorting
  sortBy: string = '';
  sortDirection: 'asc' | 'desc' = 'asc';

  constructor(
    private adminService: AdminService,
    private circulationService: CirculationService,
    private toastr: ToastrService,
  ) {}

  ngOnInit(): void {
    this.loadAllLoans();
  }

  loadAllLoans(): void {
    this.isLoading = true;
    this.adminService.getAllLoans().subscribe({
      next: (data) => {
        this.allLoans = data;
        this.applyFilter(this.currentFilter); // Áp dụng filter mặc định
        this.isLoading = false;
      },
      error: (err) => {
        this.errorMessage = 'Could not load loan data.';
        this.isLoading = false;
        console.error(err);
      },
    });
  }

  applyFilter(status: string): void {
    this.currentFilter = status;
    this.applyAllFilters();
  }

  applyAllFilters(): void {
    let result = this.allLoans;

    // Filter by status
    if (this.currentFilter !== 'ALL') {
      result = result.filter((loan) => loan.status === this.currentFilter);
    }

    // Filter by date range
    if (this.dateFrom) {
      const fromDate = new Date(this.dateFrom);
      result = result.filter((loan) => new Date(loan.loanDate) >= fromDate);
    }
    if (this.dateTo) {
      const toDate = new Date(this.dateTo);
      result = result.filter((loan) => new Date(loan.loanDate) <= toDate);
    }

    // Filter by search text
    if (this.searchText.trim()) {
      const search = this.searchText.toLowerCase();
      result = result.filter(
        (loan) =>
          loan.bookName.toLowerCase().includes(search) ||
          loan.userName.toLowerCase().includes(search) ||
          loan.loanId.toString().includes(search),
      );
    }

    this.filteredLoans = result;
  }

  onDateRangeChange(): void {
    this.applyAllFilters();
  }

  onSearchChange(): void {
    this.applyAllFilters();
  }

  markAsReturned(loanId: number): void {
    if (!confirm('Are you sure you want to mark this loan as returned?')) {
      return;
    }

    // Tạm thời vô hiệu hóa nút để tránh click đúp
    const loan = this.filteredLoans.find((l) => l.loanId === loanId);
    if (loan) loan.status = 'RETURNED'; // Cập nhật giao diện tạm thời

    this.circulationService.returnLoan(loanId).subscribe({
      next: () => {
        this.toastr.success('Đã đánh dấu sách đã trả!');
        this.loadAllLoans();
      },
      error: (err) => {
        this.toastr.error('Lỗi khi trả sách. Vui lòng thử lại.');
        console.error(err);
        this.loadAllLoans();
      },
    });
  }

  sendReminder(loanId: number): void {
    if (!confirm('Gửi email nhắc nhở tới người mượn?')) {
      return;
    }

    // TODO: Call API to send reminder email
    // this.adminService.sendReminderEmail(loanId).subscribe(...)

    // Giả lập API call
    this.toastr.info('Đang gửi email nhắc nhở...', '', { timeOut: 1000 });
    setTimeout(() => {
      this.toastr.success('Đã gửi email nhắc nhở thành công!');
    }, 1500);
  }

  renewLoan(loanId: number): void {
    if (!confirm('Gia hạn thêm 7 ngày cho phiếu mượn này?')) {
      return;
    }

    // TODO: Call API to renew loan
    // this.circulationService.renewLoan(loanId, 7).subscribe(...)

    // Giả lập API call - Cập nhật dueDate tạm thời
    const loan = this.filteredLoans.find((l) => l.loanId === loanId);
    if (loan) {
      const currentDue = new Date(loan.dueDate);
      currentDue.setDate(currentDue.getDate() + 7);
      loan.dueDate = currentDue.toISOString();
      this.toastr.success('Đã gia hạn thêm 7 ngày!');
    }
  }

  exportToExcel(): void {
    if (this.filteredLoans.length === 0) {
      this.toastr.warning('Không có dữ liệu để xuất');
      return;
    }

    const exportData = this.filteredLoans.map((loan) => ({
      'ID Mượn': loan.loanId,
      'Tên Sách': loan.bookName,
      'Tên Người Dùng': loan.userName,
      'Ngày Mượn': new Date(loan.loanDate).toLocaleDateString('vi-VN'),
      'Ngày Hết Hạn': new Date(loan.dueDate).toLocaleDateString('vi-VN'),
      'Ngày Trả': loan.returnDate
        ? new Date(loan.returnDate).toLocaleDateString('vi-VN')
        : '-',
      'Trạng Thái': loan.status,
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Loans');

    const fileName = `loans_${this.currentFilter}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
    this.toastr.success(`Đã xuất file: ${fileName}`);
  }

  sortColumn(column: string): void {
    if (this.sortBy === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = column;
      this.sortDirection = 'asc';
    }

    this.filteredLoans.sort((a, b) => {
      let valueA: any;
      let valueB: any;

      switch (column) {
        case 'loanId':
          valueA = a.loanId;
          valueB = b.loanId;
          break;
        case 'bookName':
          valueA = a.bookName.toLowerCase();
          valueB = b.bookName.toLowerCase();
          break;
        case 'userName':
          valueA = a.userName.toLowerCase();
          valueB = b.userName.toLowerCase();
          break;
        case 'loanDate':
          valueA = new Date(a.loanDate).getTime();
          valueB = new Date(b.loanDate).getTime();
          break;
        case 'dueDate':
          valueA = new Date(a.dueDate).getTime();
          valueB = new Date(b.dueDate).getTime();
          break;
        case 'status':
          valueA = a.status;
          valueB = b.status;
          break;
        default:
          return 0;
      }

      if (valueA < valueB) return this.sortDirection === 'asc' ? -1 : 1;
      if (valueA > valueB) return this.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }

  getSortIcon(column: string): string {
    if (this.sortBy !== column) return 'fa-sort';
    return this.sortDirection === 'asc' ? 'fa-sort-up' : 'fa-sort-down';
  }
}
