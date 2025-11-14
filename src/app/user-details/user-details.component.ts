import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Users } from '../models/users';
import { BorrowService } from '../services/borrow.service';
import { UsersService } from '../services/users.service';
import { LoanDetails } from '../services/admin.service';

@Component({
    selector: 'app-user-details',
    templateUrl: './user-details.component.html',
    styleUrls: ['./user-details.component.css'],
    standalone: false
})
export class UserDetailsComponent implements OnInit {

  id!: number;
  borrow: LoanDetails[] = [];
  user!: Users;

  constructor(
    private route: ActivatedRoute,
    private borrowService: BorrowService,
    public userService: UsersService
  ) {}

  ngOnInit(): void {
    this.id = +this.route.snapshot.params['userId'];

    this.user = new Users();
    this.userService.getUserById(this.id).subscribe((data: Users) => {
      this.user = data;
    });

    this.getBorrowedByUser(this.id);
  }

  private getBorrowedByUser(userId: number) {
    this.borrowService.getLoansByMemberId(userId).subscribe((data: LoanDetails[]) => {
      this.borrow = data;
    });
  }
}