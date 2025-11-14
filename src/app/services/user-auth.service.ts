// src/app/_service/user-auth.service.ts

import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class UserAuthService {
  private ROLES_KEY = 'roles';
  private TOKEN_KEY = 'jwtToken';
  private USER_ID_KEY = 'userId';
  private NAME_KEY = 'name';

  constructor() {}

  // --- LƯU TRỮ THÔNG TIN ---
  public setRoles(roles: Array<string | { roleName?: string }>) {
    const normalized = (roles ?? [])
      .map(r => (typeof r === 'string' ? r : r?.roleName))
      .filter((v): v is string => !!v);
    localStorage.setItem(this.ROLES_KEY, JSON.stringify(normalized));
  }

  public setToken(jwtToken: string) {
    localStorage.setItem(this.TOKEN_KEY, jwtToken);
  }

  public setUserId(userId: number) {
    localStorage.setItem(this.USER_ID_KEY, String(userId));
  }

  public setName(name: string) {
    localStorage.setItem(this.NAME_KEY, name);
  }

  // --- TRUY XUẤT THÔNG TIN ---
  public getRoles(): string[] {
    const raw = localStorage.getItem(this.ROLES_KEY);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  public getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  public getUserId(): number | null {
    const s = localStorage.getItem(this.USER_ID_KEY);
    return s != null ? Number(s) : null;
  }

  public getName(): string | null {
    return localStorage.getItem(this.NAME_KEY);
  }
  
  // --- CÁC HÀM TIỆN ÍCH ---
  public clear() {
    localStorage.removeItem(this.ROLES_KEY);
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_ID_KEY);
    localStorage.removeItem(this.NAME_KEY);
  }

  public isLoggedIn(): boolean {
    return !!this.getToken();
  }

  // --- KIỂM TRA QUYỀN ---
  public isAdmin(): boolean {
    const roles = this.getRoles();
    return roles.includes('Admin') || roles.includes('ROLE_ADMIN');
  }

  public isUser(): boolean {
    const roles = this.getRoles();
    return roles.includes('User') || roles.includes('ROLE_USER');
  }

  public roleMatch(allowedRoles: string[]): boolean {
    if (!allowedRoles || allowedRoles.length === 0) return true;

    const normalizedAllowed = allowedRoles.map((r) => {
      const up = r.toUpperCase();
      return up.startsWith('ROLE_') ? up : `ROLE_${up}`;
    });

    const userRoles = this.getRoles().map(r => r.toUpperCase());
    if (userRoles.length === 0) return false;

    return userRoles.some((userRole) => normalizedAllowed.includes(userRole));
  }
}