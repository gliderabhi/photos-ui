import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { PhotoService } from '../services/photo.service';
import { switchMap, map, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

export const folderGuard: CanActivateFn = () => {
  const photo = inject(PhotoService);
  const router = inject(Router);

  return photo.getFolderStatus().pipe(
    switchMap(status => {
      if (!status.hasFolder) {
        return of(router.createUrlTree(['/folder-setup']));
      }
      if (!photo.folderUnlocked()) {
        return of(router.createUrlTree(['/folder-unlock']));
      }
      return of(true);
    }),
    catchError(() => of(router.createUrlTree(['/folder-setup'])))
  );
};
