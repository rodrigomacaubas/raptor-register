import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environment/enviroment';

interface User {
  username: string;
  password: string;
  confirmPassword: string;
  birthDate: string;
  gender: string;
  email: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private readonly apiUrl = environment.apiUrl + '/users';
  private readonly resendUrl = environment.apiUrl + '/user/resend_confirmation_email';
  private readonly activeEmailUrl = environment.apiUrl + '/user/active_email';

  constructor(private readonly http: HttpClient) {}

  registerUser(user: User): Observable<any> {
    return this.http.post<any>(this.apiUrl, user);
  }
  
  resendConfirmationEmail(email: string): Observable<any> {
    return this.http.post<any>(this.resendUrl, { email });
  }
  
  activateEmail(emailCode: string): Observable<any> {
    return this.http.post<any>(this.activeEmailUrl, { email_code: emailCode });
  }
}