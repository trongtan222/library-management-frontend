import { Component, OnInit, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Chart, registerables, ChartConfiguration } from 'chart.js';
import { environment } from 'src/environments/environment';
import {
  AdminService,
  DashboardDetails,
  LoanDetails,
} from '../../services/admin.service';
import { forkJoin } from 'rxjs';
import { BooksService, Page } from '../../services/books.service'; // Import Page
import { UsersService } from '../../services/users.service';
import { Book } from '../../models/book'; // Correct import
import { User } from '../../models/user'; // Correct import

// Đăng ký các module của Chart.js
Chart.register(...registerables);

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
  standalone: false,
})
export class DashboardComponent implements OnInit, OnDestroy {
  details: DashboardDetails = {
    stats: {
      totalBooks: 0,
      totalUsers: 0,
      activeLoans: 0,
      overdueLoans: 0,
      totalFines: 0,
      totalUnpaidFines: 0,
    },
    mostLoanedBooks: [],
    topBorrowers: [],
    recentActivities: [],
    overdueLoans: [],
  } as DashboardDetails;
  isLoading = true;
  errorMessage = '';

  // Lưu tham chiếu chart để destroy khi thoát trang (tránh rò rỉ bộ nhớ)
  private charts: Chart[] = [];
  // URL API lấy dữ liệu biểu đồ
  private chartApiUrl = `${environment.apiBaseUrl}/admin/dashboard/chart-data`;

  // Cấu hình màu sắc cho Dark Mode
  private readonly TEXT_COLOR = '#c9d1d9'; // Màu chữ sáng
  private readonly GRID_COLOR = '#30363d'; // Màu lưới tối mờ

  // Date Range Filter
  dateRange: 'today' | 'week' | 'month' | 'year' = 'month';
  dateRangeOptions = [
    { value: 'today', label: 'Hôm nay' },
    { value: 'week', label: 'Tuần này' },
    { value: 'month', label: 'Tháng này' },
    { value: 'year', label: 'Năm nay' },
  ];

  // --- MỚI: State cho việc hiển thị danh sách chi tiết ---
  selectedSection:
    | 'BOOKS'
    | 'USERS'
    | 'LOANS_ACTIVE'
    | 'LOANS_OVERDUE'
    | 'FINES_ALL'
    | 'FINES_UNPAID'
    | null = null;
  listLoading = false;

  // Dữ liệu bảng (dùng chung, sẽ map tùy loại)
  tableData: any[] = [];

  // Phân trang cho bảng chi tiết
  page = 1;
  pageSize = 10;
  pageSizes = [10, 20, 50, 100];
  totalPages = 0;
  totalElements = 0;

  constructor(
    private http: HttpClient,
    private adminService: AdminService,
    private booksService: BooksService, // Inject thêm
    private usersService: UsersService, // Inject thêm
  ) {}

  ngOnInit(): void {
    this.loadAllData();
  }

  onDateRangeChange(range: 'today' | 'week' | 'month' | 'year') {
    this.dateRange = range;
    this.loadAllData();
  }

  ngOnDestroy(): void {
    this.charts.forEach((c) => c.destroy());
  }

  loadAllData() {
    this.isLoading = true;

    // Sử dụng forkJoin để đợi cả 2 API cùng hoàn tất
    forkJoin({
      dashboardStats: this.adminService.getDashboardDetails(),
      chartData: this.http.get<any>(this.chartApiUrl),
    }).subscribe({
      next: (result) => {
        this.details = result.dashboardStats;
        this.isLoading = false; // Lúc này HTML mới hiển thị canvas

        // Sử dụng setTimeout để đảm bảo Angular đã render canvas ra DOM
        setTimeout(() => {
          this.renderLoansChart(result.chartData.monthlyLoans);
          this.renderStatusChart(result.chartData.statusDistribution);
          this.renderTopBooksChart();
        }, 0);
      },
      error: (err: any) => {
        console.error('Lỗi tải dữ liệu dashboard', err);
        this.errorMessage = 'Không thể tải dữ liệu. Vui lòng thử lại sau.';
        this.isLoading = false;
      },
    });
  }

