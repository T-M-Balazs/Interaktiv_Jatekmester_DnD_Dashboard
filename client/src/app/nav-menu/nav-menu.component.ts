import { Component, OnInit } from '@angular/core';
import { AuthService } from '../player/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-nav-menu',
  templateUrl: './nav-menu.component.html',
  styleUrls: ['./nav-menu.component.css']
})
export class NavMenuComponent implements OnInit {
  isExpanded = false;
  currentUser: any = null;

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit() {
    this.authService.userProfile$.subscribe(user => {
      this.currentUser = user;
    });
  }

  toggle() { this.isExpanded = !this.isExpanded; }
  collapse() { this.isExpanded = false; }

  logout() {
    this.authService.logout().then(() => {
      this.collapse();
      this.router.navigate(['/login']);
    });
  }
}