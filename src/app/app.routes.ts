import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { folderGuard } from './guards/folder.guard';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./components/login/login.component').then(m => m.LoginComponent) },
  {
    path: '',
    loadComponent: () => import('./components/shell/shell.component').then(m => m.ShellComponent),
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'gallery', pathMatch: 'full' },
      {
        path: 'gallery',
        loadComponent: () => import('./components/gallery/gallery.component').then(m => m.GalleryComponent),
        canActivate: [folderGuard]
      },
      {
        path: 'upload',
        loadComponent: () => import('./components/upload/upload.component').then(m => m.UploadComponent),
        canActivate: [folderGuard]
      },
      {
        path: 'folder-setup',
        loadComponent: () => import('./components/folder-setup/folder-setup.component').then(m => m.FolderSetupComponent)
      },
      {
        path: 'folder-unlock',
        loadComponent: () => import('./components/folder-unlock/folder-unlock.component').then(m => m.FolderUnlockComponent)
      },
    ]
  },
  { path: '**', redirectTo: '' }
];
