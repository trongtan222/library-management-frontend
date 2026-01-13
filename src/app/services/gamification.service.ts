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

@Injectable({
  providedIn: 'root',
})
export class GamificationService {
  private apiUrl = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  // User endpoints
  getMyStats(): Observable<GamificationStats> {
    return this.http.get<GamificationStats>(
      `${this.apiUrl}/user/gamification/stats`
    );
  }

  getMyBadges(): Observable<UserBadge[]> {
    return this.http.get<UserBadge[]>(
      `${this.apiUrl}/user/gamification/badges`
    );
  }

  getMyChallenges(): Observable<ChallengeProgress[]> {
    return this.http.get<ChallengeProgress[]>(
      `${this.apiUrl}/user/gamification/challenges`
    );
  }

  joinChallenge(challengeId: number): Observable<ChallengeProgress> {
    return this.http.post<ChallengeProgress>(
      `${this.apiUrl}/user/gamification/challenges/${challengeId}/join`,
      {}
    );
  }

  // Public endpoints
  getLeaderboard(limit: number = 10): Observable<LeaderboardEntry[]> {
    return this.http.get<LeaderboardEntry[]>(
      `${this.apiUrl}/public/gamification/leaderboard`,
      {
        params: { limit: limit.toString() },
      }
    );
  }

  getActiveChallenges(): Observable<ReadingChallenge[]> {
    return this.http.get<ReadingChallenge[]>(
      `${this.apiUrl}/public/gamification/challenges/active`
    );
  }

  getAllBadges(): Observable<Badge[]> {
    return this.http.get<Badge[]>(`${this.apiUrl}/public/gamification/badges`);
  }
}
