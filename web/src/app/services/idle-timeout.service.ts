import { Injectable, OnDestroy, inject, signal } from '@angular/core';
import { AuthService } from './auth.service';

const IDLE_TIMEOUT_MS = 30 * 60 * 1000;  // 30 minutes
const WARN_BEFORE_MS  =  2 * 60 * 1000;  // 2 minutes

const ACTIVITY_EVENTS = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll'] as const;

@Injectable({ providedIn: 'root' })
export class IdleTimeoutService implements OnDestroy {
  private auth = inject(AuthService);

  private warnTimer?: ReturnType<typeof setTimeout>;
  private countdownInterval?: ReturnType<typeof setInterval>;

  private _showWarning = signal(false);
  private _countdown   = signal(0);

  readonly showWarning = this._showWarning.asReadonly();
  readonly countdown   = this._countdown.asReadonly();

  private readonly boundReset = () => this.resetOnActivity();

  start(): void {
    ACTIVITY_EVENTS.forEach(e => document.addEventListener(e, this.boundReset, { passive: true }));
    this.schedule();
  }

  stop(): void {
    ACTIVITY_EVENTS.forEach(e => document.removeEventListener(e, this.boundReset));
    this.clearTimers();
    this._showWarning.set(false);
  }

  stayLoggedIn(): void {
    this.clearTimers();
    this._showWarning.set(false);
    this.schedule();
  }

  private resetOnActivity(): void {
    if (this._showWarning()) return;
    clearTimeout(this.warnTimer);
    this.schedule();
  }

  private schedule(): void {
    this.warnTimer = setTimeout(() => this.beginCountdown(), IDLE_TIMEOUT_MS - WARN_BEFORE_MS);
  }

  private beginCountdown(): void {
    this._showWarning.set(true);
    let remaining = Math.floor(WARN_BEFORE_MS / 1000);
    this._countdown.set(remaining);

    this.countdownInterval = setInterval(() => {
      remaining--;
      this._countdown.set(remaining);
      if (remaining <= 0) {
        this.clearTimers();
        this._showWarning.set(false);
        this.auth.logout();
      }
    }, 1000);
  }

  private clearTimers(): void {
    clearTimeout(this.warnTimer);
    clearInterval(this.countdownInterval);
  }

  ngOnDestroy(): void {
    this.stop();
  }
}
