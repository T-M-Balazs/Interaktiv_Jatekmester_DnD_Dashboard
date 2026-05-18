import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class UploadService {
  constructor(private http: HttpClient) {}

  upload(file: File) {
    const form = new FormData();
    form.append('file', file, file.name);
    return this.http.post('/api/upload', form);
  }
}
