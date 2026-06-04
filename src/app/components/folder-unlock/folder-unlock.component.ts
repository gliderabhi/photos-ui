import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { PhotoService } from '../../services/photo.service';

@Component({
  selector: 'app-folder-unlock',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div style="position:fixed;top:56px;left:240px;right:0;bottom:0;overflow:hidden;background:#f1f5f9;display:flex;align-items:center;justify-content:center;">

      <div style="width:380px;padding:40px;background:#fff;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

          <div style="margin-bottom:32px;">
            <h2 style="margin:0 0 6px 0;font-size:26px;font-weight:700;color:#1e293b;">Unlock Folder</h2>
            <p style="margin:0;font-size:13px;color:#64748b;">Enter your folder password to continue</p>
          </div>

          <form [formGroup]="form" (ngSubmit)="submit()" style="display:flex;flex-direction:column;gap:20px;">

            <div style="display:flex;flex-direction:column;gap:6px;">
              <label style="font-size:13px;font-weight:600;color:#374151;">Folder Password</label>
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
              {{ loading ? 'Verifying…' : 'Unlock' }}
            </button>

            <button type="button" (click)="router.navigate(['/folder-setup'])"
                    style="padding:0;background:none;border:none;cursor:pointer;color:#64748b;font-size:13px;text-align:center;">
              Change password
            </button>

          </form>
      </div>

    </div>
  `
})
export class FolderUnlockComponent {
  private fb = inject(FormBuilder);
  photo = inject(PhotoService);
  router = inject(Router);

  form = this.fb.group({ password: ['', Validators.required] });
  loading = false;
  error = '';

  submit() {
    if (this.form.invalid) return;
    this.loading = true;
    this.error = '';
    const password = this.form.value.password!;
    this.photo.verifyFolder(password).subscribe({
      next: () => { this.photo.unlockFolder(password); this.router.navigate(['/gallery']); },
      error: (err) => { this.error = err.error?.message ?? 'Incorrect password'; this.loading = false; }
    });
  }
}
