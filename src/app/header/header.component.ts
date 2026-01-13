import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { UserAuthService } from '../services/user-auth.service';
import { ThemeService } from '../services/theme.service';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css'],
  standalone: false,
})
export class HeaderComponent implements OnInit {
  currentTheme: 'light' | 'dark' = 'dark';

  constructor(
    public userAuthService: UserAuthService, // public de dung truc tiep trong template
    public themeService: ThemeService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.currentTheme = this.themeService.getCurrentTheme();
    this.themeService.theme$.subscribe((theme) => {
      this.currentTheme = theme;
    });
  }

  public isLoggedIn(): boolean {
    return this.userAuthService.isLoggedIn();
  }

  public toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  public getUserName(): string | null {
    return this.userAuthService.getName();
  }

  public getUserInitial(): string {
    const name = this.getUserName();
    if (!name) {
      return '?';
    }
    return name.trim().charAt(0).toUpperCase();
  }

  public logout(): void {
    this.router.navigate(['/logout']);
  }

  public isAdmin(): boolean {
    return this.userAuthService.isAdmin();
  }

  public isUser(): boolean {
    return this.userAuthService.isUser();
  }
}
