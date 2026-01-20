import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// Components
import { ConfirmDialogComponent } from './components/confirm-dialog/confirm-dialog.component';
import { PaginationComponent } from './components/pagination/pagination.component';

// Pipes
import { TruncatePipe } from './pipes/truncate.pipe';
import { CurrencyVNDPipe } from './pipes/currency-vnd.pipe';
import { TimeAgoPipe } from './pipes/time-ago.pipe';

// Directives
import { HasRoleDirective } from './directives/has-role.directive';

// Services are provided in root, no need to add to providers

/**
 * SharedModule exports all reusable components, pipes, and directives.
 * Import this module in any feature module that needs shared functionality.
 *
 * Usage in feature modules:
 * ```typescript
 * @NgModule({
 *   imports: [
 *     CommonModule,
 *     SharedModule,
 *     // ... other imports
 *   ],
 *   // ... rest of module
 * })
 * export class FeatureModule { }
 * ```
 */
@NgModule({
  declarations: [
    // Components
    ConfirmDialogComponent,
    PaginationComponent,

    // Pipes
    TruncatePipe,
    CurrencyVNDPipe,
    TimeAgoPipe,

    // Directives
    HasRoleDirective,
  ],
  imports: [CommonModule, FormsModule],
  exports: [
    // Re-export common modules
    CommonModule,
    FormsModule,

    // Export our components
    ConfirmDialogComponent,
    PaginationComponent,

    // Export our pipes
    TruncatePipe,
    CurrencyVNDPipe,
    TimeAgoPipe,

    // Export our directives
    HasRoleDirective,
  ],
})
export class SharedModule {}
