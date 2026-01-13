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
import { LogoutComponent } from './logout/logout.component';
import { CreateLoanComponent } from './admin/create-loan/create-loan.component';
import { WishlistComponent } from './wishlist/wishlist.component';
import { AdminScannerComponent } from './admin/admin-scanner/admin-scanner.component';
import { ForgotPasswordComponent } from './forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './reset-password/reset-password.component';
import { AdminSettingsComponent } from './admin/admin-settings/admin-settings.component';
import { ManageCategoriesComponent } from './admin/manage-categories/manage-categories.component';
import { ManageAuthorsComponent } from './admin/manage-authors/manage-authors.component';
import { ImportExportComponent } from './admin/import-export/import-export.component';
import { AdminNewsComponent } from './admin/admin-news/admin-news.component';
import { RenewalsComponent } from './admin/renewals/renewals.component';
import { RulesComponent } from './rules/rules.component';
import { GamificationComponent } from './gamification/gamification.component';

const routes: Routes = [
  // ADMIN pages
  {
    path: 'books',
    component: BooksListComponent,
    canActivate: [AuthGuard],
    data: { roles: ['ROLE_ADMIN'] },
  },
  {
    path: 'create-book',
    component: CreateBookComponent,
    canActivate: [AuthGuard],
    data: { roles: ['ROLE_ADMIN'] },
  },
  {
    path: 'update-book/:bookId',
    component: UpdateBookComponent,
    canActivate: [AuthGuard],
    data: { roles: ['ROLE_ADMIN'] },
  },
  {
    path: 'book-details/:bookId',
    component: BookDetailsComponent,
    canActivate: [AuthGuard],
    data: { roles: ['ROLE_ADMIN'] },
  },
  {
    path: 'users',
    component: UsersListComponent,
    canActivate: [AuthGuard],
    data: { roles: ['ROLE_ADMIN'] },
  },
  {
    path: 'create-user',
    component: CreateUserComponent,
    canActivate: [AuthGuard],
    data: { roles: ['ROLE_ADMIN'] },
  }, // <-- THÊM ROUTE
  {
    path: 'user-details/:userId',
    component: UserDetailsComponent,
    canActivate: [AuthGuard],
    data: { roles: ['ROLE_ADMIN'] },
  },
  {
    path: 'update-user/:userId',
    component: UpdateUserComponent,
    canActivate: [AuthGuard],
    data: { roles: ['ROLE_ADMIN'] },
  },
  {
    path: 'admin/dashboard',
    component: DashboardComponent,
    canActivate: [AuthGuard],
    data: { roles: ['ROLE_ADMIN'] },
  },
  {
    path: 'admin/loans',
    component: LoanManagementComponent,
    canActivate: [AuthGuard],
    data: { roles: ['ROLE_ADMIN'] },
  },
  {
    path: 'admin/fines',
    component: ManageFinesComponent,
    canActivate: [AuthGuard],
    data: { roles: ['ROLE_ADMIN'] },
  },
  {
    path: 'admin/reviews',
    component: ManageReviewsComponent,
    canActivate: [AuthGuard],
    data: { roles: ['ROLE_ADMIN'] },
  },
  {
    path: 'admin/categories',
    component: ManageCategoriesComponent,
    canActivate: [AuthGuard],
    data: { roles: ['ROLE_ADMIN'] },
  },
  {
    path: 'admin/authors',
    component: ManageAuthorsComponent,
    canActivate: [AuthGuard],
    data: { roles: ['ROLE_ADMIN'] },
  },
  {
    path: 'admin/import-export',
    component: ImportExportComponent,
    canActivate: [AuthGuard],
    data: { roles: ['ROLE_ADMIN'] },
  },
  {
    path: 'admin/news',
    component: AdminNewsComponent,
    canActivate: [AuthGuard],
    data: { roles: ['ROLE_ADMIN'] },
  },
  {
    path: 'admin/create-loan',
    component: CreateLoanComponent,
    canActivate: [AuthGuard],
    data: { roles: ['ROLE_ADMIN'] },
  },
  {
    path: 'admin/scanner',
    component: AdminScannerComponent,
    canActivate: [AuthGuard],
    data: { roles: ['ROLE_ADMIN'] },
  },
  {
    path: 'admin/settings',
    component: AdminSettingsComponent,
    canActivate: [AuthGuard],
    data: { roles: ['ROLE_ADMIN'] },
  },
  {
    path: 'admin/renewals',
    component: RenewalsComponent,
    canActivate: [AuthGuard],
    data: { roles: ['ROLE_ADMIN'] },
  },

  // USER pages
  {
    path: 'borrow-book',
    component: BorrowBookComponent,
    canActivate: [AuthGuard],
    data: { roles: ['ROLE_USER', 'ROLE_ADMIN'] },
  },
  {
    path: 'return-book',
    component: ReturnBookComponent,
    canActivate: [AuthGuard],
    data: { roles: ['ROLE_USER', 'ROLE_ADMIN'] },
  },
  {
    path: 'books/:id',
    component: BookDetailsComponent,
    canActivate: [AuthGuard],
    data: { roles: ['ROLE_USER', 'ROLE_ADMIN'] },
  },
  {
    path: 'my-account',
    component: MyAccountComponent,
    canActivate: [AuthGuard],
    data: { roles: ['ROLE_USER', 'ROLE_ADMIN'] },
  },
  {
    path: 'wishlist',
    component: WishlistComponent,
    canActivate: [AuthGuard],
    data: { roles: ['ROLE_USER', 'ROLE_ADMIN'] },
  },
  {
    path: 'gamification',
    component: GamificationComponent,
    canActivate: [AuthGuard],
    data: { roles: ['ROLE_USER', 'ROLE_ADMIN'] },
  },

  // public
  { path: 'register', component: SignupComponent },
  { path: 'login', component: LoginComponent },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'reset-password', component: ResetPasswordComponent },
  { path: 'logout', component: LogoutComponent },
  { path: 'forbidden', component: ForbiddenComponent },
  { path: '', component: HomeComponent },
  { path: 'rules', component: RulesComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
