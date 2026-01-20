import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Location } from '@angular/common';

@Component({
  selector: 'app-forbidden',
  templateUrl: './forbidden.component.html',
  styleUrls: ['./forbidden.component.css'],
  standalone: false,
})
export class ForbiddenComponent implements OnInit, OnDestroy {
  countdown = 10; // Auto-redirect after 10 seconds
  private countdownTimer?: ReturnType<typeof setInterval>;
  showReportForm = false;
  reportMessage = '';
  reportSubmitted = false;

  constructor(
    private router: Router,
    private location: Location,
  ) {}

  ngOnInit(): void {
    this.startCountdown();
  }

  ngOnDestroy(): void {
    this.clearTimer();
  }

  startCountdown(): void {
    this.clearTimer();
    this.countdownTimer = setInterval(() => {
      this.countdown--;
      if (this.countdown <= 0) {
        this.clearTimer();
        this.router.navigate(['/']);
      }
    }, 1000);
  }

  clearTimer(): void {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = undefined;
    }
  }

  goBack(): void {
    this.clearTimer();
    this.location.back();
  }

  goHome(): void {
    this.clearTimer();
    this.router.navigate(['/']);
  }

  goToLogin(): void {
    this.clearTimer();
    this.router.navigate(['/login']);
  }

  toggleReportForm(): void {
    this.showReportForm = !this.showReportForm;
    if (this.showReportForm) {
      this.clearTimer(); // Pause countdown when reporting
    }
  }

  submitReport(): void {
    if (!this.reportMessage.trim()) {
      return;
    }

    // TODO: Implement actual API call to send report to admin
    console.log('Report submitted:', {
      message: this.reportMessage,
      url: window.location.href,
      timestamp: new Date().toISOString(),
    });

    this.reportSubmitted = true;
    this.reportMessage = '';

    setTimeout(() => {
      this.showReportForm = false;
      this.reportSubmitted = false;
      this.startCountdown(); // Resume countdown
    }, 3000);
  }

  cancelReport(): void {
    this.showReportForm = false;
    this.reportMessage = '';
    this.startCountdown(); // Resume countdown
  }
}
