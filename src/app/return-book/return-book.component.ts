import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { BorrowService } from '../services/borrow.service';
import { UserAuthService } from '../services/user-auth.service';
import { LoanDetails } from '../services/admin.service';

@Component({
  selector: 'app-return-book',
  templateUrl: './return-book.component.html',
  styleUrls: ['./return-book.component.css'],
})
export class ReturnBookComponent implements OnInit {

  borrows: LoanDetails[] = [];
  userId: number | null = null;
  loading = new Set<number>();

  showConfirmModal = false;
  borrowToReturn: LoanDetails | null = null;

  errorMessage = '';
  successMessage = '';

  constructor(
    private borrowService: BorrowService,
    private userAuthService: UserAuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.userId = this.userAuthService.getUserId();

    if (!this.userId) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: '/return-book' }});
      return;
    }
    this.loadUserBorrows();
  }

  private loadUserBorrows() {
    this.borrowService.getMyLoanHistory().subscribe({
      next: (data: LoanDetails[]) => {
        this.borrows = (data || []).filter(b => b.status !== 'RETURNED');
      },
      error: (err: HttpErrorResponse) => {
        console.error('[ReturnBook] getMyLoanHistory error:', err);
        this.errorMessage = "Could not retrieve your borrowed books list.";
      },
    });
  }

  openConfirmModal(borrow: LoanDetails): void {
    this.borrowToReturn = borrow;
    this.showConfirmModal = true;
  }

  closeConfirmModal(): void {
    this.showConfirmModal = false;
    this.borrowToReturn = null;
  }

  confirmReturn(): void {
    if (!this.borrowToReturn || !this.borrowToReturn.loanId) {
      console.error("Return failed: loanId is missing.", this.borrowToReturn);
      return;
    }

    const borrow = this.borrowToReturn;
    this.closeConfirmModal();
    this.clearMessages();
    this.loading.add(borrow.loanId);
    
    const loanId = borrow.loanId;

    this.borrowService.returnLoan(loanId).subscribe({
      next: () => {
        this.successMessage = `Successfully returned "${borrow.bookName}".`;
        if (this.userId) {
          this.loadUserBorrows();
        }
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage = err.error?.message || 'An error occurred while returning the book.';
      },
      complete: () => {
        if (borrow.loanId) this.loading.delete(borrow.loanId);
      }
    });
  }

  private clearMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
  }
}