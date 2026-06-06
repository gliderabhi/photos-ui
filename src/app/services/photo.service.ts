import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

const BASE = 'https://api.sevis.store';
const API = `${BASE}/photo-service/api/photos`;
const ALBUM_API = `${BASE}/photo-service/api/albums`;
const FOLDER_PWD_KEY = 'folder_password';
const FAVORITES_KEY = 'photos_favorites';

export interface PhotoResponse {
  id: number;
  originalFilename: string;
  contentType: string;
  fileSize: number;
  uploadedAt: string;
  url: string;
}

export interface PhotosByDate {
  date: string;
  photos: PhotoResponse[];
}

export interface AlbumResponse {
  id: number;
  name: string;
  photoCount: number;
  createdAt: string;
  coverPhoto: PhotoResponse | null;
}

@Injectable({ providedIn: 'root' })
export class PhotoService {
  folderUnlocked = signal(!!sessionStorage.getItem(FOLDER_PWD_KEY));

  constructor(private http: HttpClient) {}

  // ── Folder ────────────────────────────────────────────────────

  getFolderStatus(): Observable<{ hasFolder: boolean }> {
    return this.http.get<{ hasFolder: boolean }>(`${API}/folder/status`);
  }

  setupFolder(password: string, currentPassword?: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${API}/folder/setup`, { password, currentPassword });
  }

  verifyFolder(password: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${API}/folder/verify`, {}, {
      headers: this.folderHeaders(password)
    });
  }

  unlockFolder(password: string) {
    sessionStorage.setItem(FOLDER_PWD_KEY, password);
    this.folderUnlocked.set(true);
  }

  lockFolder() {
    sessionStorage.removeItem(FOLDER_PWD_KEY);
    this.folderUnlocked.set(false);
  }

  getFolderPassword(): string | null {
    return sessionStorage.getItem(FOLDER_PWD_KEY);
  }

  // ── Photos ────────────────────────────────────────────────────

  listPhotos(): Observable<PhotosByDate[]> {
    return this.http.get<PhotosByDate[]>(API, { headers: this.folderHeaders() });
  }

  upload(file: File): Observable<PhotoResponse> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<PhotoResponse>(`${API}/upload`, formData, {
      headers: this.folderHeaders()
    });
  }

  getPhotoBlob(photoId: number): Observable<Blob> {
    return this.http.get(`${API}/${photoId}/content`, {
      headers: this.folderHeaders(),
      responseType: 'blob'
    });
  }

  deletePhoto(photoId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${API}/${photoId}`, {
      headers: this.folderHeaders()
    });
  }

  bulkDeletePhotos(photoIds: number[]): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${API}/bulk`, {
      headers: this.folderHeaders(),
      body: { photoIds }
    });
  }

  // ── Albums ────────────────────────────────────────────────────

  listAlbums(): Observable<AlbumResponse[]> {
    return this.http.get<AlbumResponse[]>(ALBUM_API, { headers: this.folderHeaders() });
  }

  createAlbum(name: string): Observable<AlbumResponse> {
    return this.http.post<AlbumResponse>(ALBUM_API, { name }, { headers: this.folderHeaders() });
  }

  deleteAlbum(albumId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${ALBUM_API}/${albumId}`, {
      headers: this.folderHeaders()
    });
  }

  getAlbumPhotos(albumId: number): Observable<PhotoResponse[]> {
    return this.http.get<PhotoResponse[]>(`${ALBUM_API}/${albumId}/photos`, {
      headers: this.folderHeaders()
    });
  }

  addPhotosToAlbum(albumId: number, photoIds: number[]): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${ALBUM_API}/${albumId}/photos`, { photoIds }, {
      headers: this.folderHeaders()
    });
  }

  removePhotoFromAlbum(albumId: number, photoId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${ALBUM_API}/${albumId}/photos/${photoId}`, {
      headers: this.folderHeaders()
    });
  }

  // ── Favorites (localStorage) ──────────────────────────────────

  getFavorites(): Set<number> {
    try {
      const raw = localStorage.getItem(FAVORITES_KEY);
      return raw ? new Set(JSON.parse(raw) as number[]) : new Set();
    } catch { return new Set(); }
  }

  toggleFavorite(photoId: number): boolean {
    const favs = this.getFavorites();
    if (favs.has(photoId)) { favs.delete(photoId); } else { favs.add(photoId); }
    localStorage.setItem(FAVORITES_KEY, JSON.stringify([...favs]));
    return favs.has(photoId);
  }

  isFavorite(photoId: number): boolean {
    return this.getFavorites().has(photoId);
  }

  // ── Helpers ───────────────────────────────────────────────────

  private folderHeaders(password?: string): HttpHeaders {
    const pwd = password ?? this.getFolderPassword() ?? '';
    return new HttpHeaders({ 'X-Folder-Password': pwd });
  }
}
