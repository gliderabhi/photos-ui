import { Component, OnInit, OnDestroy, inject, signal, computed, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import Hls from 'hls.js';
import { VideoService, VideoResponse } from '../../services/video.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-videos',
  standalone: true,
  template: `
    <div style="max-width:1100px;margin:0 auto;padding-bottom:40px;">

      <h1 style="margin:0 0 4px;font-size:22px;font-weight:600;color:#202124;">Videos</h1>
      <p style="margin:0 0 24px;font-size:13px;color:#5f6368;">Play videos from your private vault</p>

      @if (loading()) {
        <div style="display:flex;justify-content:center;padding:60px;">
          <div style="width:32px;height:32px;border:3px solid #e8eaed;border-top-color:#1a73e8;border-radius:50%;animation:spin 0.8s linear infinite;"></div>
        </div>
      } @else if (videos().length === 0) {
        <p style="font-size:13px;color:#9aa0a6;">No videos yet</p>
      } @else {
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:16px;">
          @for (video of videos(); track video.id) {
            <div style="border-radius:12px;overflow:hidden;background:#f1f3f4;cursor:pointer;position:relative;"
                 (click)="playVideo(video)">
              <div style="aspect-ratio:16/10;position:relative;">
                @if (video.thumbnailUrl) {
                  <img [src]="videoSvc.resolveUrl(video.thumbnailUrl)" [alt]="video.title"
                       style="width:100%;height:100%;object-fit:cover;display:block;" />
                }
                @if (isPlayable(video)) {
                  <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;">
                    <div style="width:40px;height:40px;border-radius:50%;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff"><path d="M8 5v14l11-7z"/></svg>
                    </div>
                  </div>
                } @else if (video.status === 'FAILED') {
                  <div style="position:absolute;inset:0;background:rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;color:#ea4335;font-size:12px;">
                    Failed
                  </div>
                } @else {
                  <div style="position:absolute;inset:0;background:rgba(0,0,0,0.25);"></div>
                }
              </div>
              <div style="padding:8px 10px;">
                <p style="margin:0;font-size:12px;color:#202124;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">{{ video.title }}</p>
              </div>
              <button (click)="deleteVideo($event, video)"
                      style="position:absolute;top:6px;right:6px;background:rgba(0,0,0,0.55);border:none;border-radius:50%;width:26px;height:26px;display:flex;align-items:center;justify-content:center;cursor:pointer;">
                <svg width="12" height="12" fill="none" stroke="#fff" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                </svg>
              </button>
            </div>
          }
        </div>
      }

      <!-- Player modal -->
      @if (playingVideo()) {
        <div (click)="closePlayer()"
             style="position:fixed;inset:0;background:#000;z-index:1000;display:flex;align-items:flex-start;justify-content:center;padding-top:32px;">

          @if (qualityLevels().length > 0) {
            <div (click)="$event.stopPropagation()" style="position:absolute;top:16px;right:68px;">
              <button (click)="showQualityMenu.set(!showQualityMenu())"
                      style="background:rgba(255,255,255,0.1);border:none;border-radius:20px;padding:9px 16px;color:#fff;font-size:13px;cursor:pointer;display:flex;align-items:center;gap:6px;">
                <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                  <circle cx="12" cy="12" r="3" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                {{ currentQualityLabel() }}
              </button>
              @if (showQualityMenu()) {
                <div style="position:absolute;top:calc(100% + 6px);right:0;background:#1f1f1f;border-radius:10px;overflow:hidden;min-width:110px;box-shadow:0 4px 20px rgba(0,0,0,0.4);">
                  <button (click)="selectQuality(-1)"
                          [style.background]="currentLevelIndex() === -1 ? 'rgba(255,255,255,0.12)' : 'transparent'"
                          style="display:block;width:100%;text-align:left;padding:10px 16px;background:transparent;border:none;color:#fff;font-size:13px;cursor:pointer;">
                    Auto
                  </button>
                  @for (level of qualityLevels(); track level.index) {
                    <button (click)="selectQuality(level.index)"
                            [style.background]="currentLevelIndex() === level.index ? 'rgba(255,255,255,0.12)' : 'transparent'"
                            style="display:block;width:100%;text-align:left;padding:10px 16px;background:transparent;border:none;color:#fff;font-size:13px;cursor:pointer;">
                      {{ level.label }}
                    </button>
                  }
                </div>
              }
            </div>
          }

          <button (click)="closePlayer()"
                  style="position:absolute;top:16px;right:16px;background:rgba(255,255,255,0.1);border:none;border-radius:50%;width:42px;height:42px;color:#fff;font-size:22px;cursor:pointer;">×</button>
          <!-- Fixed 16:9 box (same as the movies UI) so the player doesn't resize
               per-video based on each clip's native aspect ratio/portrait-vs-landscape. -->
          <div (click)="$event.stopPropagation()"
               style="width:90vw;max-width:1280px;aspect-ratio:16/9;background:#000;border-radius:8px;overflow:hidden;">
            <video #videoEl controls autoplay
                   style="width:100%;height:100%;display:block;object-fit:contain;"></video>
          </div>
        </div>
      }
    </div>

    <style>
      @keyframes spin { to { transform: rotate(360deg); } }
    </style>
  `
})
export class VideosComponent implements OnInit, OnDestroy {
  videoSvc = inject(VideoService);
  private auth = inject(AuthService);