  // --- MỚI: Hàm xử lý khi click vào thẻ thống kê ---
  showSection(
    section:
      | 'BOOKS'
      | 'USERS'
      | 'LOANS_ACTIVE'
      | 'LOANS_OVERDUE'
      | 'FINES_ALL'
      | 'FINES_UNPAID',
  ) {
    // Nếu bấm lại vào thẻ đang chọn thì ẩn đi (toggle)
    if (this.selectedSection === section) {
      this.selectedSection = null;
      this.tableData = [];
      this.updatePaginationMeta();
      return;
    }

    this.selectedSection = section;
    this.listLoading = true;
    this.tableData = [];
    this.page = 1;
    this.updatePaginationMeta();

    switch (section) {
      case 'BOOKS':
        // Sử dụng getPublicBooks với page size lớn để lấy "tất cả" (hoặc tạm thời dùng cách này)
        // availableOnly = false để lấy cả sách hết hàng (cho admin)
        this.booksService.getPublicBooks(false, null, null, 0, 1000).subscribe({
          next: (data: Page<Book>) => {
            this.tableData = data.content;
            this.updatePaginationMeta();
            this.listLoading = false;
          },
          error: (err: any) => {
            console.error(err);
            this.listLoading = false;
            this.updatePaginationMeta();
          },
        });
        break;

      case 'USERS':
        this.usersService.getUsersList().subscribe({
          next: (data: User[]) => {
            this.tableData = data;
            this.updatePaginationMeta();
            this.listLoading = false;
          },
          error: (err: any) => {
            console.error(err);
            this.listLoading = false;
            this.updatePaginationMeta();
          },
        });
        break;

      case 'LOANS_ACTIVE':
        this.adminService.getAllLoans().subscribe({
          next: (data: LoanDetails[]) => {
            this.tableData = data.filter((l) => l.status === 'ACTIVE');
            this.updatePaginationMeta();
            this.listLoading = false;
          },
          error: (err: any) => {
            console.error(err);
            this.listLoading = false;
            this.updatePaginationMeta();
          },
        });
        break;

      case 'LOANS_OVERDUE':
        this.adminService.getAllLoans().subscribe({
          next: (data: LoanDetails[]) => {
            this.tableData = data.filter((l) => l.status === 'OVERDUE');
            this.updatePaginationMeta();
            this.listLoading = false;
          },
          error: (err: any) => {
            console.error(err);
            this.listLoading = false;
            this.updatePaginationMeta();
          },
        });
        break;

      case 'FINES_ALL':
        this.adminService.getAllLoans().subscribe({
          next: (data: LoanDetails[]) => {
            this.tableData = data.filter((l) => (l.fineAmount ?? 0) > 0);
            this.updatePaginationMeta();
            this.listLoading = false;
          },
          error: (err: any) => {
            console.error(err);
            this.listLoading = false;
            this.updatePaginationMeta();
          },
        });
        break;

      case 'FINES_UNPAID':
        this.adminService.getUnpaidFines().subscribe({
          next: (data: any[]) => {
            this.tableData = data;
            this.updatePaginationMeta();
            this.listLoading = false;
          },
          error: (err: any) => {
            console.error(err);
            this.listLoading = false;
            this.updatePaginationMeta();
          },
        });
        break;
    }
  }

  get pagedTableData(): any[] {
    const start = (this.page - 1) * this.pageSize;
    return this.tableData.slice(start, start + this.pageSize);
  }

  setPage(p: number) {
    if (p < 1 || (this.totalPages && p > this.totalPages)) return;
    this.page = p;
  }

  prevPage() {
    if (this.page > 1) this.page--;
  }
  nextPage() {
    if (this.totalPages > 0 && this.page < this.totalPages) this.page++;
  }

  changePageSize(event: Event) {
    const value = Number((event.target as HTMLSelectElement).value);
    this.pageSize = value;
    this.page = 1;
    this.updatePaginationMeta();
  }

  private updatePaginationMeta() {
    this.totalElements = this.tableData.length;
    this.totalPages =
      this.totalElements > 0
        ? Math.ceil(this.totalElements / this.pageSize)
        : 0;
    if (this.totalPages > 0 && this.page > this.totalPages) {
      this.page = this.totalPages;
    }
  }

