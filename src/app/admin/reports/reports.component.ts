import {
  Component,
  OnDestroy,
  OnInit,
  ElementRef,
  ViewChild,
} from '@angular/core';
import Chart from 'chart.js/auto';
import { AdminService, ReportSummary } from 'src/app/services/admin.service';

@Component({
  selector: 'app-reports',
  templateUrl: './reports.component.html',
  styleUrls: ['./reports.component.css'],
  standalone: false,
})
export class ReportsComponent implements OnInit, OnDestroy {
  // State
  isLoading = false;
  errorMessage = '';
  reportData: ReportSummary | null = null;
  exportingLoans = false;
  exportingBooks = false;
  exportingUsers = false;
  exportingPdf = false;

  // Drill-down
  selectedMonthDetails: { month: string; loans: any[] } | null = null;
  isLoadingDetails = false;

  // Column selection for Excel export
  showColumnSelector = false;
  excelColumns = {
    loans: {
      id: true,
      bookName: true,
      userName: true,
      borrowDate: true,
      returnDate: true,
    },
    books: {
      id: true,
      name: true,
      author: true,
      isbn: true,
      category: true,
      quantity: true,
    },
    users: { id: true, name: true, email: true, phone: true, role: true },
  };

  // Date range
  startDate: string;
  endDate: string;

  @ViewChild('loansChart') loansChart?: ElementRef<HTMLCanvasElement>;
  @ViewChild('topBooksChart') topBooksChart?: ElementRef<HTMLCanvasElement>;
  @ViewChild('finesChart') finesChart?: ElementRef<HTMLCanvasElement>;
  @ViewChild('categoryChart') categoryChart?: ElementRef<HTMLCanvasElement>;

  private loansChartInstance?: Chart;
  private topBooksChartInstance?: Chart;
  private finesChartInstance?: Chart;
  private categoryChartInstance?: Chart;

  constructor(private adminService: AdminService) {
    // Mặc định là tháng hiện tại
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    this.startDate = firstDay.toISOString().split('T')[0];
    this.endDate = today.toISOString().split('T')[0];
  }

  ngOnInit(): void {
    this.generateReport();
  }

  ngOnDestroy(): void {
    this.loansChartInstance?.destroy();
    this.topBooksChartInstance?.destroy();
    this.finesChartInstance?.destroy();
    this.categoryChartInstance?.destroy();
  }

  generateReport(): void {
    if (this.isInvalidRange()) {
      this.errorMessage = 'Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.';
      return;
    }
    this.isLoading = true;
    this.errorMessage = '';
    this.reportData = null;

    this.adminService.getReportSummary(this.startDate, this.endDate).subscribe({
      next: (data: ReportSummary) => {
        // Thêm kiểu dữ liệu cho 'data'
        this.reportData = data;
        this.updateCharts(data);
        this.isLoading = false;
      },
      error: (err: any) => {
        // Thêm kiểu dữ liệu cho 'err'
        this.errorMessage = 'Could not load report data.';
        this.isLoading = false;
        console.error(err);
      },
    });
  }

  private updateCharts(data: ReportSummary): void {
    setTimeout(() => {
      this.renderLoansChart(data);
      this.renderTopBooksChart(data);
      this.renderFinesChart(data);
      this.renderCategoryChart(data);
    });
  }

