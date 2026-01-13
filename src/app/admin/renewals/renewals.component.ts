import { Component, OnInit } from '@angular/core';
import { AdminService, RenewalRequestDto } from '../../services/admin.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-admin-renewals',
  templateUrl: './renewals.component.html',
  styleUrls: ['./renewals.component.css'],
  standalone: false
})
export class RenewalsComponent implements OnInit {
  loading = false;
  items: RenewalRequestDto[] = [];
  filter: 'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL' = 'PENDING';

  constructor(private admin: AdminService, private toastr: ToastrService) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    const status = this.filter === 'ALL' ? undefined : this.filter;
    this.admin.listRenewals(status as any).subscribe({
      next: (res) => this.items = res,
      error: () => this.toastr.error('Không tải được danh sách gia hạn'),
      complete: () => this.loading = false
    });
  }

  approve(id: number): void {
    this.admin.approveRenewal(id).subscribe({
      next: () => { this.toastr.success('Đã phê duyệt gia hạn'); this.load(); },
      error: (e) => this.toastr.error(e?.error?.message || 'Phê duyệt thất bại')
    });
  }

  reject(id: number): void {
    this.admin.rejectRenewal(id).subscribe({
      next: () => { this.toastr.info('Đã từ chối gia hạn'); this.load(); },
      error: (e) => this.toastr.error(e?.error?.message || 'Từ chối thất bại')
    });
  }
}
