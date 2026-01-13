import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router'; // Import RouterModule
import { CommonModule } from '@angular/common'; // Import CommonModule (cho *ngIf)
import { ToastrService } from 'ngx-toastr';
import { BooksService } from '../../services/books.service';
import { Book } from '../../models/book';
import { ZXingScannerModule } from '@zxing/ngx-scanner'; // Import Module Quét Mã
import { BarcodeFormat } from '@zxing/library';

@Component({
  selector: 'app-admin-scanner',
  templateUrl: './admin-scanner.component.html',
  styleUrls: ['./admin-scanner.component.css'],
  standalone: true, // <--- BẮT BUỘC: Xác định là Standalone
  imports: [
    CommonModule, 
    ZXingScannerModule, 
    RouterModule
  ] // <--- BẮT BUỘC: Khai báo các thư viện dùng trong HTML
})
export class AdminScannerComponent implements OnInit {

  // Cấu hình định dạng quét
  allowedFormats = [ 
    BarcodeFormat.QR_CODE, 
    BarcodeFormat.EAN_13, 
    BarcodeFormat.CODE_128, 
    BarcodeFormat.DATA_MATRIX 
  ];

  hasDevices: boolean = false;
  hasPermission: boolean = false;
  isScanning: boolean = true;
  
  scannedResult: string = '';
  foundBook: Book | null = null;
  isLoadingBook: boolean = false;
  manualCode: string = '';

  constructor(
    private router: Router,
    private toastr: ToastrService,
    private booksService: BooksService
  ) { }

  ngOnInit(): void {
  }

  onCamerasFound(devices: MediaDeviceInfo[]): void {
    this.hasDevices = Boolean(devices && devices.length);
    if (!this.hasDevices) {
      this.toastr.info('Không tìm thấy thiết bị Camera. Bạn có thể nhập mã thủ công.', 'Thông báo');
    }
  }

  onPermissionResponse(permission: boolean): void {
    this.hasPermission = permission;
    if (!permission) {
      this.toastr.warning('Bạn cần cấp quyền Camera để sử dụng tính năng này.');
    }
  }

  onCodeResult(resultString: string): void {
    if (!this.isScanning || !resultString) return;

    this.isScanning = false;
    this.scannedResult = resultString;
    this.playBeep();

    this.toastr.info(`Đã quét được mã: ${resultString}`, 'Đang tìm kiếm...');
    this.findBook(resultString);
  }

  findBook(code: string) {
    this.isLoadingBook = true;
    this.foundBook = null;
    // Ưu tiên tìm theo ISBN/Barcode (search API)
    this.searchByKeyword(code);
  }

  searchByKeyword(keyword: string) {
    this.booksService.getPublicBooks(false, keyword, '', 0, 5).subscribe({
      next: (page: any) => {
        const content = page.content || page || [];
        if (content.length === 1) {
          this.handleBookFound(content[0]);
        } else if (content.length > 1) {
          // Nếu nhiều hơn 1 kết quả, chọn kết quả đầu và báo cho admin
          this.handleBookFound(content[0]);
          this.toastr.info(`Có ${content.length} kết quả, đã chọn kết quả đầu tiên.`, 'Nhiều kết quả');
        } else {
          // Thử theo ID nếu mã là số nhỏ (tránh ISBN rất lớn)
          const asNumber = Number(keyword);
          if (!isNaN(asNumber) && asNumber > 0 && asNumber < 1000000) {
            this.booksService.getBookById(asNumber).subscribe({
              next: (book) => this.handleBookFound(book),
              error: () => {
                this.toastr.error('Không tìm thấy sách nào với mã này.');
                this.isLoadingBook = false;
                setTimeout(() => this.isScanning = true, 3000);
              }
            });
          } else {
            this.toastr.error('Không tìm thấy sách nào với mã này.');
            this.isLoadingBook = false;
            setTimeout(() => this.isScanning = true, 3000);
          }
        }
      },
      error: () => {
        this.toastr.error('Lỗi khi tìm kiếm sách.');
        this.isLoadingBook = false;
      }
    });
  }

  handleBookFound(book: Book) {
      this.foundBook = book;
      this.isLoadingBook = false;
      this.toastr.success(`Đã tìm thấy: ${book.name}`);
  }

  resetScan(): void {
    this.scannedResult = '';
    this.foundBook = null;
    this.isScanning = true;
    this.isLoadingBook = false;
  }

  playBeep(): void {
    // Tạo context âm thanh đơn giản không cần file mp3
    try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContext) {
            const ctx = new AudioContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = 800; // Tần số Hz
            osc.type = 'square';
            osc.start();
            gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.1);
            setTimeout(() => osc.stop(), 100);
        }
    } catch (e) {
        console.error('Không thể phát tiếng bíp', e);
    }
  }

  navigateToEdit(bookId: number): void {
      this.router.navigate(['/admin/books/edit', bookId]);
  }

  navigateToCreateLoan(book: Book): void {
    this.router.navigate(['/admin/create-loan'], { queryParams: { bookId: book.id } });
  }

  submitManualCode(): void {
    const code = (this.manualCode || '').trim();
    if (!code) {
      this.toastr.warning('Vui lòng nhập mã để tìm kiếm.');
      return;
    }
    this.scannedResult = code;
    this.findBook(code);
  }
}