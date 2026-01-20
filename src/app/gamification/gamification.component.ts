import { Component, OnInit } from '@angular/core';
import confetti from 'canvas-confetti';
import {
  GamificationService,
  GamificationStats,
  UserBadge,
  ChallengeProgress,
  LeaderboardEntry,
  ReadingChallenge,
  RewardItem,
  DailyQuest,
  PointHistory,
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
  rewardItems: RewardItem[] = [];
  dailyQuests: DailyQuest[] = [];
  pointHistory: PointHistory[] = [];

  activeTab:
    | 'stats'
    | 'badges'
    | 'challenges'
    | 'leaderboard'
    | 'rewards'
    | 'quests' = 'stats';
  loading = true;
  error = '';
  previousLevel = 0;

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
        // Check for level up
        if (this.previousLevel > 0 && stats.currentLevel > this.previousLevel) {
          this.celebrateLevelUp(stats.currentLevel);
        }
        this.previousLevel = stats.currentLevel;
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

    // Load reward items
    this.gamificationService.getRewardItems().subscribe({
      next: (response) => (this.rewardItems = response.rewards),
      error: (err) => {
        console.error('Failed to load rewards:', err);
        this.rewardItems = [];
      },
    });

    // Load daily quests
    this.gamificationService.getDailyQuests().subscribe({
      next: (response) => (this.dailyQuests = response.quests),
      error: (err) => {
        console.error('Failed to load quests:', err);
        this.dailyQuests = [];
      },
    });

    // Load point history for chart
    this.gamificationService.getPointHistory(30).subscribe({
      next: (response) => (this.pointHistory = response.history),
      error: (err) => {
        console.error('Failed to load point history:', err);
        this.pointHistory = [];
      },
    });
  }

  setActiveTab(
    tab:
      | 'stats'
      | 'badges'
      | 'challenges'
      | 'leaderboard'
      | 'rewards'
      | 'quests',
  ): void {
    this.activeTab = tab;
  }

  // Level Up Celebration with Confetti
  celebrateLevelUp(newLevel: number): void {
    const duration = 3000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#FFD700', '#FFA500', '#FF6347'],
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#FFD700', '#FFA500', '#FF6347'],
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();

    // Show level up message
    const levelName = this.getLevelName(newLevel);
    alert(`🎉 Chúc mừng! Bạn đã đạt Cấp ${newLevel} - ${levelName}!`);
  }

  getLevelName(level: number): string {
    const names = [
      'Người mới',
      'Độc giả tập sự',
      'Mọt sách',
      'Chuyên gia đọc',
      'Bậc thầy văn chương',
      'Huyền thoại thư viện',
    ];
    return names[Math.min(level, names.length) - 1] || names[names.length - 1];
  }

  // Reward redemption
  redeemReward(item: RewardItem): void {
    if (!this.stats || this.stats.totalPoints < item.cost) {
      alert('Bạn không đủ điểm để đổi phần thưởng này!');
      return;
    }

    if (
      !confirm(`Bạn có chắc muốn đổi ${item.cost} điểm lấy "${item.name}"?`)
    ) {
      return;
    }

    this.gamificationService.redeemReward(item.id).subscribe({
      next: (result) => {
        alert(result.message);
        if (this.stats) {
          this.stats.totalPoints = result.remainingPoints;
        }
        this.loadData();
      },
      error: (err) => {
        alert(err.error?.message || 'Không thể đổi phần thưởng');
      },
    });
  }

  purchaseStreakFreeze(): void {
    if (!confirm('Bạn có muốn mua "Đóng băng chuỗi" với 200 điểm?')) {
      return;
    }

    this.gamificationService.purchaseStreakFreeze().subscribe({
      next: (result) => {
        alert(result.message);
        this.loadData();
      },
      error: (err) => {
        alert(err.error?.message || 'Không thể mua streak freeze');
      },
    });
  }

  // Share to social media
  shareToFacebook(): void {
    if (!this.stats) return;
    const text = `Tôi đã đạt Cấp ${this.stats.currentLevel} với ${this.stats.totalPoints} điểm trên Thư viện THCS Phương Tú! 📚🎉`;
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}&quote=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'width=600,height=400');
  }

  // Mock data helpers (for frontend development)
  getMockRewardItems(): RewardItem[] {
    return [
      {
        id: 1,
        name: 'Vé Gia Hạn',
        description: 'Gia hạn thêm 7 ngày miễn phí phạt',
        icon: '🎫',
        cost: 500,
        category: 'extension',
        available: true,
      },
      {
        id: 2,
        name: 'Ưu Tiên Đặt Trước',
        description: 'Xếp hàng đầu tiên khi đặt sách hot',
        icon: '⭐',
        cost: 1000,
        category: 'priority',
        available: true,
      },
      {
        id: 3,
        name: 'Khung Avatar Vàng',
        description: 'Khung ảnh đại diện màu vàng sang trọng',
        icon: '🖼️',
        cost: 800,
        category: 'cosmetic',
        available: true,
      },
      {
        id: 4,
        name: 'Đóng Băng Chuỗi',
        description: 'Bảo vệ chuỗi đăng nhập của bạn 1 ngày',
        icon: '❄️',
        cost: 200,
        category: 'special',
        available: true,
      },
    ];
  }

  getMockDailyQuests(): DailyQuest[] {
    return [
      {
        id: 1,
        title: 'Đăng nhập hàng ngày',
        description: 'Đăng nhập vào ứng dụng',
        points: 10,
        completed: true,
        progress: 1,
        target: 1,
      },
      {
        id: 2,
        title: 'Tìm kiếm sách',
        description: 'Tìm kiếm ít nhất 1 cuốn sách',
        points: 5,
        completed: false,
        progress: 0,
        target: 1,
      },
      {
        id: 3,
        title: 'Viết đánh giá',
        description: 'Viết đánh giá cho 1 cuốn sách',
        points: 20,
        completed: false,
        progress: 0,
        target: 1,
      },
    ];
  }

  getMockPointHistory(): PointHistory[] {
    const history: PointHistory[] = [];
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const change = Math.floor(Math.random() * 50) - 10;
      const points = 500 + (29 - i) * 10 + change;
      history.push({
        date: date.toISOString().split('T')[0],
        points,
        change,
        reason: change > 0 ? 'Mượn sách' : 'Trả sách đúng hạn',
      });
    }
    return history;
  }

  getPointHistoryChart(): string {
    if (this.pointHistory.length === 0) return 'M 0 100 L 100 100';
    const maxPoints = Math.max(...this.pointHistory.map((h) => h.points));
    const minPoints = Math.min(...this.pointHistory.map((h) => h.points));
    const range = maxPoints - minPoints || 1;

    const points = this.pointHistory.map((h, i) => {
      const x = (i / (this.pointHistory.length - 1)) * 100;
      const y = 100 - ((h.points - minPoints) / range) * 80;
      return `${x},${y}`;
    });

    return `M ${points.join(' L ')}`;
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
          (c) => c.id !== challengeId,
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
