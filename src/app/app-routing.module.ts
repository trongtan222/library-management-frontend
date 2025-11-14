import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { BookDetailsComponent } from './book-details/book-details.component';
import { BooksListComponent } from './books-list/books-list.component';
import { BorrowBookComponent } from './borrow-book/borrow-book.component';
import { CreateBookComponent } from './create-book/create-book.component';
import { ForbiddenComponent } from './forbidden/forbidden.component';
import { HomeComponent } from './home/home.component';
import { LoginComponent } from './login/login.component';
import { ReturnBookComponent } from './return-book/return-book.component';
import { UpdateBookComponent } from './update-book/update-book.component';
import { UpdateUserComponent } from './update-user/update-user.component';
import { UserDetailsComponent } from './user-details/user-details.component';
import { UsersListComponent } from './users-list/users-list.component';
import { AuthGuard } from './auth/auth.guard';
import { SignupComponent } from './signup/signup.component';
import { DashboardComponent } from './admin/dashboard/dashboard.component';
import { LoanManagementComponent } from './admin/loan-management/loan-management.component';
import { MyAccountComponent } from './my-account/my-account.component';
import { ManageFinesComponent } from './admin/manage-fines/manage-fines.component';
import { ManageReviewsComponent } from './admin/manage-reviews/manage-reviews.component';
import { CreateUserComponent } from './create-user/create-user.component'; // <-- THÊM IMPORT

const routes: Routes = [
  // ADMIN pages
  { path: 'books', component: BooksListComponent, canActivate: [AuthGuard], data: { roles: ['Admin'] } },
  { path: 'create-book', component: CreateBookComponent, canActivate: [AuthGuard], data: { roles: ['Admin'] } },
  { path: 'update-book/:bookId', component: UpdateBookComponent, canActivate: [AuthGuard], data: { roles: ['Admin'] } },
  { path: 'book-details/:bookId', component: BookDetailsComponent, canActivate: [AuthGuard], data: { roles: ['Admin'] } },
  { path: 'users', component: UsersListComponent, canActivate: [AuthGuard], data: { roles: ['Admin'] } },
  { path: 'create-user', component: CreateUserComponent, canActivate: [AuthGuard], data: { roles: ['Admin'] } }, // <-- THÊM ROUTE
  { path: 'user-details/:userId', component: UserDetailsComponent, canActivate: [AuthGuard], data: { roles: ['Admin'] } },
  { path: 'update-user/:userId', component: UpdateUserComponent, canActivate: [AuthGuard], data: { roles: ['Admin'] } },
  { path: 'admin/dashboard', component: DashboardComponent, canActivate: [AuthGuard], data: { roles: ['Admin'] } },
  { path: 'admin/loans', component: LoanManagementComponent, canActivate: [AuthGuard], data: { roles: ['Admin'] } },
  { path: 'admin/fines', component: ManageFinesComponent, canActivate: [AuthGuard], data: { roles: ['Admin'] } },
  { path: 'admin/reviews', component: ManageReviewsComponent, canActivate: [AuthGuard], data: { roles: ['Admin'] } },
  

  // USER pages
  { path: 'borrow-book', component: BorrowBookComponent, canActivate: [AuthGuard], data: { roles: ['User'] } },
  { path: 'return-book', component: ReturnBookComponent, canActivate: [AuthGuard], data: { roles: ['User'] } },
  { path: 'books/:id', component: BookDetailsComponent, canActivate: [AuthGuard], data: { roles: ['User', 'Admin'] } },
  { path: 'my-account', component: MyAccountComponent, canActivate: [AuthGuard], data: { roles: ['User'] } },

  // public
  { path: 'register', component: SignupComponent },
  { path: 'login', component: LoginComponent },
  { path: 'forbidden', component: ForbiddenComponent },
  { path: '', component: HomeComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }