import { Component, OnInit } from '@angular/core';
import { AdminService } from '../../services/admin.service';
import { ToastrService } from 'ngx-toastr';
import {
  GroupedSettingsResponse,
  CategoryGroup,
  SettingDto,
  SettingDataType,
} from '../../models/setting';

@Component({
  selector: 'app-admin-settings',
  templateUrl: './admin-settings.component.html',
  styleUrls: ['./admin-settings.component.css'],
  standalone: false,
})
export class AdminSettingsComponent implements OnInit {
  groupedSettings: GroupedSettingsResponse | null = null;
  categories: string[] = [];
  activeTab: string = 'LOAN_POLICY';
  loading = false;
  savingKeys = new Set<string>();
  resettingKeys = new Set<string>();

  // Expose enum to template
  SettingDataType = SettingDataType;

  // Confirmation modal state
  showResetModal = false;
  resetModalKey: string = '';
  resetModalTitle: string = '';
  resetModalDefaultValue: string = '';
  isResettingCategory = false;

  constructor(
    private adminService: AdminService,
    private toastr: ToastrService,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.adminService.getGroupedSettings().subscribe({
      next: (response) => {
        this.groupedSettings = response;
        this.categories = Object.keys(response.groups);
        if (this.categories.length > 0 && !this.activeTab) {
          this.activeTab = this.categories[0];
        }
      },
      error: () => this.toastr.error('Không tải được cấu hình'),
      complete: () => (this.loading = false),
    });
  }

  getActiveGroup(): CategoryGroup | null {
    if (!this.groupedSettings || !this.activeTab) return null;
    return this.groupedSettings.groups[this.activeTab] || null;
  }

  saveSetting(setting: SettingDto): void {
    // Validate based on dataType
    if (setting.dataType === SettingDataType.NUMBER) {
      const num = Number(setting.value);
      if (isNaN(num)) {
        this.toastr.warning('Giá trị phải là số hợp lệ');
        return;
      }
      if (num < 0) {
        this.toastr.warning('Không được nhập số âm');
        return;
      }
    }

    this.savingKeys.add(setting.key);
    this.adminService.updateSetting(setting.key, setting.value).subscribe({
      next: () => {
        this.toastr.success(`Đã lưu: ${setting.description || setting.key}`);
        this.load(); // Reload to get updated audit info
      },
      error: () => this.toastr.error('Lưu thiết lập thất bại'),
      complete: () => this.savingKeys.delete(setting.key),
    });
  }

  isSaving(key: string): boolean {
    return this.savingKeys.has(key);
  }

  isResetting(key: string): boolean {
    return this.resettingKeys.has(key);
  }

  // Reset modal handlers
  openResetModal(setting: SettingDto): void {
    if (!setting.defaultValue) {
      this.toastr.warning('Thiết lập này không có giá trị mặc định');
      return;
    }
    this.resetModalKey = setting.key;
    this.resetModalTitle = setting.description || setting.key;
    this.resetModalDefaultValue = setting.defaultValue;
    this.isResettingCategory = false;
    this.showResetModal = true;
  }

  openResetCategoryModal(): void {
    const group = this.getActiveGroup();
    if (!group) return;

    this.resetModalKey = this.activeTab;
    this.resetModalTitle = `tất cả thiết lập trong "${group.displayName}"`;
    this.resetModalDefaultValue = '';
    this.isResettingCategory = true;
    this.showResetModal = true;
  }

  confirmReset(): void {
    if (this.isResettingCategory) {
      this.resetCategory();
    } else {
      this.resetSingleSetting();
    }
  }

  resetSingleSetting(): void {
    this.resettingKeys.add(this.resetModalKey);
    this.adminService.resetSettingToDefault(this.resetModalKey).subscribe({
      next: () => {
        this.toastr.success('Đã khôi phục về giá trị mặc định');
        this.load();
        this.closeResetModal();
      },
      error: (err) => {
        const msg = err.error?.message || 'Khôi phục thất bại';
        this.toastr.error(msg);
      },
      complete: () => this.resettingKeys.delete(this.resetModalKey),
    });
  }

  resetCategory(): void {
    this.adminService.resetCategoryToDefaults(this.activeTab).subscribe({
      next: (response: any) => {
        this.toastr.success(response.message || 'Đã khôi phục danh mục');
        this.load();
        this.closeResetModal();
      },
      error: (err) => {
        const msg = err.error?.message || 'Khôi phục thất bại';
        this.toastr.error(msg);
      },
    });
  }

  closeResetModal(): void {
    this.showResetModal = false;
    this.resetModalKey = '';
    this.resetModalTitle = '';
    this.resetModalDefaultValue = '';
    this.isResettingCategory = false;
  }

  formatDateTime(dateTime: string | null): string {
    if (!dateTime) return 'Chưa cập nhật';
    const date = new Date(dateTime);
    return date.toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  getCategoryIcon(category: string): string {
    const group = this.groupedSettings?.groups[category];
    return group?.icon || '⚙️';
  }

  getCategoryDisplayName(category: string): string {
    const group = this.groupedSettings?.groups[category];
    return group?.displayName || category;
  }
}
