// src/app/logout/logout.component.ts
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { UserAuthService } from '../services/user-auth.service';

@Component({
    selector: 'app-logout',
    template: '',
    standalone: false
})
export class LogoutComponent implements OnInit {
  constructor(private router: Router, private auth: UserAuthService) {}
  ngOnInit() {
    this.auth.clear();
    this.router.navigate(['/login']);
  }
}
