import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
// SỬA: Import từ users.ts
import { User } from '../models/user';
import { CirculationService } from '../services/circulation.service'; // Use CirculationService instead of BorrowService
import { UsersService } from '../services/users.service';
import { LoanDetails } from '../services/admin.service';
import { ToastrService } from 'ngx-toastr';

@Component({
    selector: 'app-user-details',
    templateUrl: './user-details.component.html',
    styleUrls: ['./user-details.component.css'],
    standalone: false
})
export class UserDetailsComponent implements OnInit {

  id!: number;
  borrow: LoanDetails[] = [];
  user!: User;
  isLoadingUser = false;
  isLoadingLoans = false;

  constructor(
    private route: ActivatedRoute,
    private circulationService: CirculationService,
    public userService: UsersService,
    private toastr: ToastrService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.id = +this.route.snapshot.params['userId'];
    this.user = new User();
    this.isLoadingUser = true;
    this.userService.getUserById(this.id).subscribe({
      next: (data: User) => {
        this.user = data;
      },
      error: () => {
        this.toastr.error('Không tải được thông tin người dùng');
      },
      complete: () => (this.isLoadingUser = false)
    });

    this.getBorrowedByUser(this.id);
  }

  private getBorrowedByUser(userId: number) {
    this.isLoadingLoans = true;
    this.circulationService.getLoansByMemberId(userId).subscribe({
      next: (data: any[]) => {
        this.borrow = data.map((item: any) => ({
          loanId: item.loanId ?? item.id,
          bookId: item.bookId,
          bookName: item.bookName,
          userName: item.userName,
          loanDate: item.loanDate,
          dueDate: item.dueDate,
          returnDate: item.returnDate,
          status: item.status,
          fineAmount: item.fineAmount,
          overdueDays: item.overdueDays
        })) as LoanDetails[];
      },
      error: () => {
        this.toastr.error('Không tải được lịch sử mượn');
      },
      complete: () => (this.isLoadingLoans = false)
    });
  }

  onReturnLoan(loanId: number): void {
    this.circulationService.returnLoan(loanId).subscribe({
      next: (updatedLoan) => {
        if (updatedLoan && updatedLoan.fineAmount && updatedLoan.fineAmount > 0) {
          this.toastr.warning(
            `Trả sách trễ ${updatedLoan.overdueDays ?? ''} ngày. Tiền phạt: ${updatedLoan.fineAmount.toLocaleString('vi-VN')} đ`,
            'Trả sách quá hạn'
          );
        } else {
          this.toastr.success('Trả sách thành công, không có tiền phạt.', 'Trả sách');
        }
        this.getBorrowedByUser(this.id);
      }
    });
  }

  backToList(): void {
    this.router.navigate(['/users']);
  }

  editUser(): void {
    this.router.navigate(['/update-user', this.id]);
  }

  getRoleDisplay(): string {
    if (!this.user) return '—';
    // Hỗ trợ cả dạng chuỗi đơn lẻ và mảng đối tượng
    const r: any = (this.user as any).role;
    const rs: any[] = (this.user as any).roles;
    if (r && typeof r === 'string') return r;
    if (Array.isArray(rs) && rs.length) {
      // Nếu phần tử là object, lấy thuộc tính name hoặc role, nếu là chuỗi thì dùng trực tiếp
      return rs.map(x => typeof x === 'string' ? x : (x.name || x.role || '')).filter(Boolean).join(', ') || '—';
    }
    return '—';
  }

  getPhoneDisplay(): string {
    const u: any = this.user;
    return (u && (u.phoneNumber || u.phone)) ? (u.phoneNumber || u.phone) : '—';
  }
}