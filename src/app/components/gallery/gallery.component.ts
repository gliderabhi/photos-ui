import { Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { PhotoService, PhotosByDate, PhotoResponse } from '../../services/photo.service';

interface PhotoWithBlob extends PhotoResponse { blobUrl?: SafeUrl; loading: boolean; }
interface GroupWithBlobs { date: string; photos: PhotoWithBlob[]; }

@Component({
  selector: 'app-gallery',
  standalone: true,
  template: `
    <!-- full-bleed white canvas, flush to shell edges -->
    <div style="margin:-24px;background:#fff;min-height:calc(100vh - 56px);">

      <!-- Top bar -->
      <div style="display:flex;align-items:center;justify-content:space-between;padding:20px 24px 8px;">
        <h1 style="margin:0;font-size:22px;font-weight:400;color:#202124;">Photos</h1>
        <button (click)="router.navigate(['/upload'])"
                style="display:flex;align-items:center;gap:6px;padding:9px 18px;background:#1a73e8;color:#fff;border:none;border-radius:24px;font-size:14px;font-weight:500;cursor:pointer;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/>
          </svg>
          Upload
        </button>
      </div>

      @if (loading()) {
        <div style="display:flex;justify-content:center;padding:80px;">
          <div style="width:40px;height:40px;border:3px solid #e8eaed;border-top-color:#1a73e8;border-radius:50%;animation:spin 0.8s linear infinite;"></div>
        </div>

      } @else if (groups().length === 0) {
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:100px 24px;text-align:center;">
          <div style="width:80px;height:80px;background:#f1f3f4;border-radius:50%;display:flex;align-items:center;justify-content:center;margin-bottom:24px;">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#9aa0a6" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
            </svg>
          </div>
          <p style="margin:0;font-size:18px;font-weight:400;color:#202124;">Add photos to get started</p>
          <p style="margin:8px 0 24px;font-size:14px;color:#5f6368;">Your photos will appear here</p>
          <button (click)="router.navigate(['/upload'])"
                  style="padding:10px 24px;background:#1a73e8;color:#fff;border:none;border-radius:24px;font-size:14px;font-weight:500;cursor:pointer;">
            Upload photos
          </button>
        </div>

      } @else {
        @for (group of groups(); track group.date) {
          <section style="padding:0 24px 8px;">
            <h2 style="margin:16px 0 8px;font-size:15px;font-weight:500;color:#3c4043;letter-spacing:0;">
              {{ formatDate(group.date) }}
            </h2>
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:8px;">
              @for (photo of group.photos; track photo.id) {
                <div class="gp-thumb" (click)="openLightbox(photo)"
                     style="position:relative;aspect-ratio:1;background:#f1f3f4;cursor:pointer;overflow:hidden;border-radius:12px;">

                  @if (photo.blobUrl) {
                    <img [src]="photo.blobUrl" [alt]="photo.originalFilename"
                         style="width:100%;height:100%;object-fit:cover;display:block;transition:transform 0.2s;" />
                  } @else if (photo.loading) {
                    <div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;">
                      <div style="width:24px;height:24px;border:2px solid #e8eaed;border-top-color:#1a73e8;border-radius:50%;animation:spin 0.8s linear infinite;"></div>
                    </div>
                  }

                  <!-- Hover overlay with delete -->
                  <div class="gp-overlay"
                       style="position:absolute;inset:0;background:linear-gradient(to bottom,rgba(0,0,0,0.25) 0%,transparent 40%,transparent 70%,rgba(0,0,0,0.3) 100%);opacity:0;transition:opacity 0.15s;">
                    <button (click)="deletePhoto($event, group, photo)"
                            style="position:absolute;bottom:8px;right:8px;background:rgba(0,0,0,0.55);border:none;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;cursor:pointer;">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                      </svg>
                    </button>
                  </div>
                </div>
              }
            </div>
          </section>
        }
      }

      <!-- Lightbox -->
      @if (lightboxPhoto()) {
        <div (click)="lightboxPhoto.set(null)"
             style="position:fixed;inset:0;background:rgba(0,0,0,0.92);z-index:1000;display:flex;align-items:center;justify-content:center;">

          <!-- Close -->
          <button (click)="lightboxPhoto.set(null)"
                  style="position:absolute;top:16px;right:16px;background:rgba(255,255,255,0.1);border:none;border-radius:50%;width:44px;height:44px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:#fff;font-size:22px;">
            ×
          </button>

          <!-- Filename -->
          <p style="position:absolute;top:20px;left:24px;margin:0;font-size:13px;color:rgba(255,255,255,0.7);">
            {{ lightboxPhoto()!.originalFilename }}
          </p>

          <img [src]="lightboxPhoto()!.blobUrl" [alt]="lightboxPhoto()!.originalFilename"
               (click)="$event.stopPropagation()"
               style="max-height:90vh;max-width:90vw;object-fit:contain;border-radius:2px;box-shadow:0 8px 40px rgba(0,0,0,0.5);" />
        </div>
      }

    </div>
    <style>
      @keyframes spin { to { transform: rotate(360deg); } }
      .gp-thumb:hover .gp-overlay { opacity: 1 !important; }
      .gp-thumb:hover img { transform: scale(1.03); }
    </style>
  `
})
export class GalleryComponent implements OnInit {
  private photo = inject(PhotoService);
  private sanitizer = inject(DomSanitizer);
  router = inject(Router);

  groups = signal<GroupWithBlobs[]>([]);
  loading = signal(true);
  lightboxPhoto = signal<PhotoWithBlob | null>(null);

  ngOnInit() { this.loadPhotos(); }

  loadPhotos() {
    this.loading.set(true);
    this.photo.listPhotos().subscribe({
      next: (data) => {
        this.groups.set(data.map(g => ({ date: g.date, photos: g.photos.map(p => ({ ...p, loading: true })) })));
        this.loading.set(false);
        this.loadThumbnails();
      },
      error: () => { this.loading.set(false); }
    });
  }

  private patchPhoto(id: number, patch: Partial<PhotoWithBlob>) {
    this.groups.update(gs => gs.map(g => ({
      ...g,
      photos: g.photos.map(p => p.id === id ? { ...p, ...patch } : p)
    })));
  }

  loadThumbnails() {
    for (const group of this.groups()) {
      for (const photo of group.photos) {
        this.photo.getPhotoBlob(photo.id).subscribe({
          next: (blob) => this.patchPhoto(photo.id, { blobUrl: this.sanitizer.bypassSecurityTrustUrl(URL.createObjectURL(blob)), loading: false }),
          error: () => this.patchPhoto(photo.id, { loading: false })
        });
      }
    }
  }

  openLightbox(photo: PhotoWithBlob) { this.lightboxPhoto.set(photo); }

  deletePhoto(e: Event, group: GroupWithBlobs, photo: PhotoWithBlob) {
    e.stopPropagation();
    if (!confirm(`Delete "${photo.originalFilename}"?`)) return;
    this.photo.deletePhoto(photo.id).subscribe({
      next: () => {
        this.groups.update(gs => gs
          .map(g => ({ ...g, photos: g.photos.filter(p => p.id !== photo.id) }))
          .filter(g => g.photos.length > 0)
        );
      }
    });
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }
}
