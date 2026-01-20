import { Component, OnInit } from '@angular/core';
import { Review, ReviewService } from '../../services/review.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-manage-reviews',
  templateUrl: './manage-reviews.component.html',
  styleUrls: ['./manage-reviews.component.css'],
  standalone: false,
})
export class ManageReviewsComponent implements OnInit {
  reviews: Review[] = [];
  isLoading = true;
  statusFilter: 'ALL' | 'PENDING' | 'APPROVED' = 'ALL';
  search = '';

  // Bulk actions
  selectedReviewIds: Set<number> = new Set();

  // Reply
  replyingToReview: Review | null = null;
  replyText: string = '';

  // Text truncation
  expandedReviews: Set<number> = new Set();
  readonly MAX_COMMENT_LENGTH = 100;

  constructor(
    private reviewService: ReviewService,
    private toastr: ToastrService,
  ) {}

  ngOnInit(): void {
    this.loadReviews();
  }

  loadReviews(): void {
    this.isLoading = true;
    this.reviewService.getAllReviews().subscribe({
      next: (data) => {
        this.reviews = data;
        this.isLoading = false;
      },
      error: () => this.toastr.error('Không thể tải danh sách đánh giá.'),
    });
  }

  approve(review: Review): void {
    this.reviewService.approveReview(review.id).subscribe({
      next: (updatedReview) => {
        review.approved = true; // Cập nhật giao diện ngay lập tức
        this.toastr.success(
          `Đã phê duyệt đánh giá cho sách "${review.bookName}".`,
        );
      },
      error: () => this.toastr.error('Phê duyệt thất bại.'),
    });
  }

  delete(review: Review): void {
    if (!confirm('Xóa đánh giá này?')) return;
    this.reviewService.deleteReview(review.id).subscribe({
      next: () => {
        this.reviews = this.reviews.filter((r) => r.id !== review.id);
        this.toastr.success('Đã xóa đánh giá.');
      },
      error: () => this.toastr.error('Xóa đánh giá thất bại.'),
    });
  }

  filtered(): Review[] {
    return this.reviews.filter((r) => {
      const matchStatus =
        this.statusFilter === 'ALL' ||
        (this.statusFilter === 'PENDING' && !r.approved) ||
        (this.statusFilter === 'APPROVED' && !!r.approved);
      const term = this.search.trim().toLowerCase();
      const matchText =
        !term ||
        r.bookName?.toLowerCase().includes(term) ||
        r.userName?.toLowerCase().includes(term) ||
        r.comment?.toLowerCase().includes(term);
      return matchStatus && matchText;
    });
  }

  // === BULK ACTIONS ===
  toggleSelection(reviewId: number): void {
    if (this.selectedReviewIds.has(reviewId)) {
      this.selectedReviewIds.delete(reviewId);
    } else {
      this.selectedReviewIds.add(reviewId);
    }
  }

  selectAll(): void {
    const filteredReviews = this.filtered();
    if (this.selectedReviewIds.size === filteredReviews.length) {
      this.selectedReviewIds.clear();
    } else {
      filteredReviews.forEach((r) => this.selectedReviewIds.add(r.id));
    }
  }

  isSelected(reviewId: number): boolean {
    return this.selectedReviewIds.has(reviewId);
  }

  getSelectedCount(): number {
    return this.selectedReviewIds.size;
  }

  canBulkAction(): boolean {
    return this.selectedReviewIds.size > 0;
  }

  bulkApprove(): void {
    if (!this.canBulkAction()) return;
    const ids = Array.from(this.selectedReviewIds);
    if (!confirm(`Duyệt ${ids.length} đánh giá đã chọn?`)) return;

    this.reviewService.bulkApprove(ids).subscribe({
      next: () => {
        ids.forEach((id) => {
          const review = this.reviews.find((r) => r.id === id);
          if (review) review.approved = true;
        });
        this.toastr.success(`Đã duyệt ${ids.length} đánh giá`);
        this.selectedReviewIds.clear();
      },
      error: () => this.toastr.error('Duyệt hàng loạt thất bại'),
    });
  }

  bulkDelete(): void {
    if (!this.canBulkAction()) return;
    const ids = Array.from(this.selectedReviewIds);
    if (!confirm(`XÓA ${ids.length} đánh giá đã chọn? Không thể hoàn tác!`))
      return;

    this.reviewService.bulkDelete(ids).subscribe({
      next: () => {
        this.reviews = this.reviews.filter((r) => !ids.includes(r.id));
        this.toastr.success(`Đã xóa ${ids.length} đánh giá`);
        this.selectedReviewIds.clear();
      },
      error: () => this.toastr.error('Xóa hàng loạt thất bại'),
    });
  }

  // === ADMIN REPLY ===
  openReplyForm(review: Review): void {
    this.replyingToReview = review;
    this.replyText = review.adminReply || '';
  }

  cancelReply(): void {
    this.replyingToReview = null;
    this.replyText = '';
  }

  saveReply(): void {
    if (!this.replyingToReview || !this.replyText.trim()) {
      this.toastr.warning('Vui lòng nhập nội dung trả lời');
      return;
    }

    this.reviewService
      .addAdminReply(this.replyingToReview.id, this.replyText)
      .subscribe({
        next: (updated) => {
          const idx = this.reviews.findIndex((r) => r.id === updated.id);
          if (idx !== -1) this.reviews[idx] = updated;
          this.toastr.success('Đã thêm trả lời');
          this.cancelReply();
        },
        error: () => this.toastr.error('Thêm trả lời thất bại'),
      });
  }

  // === UI HELPERS ===
  getStarArray(rating: number): boolean[] {
    return Array.from({ length: 5 }, (_, i) => i < rating);
  }

  getTruncatedComment(review: Review): string {
    if (!review.comment) return '-';
    if (
      this.expandedReviews.has(review.id) ||
      review.comment.length <= this.MAX_COMMENT_LENGTH
    ) {
      return review.comment;
    }
    return review.comment.slice(0, this.MAX_COMMENT_LENGTH) + '...';
  }

  toggleCommentExpansion(reviewId: number): void {
    if (this.expandedReviews.has(reviewId)) {
      this.expandedReviews.delete(reviewId);
    } else {
      this.expandedReviews.add(reviewId);
    }
  }

  isCommentExpanded(reviewId: number): boolean {
    return this.expandedReviews.has(reviewId);
  }

  isCommentLong(comment: string): boolean {
    return !!comment && comment.length > this.MAX_COMMENT_LENGTH;
  }
}
