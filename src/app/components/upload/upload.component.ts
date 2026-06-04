import { Component, inject } from '@angular/core';
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
    <div style="max-width:42rem;margin:0 auto">
      <div class="page-header">
        <h1 class="page-title">Upload Photos</h1>
        <button (click)="router.navigate(['/gallery'])" style="font-size:0.875rem;color:#4f46e5;background:none;border:none;cursor:pointer">
          View Gallery
        </button>
      </div>

      <div class="dropzone" [class.dropzone-active]="dragging"
           (dragover)="onDragOver($event)" (dragleave)="dragging=false"
           (drop)="onDrop($event)" (click)="fileInput.click()">
        <div class="dropzone-icon">📷</div>
        <p style="color:#4b5563;font-weight:500">Drop photos here or <span style="color:#4f46e5">browse</span></p>
        <p class="dropzone-hint">PNG, JPG, WEBP up to 20 MB each</p>
      </div>
      <input #fileInput type="file" multiple accept="image/*" style="display:none" (change)="onFileSelect($event)" />

      @if (queue.length > 0) {
        <div style="margin-top:1.5rem;display:flex;flex-direction:column;gap:0.75rem">
          @for (item of queue; track item.file.name) {
            <div class="upload-item">
              <img [src]="item.preview" class="upload-thumb" />
              <div style="flex:1;min-width:0">
                <p class="upload-name">{{ item.file.name }}</p>
                <p class="upload-size">{{ (item.file.size / 1024 / 1024).toFixed(2) }} MB</p>
                @if (item.errorMsg) { <p class="upload-err">{{ item.errorMsg }}</p> }
              </div>
              <span class="status-badge" [class]="'status-' + item.status">{{ item.status }}</span>
            </div>
          }
        </div>
        <div style="margin-top:1rem;display:flex;gap:0.75rem">
          <button (click)="uploadAll()" [disabled]="uploading" class="btn-primary-full" style="flex:1">
            {{ uploading ? 'Uploading...' : 'Upload All' }}
          </button>
          <button (click)="queue=[]" [disabled]="uploading" class="btn-secondary">Clear</button>
        </div>
      }
    </div>
  `
})
export class UploadComponent {
  private photo = inject(PhotoService);
  router = inject(Router);

  queue: UploadItem[] = [];
  dragging = false;
  uploading = false;

  onDragOver(e: DragEvent) { e.preventDefault(); this.dragging = true; }
  onDrop(e: DragEvent) {
    e.preventDefault(); this.dragging = false;
    this.addToQueue(Array.from(e.dataTransfer?.files ?? []).filter(f => f.type.startsWith('image/')));
  }
  onFileSelect(e: Event) {
    const input = e.target as HTMLInputElement;
    this.addToQueue(Array.from(input.files ?? []));
    input.value = '';
  }
  addToQueue(files: File[]) {
    for (const file of files) {
      const reader = new FileReader();
      reader.onload = ev => this.queue.push({ file, preview: ev.target!.result as string, status: 'pending' });
      reader.readAsDataURL(file);
    }
  }
  uploadAll() {
    this.uploading = true;
    const pending = this.queue.filter(i => i.status === 'pending');
    let done = 0;
    if (!pending.length) { this.uploading = false; return; }
    for (const item of pending) {
      item.status = 'uploading';
      this.photo.upload(item.file).subscribe({
        next: () => { item.status = 'done'; if (++done === pending.length) this.uploading = false; },
        error: (err) => { item.status = 'error'; item.errorMsg = err.error?.message ?? 'Upload failed'; if (++done === pending.length) this.uploading = false; }
      });
    }
  }
}
