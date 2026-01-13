import { Component, OnInit } from '@angular/core';
import { AdminService } from '../../services/admin.service';
import { ToastrService } from 'ngx-toastr';

@Component({
    selector: 'app-admin-settings',
    templateUrl: './admin-settings.component.html',
    styleUrls: ['./admin-settings.component.css'],
    standalone: false
})
export class AdminSettingsComponent implements OnInit {
  settings: Record<string, string> = {};
  loading = false;
  isSavingDays = false;
  isSavingFine = false;
  isSavingAll = false;

  constructor(private adminService: AdminService, private toastr: ToastrService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.adminService.getSettings().subscribe({
      next: (list) => {
        const map: Record<string, string> = {};
        for (const s of list) {
          map[s.key] = s.value;
        }
        this.settings = map;
      },
      error: () => this.toastr.error('Không tải được cấu hình'),
      complete: () => (this.loading = false)
    });
  }

  saveKey(key: string): void {
    const raw = this.settings[key] ?? '';
    const valueNum = Number(raw);
    // Validate: không âm, không NaN
    if (isNaN(valueNum)) {
      this.toastr.warning('Giá trị phải là số hợp lệ');
      return;
    }
    if (valueNum < 0) {
      this.toastr.warning('Không được nhập số âm');
      return;
    }

    const isDays = key === 'LOAN_MAX_DAYS';
    const isFine = key === 'FINE_PER_DAY';
    if (isDays) this.isSavingDays = true;
    if (isFine) this.isSavingFine = true;

    this.adminService.updateSetting(key, String(valueNum)).subscribe({
      next: () => this.toastr.success('Đã lưu thiết lập'),
      error: () => this.toastr.error('Lưu thiết lập thất bại'),
      complete: () => {
        if (isDays) this.isSavingDays = false;
        if (isFine) this.isSavingFine = false;
      }
    });
  }

  saveAll(): void {
    // Validate cả hai trước khi gửi
    const daysRaw = this.settings['LOAN_MAX_DAYS'] ?? '';
    const fineRaw = this.settings['FINE_PER_DAY'] ?? '';
    const days = Number(daysRaw);
    const fine = Number(fineRaw);
    if ([days, fine].some(v => isNaN(v))) {
      this.toastr.warning('Giá trị phải là số hợp lệ');
      return;
    }
    if (days < 0 || fine < 0) {
      this.toastr.warning('Không được nhập số âm');
      return;
    }

    this.isSavingAll = true;
    // Gửi tuần tự để đơn giản
    this.adminService.updateSetting('LOAN_MAX_DAYS', String(days)).subscribe({
      next: () => {
        this.adminService.updateSetting('FINE_PER_DAY', String(fine)).subscribe({
          next: () => this.toastr.success('Đã lưu tất cả thiết lập'),
          error: () => this.toastr.error('Lưu FINE_PER_DAY thất bại'),
          complete: () => (this.isSavingAll = false)
        });
      },
      error: () => {
        this.toastr.error('Lưu LOAN_MAX_DAYS thất bại');
        this.isSavingAll = false;
      }
    });
  }
}
