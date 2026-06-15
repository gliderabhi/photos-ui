import { Component, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { PhotoService } from '../../services/photo.service';

interface UploadItem {
  file: File;
  preview: string;
  status: 'pending' | 'uploading' | 'done' | 'error';
  errorMsg?: string;
}

@Component({
  selector: 'app-upload',
  standalone: true,
  template: `
    <div style="max-width:960px;margin:0 auto;padding-bottom:40px;">

      <!-- Header -->
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:28px;">
        <div>
          <h1 style="margin:0;font-size:22px;font-weight:600;color:#202124;">Upload photos</h1>
          <p style="margin:4px 0 0;font-size:13px;color:#5f6368;">Add photos to your private vault</p>
        </div>
        @if (doneCount() > 0) {
          <button (click)="router.navigate(['/gallery'])"
                  style="display:flex;align-items:center;gap:6px;padding:9px 18px;background:#1a73e8;color:#fff;border:none;border-radius:24px;font-size:14px;font-weight:500;cursor:pointer;">
            View in Gallery
          </button>
        }
      </div>

      <!-- Drop zone -->
      <div (dragover)="onDragOver($event)" (dragleave)="dragging.set(false)" (drop)="onDrop($event)" (click)="fileInput.click()"
           style="border:2px dashed;border-radius:16px;padding:56px 24px;text-align:center;cursor:pointer;transition:all 0.2s;user-select:none;"
           [style.borderColor]="dragging() ? '#1a73e8' : '#dadce0'"
           [style.background]="dragging() ? '#e8f0fe' : '#fafafa'">
        <div style="width:56px;height:56px;margin:0 auto 16px;background:#e8f0fe;border-radius:50%;display:flex;align-items:center;justify-content:center;">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1a73e8" stroke-width="1.8">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
          </svg>
        </div>
        <p style="margin:0;font-size:16px;font-weight:500;color:#202124;">
          {{ dragging() ? 'Drop photos here' : 'Drag photos here' }}
        </p>
        <p style="margin:8px 0 16px;font-size:13px;color:#5f6368;">or</p>
        <span style="display:inline-block;padding:8px 24px;background:#1a73e8;color:#fff;border-radius:24px;font-size:14px;font-weight:500;">
          Select from computer
        </span>
        <p style="margin:16px 0 0;font-size:12px;color:#9aa0a6;">PNG, JPG, WEBP · up to 20 MB each</p>
      </div>
      <input #fileInput type="file" multiple accept="image/*" style="display:none" (change)="onFileSelect($event)" />

      <!-- Selected photos grid -->
      @if (queue().length > 0) {
        <div style="margin-top:28px;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
            <span style="font-size:14px;color:#5f6368;">
              {{ queue().length }} photo{{ queue().length !== 1 ? 's' : '' }} selected
              @if (doneCount() > 0) { · {{ doneCount() }} uploaded }
            </span>
            <div style="display:flex;gap:10px;align-items:center;">
              @if (!allDone()) {
                <button (click)="queue.set([])" [disabled]="uploading()"
                        style="padding:8px 18px;background:none;border:1px solid #dadce0;border-radius:24px;font-size:14px;color:#5f6368;cursor:pointer;">
                  Clear
                </button>
                <button (click)="uploadAll()" [disabled]="uploading()"
                        style="padding:8px 24px;background:#1a73e8;color:#fff;border:none;border-radius:24px;font-size:14px;font-weight:500;cursor:pointer;"
                        [style.opacity]="uploading() ? '0.7' : '1'">
                  {{ uploading() ? 'Uploading…' : 'Upload ' + pendingCount() + ' photo' + (pendingCount() !== 1 ? 's' : '') }}
                </button>
              }
            </div>
          </div>

          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:4px;">
            @for (item of queue(); track item.file.name) {
              <div style="position:relative;aspect-ratio:1;border-radius:4px;overflow:hidden;background:#f1f3f4;">
                <img [src]="item.preview" style="width:100%;height:100%;object-fit:cover;" />

                <!-- Status overlay -->
                @if (item.status === 'uploading') {
                  <div style="position:absolute;inset:0;background:rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;">
                    <div style="width:32px;height:32px;border:3px solid rgba(255,255,255,0.3);border-top-color:#fff;border-radius:50%;animation:spin 0.8s linear infinite;"></div>
                  </div>
                } @else if (item.status === 'done') {
                  <div style="position:absolute;inset:0;background:rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:center;">
                    <div style="width:32px;height:32px;background:#1a73e8;border-radius:50%;display:flex;align-items:center;justify-content:center;">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
                      </svg>
                    </div>
                  </div>
                } @else if (item.status === 'error') {
                  <div style="position:absolute;inset:0;background:rgba(0,0,0,0.45);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;padding:8px;">
                    <div style="width:28px;height:28px;background:#ea4335;border-radius:50%;display:flex;align-items:center;justify-content:center;">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
                      </svg>
                    </div>
                    <span style="font-size:10px;color:#fff;text-align:center;line-height:1.3;">{{ item.errorMsg ?? 'Failed' }}</span>
                  </div>
                }

                <!-- Filename tooltip on hover (bottom bar) -->
                <div style="position:absolute;bottom:0;left:0;right:0;padding:4px 6px;background:linear-gradient(transparent,rgba(0,0,0,0.6));opacity:0;"
                     class="thumb-label">
                  <p style="margin:0;font-size:10px;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">{{ item.file.name }}</p>
                </div>
              </div>
            }
          </div>
        </div>
      }

    </div>
    <style>
      @keyframes spin { to { transform: rotate(360deg); } }
      div:hover > .thumb-label { opacity: 1 !important; transition: opacity 0.15s; }
    </style>
  `
})
export class UploadComponent {
  private photo = inject(PhotoService);
  router = inject(Router);

  queue = signal<UploadItem[]>([]);
  dragging = signal(false);
  uploading = signal(false);

  pendingCount = computed(() => this.queue().filter(i => i.status === 'pending').length);
  doneCount    = computed(() => this.queue().filter(i => i.status === 'done').length);
  allDone      = computed(() => this.queue().length > 0 && this.queue().every(i => i.status === 'done' || i.status === 'error'));

  onDragOver(e: DragEvent) { e.preventDefault(); this.dragging.set(true); }
  onDrop(e: DragEvent) {
    e.preventDefault(); this.dragging.set(false);
    this.addToQueue(Array.from(e.dataTransfer?.files ?? []).filter(f => f.type.startsWith('image/')));
  }
  onFileSelect(e: Event) {
    const input = e.target as HTMLInputElement;
    this.addToQueue(Array.from(input.files ?? []));
    input.value = '';
  }
  addToQueue(files: File[]) {
    const newItems: UploadItem[] = files.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      status: 'pending'
    }));
    this.queue.update(q => [...q, ...newItems]);
  }
  private updateItem(file: File, patch: Partial<UploadItem>) {
    this.queue.update(q => q.map(i => i.file === file ? { ...i, ...patch } : i));
  }
  uploadAll() {
    this.uploading.set(true);
    const pending = this.queue().filter(i => i.status === 'pending');
    let done = 0;
    if (!pending.length) { this.uploading.set(false); return; }
    for (const item of pending) {
      this.updateItem(item.file, { status: 'uploading' });
      this.photo.upload(item.file).subscribe({
        next: () => { this.updateItem(item.file, { status: 'done' }); if (++done === pending.length) this.uploading.set(false); },
        error: (err) => { this.updateItem(item.file, { status: 'error', errorMsg: err.error?.message ?? 'Upload failed' }); if (++done === pending.length) this.uploading.set(false); }
      });
    }
  }
}
