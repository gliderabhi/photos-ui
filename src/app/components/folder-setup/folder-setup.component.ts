import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { PhotoService } from '../../services/photo.service';

@Component({
  selector: 'app-folder-setup',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div style="position:fixed;top:56px;left:240px;right:0;bottom:0;overflow:hidden;background:#f1f5f9;display:flex;align-items:center;justify-content:center;">

      <div style="width:380px;padding:40px;background:#fff;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,0.08);max-height:calc(100% - 48px);overflow-y:auto;">

          <div style="margin-bottom:32px;">
            <h2 style="margin:0 0 6px 0;font-size:26px;font-weight:700;color:#1e293b;">
              {{ isChanging ? 'Update Password' : 'Set Password' }}
            </h2>
            <p style="margin:0;font-size:13px;color:#64748b;">
              {{ isChanging ? 'Enter your current password then choose a new one' : 'Choose a password to protect your folder' }}
            </p>
          </div>

          <form [formGroup]="form" (ngSubmit)="submit()" style="display:flex;flex-direction:column;gap:20px;">

            @if (isChanging) {
              <div style="display:flex;flex-direction:column;gap:6px;">
                <label style="font-size:13px;font-weight:600;color:#374151;">Current Password</label>
                <input
                  formControlName="currentPassword"
                  type="password"
                  placeholder="••••••••"
                  style="padding:11px 14px;font-size:14px;border:1.5px solid #e2e8f0;border-radius:8px;outline:none;background:#f8fafc;color:#1e293b;"
                  (focus)="$any($event.target).style.borderColor='#2563eb'"
                  (blur)="$any($event.target).style.borderColor='#e2e8f0'"
                />
              </div>
            }

            <div style="display:flex;flex-direction:column;gap:6px;">
              <label style="font-size:13px;font-weight:600;color:#374151;">New Password</label>
              <input
                formControlName="password"
                type="password"
                placeholder="••••••••"
                style="padding:11px 14px;font-size:14px;border:1.5px solid #e2e8f0;border-radius:8px;outline:none;background:#f8fafc;color:#1e293b;"
                (focus)="$any($event.target).style.borderColor='#2563eb'"
                (blur)="$any($event.target).style.borderColor='#e2e8f0'"
              />
            </div>

            <div style="display:flex;flex-direction:column;gap:6px;">
              <label style="font-size:13px;font-weight:600;color:#374151;">Confirm Password</label>
              <input
                formControlName="confirm"
                type="password"
                placeholder="••••••••"
                style="padding:11px 14px;font-size:14px;border:1.5px solid #e2e8f0;border-radius:8px;outline:none;background:#f8fafc;color:#1e293b;"
                (focus)="$any($event.target).style.borderColor='#2563eb'"
                (blur)="$any($event.target).style.borderColor='#e2e8f0'"
              />
              @if (form.errors?.['mismatch'] && form.get('confirm')?.touched) {
                <p style="margin:4px 0 0 0;font-size:12px;color:#dc2626;">Passwords do not match</p>
              }
            </div>

            @if (error) {
              <div style="padding:10px 14px;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;font-size:13px;color:#dc2626;">
                {{ error }}
              </div>
            }
            @if (success) {
              <div style="padding:10px 14px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;font-size:13px;color:#16a34a;">
                {{ success }}
              </div>
            }

            <button
              type="submit"
              [disabled]="loading || form.invalid"
              style="margin-top:4px;padding:13px;font-size:15px;font-weight:600;color:#fff;background:linear-gradient(135deg,#2563eb,#1d4ed8);border:none;border-radius:8px;cursor:pointer;letter-spacing:0.02em;"
              [style.opacity]="loading || form.invalid ? '0.7' : '1'"
            >
              {{ loading ? 'Saving…' : (isChanging ? 'Update Password' : 'Set Password') }}
            </button>

          </form>
      </div>

    </div>
  `
})
export class FolderSetupComponent implements OnInit {
  private fb = inject(FormBuilder);
  private photo = inject(PhotoService);
  private router = inject(Router);

  isChanging = false;
  loading = false;
  error = '';
  success = '';

  form = this.fb.group({
    currentPassword: [''],
    password: ['', [Validators.required, Validators.minLength(4)]],
    confirm: ['', Validators.required]
  }, { validators: (g) => g.get('password')?.value === g.get('confirm')?.value ? null : { mismatch: true } });

  ngOnInit() {
    this.photo.getFolderStatus().subscribe(s => { this.isChanging = s.hasFolder; });
  }

  submit() {
    if (this.form.invalid) return;
    this.loading = true;
    this.error = '';
    const { password, currentPassword } = this.form.value;
    this.photo.setupFolder(password!, this.isChanging ? currentPassword! : undefined).subscribe({
      next: () => {
        this.success = 'Password set! Redirecting...';
        this.photo.unlockFolder(password!);
        setTimeout(() => this.router.navigate(['/gallery']), 1000);
      },
      error: (err) => { this.error = err.error?.message ?? 'Failed to set password'; this.loading = false; }
    });
  }
}
