import { Component, OnInit } from '@angular/core';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';
import { AdminService, ReportSummary } from 'src/app/services/admin.service';

@Component({
  selector: 'app-reports',
  templateUrl: './reports.component.html',
  styleUrls: ['./reports.component.css']
})
export class ReportsComponent implements OnInit {

  // State
  isLoading = false;
  errorMessage = '';
  reportData: ReportSummary | null = null;
  
  // Date range
  startDate: string;
  endDate: string;

  // Chart for Loans by Month
  public barChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    scales: { x: {}, y: { min: 0, ticks: { stepSize: 1 } } }, // Đảm bảo trục Y là số nguyên
    plugins: { legend: { display: true, position: 'top' } }
  };
  public barChartType: ChartType = 'bar';
  public barChartData: ChartData<'bar'> = {
    labels: [],
    datasets: [
      { data: [], label: 'Lượt mượn' }
    ]
  };

  // Chart for Top Books
  public pieChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    plugins: { legend: { display: true, position: 'left' } }
  };
  public pieChartType: ChartType = 'pie';
  public pieChartData: ChartData<'pie'> = {
    labels: [],
    datasets: [{ data: [] }]
  };

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

  generateReport(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.reportData = null;

    this.adminService.getReportSummary(this.startDate, this.endDate).subscribe({
      next: (data: ReportSummary) => { // Thêm kiểu dữ liệu cho 'data'
        this.reportData = data;
        this.updateCharts(data);
        this.isLoading = false;
      },
      error: (err: any) => { // Thêm kiểu dữ liệu cho 'err'
        this.errorMessage = 'Could not load report data.';
        this.isLoading = false;
        console.error(err);
      }
    });
  }

  private updateCharts(data: ReportSummary): void {
    // Update Bar Chart (Loans by Month)
    this.barChartData = {
      labels: data.loansByMonth.map(item => item.month),
      datasets: [{ 
        data: data.loansByMonth.map(item => item.count), 
        label: 'Lượt mượn',
        backgroundColor: 'rgba(75, 192, 192, 0.6)'
      }]
    };

    // Update Pie Chart (Top Books)
    this.pieChartData = {
      labels: data.mostLoanedBooks.map(item => item.bookName),
      datasets: [{
        data: data.mostLoanedBooks.map(item => item.loanCount)
      }]
    };
  }
}