import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { PhotoService, PhotosByDate, PhotoResponse } from '../../services/photo.service';

interface PhotoWithBlob extends PhotoResponse { blobUrl?: SafeUrl; loading: boolean; }
interface GroupWithBlobs { date: string; photos: PhotoWithBlob[]; }

@Component({
  selector: 'app-gallery',
  standalone: true,
  template: `
    <div>
      <div class="page-header">
        <h1 class="page-title">Your Photos</h1>
        <button (click)="router.navigate(['/upload'])" class="btn-primary">+ Upload</button>
      </div>

      @if (loading) {
        <div class="page-spinner"><div class="spinner"></div></div>
      } @else if (groups.length === 0) {
        <div class="empty-state">
          <div class="empty-icon">🖼️</div>
          <p class="empty-title">No photos yet</p>
          <p class="empty-hint">Upload your first photo to get started</p>
          <button (click)="router.navigate(['/upload'])" class="btn-primary" style="margin-top:1rem">
            Upload Photos
          </button>
        </div>
      } @else {
        @for (group of groups; track group.date) {
          <section style="margin-bottom:2.5rem">
            <h2 class="section-date">{{ formatDate(group.date) }}</h2>
            <div class="photo-grid">
              @for (photo of group.photos; track photo.id) {
                <div class="photo-thumb" (click)="openLightbox(photo)">
                  @if (photo.blobUrl) {
                    <img [src]="photo.blobUrl" [alt]="photo.originalFilename" />
                  } @else if (photo.loading) {
                    <div class="photo-spinner"><div class="spinner-sm"></div></div>
                  }
                  <div class="photo-thumb-overlay">
                    <button (click)="deletePhoto($event, group, photo)" class="photo-delete-btn">Delete</button>
                  </div>
                </div>
              }
            </div>
          </section>
        }
      }

      @if (lightboxPhoto) {
        <div class="lightbox-backdrop" (click)="lightboxPhoto=null">
          <button class="lightbox-close">×</button>
          <img [src]="lightboxPhoto.blobUrl" [alt]="lightboxPhoto.originalFilename"
               style="max-height:100%;max-width:100%;object-fit:contain;border-radius:0.5rem"
               (click)="$event.stopPropagation()" />
          <p class="lightbox-caption">{{ lightboxPhoto.originalFilename }}</p>
        </div>
      }
    </div>
  `
})
export class GalleryComponent implements OnInit {
  private photo = inject(PhotoService);
  private sanitizer = inject(DomSanitizer);
  router = inject(Router);

  groups: GroupWithBlobs[] = [];
  loading = true;
  lightboxPhoto: PhotoWithBlob | null = null;

  ngOnInit() { this.loadPhotos(); }

  loadPhotos() {
    this.loading = true;
    this.photo.listPhotos().subscribe({
      next: (data) => {
        this.groups = data.map(g => ({ date: g.date, photos: g.photos.map(p => ({ ...p, loading: true })) }));
        this.loading = false;
        this.loadThumbnails();
      },
      error: () => { this.loading = false; }
    });
  }

  loadThumbnails() {
    for (const group of this.groups) {
      for (const photo of group.photos) {
        this.photo.getPhotoBlob(photo.id).subscribe({
          next: (blob) => { photo.blobUrl = this.sanitizer.bypassSecurityTrustUrl(URL.createObjectURL(blob)); photo.loading = false; },
          error: () => { photo.loading = false; }
        });
      }
    }
  }

  openLightbox(photo: PhotoWithBlob) { this.lightboxPhoto = photo; }

  deletePhoto(e: Event, group: GroupWithBlobs, photo: PhotoWithBlob) {
    e.stopPropagation();
    if (!confirm(`Delete "${photo.originalFilename}"?`)) return;
    this.photo.deletePhoto(photo.id).subscribe({
      next: () => {
        group.photos = group.photos.filter(p => p.id !== photo.id);
        if (!group.photos.length) this.groups = this.groups.filter(g => g.date !== group.date);
      }
    });
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }
}
