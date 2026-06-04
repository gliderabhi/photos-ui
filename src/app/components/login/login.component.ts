import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div style="position:fixed;top:0;left:0;width:100vw;height:100vh;overflow:hidden;">

      <!-- Full screen background image -->
      <img src="/trucks.jpg" style="width:100%;height:100%;object-fit:cover;object-position:center;display:block;" />

      <!-- Top center info bar -->
      <div style="position:absolute;top:0;left:0;right:0;z-index:10;display:flex;flex-direction:column;align-items:center;padding:20px 40px;">
        <h1 style="margin:0;font-size:18px;font-weight:700;color:#edeff2;letter-spacing:0.01em;text-align:center;">
          Welcome to Photos — Your Private Photo Vault
        </h1>
        <p style="margin:6px 0 0 0;font-size:11px;color:#fcfdfe;font-weight:500;text-align:center;max-width:640px;line-height:1.6;">
          Photos is a secure, private photo storage application. Your photos are protected by end-to-end folder encryption.
          Please sign in with your credentials to access your gallery.
        </p>
      </div>

      <!-- Login form — right side -->
      <div style="position:absolute;top:0;right:0;bottom:0;width:380px;z-index:20;display:flex;align-items:center;justify-content:center;">
        <div style="width:100%;height:100%;padding:0 40px;display:flex;flex-direction:column;justify-content:center;background:rgba(255,255,255,0.92);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);box-shadow:-8px 0 40px rgba(0,0,0,0.2);">

          <div style="margin-bottom:32px;">
            <h2 style="margin:0 0 6px 0;font-size:26px;font-weight:700;color:#1e293b;">Sign In</h2>
            <p style="margin:0;font-size:13px;color:#64748b;">Enter your credentials to continue</p>
          </div>

          <form [formGroup]="form" (ngSubmit)="submit()" style="display:flex;flex-direction:column;gap:20px;">

            <div style="display:flex;flex-direction:column;gap:6px;">
              <label style="font-size:13px;font-weight:600;color:#374151;">Email Address</label>
              <input
                formControlName="email"
                type="email"
                placeholder="you@example.com"
                style="padding:11px 14px;font-size:14px;border:1.5px solid #e2e8f0;border-radius:8px;outline:none;background:#f8fafc;color:#1e293b;"
                (focus)="$any($event.target).style.borderColor='#2563eb'"
                (blur)="$any($event.target).style.borderColor='#e2e8f0'"
              />
            </div>

            <div style="display:flex;flex-direction:column;gap:6px;">
              <label style="font-size:13px;font-weight:600;color:#374151;">Password</label>
              <input
                formControlName="password"
                type="password"
                placeholder="••••••••"
                style="padding:11px 14px;font-size:14px;border:1.5px solid #e2e8f0;border-radius:8px;outline:none;background:#f8fafc;color:#1e293b;"
                (focus)="$any($event.target).style.borderColor='#2563eb'"
                (blur)="$any($event.target).style.borderColor='#e2e8f0'"
              />
            </div>

            @if (error) {
              <div style="padding:10px 14px;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;font-size:13px;color:#dc2626;">
                {{ error }}
              </div>
            }

            <button
              type="submit"
              [disabled]="loading || form.invalid"
              style="margin-top:4px;padding:13px;font-size:15px;font-weight:600;color:#fff;background:linear-gradient(135deg,#2563eb,#1d4ed8);border:none;border-radius:8px;cursor:pointer;letter-spacing:0.02em;"
              [style.opacity]="loading || form.invalid ? '0.7' : '1'"
            >
              {{ loading ? 'Signing in…' : 'Sign In' }}
            </button>

          </form>
        </div>
      </div>

    </div>
  `
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  form = this.fb.group({
    email: ['admin@sevis.com', [Validators.required, Validators.email]],
    password: ['Admin@1234', Validators.required]
  });
  loading = false;
  error = '';

  submit() {
    if (this.form.invalid) return;
    this.loading = true;
    this.error = '';
    const { email, password } = this.form.value;
    this.auth.login(email!, password!).subscribe({
      next: () => this.router.navigate(['/gallery']),
      error: (err) => { this.error = err.error?.message ?? 'Invalid credentials'; this.loading = false; }
    });
  }
}
