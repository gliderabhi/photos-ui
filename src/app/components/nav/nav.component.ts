import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { PhotoService } from '../../services/photo.service';

@Component({
  selector: 'app-nav',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav class="photos-nav">
      <div style="display:flex;align-items:center;gap:1.5rem">
        <span class="photos-nav-brand">Photos</span>
        @if (auth.isLoggedIn()) {
          <a routerLink="/gallery" routerLinkActive="photos-nav-link-active"
             class="photos-nav-link">Gallery</a>
          <a routerLink="/upload" routerLinkActive="photos-nav-link-active"
             class="photos-nav-link">Upload</a>
        }
      </div>
      <div style="display:flex;align-items:center;gap:0.75rem">
        @if (auth.isLoggedIn()) {
          @if (photo.folderUnlocked()) {
            <button (click)="lockFolder()" class="btn-ghost-sm">Lock Folder</button>
          }
          <button (click)="auth.logout()" class="btn-outline-sm">Logout</button>
        } @else {
          <a routerLink="/login" class="btn-login-link">Login</a>
        }
      </div>
    </nav>
  `
})
export class NavComponent {
  auth = inject(AuthService);
  photo = inject(PhotoService);
  lockFolder() { this.photo.lockFolder(); }
}
