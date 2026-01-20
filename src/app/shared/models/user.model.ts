/**
 * Standardized User model for the entire application.
 * Handles both regular users and admin users.
 */
export interface User {
  id: number;
  username: string;
  name: string;
  email?: string;
  phoneNumber?: string;
  studentClass?: string;
  className?: string;
  roles: string[];
  active?: boolean;
  createdDate?: Date;
  lastLogin?: Date;
}

/**
 * Adapter to normalize backend user data.
 * Handles field name inconsistencies (userId vs id, etc.)
 *
 * Usage:
 * ```typescript
 * this.http.get<any>('/api/users/1').pipe(
 *   map(UserAdapter.adapt)
 * )
 * ```
 */
export class UserAdapter {
  static adapt(raw: any): User {
    if (!raw) {
      throw new Error('Cannot adapt null or undefined user data');
    }

    return {
      id: raw.userId || raw.id,
      username: raw.username || raw.userName,
      name: raw.name || raw.fullName || raw.username,
      email: raw.email,
      phoneNumber: raw.phoneNumber || raw.phone,
      studentClass: raw.studentClass || raw.className || raw.class,
      className: raw.className || raw.studentClass,
      roles: this.normalizeRoles(raw.roles || raw.role),
      active: raw.active !== undefined ? raw.active : true,
      createdDate: raw.createdDate ? new Date(raw.createdDate) : undefined,
      lastLogin: raw.lastLogin ? new Date(raw.lastLogin) : undefined,
    };
  }

  /**
   * Normalize roles to array of strings
   */
  private static normalizeRoles(roles: any): string[] {
    if (!roles) return [];

    if (Array.isArray(roles)) {
      return roles.map((r) => {
        if (typeof r === 'string') return r;
        if (r.roleName) return r.roleName;
        if (r.authority) return r.authority;
        return String(r);
      });
    }

    if (typeof roles === 'string') {
      return [roles];
    }

    return [];
  }

  /**
   * Adapt array of users
   */
  static adaptMany(rawUsers: any[]): User[] {
    if (!Array.isArray(rawUsers)) {
      return [];
    }
    return rawUsers.map((user) => UserAdapter.adapt(user));
  }
}
