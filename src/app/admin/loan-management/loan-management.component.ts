import { Component, OnInit } from '@angular/core';
import { AdminService, LoanDetails } from 'src/app/services/admin.service';
import { CirculationService } from 'src/app/services/circulation.service';

@Component({
    selector: 'app-loan-management',
    templateUrl: './loan-management.component.html',
    styleUrls: ['./loan-management.component.css'],
    standalone: false
})
export class LoanManagementComponent implements OnInit {

  allLoans: LoanDetails[] = [];
  filteredLoans: LoanDetails[] = [];
  
  isLoading = true;
  errorMessage = '';
  
  // 'ALL', 'ACTIVE', 'OVERDUE', 'RETURNED'
  currentFilter: string = 'ALL'; 

  constructor(
    private adminService: AdminService,
    private circulationService: CirculationService // Dùng để gọi API trả sách
  ) { }

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
        this.errorMessage = "Could not load loan data.";
        this.isLoading = false;
        console.error(err);
      }
    });
  }

  applyFilter(status: string): void {
    this.currentFilter = status;
    if (status === 'ALL') {
      this.filteredLoans = this.allLoans;
    } else {
      this.filteredLoans = this.allLoans.filter(loan => loan.status === status);
    }
  }

  markAsReturned(loanId: number): void {
    if (!confirm('Are you sure you want to mark this loan as returned?')) {
      return;
    }

    // Tạm thời vô hiệu hóa nút để tránh click đúp
    const loan = this.filteredLoans.find(l => l.loanId === loanId);
    if (loan) loan.status = 'RETURNED'; // Cập nhật giao diện tạm thời

    this.circulationService.returnLoan(loanId).subscribe({
      next: () => {
        // Tải lại toàn bộ danh sách để cập nhật trạng thái chính xác
        this.loadAllLoans();
      },
      error: (err) => {
        alert('Failed to return the book. Please check the console.');
        console.error(err);
        // Tải lại để khôi phục trạng thái cũ nếu có lỗi
        this.loadAllLoans();
      }
    });
  }
}