  setQuickRange(days: number) {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - (days - 1));
    this.startDate = start.toISOString().split('T')[0];
    this.endDate = end.toISOString().split('T')[0];
    this.generateReport();
  }

  setThisMonth() {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    this.startDate = firstDay.toISOString().split('T')[0];
    this.endDate = today.toISOString().split('T')[0];
    this.generateReport();
  }

  exportLoansExcel() {
    if (this.isInvalidRange()) {
      this.errorMessage = 'Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.';
      return;
    }
    this.exportingLoans = true;
    this.adminService.exportLoansExcel(this.startDate, this.endDate).subscribe({
      next: (blob) =>
        this.triggerDownload(
          blob,
          `bao_cao_muon_sach_${this.startDate}_${this.endDate}.xlsx`,
        ),
      error: () => (this.errorMessage = 'Không tải được file Excel lượt mượn.'),
      complete: () => (this.exportingLoans = false),
    });
  }

  exportBooksExcel() {
    this.exportingBooks = true;
    this.adminService.exportBooksExcel().subscribe({
      next: (blob) =>
        this.triggerDownload(blob, `danh_sach_sach_${this.endDate}.xlsx`),
      error: () => (this.errorMessage = 'Không tải được file Excel sách.'),
      complete: () => (this.exportingBooks = false),
    });
  }

  exportUsersExcel() {
    this.exportingUsers = true;
    this.adminService.exportUsersExcel().subscribe({
      next: (blob) =>
        this.triggerDownload(blob, `danh_sach_nguoi_dung_${this.endDate}.xlsx`),
      error: () =>
        (this.errorMessage = 'Không tải được file Excel người dùng.'),
      complete: () => (this.exportingUsers = false),
    });
  }

  // === DEEP ANALYTICS HELPERS ===
  getLoansGrowthIndicator(): {
    icon: string;
    color: string;
    text: string;
  } | null {
    if (!this.reportData?.loansGrowthPercent) return null;
    const growth = this.reportData.loansGrowthPercent;
    if (growth > 0) {
      return {
        icon: '↑',
        color: 'text-success',
        text: `+${growth.toFixed(1)}%`,
      };
    } else if (growth < 0) {
      return { icon: '↓', color: 'text-danger', text: `${growth.toFixed(1)}%` };
    }
    return { icon: '→', color: 'text-muted', text: '0%' };
  }

  getFinesGrowthIndicator(): {
    icon: string;
    color: string;
    text: string;
  } | null {
    if (!this.reportData?.finesGrowthPercent) return null;
    const growth = this.reportData.finesGrowthPercent;
    if (growth > 0) {
      return {
        icon: '↑',
        color: 'text-danger',
        text: `+${growth.toFixed(1)}%`,
      }; // More fines = bad
    } else if (growth < 0) {
      return {
        icon: '↓',
        color: 'text-success',
        text: `${growth.toFixed(1)}%`,
      }; // Less fines = good
    }
    return { icon: '→', color: 'text-muted', text: '0%' };
  }

  hasDeadStock(): boolean {
    return (this.reportData?.deadStockBooks?.length ?? 0) > 0;
  }

  hasHighTurnover(): boolean {
    return (this.reportData?.highTurnoverBooks?.length ?? 0) > 0;
  }

  // === PDF EXPORT ===
  exportPdf() {
    this.exportingPdf = true;
    // Capture current report state and print
    setTimeout(() => {
      window.print();
      this.exportingPdf = false;
    }, 500);
  }

  // === DRILL-DOWN ===
  onChartClick(month: string) {
    // In real implementation, this would call API to get detailed loans for that month
    this.selectedMonthDetails = {
      month,
      loans: [], // Backend should provide this
    };
    this.isLoadingDetails = true;

    // Mock: Clear after 1 second (real implementation would call adminService.getLoansByMonth(month))
    setTimeout(() => {
      this.isLoadingDetails = false;
    }, 1000);
  }

  closeDrillDown() {
    this.selectedMonthDetails = null;
  }

  // === COLUMN SELECTOR ===
  toggleColumnSelector() {
    this.showColumnSelector = !this.showColumnSelector;
  }

  selectAllColumns(type: 'loans' | 'books' | 'users', value: boolean) {
    Object.keys(this.excelColumns[type]).forEach((key) => {
      (this.excelColumns[type] as any)[key] = value;
    });
  }

  get totalLoans(): number {
    return (this.reportData?.loansByMonth || []).reduce(
      (sum, item: any) => sum + (item.count || 0),
      0,
    );
  }

  get totalFines(): number {
    return (this.reportData?.finesByMonth || []).reduce(
      (sum, item: any) => sum + (item.totalFines || 0),
      0,
    );
  }

  private isInvalidRange(): boolean {
    return !!this.startDate && !!this.endDate && this.startDate > this.endDate;
  }

  private renderLoansChart(data: ReportSummary) {
    const ctx = this.loansChart?.nativeElement;
    if (!ctx) return;
    const labels = data.loansByMonth.map((item: any) => item.month);
    const values = data.loansByMonth.map((item: any) => item.count);
    this.loansChartInstance?.destroy();
    this.loansChartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Lượt mượn',
            data: values,
            backgroundColor: 'rgba(54, 162, 235, 0.6)',
          },
        ],
      },
      options: {
        responsive: true,
        scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
      },
    });
  }

  private renderTopBooksChart(data: ReportSummary) {
    const ctx = this.topBooksChart?.nativeElement;
    if (!ctx) return;
    const labels = data.mostLoanedBooks.map((item: any) => item.bookName);
    const values = data.mostLoanedBooks.map((item: any) => item.loanCount);
    this.topBooksChartInstance?.destroy();
    this.topBooksChartInstance = new Chart(ctx, {
      type: 'pie',
      data: {
        labels,
        datasets: [
          {
            data: values,
            backgroundColor: [
              '#4e79a7',
              '#f28e2b',
              '#e15759',
              '#76b7b2',
              '#59a14f',
              '#edc949',
            ],
          },
        ],
      },
      options: {
        responsive: true,
        plugins: { legend: { position: 'left' } },
      },
    });
  }

  private renderFinesChart(data: ReportSummary) {
    const ctx = this.finesChart?.nativeElement;
    if (!ctx) return;
    const labels = (data.finesByMonth || []).map(
      (item: any) => item.month || item.period || '',
    );
    const values = (data.finesByMonth || []).map(
      (item: any) => item.totalFines || 0,
    );
    this.finesChartInstance?.destroy();
    this.finesChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Tiền phạt',
            data: values,
            borderColor: '#d35400',
            backgroundColor: 'rgba(211, 84, 0, 0.15)',
            tension: 0.2,
          },
        ],
      },
      options: {
        responsive: true,
        scales: { y: { beginAtZero: true } },
      },
    });
  }

  private renderCategoryChart(data: ReportSummary) {
    const ctx = this.categoryChart?.nativeElement;
    if (!ctx || !data.loansByCategory || data.loansByCategory.length === 0)
      return;

    const labels = data.loansByCategory.map((item: any) => item.categoryName);
    const values = data.loansByCategory.map((item: any) => item.loanCount);
    const percentages = data.loansByCategory.map(
      (item: any) => item.percentage,
    );

    this.categoryChartInstance?.destroy();
    this.categoryChartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels.map(
          (label, i) => `${label} (${percentages[i].toFixed(1)}%)`,
        ),
        datasets: [
          {
            data: values,
            backgroundColor: [
              '#FF6384',
              '#36A2EB',
              '#FFCE56',
              '#4BC0C0',
              '#9966FF',
              '#FF9F40',
              '#FF6384',
              '#C9CBCF',
            ],
            borderWidth: 2,
            borderColor: '#fff',
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'right', labels: { boxWidth: 15, padding: 10 } },
          tooltip: {
            callbacks: {
              label: (context) => {
                const label = labels[context.dataIndex];
                const value = values[context.dataIndex];
                const pct = percentages[context.dataIndex];
                return `${label}: ${value} lượt (${pct.toFixed(1)}%)`;
              },
            },
          },
        },
      },
    });
  }

  private triggerDownload(blob: Blob, filename: string) {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  }
}
