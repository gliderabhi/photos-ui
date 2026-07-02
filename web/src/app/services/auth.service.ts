import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';

const API       = '/user-service';
const TOKEN_KEY = 'photos_token';
const USER_KEY  = 'photos_user';

interface AuthResponse { token: string; name?: string; email?: string; role?: string; }
export interface PhotosUser { name: string; email: string; }

@Injectable({ providedIn: 'root' })
export class AuthService {
  isLoggedIn = signal(!!localStorage.getItem(TOKEN_KEY));

  private _user = signal<PhotosUser | null>(
    JSON.parse(localStorage.getItem(USER_KEY) || 'null')
  );
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
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }
}
