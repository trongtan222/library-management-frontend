import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { Location } from '@angular/common'; // Import Location để quay lại trang cũ
import { UserAuthService } from '../services/user-auth.service';

@Component({
  selector: 'app-logout',
  templateUrl: './logout.component.html',
  styleUrls: ['./logout.component.css'],
  standalone: false
})
export class LogoutComponent {

  constructor(
    private router: Router,
    private auth: UserAuthService,
    private location: Location
  ) {
    console.log('Logout Component đã được khởi tạo!');
  }

  // Không thực hiện đăng xuất ngay lập tức ở ngOnInit nữa

  onConfirm() {
    // Xóa token và thông tin người dùng
    this.auth.clear();
    
    // Điều hướng về trang đăng nhập
    this.router.navigate(['/login']);
  }

  onCancel() {
    // Quay lại trang trước đó nếu người dùng đổi ý
    this.location.back();
  }
}