  videos = signal<VideoResponse[]>([]);
  loading = signal(true);
  playingVideo = signal<VideoResponse | null>(null);
  qualityLevels = signal<{ index: number; label: string }[]>([]);
  currentLevelIndex = signal<number>(-1); // -1 = Auto (hls.js's own ABR)
  showQualityMenu = signal(false);

  currentQualityLabel = computed(() => {
    const idx = this.currentLevelIndex();
    if (idx === -1) return 'Auto';
    return this.qualityLevels().find(l => l.index === idx)?.label ?? 'Auto';
  });

  @ViewChild('videoEl') videoElRef?: ElementRef<HTMLVideoElement>;
  private hls?: Hls;
  private pollHandle?: ReturnType<typeof setTimeout>;

  ngOnInit() {
    this.refresh();
  }

  ngOnDestroy() {
    this.hls?.destroy();
    if (this.pollHandle) clearTimeout(this.pollHandle);
  }

  refresh() {
    this.loading.set(true);
    this.videoSvc.listVideos().subscribe({
      next: (data) => {
        this.videos.set(data);
        this.loading.set(false);
        // Keep polling quietly while anything is still pending/processing so
        // thumbnails/HLS availability update live — no progress UI is shown.
        if (this.pollHandle) clearTimeout(this.pollHandle);
        if (data.some(v => v.status === 'PENDING' || v.status === 'PROCESSING')) {
          this.pollHandle = setTimeout(() => this.refresh(), 4000);
        }
      },
      error: () => this.loading.set(false)
    });
  }

  isPlayable(video: VideoResponse): boolean {
    return !!(video.masterPlaylistUrl || video.rawStreamUrl);
  }

  playVideo(video: VideoResponse) {
    const url = video.masterPlaylistUrl ?? video.rawStreamUrl;
    if (!url) return;
    this.qualityLevels.set([]);
    this.currentLevelIndex.set(-1);
    this.showQualityMenu.set(false);
    this.playingVideo.set(video);
    setTimeout(() => this.attachPlayer(this.videoSvc.resolveUrl(url), !!video.masterPlaylistUrl), 0);
  }

  selectQuality(levelIndex: number) {
    if (this.hls) this.hls.currentLevel = levelIndex;
    this.showQualityMenu.set(false);
  }

  private attachPlayer(url: string, isHls: boolean) {
    const el = this.videoElRef?.nativeElement;
    if (!el) return;
    this.hls?.destroy();
    if (isHls && Hls.isSupported()) {
      // hls.js resolves segment/init-segment URLs relative to the playlist URL,
      // which drops the ?access_token query param carried by the manifest
      // request — so the token has to be attached as a header on every request
      // hls.js itself makes, not just the initial loadSource() call.
      this.hls = new Hls({
        xhrSetup: (xhr) => {
          const token = this.auth.getToken();
          if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        }
      });
      this.hls.on(Hls.Events.MANIFEST_PARSED, (_evt, data) => {
        const byHeightDesc = data.levels
          .map((level, index) => ({ index, height: level.height }))
          .sort((a, b) => b.height - a.height);
        this.qualityLevels.set(byHeightDesc.map(l => ({ index: l.index, label: `${l.height}p` })));

        // hls.js's ABR otherwise starts conservatively at a low bitrate before
        // its bandwidth estimate ramps up. `startLevel` (unlike `currentLevel`)
        // only steers the *initial* fragment choice and leaves Auto ABR in
        // control afterward, so quality still adapts normally from there on.
        if (byHeightDesc.length > 0) this.hls!.startLevel = byHeightDesc[0].index;
      });
      this.hls.on(Hls.Events.LEVEL_SWITCHED, (_evt, data) => {
        this.currentLevelIndex.set(data.level);
      });
      this.hls.loadSource(url);
      this.hls.attachMedia(el);
    } else {
      // Safari (native HLS) or the raw-file fallback both just work via <video src>
      el.src = url;
    }
  }

  closePlayer() {
    this.hls?.destroy();
    this.hls = undefined;
    this.playingVideo.set(null);
    this.qualityLevels.set([]);
    this.showQualityMenu.set(false);
  }

  deleteVideo(e: Event, video: VideoResponse) {
    e.stopPropagation();
    if (!confirm(`Delete "${video.title}"?`)) return;
    this.videoSvc.deleteVideo(video.id).subscribe({
      next: () => this.videos.update(vs => vs.filter(v => v.id !== video.id))
    });
  }
}
