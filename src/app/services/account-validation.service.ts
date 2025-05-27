import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { UsernameCheckResponse } from '../models/username-check-response.model';
import { EmailCheckResponse } from '../models/email-check-response.model';
import { environment } from '../environment/enviroment';

@Injectable({
  providedIn: 'root',
})
export class AccountValidationService {
  // private readonly baseUrl = environment.apiUrl + '/check'; // Preferível para deploys
  private readonly baseUrl = environment.apiUrl + '/check';

  constructor(private readonly http: HttpClient) {}

  /**
   * Verifica se o e-mail já está cadastrado.
   * @param email O e-mail a ser verificado.
   * @returns Observable<boolean> indicando existência.
   */
  checkEmail(email: string): Observable<boolean> {
    return this.http
      .post<EmailCheckResponse>(`${this.baseUrl}/email`, { email })
      .pipe(map((response: EmailCheckResponse) => response.email_exists));
  }

  /**
   * Verifica se o nome de usuário já está cadastrado.
   * @param username O username a ser verificado.
   * @returns Observable<boolean> indicando existência.
   */
  checkUsername(username: string): Observable<boolean> {
    return this.http
      .post<UsernameCheckResponse>(`${this.baseUrl}/username`, { username })
      .pipe(map((response: UsernameCheckResponse) => response.username_exists));
  }
}