import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PhotoService } from './photo.service';
import { AuthService } from './auth.service';

const BASE = '';
// Upload/delete go through photo-service (resolves a per-user storageBaseDir
// under the encrypted photo folder, then forwards to stream-service's ffmpeg
// pipeline — see project decision to reuse stream-service directly).
const PHOTO_VIDEO_API = `${BASE}/photo-service/api/photos/videos`;
// List/status/playback go straight to stream-service through the gateway — the
// gateway's JWT filter already injects a trustworthy X-User-Id, so there's no
// need to proxy binary HLS/raw traffic through photo-service.
const STREAM_VIDEO_API = `${BASE}/stream-service/api/videos`;

export interface VideoResponse {
  id: string;
  title: string;
  originalFilename: string;
  status: string;
  durationSeconds: number;
  fileSizeBytes: number;
  transcodeProgress: number;
  errorMessage: string | null;
  description: string | null;
  thumbnailUrl: string | null;
  masterPlaylistUrl: string | null;
  rawStreamUrl: string | null;
  availableQualities: string[];
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class VideoService {
  constructor(private http: HttpClient, private photo: PhotoService, private auth: AuthService) {}

  listVideos(): Observable<VideoResponse[]> {
    return this.http.get<VideoResponse[]>(STREAM_VIDEO_API, { params: { sourceApp: 'PHOTOS' } });
  }

  uploadVideo(file: File): Observable<VideoResponse> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<VideoResponse>(`${PHOTO_VIDEO_API}/upload`, formData, {
      headers: this.folderHeaders()
    });
  }

  deleteVideo(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${PHOTO_VIDEO_API}/${id}`, {
      headers: this.folderHeaders()
    });
  }

  // Thumbnails, HLS playlists and raw playback are loaded by native <img>/<video>
  // elements (and hls.js's own internal fetches), none of which go through
  // HttpClient/the auth interceptor — so the JWT has to ride along as a query
  // param instead of the usual Authorization header for these to load at all.
  resolveUrl(relativeUrl: string): string {
    const token = this.auth.getToken();
    const separator = relativeUrl.includes('?') ? '&' : '?';
    return `${BASE}${relativeUrl}${token ? `${separator}access_token=${encodeURIComponent(token)}` : ''}`;
  }

  private folderHeaders(): HttpHeaders {
    return new HttpHeaders({ 'X-Folder-Password': this.photo.getFolderPassword() ?? '' });
  }
}
