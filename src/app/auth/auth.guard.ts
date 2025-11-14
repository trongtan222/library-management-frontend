import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { UserAuthService } from '../services/user-auth.service';
import { UsersService } from '../services/users.service';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(
    private userAuthService: UserAuthService,
    private router: Router,
    private userService: UsersService
  ) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | UrlTree {
    const token = this.userAuthService.getToken();
    if (!token) {
      return this.router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url }});
    }

    const needRoles = route.data['roles'] as string[] | undefined;
    if (!needRoles || needRoles.length === 0) return true;

    const ok = this.userService.roleMatch(needRoles);
    return ok ? true : this.router.createUrlTree(['/forbidden']);
  }
}
