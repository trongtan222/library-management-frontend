import { HttpClient, HttpHeaders, HttpContext } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { User } from '../models/user';
import { UserAuthService } from './user-auth.service';
import { ApiService, IS_PUBLIC_API } from './api.service';

type RoleLike = string | { roleName?: string };

export interface AuthResponse {
  token?: string;
  userId?: number;
  username?: string;
  name?: string;
  roles?: RoleLike[];
}

@Injectable({ providedIn: 'root' })
export class UsersService {
  
  constructor(
    private http: HttpClient,
    private userAuth: UserAuthService,
    private apiService: ApiService
  ) {}

  // ---------- AUTHENTICATION & REGISTRATION ----------

  public login(credentials: { username: string; password: string }): Observable<AuthResponse> {
    // Login luôn là public
    return this.http.post<AuthResponse>(
      this.apiService.buildUrl('/auth/authenticate'), 
      credentials, 
      { context: new HttpContext().set(IS_PUBLIC_API, true) }
    );
  }

  public register(registerData: any): Observable<any> {
    // Register luôn là public
    return this.http.post(
      this.apiService.buildUrl('/auth/register'), 
      registerData,
      { context: new HttpContext().set(IS_PUBLIC_API, true) }
    );
  }

  public requestPasswordReset(email: string): Observable<any> {
    return this.http.post(
      this.apiService.buildUrl('/auth/forgot-password'),
      { email },
      { context: new HttpContext().set(IS_PUBLIC_API, true) }
    );
  }

  public confirmPasswordReset(payload: { token: string; newPassword: string }): Observable<any> {
    return this.http.post(
      this.apiService.buildUrl('/auth/reset-password'),
      payload,
      { context: new HttpContext().set(IS_PUBLIC_API, true) }
    );
  }

  // ---------- ACCOUNT ----------
  public changePassword(payload: { oldPassword: string; newPassword: string }): Observable<any> {
    return this.http.put(
      this.apiService.buildUrl('/account/password'),
      payload
    );
  }

  // ---------- ROLE HANDLING ----------

  private getNormalizedRoles(): string[] {
    const rawRoles = this.userAuth.getRoles();
    if (!rawRoles) return [];

    return rawRoles.map((role) => {
        const up = role.toUpperCase();
        return up.startsWith('ROLE_') ? up : `ROLE_${up}`;
      });
  }

  public roleMatch(allowedRoles: string[]): boolean {
    if (!allowedRoles || allowedRoles.length === 0) return true;

    const normalizedAllowed = allowedRoles.map((r) => {
      const up = r.toUpperCase();
      return up.startsWith('ROLE_') ? up : `ROLE_${up}`;
    });

    const userRoles = this.getNormalizedRoles();
    if (userRoles.length === 0) return false;

    return userRoles.some((userRole) => normalizedAllowed.includes(userRole));
  }
  
  // ---------- ADMIN USER MANAGEMENT (CRUD) ----------

  getUsersList(): Observable<User[]> {
    return this.http.get<User[]>(this.apiService.buildUrl('/admin/users'));
  }

  createUser(user: any): Observable<any> {
    return this.http.post(this.apiService.buildUrl('/admin/users'), user);
  }

  getUserById(userId: number): Observable<User> {
    return this.http.get<User>(this.apiService.buildUrl(`/admin/users/${userId}`));
  }

  updateUser(userId: number, userDetails: { name: string; username: string; roles: string[] }): Observable<unknown> {
    return this.http.put(this.apiService.buildUrl(`/admin/users/${userId}`), userDetails);
  }

  deleteUser(userId: number): Observable<unknown> {
    return this.http.delete(this.apiService.buildUrl(`/admin/users/${userId}`));
  }

  resetPassword(userId: number): Observable<{ newPassword: string }> {
    return this.http.post<{ newPassword: string }>(
        this.apiService.buildUrl(`/admin/users/${userId}/reset-password`), 
        {}
    );
  }
}