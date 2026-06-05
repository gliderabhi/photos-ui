import { Component, inject, OnInit, signal, HostListener } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { PhotoService, PhotoResponse } from '../../services/photo.service';

interface AlbumPhoto extends PhotoResponse { blobUrl?: SafeUrl; loading: boolean; }

@Component({
  selector: 'app-album-detail',
  standalone: true,
  template: `
    <div style="max-width:960px;margin:0 auto;">

      <!-- Header -->
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px;">
        <button (click)="router.navigate(['/albums'])"
                style="background:none;border:none;cursor:pointer;color:#5f6368;padding:6px;border-radius:50%;display:flex;align-items:center;">
          <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" d="M19 12H5m7-7l-7 7 7 7"/>
          </svg>
        </button>
        <h1 style="margin:0;font-size:22px;font-weight:400;color:#202124;flex:1;">{{ albumName() }}</h1>
        <span style="font-size:13px;color:#5f6368;">{{ photos().length }} photo{{ photos().length !== 1 ? 's' : '' }}</span>
      </div>

      @if (loading()) {
        <div style="display:flex;justify-content:center;padding:60px;">
          <div style="width:36px;height:36px;border:3px solid #e8eaed;border-top-color:#1a73e8;border-radius:50%;animation:spin 0.8s linear infinite;"></div>
        </div>
      } @else if (photos().length === 0) {
        <div style="text-align:center;padding:80px 24px;">
          <p style="font-size:17px;color:#202124;margin:0;">This album is empty</p>
          <p style="font-size:13px;color:#5f6368;margin:8px 0 0;">Add photos from the Gallery using Select mode</p>
        </div>
      } @else {
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:8px;">
          @for (photo of photos(); track photo.id) {
            <div class="gp-thumb" (click)="openLightbox(photo)"
                 style="position:relative;aspect-ratio:1;background:#f1f3f4;cursor:pointer;overflow:hidden;border-radius:12px;">
              @if (photo.blobUrl) {
                <img [src]="photo.blobUrl" [alt]="photo.originalFilename"
                     style="width:100%;height:100%;object-fit:cover;transition:transform 0.2s;"/>
              } @else if (photo.loading) {
                <div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;">
                  <div style="width:22px;height:22px;border:2px solid #e8eaed;border-top-color:#1a73e8;border-radius:50%;animation:spin 0.8s linear infinite;"></div>
                </div>
              }
              <div class="gp-overlay"
                   style="position:absolute;inset:0;background:linear-gradient(to bottom,transparent 60%,rgba(0,0,0,0.3) 100%);opacity:0;transition:opacity 0.15s;">
                <button (click)="removeFromAlbum($event, photo)"
                        title="Remove from album"
                        style="position:absolute;bottom:8px;right:8px;background:rgba(0,0,0,0.55);border:none;border-radius:50%;width:30px;height:30px;display:flex;align-items:center;justify-content:center;cursor:pointer;">
                  <svg width="13" height="13" fill="none" stroke="#fff" stroke-width="2.5" viewBox="0 0 24 24">
                    <path stroke-linecap="round" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>
            </div>
          }
        </div>
      }

      <!-- Lightbox -->
      @if (lightboxPhoto()) {
        <div (click)="lightboxPhoto.set(null)"
             style="position:fixed;inset:0;background:rgba(0,0,0,0.93);z-index:1000;display:flex;align-items:center;justify-content:center;">
          <button (click)="lightboxPhoto.set(null)"
                  style="position:absolute;top:16px;right:16px;background:rgba(255,255,255,0.1);border:none;border-radius:50%;width:42px;height:42px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:#fff;font-size:22px;">×</button>
          <p style="position:absolute;top:20px;left:24px;margin:0;font-size:13px;color:rgba(255,255,255,0.7);">{{ lightboxPhoto()!.originalFilename }}</p>

          @if (lightboxIndex() > 0) {
            <button (click)="navigateLightbox(-1); $event.stopPropagation()"
                    style="position:absolute;left:16px;background:rgba(255,255,255,0.12);border:none;border-radius:50%;width:44px;height:44px;display:flex;align-items:center;justify-content:center;cursor:pointer;">
              <svg width="20" height="20" fill="none" stroke="#fff" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" d="M15 19l-7-7 7-7"/></svg>
            </button>
          }
          @if (lightboxIndex() < photos().length - 1) {
            <button (click)="navigateLightbox(1); $event.stopPropagation()"
                    style="position:absolute;right:16px;background:rgba(255,255,255,0.12);border:none;border-radius:50%;width:44px;height:44px;display:flex;align-items:center;justify-content:center;cursor:pointer;">
              <svg width="20" height="20" fill="none" stroke="#fff" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" d="M9 5l7 7-7 7"/></svg>
            </button>
          }

          <img [src]="lightboxPhoto()!.blobUrl" [alt]="lightboxPhoto()!.originalFilename"
               (click)="$event.stopPropagation()"
               style="max-height:90vh;max-width:90vw;object-fit:contain;border-radius:4px;" />
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
export class AlbumDetailComponent implements OnInit {
  private photoService = inject(PhotoService);
  private sanitizer = inject(DomSanitizer);
  private route = inject(ActivatedRoute);
  router = inject(Router);

  albumId = signal(0);
  albumName = signal('Album');
  photos = signal<AlbumPhoto[]>([]);
  loading = signal(true);
  lightboxPhoto = signal<AlbumPhoto | null>(null);

  lightboxIndex = signal(0);

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.albumId.set(id);

    // Get album name from navigation state or derive it
    const nav = history.state as { albumName?: string };
    if (nav?.albumName) this.albumName.set(nav.albumName);

    this.loadPhotos();
  }

  loadPhotos() {
    this.loading.set(true);
    this.photoService.getAlbumPhotos(this.albumId()).subscribe({
      next: (data) => {
        this.photos.set(data.map(p => ({ ...p, loading: true })));
        this.loading.set(false);
        this.loadThumbnails();
      },
      error: () => this.loading.set(false)
    });
  }

  loadThumbnails() {
    for (const photo of this.photos()) {
      this.photoService.getPhotoBlob(photo.id).subscribe({
        next: (blob) => this.patchPhoto(photo.id, {
          blobUrl: this.sanitizer.bypassSecurityTrustUrl(URL.createObjectURL(blob)),
          loading: false
        }),
        error: () => this.patchPhoto(photo.id, { loading: false })
      });
    }
  }

  private patchPhoto(id: number, patch: Partial<AlbumPhoto>) {
    this.photos.update(ps => ps.map(p => p.id === id ? { ...p, ...patch } : p));
    const lb = this.lightboxPhoto();
    if (lb?.id === id) this.lightboxPhoto.set({ ...lb, ...patch } as AlbumPhoto);
  }

  openLightbox(photo: AlbumPhoto) {
    this.lightboxIndex.set(this.photos().findIndex(p => p.id === photo.id));
    this.lightboxPhoto.set(photo);
  }

  navigateLightbox(dir: -1 | 1) {
    const idx = this.lightboxIndex() + dir;
    const photo = this.photos()[idx];
    if (photo) { this.lightboxIndex.set(idx); this.lightboxPhoto.set(photo); }
  }

  @HostListener('document:keydown', ['$event'])
  onKey(e: KeyboardEvent) {
    if (!this.lightboxPhoto()) return;
    if (e.key === 'ArrowLeft') this.navigateLightbox(-1);
    if (e.key === 'ArrowRight') this.navigateLightbox(1);
    if (e.key === 'Escape') this.lightboxPhoto.set(null);
  }

  removeFromAlbum(e: Event, photo: AlbumPhoto) {
    e.stopPropagation();
    if (!confirm(`Remove "${photo.originalFilename}" from this album?`)) return;
    this.photoService.removePhotoFromAlbum(this.albumId(), photo.id).subscribe({
      next: () => this.photos.update(ps => ps.filter(p => p.id !== photo.id))
    });
  }
}
