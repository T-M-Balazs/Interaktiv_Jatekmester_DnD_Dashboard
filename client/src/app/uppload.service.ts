import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class UploadService {
  // Ez a Node.js szervered címe, amit az index.js-ben beállítottunk
  private apiUrl = 'http://localhost:3000/api/upload';

  constructor(private http: HttpClient) {}

  upload(file: File, folder: string = 'music') {
    const form = new FormData();
    form.append('file', file, file.name);
    // Elküldjük a fájlt és a célmappát (music vagy shorts) a backendnek
    return this.http.post<{url: string, path: string}>(`${this.apiUrl}?folder=${folder}`, form);
  }
}