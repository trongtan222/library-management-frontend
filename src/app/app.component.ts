import { Component } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { ThemeService } from './services/theme.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  standalone: false,
})
export class AppComponent {
  isHomeRoute = false;
  title = 'lms-frontend';

  constructor(private router: Router, private themeService: ThemeService) {
    this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe(() => this.updateFlag());
    this.updateFlag(); // set lần đầu khi load trang
  }

  private updateFlag() {
    const url = this.router.url.split('?')[0];
    // chỉnh danh sách path được coi là Home nếu bạn dùng route khác
    this.isHomeRoute = url === '/' || url === '/home';
  }
}
