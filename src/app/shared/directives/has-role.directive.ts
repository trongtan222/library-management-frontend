import {
  Directive,
  Input,
  TemplateRef,
  ViewContainerRef,
  OnInit,
} from '@angular/core';
import { UserAuthService } from '../../services/user-auth.service';

/**
 * Structural directive to conditionally show/hide elements based on user roles.
 *
 * Usage:
 * <button *appHasRole="['ADMIN']">Admin Only Button</button>
 * <div *appHasRole="['ADMIN', 'MANAGER']">Multiple Roles</div>
 *
 * Note: Role names are case-insensitive and automatically normalized.
 * Both "ADMIN" and "admin" will match "ROLE_ADMIN".
 */
@Directive({
  selector: '[appHasRole]',
  standalone: false,
})
export class HasRoleDirective implements OnInit {
  private requiredRoles: string[] = [];
  private hasView = false;

  constructor(
    private templateRef: TemplateRef<any>,
    private viewContainer: ViewContainerRef,
    private authService: UserAuthService,
  ) {}

  @Input()
  set appHasRole(roles: string | string[]) {
    // Normalize input to array
    this.requiredRoles = Array.isArray(roles) ? roles : [roles];
    this.updateView();
  }

  ngOnInit(): void {
    this.updateView();
  }

  private updateView(): void {
    const hasRole = this.checkRole();

    if (hasRole && !this.hasView) {
      // User has required role, show element
      this.viewContainer.createEmbeddedView(this.templateRef);
      this.hasView = true;
    } else if (!hasRole && this.hasView) {
      // User doesn't have required role, hide element
      this.viewContainer.clear();
      this.hasView = false;
    }
  }

  private checkRole(): boolean {
    if (!this.requiredRoles || this.requiredRoles.length === 0) {
      return true; // No role requirements means show to everyone
    }

    // Use UserAuthService.roleMatch() for consistent role checking
    return this.authService.roleMatch(this.requiredRoles);
  }
}
