import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { BooksService } from '../../services/books.service';
import { Book } from '../../models/book';
import { ZXingScannerModule } from '@zxing/ngx-scanner';
import { BarcodeFormat } from '@zxing/library';

// Scanner Mode Enum
enum ScannerMode {
  SEARCH = 'SEARCH',
  QUICK_RETURN = 'QUICK_RETURN',
  INVENTORY = 'INVENTORY',
  LOAN = 'LOAN',
}

interface InventoryItem {
  bookId: number;
  bookName: string;
  isbn?: string;
  scannedAt: Date;
}

interface LoanCartItem {
  book: Book;
  scannedAt: Date;
}

@Component({
  selector: 'app-admin-scanner',
  templateUrl: './admin-scanner.component.html',
  styleUrls: ['./admin-scanner.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, ZXingScannerModule, RouterModule],
})
export class AdminScannerComponent implements OnInit {
  // Scanner configuration
  allowedFormats = [
    BarcodeFormat.QR_CODE,
    BarcodeFormat.EAN_13,
    BarcodeFormat.CODE_128,
    BarcodeFormat.DATA_MATRIX,
  ];

  // Camera & Permissions
  hasDevices: boolean = false;
  hasPermission: boolean = false;
  availableCameras: MediaDeviceInfo[] = [];
  selectedCamera?: MediaDeviceInfo;

  // Scanner state
  isScanning: boolean = true;
  scannedResult: string = '';
  foundBook: Book | null = null;
  isLoadingBook: boolean = false;
  manualCode: string = '';

  // Scanner Modes
  ScannerMode = ScannerMode; // Expose enum to template
  currentMode: ScannerMode = ScannerMode.SEARCH;
  modeDescriptions = {
    [ScannerMode.SEARCH]: 'Tìm kiếm thông tin sách',
    [ScannerMode.QUICK_RETURN]: 'Trả sách nhanh (tự động quét liên tục)',
    [ScannerMode.INVENTORY]: 'Kiểm kê kho (quét hàng loạt)',
    [ScannerMode.LOAN]: 'Mượn sách (quét thẻ + sách)',
  };

  // Inventory Mode
  inventoryItems: InventoryItem[] = [];
  inventoryStartTime?: Date;

  // Loan Mode
  loanUserId?: number;
  loanUserName?: string;
  loanCart: LoanCartItem[] = [];
  isWaitingForUserScan: boolean = true;

  constructor(
    private router: Router,
    private toastr: ToastrService,
    private booksService: BooksService,
  ) {}

  ngOnInit(): void {
    // Load saved camera preference
    const savedCameraId = localStorage.getItem('preferred-camera');
    if (savedCameraId) {
      // Will be applied when cameras are found
    }
  }

  onCamerasFound(devices: MediaDeviceInfo[]): void {
    this.hasDevices = Boolean(devices && devices.length);
    this.availableCameras = devices || [];

    if (!this.hasDevices) {
      this.toastr.info(
        'Không tìm thấy thiết bị Camera. Bạn có thể nhập mã thủ công.',
        'Thông báo',
      );
      return;
    }

    // Try to restore saved camera or use first one
    const savedCameraId = localStorage.getItem('preferred-camera');
    if (savedCameraId) {
      const savedCamera = this.availableCameras.find(
        (c) => c.deviceId === savedCameraId,
      );
      if (savedCamera) {
        this.selectedCamera = savedCamera;
        return;
      }
    }

    // Default to first camera
    this.selectedCamera = this.availableCameras[0];
  }

  selectCamera(camera: MediaDeviceInfo): void {
    this.selectedCamera = camera;
    localStorage.setItem('preferred-camera', camera.deviceId);
    this.toastr.success(
      `Đã chọn camera: ${camera.label || 'Camera ' + (this.availableCameras.indexOf(camera) + 1)}`,
    );
  }

  onPermissionResponse(permission: boolean): void {
    this.hasPermission = permission;
    if (!permission) {
      this.toastr.warning('Bạn cần cấp quyền Camera để sử dụng tính năng này.');
    }
  }

  onCodeResult(resultString: string): void {
    if (!this.isScanning || !resultString) return;

    this.scannedResult = resultString;
    this.playBeep();
    this.vibrateDevice();

    // Handle based on current mode
    switch (this.currentMode) {
      case ScannerMode.SEARCH:
        this.handleSearchMode(resultString);
        break;
      case ScannerMode.QUICK_RETURN:
        this.handleQuickReturnMode(resultString);
        break;
      case ScannerMode.INVENTORY:
        this.handleInventoryMode(resultString);
        break;
      case ScannerMode.LOAN:
        this.handleLoanMode(resultString);
        break;
    }
  }

  // ========== MODE HANDLERS ==========

  handleSearchMode(code: string): void {
    this.isScanning = false;
    this.toastr.info(`Đã quét được mã: ${code}`, 'Đang tìm kiếm...');
    this.findBook(code);
  }

  handleQuickReturnMode(code: string): void {
    this.toastr.info(`Quét: ${code}`, 'Đang xử lý trả sách...');

    // Find book first
    this.findBookForReturn(code);
  }

  findBookForReturn(code: string): void {
    this.searchByKeyword(code, (book: Book) => {
      // Call return API
      this.booksService.returnBook(book.id).subscribe({
        next: () => {
          this.toastr.success(`✓ Đã trả: ${book.name}`, 'Trả sách thành công', {
            timeOut: 2000,
          });
          this.vibrateDevice(200);

          // Auto-resume after 2 seconds
          setTimeout(() => {
            this.scannedResult = '';
            this.foundBook = null;
          }, 2000);
        },
        error: (err) => {
          const errorMsg = err.error?.message || 'Lỗi khi trả sách';
          this.toastr.error(errorMsg, 'Trả sách thất bại');
          this.vibrateDevice(50, 50, 50); // Error vibration pattern

          // Resume after showing error
          setTimeout(() => {
            this.scannedResult = '';
          }, 2000);
        },
      });
    });
  }

  handleInventoryMode(code: string): void {
    if (!this.inventoryStartTime) {
      this.inventoryStartTime = new Date();
    }

    // Find book and add to inventory list
    this.searchByKeyword(code, (book: Book) => {
      const existingIndex = this.inventoryItems.findIndex(
        (item) => item.bookId === book.id,
      );

      if (existingIndex >= 0) {
        this.toastr.warning(
          `Sách "${book.name}" đã được quét trước đó`,
          'Trùng lặp',
          {
            timeOut: 1500,
          },
        );
        this.vibrateDevice(50, 50, 50);
      } else {
        this.inventoryItems.push({
          bookId: book.id,
          bookName: book.name,
          isbn: book.isbn,
          scannedAt: new Date(),
        });

        this.toastr.success(
          `[${this.inventoryItems.length}] ${book.name}`,
          'Đã thêm vào danh sách',
          {
            timeOut: 1500,
          },
        );
        this.vibrateDevice(100);
      }

      // Clear and continue
      this.scannedResult = '';
      this.foundBook = null;
    });
  }

  handleLoanMode(code: string): void {
    if (this.isWaitingForUserScan) {
      // Phase 1: Scan user ID
      const userId = Number(code);
      if (isNaN(userId) || userId <= 0) {
        this.toastr.error(
          'Mã không hợp lệ. Vui lòng quét thẻ người dùng (ID số)',
        );
        this.vibrateDevice(50, 50, 50);
        return;
      }

      // TODO: Fetch user info from API
      this.loanUserId = userId;
      this.loanUserName = `User #${userId}`; // Replace with actual API call
      this.isWaitingForUserScan = false;
      this.loanCart = [];

      this.toastr.success(
        `Đã chọn: ${this.loanUserName}`,
        'Bây giờ quét sách',
        {
          timeOut: 3000,
        },
      );
      this.vibrateDevice(200);

      this.scannedResult = '';
    } else {
      // Phase 2: Scan books
      this.searchByKeyword(code, (book: Book) => {
        const existingIndex = this.loanCart.findIndex(
          (item) => item.book.id === book.id,
        );

        if (existingIndex >= 0) {
          this.toastr.warning(`"${book.name}" đã có trong giỏ`, 'Trùng lặp');
          this.vibrateDevice(50, 50, 50);
        } else {
          this.loanCart.push({
            book: book,
            scannedAt: new Date(),
          });

          this.toastr.success(
            `[${this.loanCart.length}] ${book.name}`,
            'Đã thêm vào giỏ mượn',
            {
              timeOut: 1500,
            },
          );
          this.vibrateDevice(100);
        }

        this.scannedResult = '';
        this.foundBook = null;
      });
    }
  }

  findBook(code: string) {
    this.isLoadingBook = true;
    this.foundBook = null;
    this.searchByKeyword(code, (book) => {
      this.handleBookFound(book);
    });
  }

  searchByKeyword(keyword: string, callback: (book: Book) => void) {
    this.booksService.getPublicBooks(false, keyword, '', 0, 5).subscribe({
      next: (page: any) => {
        const content = page.content || page || [];
        if (content.length === 1) {
          callback(content[0]);
        } else if (content.length > 1) {
          callback(content[0]);
          if (this.currentMode === ScannerMode.SEARCH) {
            this.toastr.info(
              `Có ${content.length} kết quả, đã chọn kết quả đầu tiên.`,
              'Nhiều kết quả',
            );
          }
        } else {
          const asNumber = Number(keyword);
          if (!isNaN(asNumber) && asNumber > 0 && asNumber < 1000000) {
            this.booksService.getBookById(asNumber).subscribe({
              next: (book) => callback(book),
              error: () => {
                this.toastr.error('Không tìm thấy sách nào với mã này.');
                this.isLoadingBook = false;
                if (this.currentMode === ScannerMode.SEARCH) {
                  setTimeout(() => (this.isScanning = true), 3000);
                }
              },
            });
          } else {
            this.toastr.error('Không tìm thấy sách nào với mã này.');
            this.isLoadingBook = false;
            if (this.currentMode === ScannerMode.SEARCH) {
              setTimeout(() => (this.isScanning = true), 3000);
            }
          }
        }
      },
      error: () => {
        this.toastr.error('Lỗi khi tìm kiếm sách.');
        this.isLoadingBook = false;
      },
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
    try {
      const AudioContext =
        window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContext) {
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 800;
        osc.type = 'square';
        osc.start();
        gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.1);
        setTimeout(() => osc.stop(), 100);
      }
    } catch (e) {
      console.error('Không thể phát tiếng bíp', e);
    }
  }

  vibrateDevice(duration: number = 200, ...pattern: number[]): void {
    try {
      if ('vibrate' in navigator) {
        if (pattern.length > 0) {
          // Pattern: [vibrate, pause, vibrate, pause, ...]
          navigator.vibrate([duration, ...pattern]);
        } else {
          navigator.vibrate(duration);
        }
      }
    } catch (e) {
      console.error('Không thể rung thiết bị', e);
    }
  }

  // ========== MODE MANAGEMENT ==========

  changeMode(mode: ScannerMode): void {
    if (this.currentMode === mode) return;

    // Reset state when changing mode
    this.resetScan();
    this.currentMode = mode;

    // Mode-specific setup
    switch (mode) {
      case ScannerMode.INVENTORY:
        this.inventoryItems = [];
        this.inventoryStartTime = new Date();
        this.toastr.info(
          'Bắt đầu quét liên tục. Quét tất cả sách trên kệ.',
          'Chế độ kiểm kê',
        );
        break;
      case ScannerMode.LOAN:
        this.loanCart = [];
        this.loanUserId = undefined;
        this.loanUserName = undefined;
        this.isWaitingForUserScan = true;
        this.toastr.info(
          'Bước 1: Quét thẻ người dùng trước',
          'Chế độ mượn sách',
        );
        break;
      case ScannerMode.QUICK_RETURN:
        this.toastr.info(
          'Quét liên tục để trả sách. Tự động xử lý sau mỗi lần quét.',
          'Chế độ trả nhanh',
        );
        break;
      case ScannerMode.SEARCH:
        this.toastr.info('Quét để tra cứu thông tin sách', 'Chế độ tìm kiếm');
        break;
    }
  }

  // ========== INVENTORY ACTIONS ==========

  finishInventory(): void {
    if (this.inventoryItems.length === 0) {
      this.toastr.warning('Chưa quét sách nào');
      return;
    }

    const duration = this.inventoryStartTime
      ? Math.floor(
          (new Date().getTime() - this.inventoryStartTime.getTime()) / 1000,
        )
      : 0;

    this.toastr.success(
      `Đã quét ${this.inventoryItems.length} cuốn trong ${duration}s`,
      'Kết thúc kiểm kê',
    );

    // TODO: Send to backend for comparison with database
    console.log('Inventory Report:', {
      items: this.inventoryItems,
      totalScanned: this.inventoryItems.length,
      duration: duration,
      startTime: this.inventoryStartTime,
      endTime: new Date(),
    });

    // Download JSON report
    this.downloadInventoryReport();
  }

  downloadInventoryReport(): void {
    const report = {
      inventoryDate: new Date().toISOString(),
      startTime: this.inventoryStartTime?.toISOString(),
      endTime: new Date().toISOString(),
      totalScanned: this.inventoryItems.length,
      items: this.inventoryItems,
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: 'application/json',
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory-report-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  clearInventory(): void {
    if (confirm(`Xóa danh sách ${this.inventoryItems.length} cuốn đã quét?`)) {
      this.inventoryItems = [];
      this.inventoryStartTime = undefined;
      this.toastr.info('Đã xóa danh sách kiểm kê');
    }
  }

  // ========== LOAN ACTIONS ==========

  resetLoanUser(): void {
    this.loanUserId = undefined;
    this.loanUserName = undefined;
    this.loanCart = [];
    this.isWaitingForUserScan = true;
    this.toastr.info('Quét lại thẻ người dùng');
  }

  removeLoanItem(index: number): void {
    const removed = this.loanCart.splice(index, 1);
    this.toastr.info(`Đã xóa: ${removed[0].book.name}`);
  }

  completeLoan(): void {
    if (!this.loanUserId || this.loanCart.length === 0) {
      this.toastr.warning('Cần có người dùng và ít nhất 1 cuốn sách');
      return;
    }

    const bookIds = this.loanCart.map((item) => item.book.id);

    this.toastr.info('Đang tạo phiếu mượn...', 'Xử lý');

    this.booksService.batchCreateLoans(this.loanUserId, bookIds).subscribe({
      next: (response: any) => {
        const successCount = response.successCount || bookIds.length;
        const failureCount = response.failureCount || 0;

        if (failureCount === 0) {
          this.toastr.success(
            `Đã tạo ${successCount} phiếu mượn cho ${this.loanUserName}`,
            'Hoàn tất mượn sách',
            { timeOut: 3000 },
          );
          this.vibrateDevice(200);
        } else {
          this.toastr.warning(
            `Thành công: ${successCount}, Thất bại: ${failureCount}`,
            'Hoàn tất một phần',
            { timeOut: 5000 },
          );
          this.vibrateDevice(100, 50, 100);
        }

        // Reset for next user
        this.resetLoanUser();
      },
      error: (err) => {
        const errorMsg = err.error?.message || 'Lỗi khi tạo phiếu mượn';
        this.toastr.error(errorMsg, 'Tạo phiếu mượn thất bại');
        this.vibrateDevice(50, 50, 50);
      },
    });
  }

  navigateToEdit(bookId: number): void {
    this.router.navigate(['/admin/books/edit', bookId]);
  }

  navigateToCreateLoan(book: Book): void {
    this.router.navigate(['/admin/create-loan'], {
      queryParams: { bookId: book.id },
    });
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
