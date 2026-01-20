import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface GamificationStats {
  totalPoints: number;
  currentLevel: number;
  rank: number;
  badgeCount: number;
  booksBorrowedCount: number;
  booksReturnedOnTime: number;
  reviewsWritten: number;
  streakDays: number;
  activeChallenges: number;
  completedChallenges: number;
}

export interface LeaderboardEntry {
  userId: number;
  userName: string;
  totalPoints: number;
  level: number;
  badgeCount: number;
}

export interface Badge {
  id: number;
  code: string;
  nameVi: string;
  nameEn: string;
  descriptionVi: string;
  descriptionEn: string;
  iconUrl: string;
  category: string;
  pointsReward: number;
}

export interface UserBadge {
  id: number;
  badge: Badge;
  earnedAt: string;
}

export interface ReadingChallenge {
  id: number;
  nameVi: string;
  nameEn: string;
  descriptionVi: string;
  descriptionEn: string;
  targetBooks: number;
  pointsReward: number;
  startDate: string;
  endDate: string;
}

export interface ChallengeProgress {
  id: number;
  challenge: ReadingChallenge;
  booksCompleted: number;
  isCompleted: boolean;
  completedAt: string;
  joinedAt: string;
}

export interface RewardItem {
  id: number;
  name: string;
  description: string;
  icon: string;
  cost: number;
  category: 'extension' | 'priority' | 'cosmetic' | 'special';
  available: boolean;
}

export interface DailyQuest {
  id: number;
  title: string;
  description: string;
  points: number;
  completed: boolean;
  progress: number;
  target: number;
}

export interface PointHistory {
  date: string;
  points: number;
  change: number;
  reason: string;
}

@Injectable({
  providedIn: 'root',
})
export class GamificationService {
  private apiUrl = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  // User endpoints
  getMyStats(): Observable<GamificationStats> {
    return this.http.get<GamificationStats>(
      `${this.apiUrl}/user/gamification/stats`,
    );
  }

  getMyBadges(): Observable<UserBadge[]> {
    return this.http.get<UserBadge[]>(
      `${this.apiUrl}/user/gamification/badges`,
    );
  }

  getMyChallenges(): Observable<ChallengeProgress[]> {
    return this.http.get<ChallengeProgress[]>(
      `${this.apiUrl}/user/gamification/challenges`,
    );
  }

  joinChallenge(challengeId: number): Observable<ChallengeProgress> {
    return this.http.post<ChallengeProgress>(
      `${this.apiUrl}/user/gamification/challenges/${challengeId}/join`,
      {},
    );
  }

  // Public endpoints
  getLeaderboard(limit: number = 10): Observable<LeaderboardEntry[]> {
    return this.http.get<LeaderboardEntry[]>(
      `${this.apiUrl}/public/gamification/leaderboard`,
      {
        params: { limit: limit.toString() },
      },
    );
  }

  getActiveChallenges(): Observable<ReadingChallenge[]> {
    return this.http.get<ReadingChallenge[]>(
      `${this.apiUrl}/public/gamification/challenges/active`,
    );
  }

  getAllBadges(): Observable<Badge[]> {
    return this.http.get<Badge[]>(`${this.apiUrl}/public/gamification/badges`);
  }

  // Redemption Store
  getRewardItems(): Observable<{ rewards: RewardItem[]; userPoints: number }> {
    return this.http.get<{ rewards: RewardItem[]; userPoints: number }>(
      `${this.apiUrl}/user/gamification/rewards`,
    );
  }

  redeemReward(
    rewardId: number,
  ): Observable<{ message: string; remainingPoints: number }> {
    return this.http.post<{ message: string; remainingPoints: number }>(
      `${this.apiUrl}/user/gamification/rewards/${rewardId}/redeem`,
      {},
    );
  }

  // Daily Quests
  getDailyQuests(): Observable<{ quests: DailyQuest[] }> {
    return this.http.get<{ quests: DailyQuest[] }>(
      `${this.apiUrl}/user/gamification/daily-quests`,
    );
  }

  updateQuestProgress(
    questType: 'login' | 'search' | 'review',
  ): Observable<void> {
    return this.http.post<void>(
      `${this.apiUrl}/user/gamification/quests/${questType}/progress`,
      {},
    );
  }

  // Point History
  getPointHistory(days: number = 30): Observable<{ history: PointHistory[] }> {
    return this.http.get<{ history: PointHistory[] }>(
      `${this.apiUrl}/user/gamification/point-history?days=${days}`,
    );
  }

  // Streak Freeze
  purchaseStreakFreeze(): Observable<{
    message: string;
    remainingPoints: number;
  }> {
    return this.http.post<{ message: string; remainingPoints: number }>(
      `${this.apiUrl}/user/gamification/streak-freeze`,
      {},
    );
  }
}