  // 1. Vẽ biểu đồ đường (Line Chart)
  renderLoansChart(data: number[]) {
    const ctx = document.getElementById('loansChart') as HTMLCanvasElement;
    if (!ctx) return;

    const chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: [
          'T1',
          'T2',
          'T3',
          'T4',
          'T5',
          'T6',
          'T7',
          'T8',
          'T9',
          'T10',
          'T11',
          'T12',
        ],
        datasets: [
          {
            label: 'Số lượt mượn',
            data: data,
            borderColor: '#58a6ff', // Màu xanh Github
            backgroundColor: 'rgba(88, 166, 255, 0.2)',
            tension: 0.4,
            fill: true,
            pointBackgroundColor: '#ffffff',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: this.TEXT_COLOR } }, // Sửa màu chữ legend
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: this.GRID_COLOR }, // Sửa màu lưới
            ticks: { color: this.TEXT_COLOR }, // Sửa màu chữ trục Y
          },
          x: {
            grid: { display: false },
            ticks: { color: this.TEXT_COLOR }, // Sửa màu chữ trục X
          },
        },
      },
    });
    this.charts.push(chart);
  }

  // 2. Vẽ biểu đồ tròn (Doughnut Chart)
  renderStatusChart(dataMap: any) {
    const ctx = document.getElementById('statusChart') as HTMLCanvasElement;
    if (!ctx) return;

    const labels = ['Đang mượn', 'Đã trả', 'Quá hạn'];
    const values = [
      dataMap['ACTIVE'] || 0,
      dataMap['RETURNED'] || 0,
      dataMap['OVERDUE'] || 0,
    ];

    const chart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [
          {
            data: values,
            backgroundColor: [
              '#ffc107', // Vàng (Active)
              '#28a745', // Xanh (Returned)
              '#dc3545', // Đỏ (Overdue)
            ],
            borderWidth: 0, // Bỏ viền trắng mặc định
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: this.TEXT_COLOR, padding: 20 }, // Sửa màu chữ
          },
        },
        cutout: '60%',
      },
    });
    this.charts.push(chart);
  }

  // 3. Vẽ biểu đồ cột Top 5 Sách Hot
  renderTopBooksChart() {
    const ctx = document.getElementById('topBooksChart') as HTMLCanvasElement;
    if (!ctx) return;

    const topBooks = this.details.mostLoanedBooks.slice(0, 5);
    const labels = topBooks.map((b) => b.bookName.substring(0, 20) + '...');
    const data = topBooks.map((b) => b.loanCount);

    const chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Lượt mượn',
            data: data,
            backgroundColor: [
              '#ffc107',
              '#28a745',
              '#17a2b8',
              '#6610f2',
              '#fd7e14',
            ],
            borderWidth: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y', // Horizontal bar
        plugins: {
          legend: { display: false },
        },
        scales: {
          x: {
            beginAtZero: true,
            grid: { color: this.GRID_COLOR },
            ticks: { color: this.TEXT_COLOR },
          },
          y: {
            grid: { display: false },
            ticks: { color: this.TEXT_COLOR },
          },
        },
      },
    });
    this.charts.push(chart);
  }

  // Quick Actions
  quickCreateLoan() {
    window.location.href = '/admin/create-loan';
  }

  quickScanReturn() {
    window.location.href = '/admin/scanner';
  }

  quickAddUser() {
    window.location.href = '/create-user';
  }

  // Utility: Format relative time
  getRelativeTime(date: string): string {
    const now = new Date().getTime();
    const then = new Date(date).getTime();
    const diffMs = now - then;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    return `${diffDays} ngày trước`;
  }

  // Utility: Get activity icon
  getActivityIcon(activity: any): string {
    if (activity.type?.includes('LOAN')) return 'fa-hand-holding';
    if (activity.type?.includes('RETURN')) return 'fa-check-circle';
    if (activity.type?.includes('FINE')) return 'fa-coins';
    return 'fa-circle';
  }

  // Utility: Get activity color
  getActivityColor(activity: any): string {
    if (activity.type?.includes('LOAN')) return 'text-info';
    if (activity.type?.includes('RETURN')) return 'text-success';
    if (activity.type?.includes('FINE')) return 'text-danger';
    return 'text-secondary';
  }
}
