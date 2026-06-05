import { Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { PhotoService, AlbumResponse } from '../../services/photo.service';

@Component({
  selector: 'app-albums',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div style="max-width:960px;margin:0 auto;">

      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;flex-wrap:wrap;gap:12px;">
        <h1 style="margin:0;font-size:22px;font-weight:400;color:#202124;">Albums</h1>
        <div style="display:flex;gap:8px;align-items:center;">
          <input [(ngModel)]="newAlbumName" placeholder="New album name…" (keydown.enter)="createAlbum()"
                 style="padding:8px 14px;border:1px solid #dadce0;border-radius:24px;font-size:13px;outline:none;width:200px;"/>
          <button (click)="createAlbum()" [disabled]="!newAlbumName.trim()"
                  style="padding:8px 20px;background:#1a73e8;color:#fff;border:none;border-radius:24px;font-size:13px;font-weight:500;cursor:pointer;"
                  [style.opacity]="newAlbumName.trim() ? '1' : '0.5'">
            Create
          </button>
        </div>
      </div>

      @if (loading()) {
        <div style="display:flex;justify-content:center;padding:60px;">
          <div style="width:36px;height:36px;border:3px solid #e8eaed;border-top-color:#1a73e8;border-radius:50%;animation:spin 0.8s linear infinite;"></div>
        </div>
      } @else if (albums().length === 0) {
        <div style="text-align:center;padding:80px 24px;">
          <div style="width:72px;height:72px;background:#f1f3f4;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 20px;">
            <svg width="36" height="36" fill="none" stroke="#9aa0a6" stroke-width="1.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" d="M3 7a2 2 0 012-2h3l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"/>
            </svg>
          </div>
          <p style="margin:0;font-size:17px;color:#202124;">No albums yet</p>
          <p style="margin:8px 0 0;font-size:13px;color:#5f6368;">Create an album to organise your photos</p>
        </div>
      } @else {
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:16px;">
          @for (album of albums(); track album.id) {
            <div class="album-card" (click)="router.navigate(['/albums', album.id])"
                 style="border-radius:16px;overflow:hidden;background:#f1f3f4;cursor:pointer;position:relative;transition:box-shadow 0.2s;">

              <!-- Cover -->
              <div style="aspect-ratio:1;background:#e8eaed;position:relative;overflow:hidden;">
                @if (album.coverPhoto) {
                  <img [src]="coverUrls()[album.id]" style="width:100%;height:100%;object-fit:cover;"/>
                  @if (!coverUrls()[album.id]) {
                    <div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;">
                      <div style="width:22px;height:22px;border:2px solid #dadce0;border-top-color:#1a73e8;border-radius:50%;animation:spin 0.8s linear infinite;"></div>
                    </div>
                  }
                } @else {
                  <div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;">
                    <svg width="40" height="40" fill="none" stroke="#bdc1c6" stroke-width="1.5" viewBox="0 0 24 24">
                      <path stroke-linecap="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                    </svg>
                  </div>
                }
              </div>

              <!-- Meta -->
              <div style="padding:10px 12px 12px;display:flex;align-items:center;justify-content:space-between;">
                <div style="min-width:0;">
                  <p style="margin:0;font-size:13px;font-weight:500;color:#202124;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">{{ album.name }}</p>
                  <p style="margin:2px 0 0;font-size:12px;color:#5f6368;">{{ album.photoCount }} photo{{ album.photoCount !== 1 ? 's' : '' }}</p>
                </div>
                <button (click)="deleteAlbum($event, album)"
                        style="background:none;border:none;cursor:pointer;color:#9aa0a6;padding:4px;flex-shrink:0;">
                  <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                  </svg>
                </button>
              </div>
            </div>
          }
        </div>
      }
    </div>

    <style>
      @keyframes spin { to { transform: rotate(360deg); } }
      .album-card:hover { box-shadow: 0 2px 12px rgba(0,0,0,0.12); }
    </style>
  `
})
export class AlbumsComponent implements OnInit {
  private photoService = inject(PhotoService);
  private sanitizer = inject(DomSanitizer);
  router = inject(Router);

  albums = signal<AlbumResponse[]>([]);
  coverUrls = signal<Record<number, SafeUrl>>({});
  loading = signal(true);
  newAlbumName = '';

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.photoService.listAlbums().subscribe({
      next: (a) => {
        this.albums.set(a);
        this.loading.set(false);
        this.loadCovers(a);
      },
      error: () => this.loading.set(false)
    });
  }

  loadCovers(albums: AlbumResponse[]) {
    for (const album of albums) {
      if (!album.coverPhoto) continue;
      this.photoService.getPhotoBlob(album.coverPhoto.id).subscribe({
        next: (blob) => {
          const url = this.sanitizer.bypassSecurityTrustUrl(URL.createObjectURL(blob));
          this.coverUrls.update(m => ({ ...m, [album.id]: url }));
        }
      });
    }
  }

  createAlbum() {
    if (!this.newAlbumName.trim()) return;
    this.photoService.createAlbum(this.newAlbumName.trim()).subscribe({
      next: (a) => {
        this.albums.update(list => [a, ...list]);
        this.newAlbumName = '';
      }
    });
  }

  deleteAlbum(e: Event, album: AlbumResponse) {
    e.stopPropagation();
    if (!confirm(`Delete album "${album.name}"? Photos will not be deleted.`)) return;
    this.photoService.deleteAlbum(album.id).subscribe({
      next: () => this.albums.update(list => list.filter(a => a.id !== album.id))
    });
  }
}
