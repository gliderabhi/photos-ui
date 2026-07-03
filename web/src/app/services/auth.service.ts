import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';

const API       = '/user-service';
const TOKEN_KEY = 'photos_token';
const USER_KEY  = 'photos_user';

interface AuthResponse { token: string; name?: string; email?: string; role?: string; }
export interface PhotosUser { name: string; email: string; }

// A malformed value here (e.g. from a corrupted/partial write) would otherwise
// throw synchronously inside AuthService's field initializer — during dependency
// injection, not app logic — which can crash unrelated services resolved
// afterward with a confusing cascading NG0203 error instead of a clear cause.
function readStoredUser(): PhotosUser | null {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
  } catch {
    localStorage.removeItem(USER_KEY);
    return null;
  }
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  isLoggedIn = signal(!!localStorage.getItem(TOKEN_KEY));

  private _user = signal<PhotosUser | null>(readStoredUser());
  readonly user = this._user.asReadonly();

  userInitial = computed(() => (this._user()?.name ?? 'P').charAt(0).toUpperCase());

  constructor(private http: HttpClient, private router: Router) {}

  login(email: string, password: string) {
    return this.http.post<AuthResponse>(`${API}/api/auth/login`, { email, password }).pipe(
      tap(res => this.saveSession(res, email))
    );
  }

  googleLogin(idToken: string) {
    return this.http.post<AuthResponse>(`${API}/api/auth/google`, { idToken }).pipe(
      tap(res => this.saveSession(res))
    );
  }

  private saveSession(res: AuthResponse, fallbackEmail?: string) {
    localStorage.setItem(TOKEN_KEY, res.token);
    const u: PhotosUser = {
      name:  res.name  ?? fallbackEmail ?? 'Photos User',
      email: res.email ?? fallbackEmail ?? '',
    };
    localStorage.setItem(USER_KEY, JSON.stringify(u));
    this._user.set(u);
    this.isLoggedIn.set(true);
  }

  logout() {
    this.http.post(`${API}/api/auth/logout`, {}).subscribe({ error: () => {} });
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem('folder_password');
    this._user.set(null);
    this.isLoggedIn.set(false);
    // logout() can be called from AuthInterceptor's error handler, i.e. mid-flight
    // during a route's own HTTP calls — navigating synchronously here can race the
    // Router's in-progress activation of that route (whose standalone component may
    // still be creating its own environment injector) and trigger a spurious
    // NG0200 "Circular dependency detected for StandaloneService". Deferring past
    // the current call stack (and any pending microtasks the activation is using)
    // lets that activation finish first.
    setTimeout(() => this.router.navigate(['/login']), 0);
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }
}
