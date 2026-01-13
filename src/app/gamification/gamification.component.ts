import { Component, OnInit } from '@angular/core';
import {
  GamificationService,
  GamificationStats,
  UserBadge,
  ChallengeProgress,
  LeaderboardEntry,
  ReadingChallenge,
} from '../services/gamification.service';

@Component({
  selector: 'app-gamification',
  standalone: false,
  templateUrl: './gamification.component.html',
  styleUrls: ['./gamification.component.css'],
})
export class GamificationComponent implements OnInit {
  stats: GamificationStats | null = null;
  badges: UserBadge[] = [];
  challenges: ChallengeProgress[] = [];
  leaderboard: LeaderboardEntry[] = [];
  activeChallenges: ReadingChallenge[] = [];

  activeTab: 'stats' | 'badges' | 'challenges' | 'leaderboard' = 'stats';
  loading = true;
  error = '';

  // Level thresholds for progress bar
  levelThresholds = [0, 100, 300, 600, 1000, 1500, 2500];

  constructor(private gamificationService: GamificationService) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading = true;

    // Load stats
    this.gamificationService.getMyStats().subscribe({
      next: (stats) => {
        this.stats = stats;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Không thể tải dữ liệu gamification';
        this.loading = false;
      },
    });

    // Load badges
    this.gamificationService.getMyBadges().subscribe({
      next: (badges) => (this.badges = badges),
    });

    // Load challenges
    this.gamificationService.getMyChallenges().subscribe({
      next: (challenges) => (this.challenges = challenges),
    });

    // Load leaderboard
    this.gamificationService.getLeaderboard(10).subscribe({
      next: (leaderboard) => (this.leaderboard = leaderboard),
    });

    // Load active challenges
    this.gamificationService.getActiveChallenges().subscribe({
      next: (challenges) => (this.activeChallenges = challenges),
    });
  }

  setActiveTab(tab: 'stats' | 'badges' | 'challenges' | 'leaderboard'): void {
    this.activeTab = tab;
  }

  getProgressToNextLevel(): number {
    if (!this.stats) return 0;
    const currentThreshold =
      this.levelThresholds[this.stats.currentLevel - 1] || 0;
    const nextThreshold =
      this.levelThresholds[this.stats.currentLevel] ||
      this.levelThresholds[this.levelThresholds.length - 1];
    const progress = this.stats.totalPoints - currentThreshold;
    const needed = nextThreshold - currentThreshold;
    return Math.min((progress / needed) * 100, 100);
  }

  getPointsToNextLevel(): number {
    if (!this.stats) return 0;
    const nextThreshold =
      this.levelThresholds[this.stats.currentLevel] ||
      this.levelThresholds[this.levelThresholds.length - 1];
    return Math.max(nextThreshold - this.stats.totalPoints, 0);
  }

  joinChallenge(challengeId: number): void {
    this.gamificationService.joinChallenge(challengeId).subscribe({
      next: (progress) => {
        this.challenges.push(progress);
        this.activeChallenges = this.activeChallenges.filter(
          (c) => c.id !== challengeId
        );
      },
      error: (err) => {
        alert(err.error?.message || 'Không thể tham gia thử thách');
      },
    });
  }

  isJoinedChallenge(challengeId: number): boolean {
    return this.challenges.some((c) => c.challenge.id === challengeId);
  }

  getChallengeProgress(challenge: ChallengeProgress): number {
    return (challenge.booksCompleted / challenge.challenge.targetBooks) * 100;
  }

  getLevelBadge(level: number): string {
    const badges = ['🌱', '🌿', '🌳', '⭐', '🌟', '👑'];
    return badges[Math.min(level - 1, badges.length - 1)];
  }
}
