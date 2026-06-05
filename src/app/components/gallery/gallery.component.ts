import { Component, inject, OnInit, signal, computed, HostListener } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { PhotoService, PhotosByDate, PhotoResponse, AlbumResponse } from '../../services/photo.service';

interface PhotoWithBlob extends PhotoResponse { blobUrl?: SafeUrl; loading: boolean; favorite: boolean; }
interface GroupWithBlobs { date: string; photos: PhotoWithBlob[]; }

@Component({
  selector: 'app-gallery',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div style="margin:-24px;background:#fff;min-height:calc(100vh - 56px);">

      <!-- Top bar -->
      <div style="display:flex;align-items:center;justify-content:space-between;padding:16px 24px 0;gap:12px;flex-wrap:wrap;">
        <!-- Tabs -->
        <div style="display:flex;gap:0;border-bottom:2px solid #e8eaed;flex-shrink:0;">
          <button (click)="showFavoritesOnly.set(false)"
                  style="padding:8px 18px;background:none;border:none;font-size:14px;font-weight:500;cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-2px;transition:color 0.15s,border-color 0.15s;"
                  [style.color]="!showFavoritesOnly() ? '#1a73e8' : '#5f6368'"
                  [style.border-bottom-color]="!showFavoritesOnly() ? '#1a73e8' : 'transparent'">
            All Photos
          </button>
          <button (click)="showFavoritesOnly.set(true)"
                  style="display:flex;align-items:center;gap:6px;padding:8px 18px;background:none;border:none;font-size:14px;font-weight:500;cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-2px;transition:color 0.15s,border-color 0.15s;"
                  [style.color]="showFavoritesOnly() ? '#c5221f' : '#5f6368'"
                  [style.border-bottom-color]="showFavoritesOnly() ? '#c5221f' : 'transparent'">
            <svg width="13" height="13" viewBox="0 0 24 24" [attr.fill]="showFavoritesOnly() ? '#c5221f' : 'none'" stroke="currentColor" stroke-width="2.2">
              <path stroke-linecap="round" d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
            </svg>
            Favorites
          </button>
        </div>

        <!-- Search -->
        <div style="flex:1;min-width:180px;max-width:380px;position:relative;">
          <svg style="position:absolute;left:10px;top:50%;transform:translateY(-50%);pointer-events:none;" width="15" height="15" fill="none" stroke="#9aa0a6" stroke-width="2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8"/><path stroke-linecap="round" d="M21 21l-4.35-4.35"/>
          </svg>
          <input [(ngModel)]="searchQuery" placeholder="Search by name or date…"
                 style="width:100%;padding:7px 12px 7px 32px;border:1px solid #dadce0;border-radius:24px;font-size:13px;outline:none;box-sizing:border-box;"/>
        </div>

        <div style="display:flex;align-items:center;gap:8px;flex-shrink:0;">
          <!-- Bulk select toggle -->
          <button (click)="toggleBulkMode()"
                  [style.background]="bulkMode() ? '#e8f0fe' : '#f1f3f4'"
                  [style.color]="bulkMode() ? '#1a73e8' : '#5f6368'"
                  style="padding:7px 14px;border:none;border-radius:24px;font-size:13px;cursor:pointer;">
            {{ bulkMode() ? 'Cancel' : 'Select' }}
          </button>

          <button (click)="router.navigate(['/upload'])"
                  style="display:flex;align-items:center;gap:6px;padding:8px 18px;background:#1a73e8;color:#fff;border:none;border-radius:24px;font-size:13px;font-weight:500;cursor:pointer;">
            <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" d="M12 4v16m8-8H4"/>
            </svg>
            Upload
          </button>
        </div>
      </div>

      <!-- Bulk action bar -->
      @if (bulkMode() && selectedIds().size > 0) {
        <div style="display:flex;align-items:center;gap:10px;padding:10px 24px;background:#e8f0fe;margin-top:12px;flex-wrap:wrap;">
          <span style="font-size:13px;color:#1a73e8;font-weight:500;">{{ selectedIds().size }} selected</span>
          <div style="flex:1;"></div>
          <button (click)="openAlbumPicker()" style="padding:7px 16px;background:#1a73e8;color:#fff;border:none;border-radius:24px;font-size:13px;cursor:pointer;">
            Add to Album
          </button>
          <button (click)="bulkDelete()" style="padding:7px 16px;background:#ea4335;color:#fff;border:none;border-radius:24px;font-size:13px;cursor:pointer;">
            Delete ({{ selectedIds().size }})
          </button>
        </div>
      }

      <!-- Album picker modal -->
      @if (showAlbumPicker()) {
        <div (click)="showAlbumPicker.set(false)"
             style="position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:500;display:flex;align-items:center;justify-content:center;">
          <div (click)="$event.stopPropagation()"
               style="background:#fff;border-radius:16px;padding:24px;width:320px;max-height:80vh;overflow-y:auto;box-shadow:0 8px 32px rgba(0,0,0,0.2);">
            <h3 style="margin:0 0 16px;font-size:16px;font-weight:500;">Add to Album</h3>

            <!-- New album input -->
            <div style="display:flex;gap:8px;margin-bottom:16px;">
              <input [(ngModel)]="newAlbumName" placeholder="New album name…"
                     style="flex:1;padding:8px 12px;border:1px solid #dadce0;border-radius:8px;font-size:13px;outline:none;"/>
              <button (click)="createAlbumAndAdd()" [disabled]="!newAlbumName.trim()"
                      style="padding:8px 14px;background:#1a73e8;color:#fff;border:none;border-radius:8px;font-size:13px;cursor:pointer;opacity:1;"
                      [style.opacity]="newAlbumName.trim() ? '1' : '0.5'">
                Create
              </button>
            </div>

            @if (albums().length > 0) {
              <p style="margin:0 0 8px;font-size:12px;color:#9aa0a6;text-transform:uppercase;letter-spacing:0.5px;">Existing albums</p>
              @for (album of albums(); track album.id) {
                <button (click)="addToAlbum(album.id)"
                        style="width:100%;text-align:left;padding:10px 12px;background:none;border:1px solid #f1f3f4;border-radius:8px;font-size:13px;cursor:pointer;margin-bottom:6px;display:flex;justify-content:space-between;align-items:center;">
                  <span>{{ album.name }}</span>
                  <span style="color:#9aa0a6;font-size:12px;">{{ album.photoCount }} photos</span>
                </button>
              }
            }
          </div>
        </div>
      }

      <!-- Loading -->
      @if (loading()) {
        <div style="display:flex;justify-content:center;padding:80px;">
          <div style="width:40px;height:40px;border:3px solid #e8eaed;border-top-color:#1a73e8;border-radius:50%;animation:spin 0.8s linear infinite;"></div>
        </div>

      } @else if (filteredGroups().length === 0) {
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:80px 24px;text-align:center;">
          <div style="width:72px;height:72px;background:#f1f3f4;border-radius:50%;display:flex;align-items:center;justify-content:center;margin-bottom:20px;">
            <svg width="36" height="36" fill="none" stroke="#9aa0a6" stroke-width="1.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
            </svg>
          </div>
          <p style="margin:0;font-size:17px;font-weight:400;color:#202124;">
            {{ searchQuery || showFavoritesOnly() ? 'No photos match' : 'No photos yet' }}
          </p>
          <p style="margin:8px 0 0;font-size:13px;color:#5f6368;">
            {{ searchQuery || showFavoritesOnly() ? 'Try a different search or filter' : 'Upload some photos to get started' }}
          </p>
        </div>

      } @else {
        @for (group of filteredGroups(); track group.date) {
          <section style="padding:0 24px 8px;">
            <h2 style="margin:16px 0 10px;font-size:14px;font-weight:500;color:#3c4043;">
              {{ formatDate(group.date) }}
            </h2>
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:8px;">
              @for (photo of group.photos; track photo.id) {
                <div class="gp-thumb"
                     (click)="onThumbClick(photo)"
                     style="position:relative;aspect-ratio:1;background:#f1f3f4;cursor:pointer;overflow:hidden;border-radius:12px;">

                  @if (photo.blobUrl) {
                    <img [src]="photo.blobUrl" [alt]="photo.originalFilename"
                         style="width:100%;height:100%;object-fit:cover;display:block;transition:transform 0.2s;" />
                  } @else if (photo.loading) {
                    <div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;">
                      <div style="width:22px;height:22px;border:2px solid #e8eaed;border-top-color:#1a73e8;border-radius:50%;animation:spin 0.8s linear infinite;"></div>
                    </div>
                  }

                  <!-- Bulk select checkbox -->
                  @if (bulkMode()) {
                    <div style="position:absolute;top:8px;left:8px;width:22px;height:22px;border-radius:50%;border:2px solid #fff;background:rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;transition:all 0.15s;"
                         [style.background]="selectedIds().has(photo.id) ? '#1a73e8' : 'rgba(0,0,0,0.3)'"
                         [style.border-color]="selectedIds().has(photo.id) ? '#1a73e8' : '#fff'">
                      @if (selectedIds().has(photo.id)) {
                        <svg width="12" height="12" fill="none" stroke="#fff" stroke-width="2.5" viewBox="0 0 24 24">
                          <path stroke-linecap="round" d="M5 13l4 4L19 7"/>
                        </svg>
                      }
                    </div>
                  }

                  <!-- Favorite heart (top-right) — always visible when favorited, appears on hover otherwise -->
                  @if (!bulkMode()) {
                    <button (click)="toggleFavorite($event, photo)"
                            style="position:absolute;top:7px;right:7px;background:rgba(0,0,0,0.35);border:none;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;cursor:pointer;z-index:2;transition:opacity 0.15s;"
                            class="fav-btn"
                            [style.opacity]="photo.favorite ? '1' : '0'">
                      <svg width="14" height="14" viewBox="0 0 24 24" [attr.fill]="photo.favorite ? '#ea4335' : 'none'" stroke="#fff" stroke-width="2">
                        <path stroke-linecap="round" d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
                      </svg>
                    </button>
                  }

                  <!-- Hover overlay -->
                  <div class="gp-overlay"
                       style="position:absolute;inset:0;background:linear-gradient(to bottom,rgba(0,0,0,0.2) 0%,transparent 35%,transparent 65%,rgba(0,0,0,0.25) 100%);opacity:0;transition:opacity 0.15s;">
                    <button (click)="deletePhoto($event, group, photo)"
                            style="position:absolute;bottom:8px;right:8px;background:rgba(0,0,0,0.55);border:none;border-radius:50%;width:30px;height:30px;display:flex;align-items:center;justify-content:center;cursor:pointer;">
                      <svg width="13" height="13" fill="none" stroke="#fff" stroke-width="2" viewBox="0 0 24 24">
                        <path stroke-linecap="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                      </svg>
                    </button>
                    <button (click)="openInfo($event, photo)"
                            style="position:absolute;bottom:8px;right:46px;background:rgba(0,0,0,0.55);border:none;border-radius:50%;width:30px;height:30px;display:flex;align-items:center;justify-content:center;cursor:pointer;">
                      <svg width="13" height="13" fill="none" stroke="#fff" stroke-width="2" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10"/><path stroke-linecap="round" d="M12 16v-4m0-4h.01"/>
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
             style="position:fixed;inset:0;background:rgba(0,0,0,0.93);z-index:1000;display:flex;align-items:center;justify-content:center;">

          <!-- Close -->
          <button (click)="lightboxPhoto.set(null)"
                  style="position:absolute;top:16px;right:16px;background:rgba(255,255,255,0.1);border:none;border-radius:50%;width:42px;height:42px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:#fff;font-size:22px;z-index:10;">×</button>

          <!-- Filename + favorite -->
          <div style="position:absolute;top:18px;left:24px;display:flex;align-items:center;gap:10px;z-index:10;">
            <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.75);">{{ lightboxPhoto()!.originalFilename }}</p>
            <button (click)="toggleFavoriteLightbox($event)"
                    style="background:none;border:none;cursor:pointer;padding:2px;display:flex;align-items:center;">
              <svg width="18" height="18" viewBox="0 0 24 24" [attr.fill]="lightboxPhoto()!.favorite ? '#ea4335' : 'none'" stroke="#fff" stroke-width="2">
                <path stroke-linecap="round" d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
              </svg>
            </button>
            <!-- Info toggle -->
            <button (click)="showInfoPanel.set(!showInfoPanel()); $event.stopPropagation()"
                    style="background:rgba(255,255,255,0.12);border:none;border-radius:50%;width:30px;height:30px;display:flex;align-items:center;justify-content:center;cursor:pointer;">
              <svg width="14" height="14" fill="none" stroke="#fff" stroke-width="2" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10"/><path stroke-linecap="round" d="M12 16v-4m0-4h.01"/>
              </svg>
            </button>
          </div>

          <!-- Prev -->
          @if (lightboxIndex() > 0) {
            <button (click)="navigateLightbox(-1); $event.stopPropagation()"
                    style="position:absolute;left:16px;background:rgba(255,255,255,0.12);border:none;border-radius:50%;width:44px;height:44px;display:flex;align-items:center;justify-content:center;cursor:pointer;z-index:10;">
              <svg width="20" height="20" fill="none" stroke="#fff" stroke-width="2.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" d="M15 19l-7-7 7-7"/>
              </svg>
            </button>
          }

          <!-- Next -->
          @if (lightboxIndex() < flatPhotos().length - 1) {
            <button (click)="navigateLightbox(1); $event.stopPropagation()"
                    style="position:absolute;right:@if(showInfoPanel()) { 324px } @else { 16px };background:rgba(255,255,255,0.12);border:none;border-radius:50%;width:44px;height:44px;display:flex;align-items:center;justify-content:center;cursor:pointer;z-index:10;"
                    [style.right]="showInfoPanel() ? '324px' : '16px'">
              <svg width="20" height="20" fill="none" stroke="#fff" stroke-width="2.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" d="M9 5l7 7-7 7"/>
              </svg>
            </button>
          }

          <!-- Photo -->
          <img [src]="lightboxPhoto()!.blobUrl" [alt]="lightboxPhoto()!.originalFilename"
               (click)="$event.stopPropagation()"
               style="max-height:90vh;max-width:90vw;object-fit:contain;border-radius:4px;box-shadow:0 8px 40px rgba(0,0,0,0.5);"
               [style.max-width]="showInfoPanel() ? 'calc(90vw - 320px)' : '90vw'" />

          <!-- Info panel -->
          @if (showInfoPanel()) {
            <div (click)="$event.stopPropagation()"
                 style="position:absolute;top:0;right:0;bottom:0;width:300px;background:#1a1a2e;padding:60px 20px 20px;overflow-y:auto;border-left:1px solid rgba(255,255,255,0.08);">
              <p style="margin:0 0 20px;font-size:15px;font-weight:500;color:#fff;">Photo Info</p>

              <div style="display:flex;flex-direction:column;gap:14px;">
                <div>
                  <p style="margin:0;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Filename</p>
                  <p style="margin:4px 0 0;font-size:13px;color:#e2e8f0;word-break:break-all;">{{ lightboxPhoto()!.originalFilename }}</p>
                </div>
                <div>
                  <p style="margin:0;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">File size</p>
                  <p style="margin:4px 0 0;font-size:13px;color:#e2e8f0;">{{ formatSize(lightboxPhoto()!.fileSize) }}</p>
                </div>
                <div>
                  <p style="margin:0;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Type</p>
                  <p style="margin:4px 0 0;font-size:13px;color:#e2e8f0;">{{ lightboxPhoto()!.contentType }}</p>
                </div>
                <div>
                  <p style="margin:0;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Uploaded</p>
                  <p style="margin:4px 0 0;font-size:13px;color:#e2e8f0;">{{ formatDateTime(lightboxPhoto()!.uploadedAt) }}</p>
                </div>
                <div>
                  <p style="margin:0;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Photo ID</p>
                  <p style="margin:4px 0 0;font-size:13px;color:#e2e8f0;">#{{ lightboxPhoto()!.id }}</p>
                </div>
              </div>
            </div>
          }
        </div>
      }

    </div>

    <style>
      @keyframes spin { to { transform: rotate(360deg); } }
      .gp-thumb:hover .gp-overlay { opacity: 1 !important; }
      .gp-thumb:hover img { transform: scale(1.03); }
      .gp-thumb:hover .fav-btn { opacity: 1 !important; }
    </style>
  `
})
export class GalleryComponent implements OnInit {
  private photo = inject(PhotoService);
  private sanitizer = inject(DomSanitizer);
  private route = inject(ActivatedRoute);
  router = inject(Router);

  // Data
  groups = signal<GroupWithBlobs[]>([]);
  loading = signal(true);
  albums = signal<AlbumResponse[]>([]);

  // Lightbox
  lightboxPhoto = signal<PhotoWithBlob | null>(null);
  showInfoPanel = signal(false);

  // Search & filter
  searchQuery = '';
  showFavoritesOnly = signal(false);

  // Bulk
  bulkMode = signal(false);
  selectedIds = signal<Set<number>>(new Set());
  showAlbumPicker = signal(false);
  newAlbumName = '';

  // Favorites
  favorites = signal<Set<number>>(new Set());

  filteredGroups = computed(() => {
    let gs = this.groups();
    if (this.showFavoritesOnly()) {
      gs = gs.map(g => ({ ...g, photos: g.photos.filter(p => this.favorites().has(p.id)) }))
             .filter(g => g.photos.length > 0);
    }
    const q = this.searchQuery.toLowerCase().trim();
    if (q) {
      gs = gs.map(g => ({
        ...g,
        photos: g.photos.filter(p =>
          p.originalFilename.toLowerCase().includes(q) ||
          g.date.includes(q) ||
          this.formatDate(g.date).toLowerCase().includes(q)
        )
      })).filter(g => g.photos.length > 0);
    }
    return gs;
  });

  flatPhotos = computed(() => this.filteredGroups().flatMap(g => g.photos));

  lightboxIndex = computed(() => {
    const p = this.lightboxPhoto();
    if (!p) return -1;
    return this.flatPhotos().findIndex(fp => fp.id === p.id);
  });

  ngOnInit() {
    this.favorites.set(this.photo.getFavorites());
    if (this.route.snapshot.data['favoritesOnly']) this.showFavoritesOnly.set(true);
    this.loadPhotos();
    this.photo.listAlbums().subscribe({ next: a => this.albums.set(a) });
  }

  loadPhotos() {
    this.loading.set(true);
    this.photo.listPhotos().subscribe({
      next: (data) => {
        const favs = this.favorites();
        this.groups.set(data.map(g => ({
          date: g.date,
          photos: g.photos.map(p => ({ ...p, loading: true, favorite: favs.has(p.id) }))
        })));
        this.loading.set(false);
        this.loadThumbnails();
      },
      error: () => this.loading.set(false)
    });
  }

  private patchPhoto(id: number, patch: Partial<PhotoWithBlob>) {
    this.groups.update(gs => gs.map(g => ({
      ...g, photos: g.photos.map(p => p.id === id ? { ...p, ...patch } : p)
    })));
    const lb = this.lightboxPhoto();
    if (lb?.id === id) this.lightboxPhoto.set({ ...lb, ...patch } as PhotoWithBlob);
  }

  loadThumbnails() {
    for (const group of this.groups()) {
      for (const photo of group.photos) {
        this.photo.getPhotoBlob(photo.id).subscribe({
          next: (blob) => this.patchPhoto(photo.id, {
            blobUrl: this.sanitizer.bypassSecurityTrustUrl(URL.createObjectURL(blob)),
            loading: false
          }),
          error: () => this.patchPhoto(photo.id, { loading: false })
        });
      }
    }
  }

  onThumbClick(photo: PhotoWithBlob) {
    if (this.bulkMode()) {
      this.selectedIds.update(s => {
        const next = new Set(s);
        next.has(photo.id) ? next.delete(photo.id) : next.add(photo.id);
        return next;
      });
    } else {
      this.showInfoPanel.set(false);
      this.lightboxPhoto.set(photo);
    }
  }

  navigateLightbox(dir: -1 | 1) {
    const idx = this.lightboxIndex();
    const flat = this.flatPhotos();
    const next = flat[idx + dir];
    if (next) this.lightboxPhoto.set(next);
  }

  @HostListener('document:keydown', ['$event'])
  onKey(e: KeyboardEvent) {
    if (!this.lightboxPhoto()) return;
    if (e.key === 'ArrowLeft') this.navigateLightbox(-1);
    if (e.key === 'ArrowRight') this.navigateLightbox(1);
    if (e.key === 'Escape') this.lightboxPhoto.set(null);
  }

  toggleFavorite(e: Event, photo: PhotoWithBlob) {
    e.stopPropagation();
    this.photo.toggleFavorite(photo.id);
    this.favorites.set(this.photo.getFavorites());
    this.patchPhoto(photo.id, { favorite: this.favorites().has(photo.id) });
  }

  toggleFavoriteLightbox(e: Event) {
    e.stopPropagation();
    const p = this.lightboxPhoto();
    if (!p) return;
    this.toggleFavorite(e, p);
  }

  openInfo(e: Event, photo: PhotoWithBlob) {
    e.stopPropagation();
    this.showInfoPanel.set(false);
    this.lightboxPhoto.set(photo);
    setTimeout(() => this.showInfoPanel.set(true), 0);
  }

  deletePhoto(e: Event, group: GroupWithBlobs, photo: PhotoWithBlob) {
    e.stopPropagation();
    if (!confirm(`Delete "${photo.originalFilename}"?`)) return;
    this.photo.deletePhoto(photo.id).subscribe({
      next: () => this.groups.update(gs =>
        gs.map(g => ({ ...g, photos: g.photos.filter(p => p.id !== photo.id) }))
          .filter(g => g.photos.length > 0)
      )
    });
  }

  toggleBulkMode() {
    this.bulkMode.update(v => !v);
    this.selectedIds.set(new Set());
    this.showAlbumPicker.set(false);
  }

  bulkDelete() {
    const ids = [...this.selectedIds()];
    if (!ids.length) return;
    if (!confirm(`Delete ${ids.length} photo${ids.length > 1 ? 's' : ''}?`)) return;
    this.photo.bulkDeletePhotos(ids).subscribe({
      next: () => {
        const removed = new Set(ids);
        this.groups.update(gs =>
          gs.map(g => ({ ...g, photos: g.photos.filter(p => !removed.has(p.id)) }))
            .filter(g => g.photos.length > 0)
        );
        this.selectedIds.set(new Set());
        this.bulkMode.set(false);
      }
    });
  }

  openAlbumPicker() {
    this.newAlbumName = '';
    this.showAlbumPicker.set(true);
  }

  addToAlbum(albumId: number) {
    const ids = [...this.selectedIds()];
    this.photo.addPhotosToAlbum(albumId, ids).subscribe({
      next: () => {
        this.photo.listAlbums().subscribe({ next: a => this.albums.set(a) });
        this.showAlbumPicker.set(false);
        this.selectedIds.set(new Set());
        this.bulkMode.set(false);
      }
    });
  }

  createAlbumAndAdd() {
    if (!this.newAlbumName.trim()) return;
    this.photo.createAlbum(this.newAlbumName.trim()).subscribe({
      next: (album) => {
        this.albums.update(a => [album, ...a]);
        this.addToAlbum(album.id);
      }
    });
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
  }

  formatSize(bytes: number): string {
    if (!bytes) return '—';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }

  formatDateTime(iso: string): string {
    return new Date(iso).toLocaleString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }
}
