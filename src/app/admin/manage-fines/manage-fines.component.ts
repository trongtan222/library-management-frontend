import { Component, OnInit } from '@angular/core';
import { AdminService, FineDetails } from 'src/app/services/admin.service';
import { ToastrService } from 'ngx-toastr';

@Component({
    selector: 'app-manage-fines',
    templateUrl: './manage-fines.component.html',
    styleUrls: ['./manage-fines.component.css'],
    standalone: false
})
export class ManageFinesComponent implements OnInit {
  fines: FineDetails[] = [];
  isLoading = true;

  isPaymentModalOpen = false;
  selectedFine: FineDetails | null = null;
  selectedPaymentMethod: string = 'CASH';
  paymentNote: string = '';

  constructor(private adminService: AdminService, private toastr: ToastrService) { }

  ngOnInit(): void {
    this.loadFines();
  }

  loadFines(): void {
    this.isLoading = true;
    this.adminService.getUnpaidFines().subscribe(data => {
      this.fines = data;
      this.isLoading = false;
    });
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

    console.log('Fine payment confirmed', {
      loanId: this.selectedFine.loanId,
      paymentMethod: this.selectedPaymentMethod,
      note: this.paymentNote
    });

    this.adminService.markFineAsPaid(this.selectedFine.loanId).subscribe(() => {
      this.toastr.success('Đã đánh dấu là đã thu tiền phạt.');
      this.closePaymentModal();
      this.loadFines();
    });
  }
}