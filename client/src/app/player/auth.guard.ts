import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { AuthService } from './auth.service';
import { Observable } from 'rxjs';
import { filter, map, take } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}

  canActivate(): Observable<boolean | UrlTree> {
    return this.auth.authReady$.pipe(
      filter((ready) => ready === true),
      take(1),
      map(() => {
        return this.auth.currentUser
          ? true
          : this.router.createUrlTree(['/login']);
      })
    );
  }
}