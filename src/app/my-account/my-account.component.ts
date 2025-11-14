import { Component, OnInit } from '@angular/core';
import { BorrowService } from '../services/borrow.service';
import { UserAuthService } from '../services/user-auth.service';
import { HttpErrorResponse } from '@angular/common/http';
import { CirculationService } from '../services/circulation.service';
import { FineDetails, LoanDetails } from '../services/admin.service';
import { forkJoin } from 'rxjs';


@Component({
  selector: 'app-my-account',
  templateUrl: './my-account.component.html',
  styleUrls: ['./my-account.component.css']
})
export class MyAccountComponent implements OnInit {

  userName: string | null = '';
  userId: number | null = null;
  
  loans: LoanDetails[] = [];
  myFines: FineDetails[] = [];
  isLoading = true;
  errorMessage = '';
  successMessage = '';
  
  constructor(
    private userAuthService: UserAuthService,
    private borrowService: BorrowService,
    private circulationService: CirculationService
  ) { }

  ngOnInit(): void {
    this.userName = this.userAuthService.getName();
    this.userId = this.userAuthService.getUserId();

    if (this.userId) {
      this.loadInitialData();
    } else {
      this.isLoading = false;
      this.errorMessage = "User not logged in.";
    }
  }

  loadInitialData(): void {
    this.isLoading = true;
    this.clearMessages();
    
    forkJoin({
      loans: this.borrowService.getMyLoanHistory(),
      // SỬA LỖI: Gọi getMyFines() mà không có tham số
      fines: this.circulationService.getMyFines()
    }).subscribe({
      next: ({ loans, fines }) => {
        this.loans = loans;
        this.myFines = fines;
        this.isLoading = false;
      },
      error: (err) => {
        this.errorMessage = "Could not load your account data.";
        this.isLoading = false;
        console.error(err);
      }
    });
  }

  renewLoan(loanId: number): void {
    this.clearMessages();
    this.circulationService.renew({ loanId: loanId, extraDays: 7 }).subscribe({
      next: () => {
        this.successMessage = "Loan renewed successfully for 7 more days!";
        if(this.userId) this.loadInitialData();
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage = err.error?.message || "Failed to renew the loan.";
      }
    });
  }
  
  private clearMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
  }
}