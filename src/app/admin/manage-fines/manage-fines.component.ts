import { Component, OnInit } from '@angular/core';
import { AdminService, FineDetails } from 'src/app/services/admin.service';

@Component({
    selector: 'app-manage-fines',
    templateUrl: './manage-fines.component.html',
    styleUrls: ['./manage-fines.component.css'],
    standalone: false
})
export class ManageFinesComponent implements OnInit {
  fines: FineDetails[] = [];
  isLoading = true;

  constructor(private adminService: AdminService) { }

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

  markAsPaid(loanId: number): void {
    if (confirm('Are you sure this fine has been paid?')) {
      this.adminService.markFineAsPaid(loanId).subscribe(() => {
        alert('Fine marked as paid.');
        this.loadFines(); // Tải lại danh sách
      });
    }
  }
}