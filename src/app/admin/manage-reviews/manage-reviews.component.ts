import { Component, OnInit } from '@angular/core';
import { Review, ReviewService } from '../../services/review.service'; 
import { ToastrService } from 'ngx-toastr';

@Component({
    selector: 'app-manage-reviews',
    templateUrl: './manage-reviews.component.html',
    standalone: false
})
export class ManageReviewsComponent implements OnInit {
  reviews: Review[] = [];
  isLoading = true;

  constructor(private reviewService: ReviewService, private toastr: ToastrService) {}

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
      error: () => this.toastr.error('Không thể tải danh sách đánh giá.')
    });
  }

  approve(review: Review): void {
    this.reviewService.approveReview(review.id).subscribe({
      next: (updatedReview) => {
        review.approved = true; // Cập nhật giao diện ngay lập tức
        this.toastr.success(`Đã phê duyệt đánh giá cho sách "${review.bookName}".`);
      },
      error: () => this.toastr.error('Phê duyệt thất bại.')
    });
  }
}