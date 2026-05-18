import { Component } from '@angular/core';
import { AuthService } from '../player/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  email = '';
  password = '';
  username = '';
  isLoginMode = true; // Ezzel váltunk a két mód között

  constructor(private auth: AuthService, private router: Router) {}

  toggleMode() {
    this.isLoginMode = !this.isLoginMode;
    this.username = ''; // Töröljük a nevet váltáskor
  }

  async onSubmit() {
    try {
      if (this.isLoginMode) {
        await this.auth.login(this.email, this.password);
      } else {
        if (!this.username) { alert("Adj meg egy nevet!"); return; }
        await this.auth.register(this.email, this.password, this.username);
      }
      this.router.navigate(['/player']);
    } catch (err: any) {
      alert("Hiba: " + err.message);
    }
  }
}