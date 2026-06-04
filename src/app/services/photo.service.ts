import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

const API = 'http://localhost:8080/photo-service/api/photos';
const FOLDER_PWD_KEY = 'folder_password';

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

@Injectable({ providedIn: 'root' })
export class PhotoService {
  folderUnlocked = signal(!!sessionStorage.getItem(FOLDER_PWD_KEY));

  constructor(private http: HttpClient) {}

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

  getPhotoUrl(photoId: number): string {
    const token = localStorage.getItem('photos_token');
    const pwd = this.getFolderPassword();
    // We use a proxied fetch via the service, not direct URL, because we need custom headers.
    // This method is used for constructing the request.
    return `${API}/${photoId}/content`;
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

  private folderHeaders(password?: string): HttpHeaders {
    const pwd = password ?? this.getFolderPassword() ?? '';
    return new HttpHeaders({ 'X-Folder-Password': pwd });
  }
}
