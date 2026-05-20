import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs';
import type { AuthTokens } from './auth.models';
import { parseIsAdmin, parseRole } from './auth.utils';

const STORAGE_KEY = 'physis_tokens';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly _tokens = signal<AuthTokens | null>(this.loadFromStorage());

  readonly isAuthenticated = computed(() => this._tokens() !== null);
  readonly currentUserName = computed(() => this._tokens()?.userName ?? null);
  readonly accessToken = computed(() => this._tokens()?.accessToken ?? null);
  readonly isAdmin = computed(() => {
    const token = this._tokens()?.accessToken;
    return token ? parseIsAdmin(token) : false;
  });
  readonly userRole = computed(() => {
    const token = this._tokens()?.accessToken;
    return token ? parseRole(token) : null;
  });

  register(email: string, userName: string, password: string, role: 'Student' | 'Teacher') {
    return this.http
      .post<AuthTokens>('/api/auth/register', { email, userName, password, role })
      .pipe(tap(tokens => this.persist(tokens)));
  }

  login(email: string, password: string) {
    return this.http
      .post<AuthTokens>('/api/auth/login', { email, password })
      .pipe(tap(tokens => this.persist(tokens)));
  }

  refresh() {
    const tokens = this._tokens();
    if (!tokens) return null;
    return this.http
      .post<AuthTokens>('/api/auth/refresh', { refreshToken: tokens.refreshToken })
      .pipe(tap(updated => this.persist(updated)));
  }

  logout(): void {
    localStorage.removeItem(STORAGE_KEY);
    this._tokens.set(null);
    this.router.navigate(['/login']);
  }

  private persist(tokens: AuthTokens): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
    this._tokens.set(tokens);
  }

  private loadFromStorage(): AuthTokens | null {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AuthTokens;
    } catch {
      return null;
    }
  }
}
