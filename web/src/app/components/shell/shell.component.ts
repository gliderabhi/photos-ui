import { Component, OnDestroy, OnInit, inject, computed, signal, effect } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { filter, map } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';
import { AuthService } from '../../services/auth.service';
import { PhotoService } from '../../services/photo.service';
import { IdleTimeoutService } from '../../services/idle-timeout.service';
import { SeoService } from '../../services/seo.service';

const PAGE_TITLES: Record<string, string> = {
  '/gallery': 'Gallery',
  '/upload': 'Upload Photos',
  '/albums': 'Albums',
  '/favorites': 'Favorites',
  '/folder-setup': 'Folder Settings',
  '/folder-unlock': 'Unlock Folder',
};

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    @if (idleTimeout.showWarning()) {
      <div class="idle-overlay">
        <div class="idle-dialog">
          <div style="margin-bottom:12px;">
            <svg width="28" height="28" fill="none" stroke="#f59e0b" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
            </svg>
          </div>
          <h2 style="margin:0 0 8px;font-size:17px;font-weight:700;color:#1e293b;">Session expiring soon</h2>
          <p style="margin:0 0 24px;font-size:14px;color:#475569;line-height:1.5;">
            You've been inactive. You'll be logged out in
            <strong>{{ idleTimeout.countdown() }}s</strong>.
          </p>
          <button (click)="idleTimeout.stayLoggedIn()"
                  style="background:#2563eb;color:#fff;border:none;border-radius:8px;padding:10px 28px;font-size:14px;font-weight:600;cursor:pointer;">
            Stay logged in
          </button>
        </div>
      </div>
    }

    <div class="shell-root">

      @if (sidebarOpen()) {
        <div class="sidebar-overlay" (click)="toggleSidebar()"></div>
      }

      <!-- Left Sidebar -->
      <aside class="sidebar" [class.sidebar-mobile-open]="sidebarOpen()">

        <!-- Logo -->
        <div style="padding:16px 20px;border-bottom:1px solid rgba(255,255,255,0.08);display:flex;align-items:center;gap:10px;">
          <img src="photo-logo.png" alt="Photos" style="width:44px;height:44px;border-radius:10px;object-fit:contain;flex-shrink:0;" />
          <div>
            <p style="margin:0;color:#fff;font-weight:700;font-size:17px;line-height:1.2;">Photos</p>
            <p style="margin:0;color:#64748b;font-size:12px;">Private Photo Vault</p>
          </div>
        </div>

        <!-- Nav items -->
        <nav style="flex:1;padding:12px 10px;overflow-y:auto;display:flex;flex-direction:column;gap:2px;">

          <a routerLink="/gallery" routerLinkActive="nav-active" class="nav-item"
             style="display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:7px;text-decoration:none;color:#94a3b8;font-size:13px;font-weight:500;transition:background 0.15s,color 0.15s;">
            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="flex-shrink:0;">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
            </svg>
            Gallery
          </a>

          <a routerLink="/upload" routerLinkActive="nav-active" class="nav-item"
             style="display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:7px;text-decoration:none;color:#94a3b8;font-size:13px;font-weight:500;">
            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="flex-shrink:0;">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
            </svg>
            Upload
          </a>

          <a routerLink="/albums" routerLinkActive="nav-active" class="nav-item"
             style="display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:7px;text-decoration:none;color:#94a3b8;font-size:13px;font-weight:500;">
            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="flex-shrink:0;">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 7a2 2 0 012-2h3l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"/>
            </svg>
            Albums
          </a>

          <a routerLink="/favorites" routerLinkActive="nav-active" class="nav-item"
             style="display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:7px;text-decoration:none;color:#94a3b8;font-size:13px;font-weight:500;">
            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="flex-shrink:0;">
              <path stroke-linecap="round" stroke-linejoin="round" d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
            </svg>
            Favorites
          </a>

          <a routerLink="/folder-setup" routerLinkActive="nav-active" class="nav-item"
             style="display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:7px;text-decoration:none;color:#94a3b8;font-size:13px;font-weight:500;">
            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="flex-shrink:0;">
              <path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
            Folder Settings
          </a>

        </nav>

        <!-- User footer -->
        <div style="padding:12px 16px;border-top:1px solid rgba(255,255,255,0.08);display:flex;align-items:center;gap:10px;">
          <div style="width:32px;height:32px;border-radius:50%;background:#2563eb;display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;font-weight:700;flex-shrink:0;">
            {{ auth.userInitial() }}
          </div>
          <div style="flex:1;min-width:0;">
            <p style="margin:0;color:#e2e8f0;font-size:12px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">{{ auth.user()?.name }}</p>
            <p style="margin:0;color:#64748b;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">{{ auth.user()?.email }}</p>
          </div>
          <button (click)="auth.logout()" title="Logout"
                  style="background:none;border:none;cursor:pointer;color:#64748b;padding:4px;border-radius:4px;display:flex;align-items:center;">
            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
            </svg>
          </button>
        </div>
      </aside>

      <!-- Main content area -->
      <div class="shell-main">

        <!-- Top header bar -->
        <header class="shell-header">
          <button class="hamburger" (click)="toggleSidebar()" aria-label="Toggle menu">
            <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16"/>
            </svg>
          </button>
          <h1 style="margin:0;font-size:14px;font-weight:600;color:#1e293b;">{{ pageTitle() }}</h1>
          <div style="flex:1;"></div>
          @if (photo.folderUnlocked()) {
            <button (click)="photo.lockFolder()"
                    style="font-size:12px;padding:5px 12px;background:#fef3c7;color:#92400e;border:1px solid #fde68a;border-radius:6px;cursor:pointer;">
              Lock Folder
            </button>
          }
          <span class="header-date">{{ today }}</span>
        </header>

        <!-- Page content -->
        <main class="shell-content">
          <router-outlet />
        </main>
      </div>

    </div>

    <style>
      .shell-root { display:flex;height:100vh;background:#f1f5f9;overflow:hidden; }
      .sidebar { width:240px;background:#0f172a;display:flex;flex-direction:column;flex-shrink:0;transition:transform 0.25s ease;z-index:200; }
      .shell-main { flex:1;display:flex;flex-direction:column;overflow:hidden;min-width:0; }
      .shell-header { height:56px;background:#fff;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;padding:0 24px;gap:12px;flex-shrink:0; }
      .shell-content { flex:1;overflow-y:auto;padding:24px; }
      .hamburger { display:none;background:none;border:none;cursor:pointer;color:#475569;padding:4px;border-radius:6px;align-items:center;justify-content:center;flex-shrink:0; }
      .header-date { font-size:12px;color:#94a3b8;white-space:nowrap; }
      .sidebar-overlay { display:none;position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:199; }
      .nav-item:hover { background:rgba(255,255,255,0.06);color:#e2e8f0; }
      .nav-item.nav-active { background:rgba(37,99,235,0.15) !important;color:#60a5fa !important; }
      .idle-overlay { position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:9999;display:flex;align-items:center;justify-content:center; }
      .idle-dialog { background:#fff;border-radius:12px;padding:32px 28px;max-width:360px;width:90%;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.25); }
      @media (max-width:768px) {
        .sidebar { position:fixed;top:0;left:0;bottom:0;transform:translateX(-100%); }
        .sidebar.sidebar-mobile-open { transform:translateX(0); }
        .sidebar-overlay { display:block; }
        .hamburger { display:flex; }
        .header-date { display:none; }
        .shell-header { padding:0 16px; }
        .shell-content { padding:16px; }
      }
    </style>
  `
})
export class ShellComponent implements OnInit, OnDestroy {
  auth        = inject(AuthService);
  photo       = inject(PhotoService);
  idleTimeout = inject(IdleTimeoutService);
  private router = inject(Router);
  private seo    = inject(SeoService);

  today = new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

  sidebarOpen = signal(false);

  userInitial = computed(() => this.auth.userInitial());

  private url = toSignal(
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      map(e => {
        this.sidebarOpen.set(false);
        return (e as NavigationEnd).urlAfterRedirects;
      })
    ),
    { initialValue: this.router.url }
  );

  pageTitle = computed(() => {
    const u = this.url() ?? '';
    const base = u.split('?')[0];
    if (base.startsWith('/albums/')) return 'Album';
    return PAGE_TITLES[base] ?? 'Photos';
  });

  private _ = effect(() => {
    this.seo.setPage({
      title: this.pageTitle(),
      description: 'Photos — your private encrypted photo vault with Android auto-upload and album organization.',
      url: `https://photos.sevis.store${this.url() ?? ''}`,
    });
  });

  ngOnInit(): void    { this.idleTimeout.start(); }
  ngOnDestroy(): void { this.idleTimeout.stop(); }

  toggleSidebar() { this.sidebarOpen.update(v => !v); }
}
