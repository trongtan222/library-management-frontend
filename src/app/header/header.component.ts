import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { UserAuthService } from '../services/user-auth.service';

@Component({
    selector: 'app-header',
    templateUrl: './header.component.html',
    styleUrls: ['./header.component.css'],
    standalone: false
})
export class HeaderComponent implements OnInit {

  constructor(
    public userAuthService: UserAuthService, // public de dung truc tiep trong template
    private router: Router
  ) { }

  ngOnInit(): void { }

  public isLoggedIn(): boolean {
    return this.userAuthService.isLoggedIn();
  }

  public getUserName(): string | null {
    return this.userAuthService.getName();
  }

  public logout(): void {
    this.userAuthService.clear();
    this.router.navigate(['/']);
  }

  public isAdmin(): boolean {
    return this.userAuthService.isAdmin();
  }

  public isUser(): boolean {
    return this.userAuthService.isUser();
  }
}