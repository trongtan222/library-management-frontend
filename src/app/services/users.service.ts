import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Users } from '../models/users';
import { UserAuthService } from './user-auth.service';
import { environment } from '../../environments/environment';

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
  private API_URL = `${environment.apiRoot}`;
  private noAuthHeader = new HttpHeaders({ 'No-Auth': 'True' });

  constructor(
    private http: HttpClient,
    private userAuth: UserAuthService
  ) {}

  // ... (các phương thức login, register, roleMatch giữ nguyên) ...

  // ---------- AUTHENTICATION & REGISTRATION ----------

  public login(credentials: { username: string; password: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API_URL}/auth/authenticate`, credentials, {
      headers: this.noAuthHeader,
    });
  }

  public register(registerData: any): Observable<any> {
    return this.http.post(`${this.API_URL}/auth/register`, registerData, { headers: this.noAuthHeader });
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

  getUsersList(): Observable<Users[]> {
    return this.http.get<Users[]>(`${this.API_URL}/admin/users`);
  }

  createUser(user: any): Observable<any> {
    return this.http.post(`${this.API_URL}/admin/users`, user);
  }

  getUserById(userId: number): Observable<Users> {
    return this.http.get<Users>(`${this.API_URL}/admin/users/${userId}`);
  }

  updateUser(userId: number, userDetails: { name: string; username: string; roles: string[] }): Observable<unknown> {
    return this.http.put(`${this.API_URL}/admin/users/${userId}`, userDetails);
  }

  deleteUser(userId: number): Observable<unknown> {
    return this.http.delete(`${this.API_URL}/admin/users/${userId}`);
  }

  resetPassword(userId: number): Observable<{ newPassword: string }> {
    return this.http.post<{ newPassword: string }>(`${this.API_URL}/admin/users/${userId}/reset-password`, {});
  }
}