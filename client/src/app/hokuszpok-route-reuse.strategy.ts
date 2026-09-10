import { Injectable } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  DetachedRouteHandle,
  RouteReuseStrategy
} from '@angular/router';

@Injectable({ providedIn: 'root' })
export class HokuszpokRouteReuseStrategy implements RouteReuseStrategy {
  private storedHandle: DetachedRouteHandle | null = null;

  shouldDetach(route: ActivatedRouteSnapshot): boolean {
    return route.routeConfig?.path === 'hokuszpok';
  }

  store(route: ActivatedRouteSnapshot, handle: DetachedRouteHandle): void {
    this.storedHandle = handle;
  }

  shouldAttach(route: ActivatedRouteSnapshot): boolean {
    return route.routeConfig?.path === 'hokuszpok' && this.storedHandle !== null;
  }

  retrieve(route: ActivatedRouteSnapshot): DetachedRouteHandle | null {
    return route.routeConfig?.path === 'hokuszpok'
      ? this.storedHandle
      : null;
  }

  shouldReuseRoute(
    future: ActivatedRouteSnapshot,
    current: ActivatedRouteSnapshot
  ): boolean {
    return future.routeConfig === current.routeConfig;
  }
}
