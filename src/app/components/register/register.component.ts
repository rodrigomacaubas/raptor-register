// register.component.ts
import {
  Component,
  inject,
  ViewChild,
  ElementRef,
  QueryList,
  ViewChildren,
  OnDestroy,
  OnInit,
} from '@angular/core';
import {
  AbstractControl,
  AsyncValidatorFn,
  FormBuilder,
  FormGroup,
  ValidationErrors,
  Validators,
  ReactiveFormsModule,
  FormsModule,
} from '@angular/forms';
import {
  debounceTime,
  first,
  map,
  finalize,
  catchError,
  Subscription,
} from 'rxjs';
import { of, Observable } from 'rxjs';
import { MatStepperModule, MatStepper } from '@angular/material/stepper';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule, MAT_DATE_LOCALE } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatListModule } from '@angular/material/list';
import { MatCardModule } from '@angular/material/card';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse, HttpClient } from '@angular/common/http';
import { AccountValidationService } from '../../services/account-validation.service';
import { UserService } from '../../services/user.service';
import { ActivatedRoute, Router } from '@angular/router';
import { environment } from '../../environment/enviroment';

@Component({
  selector: 'app-register',
  standalone: true,
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatStepperModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSelectModule,
    MatListModule,
    MatCardModule,
  ],
  providers: [{ provide: MAT_DATE_LOCALE, useValue: 'pt-BR' }],
})
export class RegisterComponent implements OnDestroy, OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly validatorSvc = inject(AccountValidationService);
  private readonly userSvc = inject(UserService);

  registerForm: FormGroup;
  verificationForm: FormGroup;
  registrationError: string | null = null;
  isRegistering = false;

  resendCooldown = 0;
  resendTimerInterval: any = null;
  isResending = false;

  accountCreated = false;
  emailConfirmationSent = false;

  private resendSubscription: Subscription | null = null;

  resendError: string | null = null;

  isVerifyingCode = false;
  verificationError: string | null = null;
  emailVerified = false;

  serverId: string | null = null;
  backUrl: string | null = null;
  serverInfo: any = null;
  isLoadingServerInfo = false;

  @ViewChild('stepper') stepper!: MatStepper;
  @ViewChildren('codeInput') codeInputs!: QueryList<ElementRef>;

  onCodeDigit(event: KeyboardEvent, index: number): void {
    const inputs = this.codeInputs.toArray();
    const input = event.target as HTMLInputElement;
    const value = input.value;

    if (value.length === 1 && index < inputs.length - 1) {
      inputs[index + 1].nativeElement.focus();
    }

    if (event.key === 'Backspace' && !value && index > 0) {
      inputs[index - 1].nativeElement.focus();
    }

    if (event.key === 'Tab') {
      this.focusFirstEmptyInput();
    }
  }

  onCodePaste(event: ClipboardEvent): void {
    event.preventDefault();

    const clipboardData = event.clipboardData;
    if (!clipboardData) return;

    const pastedText = clipboardData.getData('text').trim();

    if (pastedText.length === 6) {
      const inputs = this.codeInputs.toArray();
      let i = 0;
      for (const char of pastedText) {
        this.verificationForm.get(`code${i + 1}`)?.setValue(char);
        inputs[i].nativeElement.value = char;
        i++;
      }
      inputs[5].nativeElement.focus();
    }
  }

  onInputChange(event: Event, index: number): void {
    const input = event.target as HTMLInputElement;
    const value = input.value;

    const sanitizedValue = value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 1);

    if (value !== sanitizedValue) {
      input.value = sanitizedValue;
      this.verificationForm.get(`code${index + 1}`)?.setValue(sanitizedValue);
    }
  }

  startResendCooldown(): void {
    this.resendCooldown = 60;

    if (this.resendTimerInterval) {
      clearInterval(this.resendTimerInterval);
    }

    this.resendTimerInterval = setInterval(() => {
      if (this.resendCooldown > 0) {
        this.resendCooldown--;
      } else {
        clearInterval(this.resendTimerInterval);
      }
    }, 1000);
  }

  resendVerificationCode(): void {
    if (this.resendCooldown === 0 && !this.isResending) {
      this.resendError = null;
      this.isResending = true;

      this.resendSubscription = this.userSvc
        .resendConfirmationEmail(this.registerForm.value.email)
        .pipe(
          finalize(() => {
            this.startResendCooldown();
            this.isResending = false;
          })
        )
        .subscribe({
          next: (response) => {
            console.log('Código reenviado com sucesso:', response);
            this.emailConfirmationSent = true;
            setTimeout(() => {
              this.emailConfirmationSent = false;
            }, 5000);
          },
          error: (error: HttpErrorResponse) => {
            console.error('Erro ao reenviar código:', error);
            if (error.status === 404) {
              this.resendError = 'Usuário não encontrado.';
            } else {
              this.resendError =
                'Erro ao reenviar código. Por favor, tente novamente.';
            }
          },
        });
    }
  }

  focusFirstEmptyInput(): void {
    setTimeout(() => {
      const inputs = this.codeInputs.toArray();
      for (const inputRef of inputs) {
        const input = inputRef.nativeElement as HTMLInputElement;
        if (!input.value) {
          input.focus();
          break;
        }
      }
    }, 0);
  }

  verifyCode(stepper: MatStepper): void {
    if (this.verificationForm.valid && !this.isVerifyingCode) {
      const code = ['code1', 'code2', 'code3', 'code4', 'code5', 'code6']
        .map((key) => this.verificationForm.get(key)?.value)
        .join('');

      this.isVerifyingCode = true;
      this.verificationError = null;

      this.userSvc
        .activateEmail(code)
        .pipe(
          finalize(() => {
            this.isVerifyingCode = false;
          })
        )
        .subscribe({
          next: (response) => {
            console.log('Código verificado com sucesso:', response);
            this.emailVerified = true;
          },
          error: (error: HttpErrorResponse) => {
            console.error('Erro ao verificar código:', error);
            if (
              error.status === 404 ||
              error.error?.error
            ) {
              this.verificationError =
                'Código de verificação inválido. Por favor, tente novamente.';
            } else {
              this.verificationError =
                'Erro ao verificar o código. Por favor, tente novamente mais tarde.';
            }
          },
        });
    }
  }

  loadServerInfo() {
    if (!this.serverId) return;
    
    this.isLoadingServerInfo = true;
    
    this.http.get<any>(`${environment.apiUrl}/servers/${this.serverId}/info`)
      .pipe(
        finalize(() => {
          this.isLoadingServerInfo = false;
        })
      )
      .subscribe({
        next: (response) => {
          this.serverInfo = response;
          console.log('Server info loaded:', this.serverInfo);
        },
        error: (error) => {
          console.error('Error loading server info:', error);
        }
      });
  }

  returnToServer() {
    if (this.backUrl) {
      window.location.href = this.backUrl;
    } else {
      console.log('No back URL provided');
    }
  }

  servers = [
    {
      name: 'Servidor 1',
      region: 'US',
      latency: '50ms',
      gameIcon: 'icon1.png',
    },
    {
      name: 'Servidor 2',
      region: 'EU',
      latency: '60ms',
      gameIcon: 'icon2.png',
    },
  ];

  showServerList = false;
  showRegisterForm = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient
  ) {
    this.registerForm = this.fb.group(
      {
        first_name: ['', Validators.required],
        last_name: ['', Validators.required],
        username: [
          '',
          {
            validators: [Validators.required],
            asyncValidators: [this.usernameTakenValidator()],
            updateOn: 'blur',
          },
        ],
        email: [
          '',
          {
            validators: [Validators.required, Validators.email],
            asyncValidators: [this.emailTakenValidator()],
            updateOn: 'blur',
          },
        ],
        password: ['', [Validators.required, this.passwordStrengthValidator()]],
        confirmPassword: ['', Validators.required],
        birthDate: ['', [Validators.required, this.ageValidator(13)]],
        gender: ['', Validators.required],
      },
      { validators: [this.passwordMatchValidator()] }
    );

    this.verificationForm = this.fb.group({
      code1: ['', Validators.required],
      code2: ['', Validators.required],
      code3: ['', Validators.required],
      code4: ['', Validators.required],
      code5: ['', Validators.required],
      code6: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.serverId = params['sid'] || null;
      this.backUrl = params['backurl'] || null;
      
      if (this.serverId) {
        this.loadServerInfo();
      }
    });
  }

  ngOnDestroy(): void {
    if (this.resendTimerInterval) {
      clearInterval(this.resendTimerInterval);
    }

    if (this.resendSubscription) {
      this.resendSubscription.unsubscribe();
    }
  }

  private emailTakenValidator(): AsyncValidatorFn {
    return (control: AbstractControl): Observable<ValidationErrors | null> => {
      if (!control.value) {
        return of(null);
      }
      return this.validatorSvc.checkEmail(control.value).pipe(
        map((taken) => (taken ? { emailTaken: true } : null)),
        first()
      );
    };
  }

  private usernameTakenValidator(): AsyncValidatorFn {
    return (control: AbstractControl): Observable<ValidationErrors | null> => {
      if (!control.value) {
        return of(null);
      }
      return this.validatorSvc.checkUsername(control.value).pipe(
        map((taken) => (taken ? { usernameTaken: true } : null)),
        first()
      );
    };
  }

  private passwordStrengthValidator() {
    const regex = /^(?=.*\d)(?=.*[!@#$%^&*()_\-+=\[\]{};':"\\|,.<>/?]).{8,}$/;
    return (control: AbstractControl): ValidationErrors | null =>
      control.value && !regex.test(control.value)
        ? { weakPassword: true }
        : null;
  }

  private passwordMatchValidator() {
    return (group: AbstractControl): ValidationErrors | null => {
      const pass = group.get('password')?.value;
      const confirm = group.get('confirmPassword')?.value;
      return pass && confirm && pass !== confirm
        ? { passwordsMismatch: true }
        : null;
    };
  }

  private ageValidator(minAge: number) {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null;
      }

      const birthDate = new Date(control.value);
      const today = new Date();

      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();

      if (
        monthDiff < 0 ||
        (monthDiff === 0 && today.getDate() < birthDate.getDate())
      ) {
        age--;
      }

      return age < minAge
        ? { minAge: { required: minAge, actual: age } }
        : null;
    };
  }

  onExistingAccount() {
    this.showServerList = true;
    this.showRegisterForm = false;
  }

  onNewAccount() {
    this.showRegisterForm = true;
    this.showServerList = false;
  }

  registerUser(stepper: MatStepper) {
    if (this.registerForm.valid && !this.isRegistering) {
      this.isRegistering = true;
      this.registrationError = null;
      this.accountCreated = false;

      this.userSvc
        .registerUser(this.registerForm.value)
        .pipe(
          finalize(() => {
            this.isRegistering = false;
          }),
          catchError((error: HttpErrorResponse) => {
            if (error.status === 409) {
              if (error.error?.message?.includes('username')) {
                this.registerForm.get('username')?.setErrors({ usernameTaken: true });
                this.registerForm.get('username')?.markAsDirty();
                this.registrationError =
                  'Nome de usuário já existe. Por favor, escolha outro.';
              } else if (error.error?.message?.includes('email')) {
                this.registerForm.get('email')?.setErrors({ emailTaken: true });
                this.registerForm.get('email')?.markAsDirty();
                this.registrationError =
                  'Email já está em uso. Por favor, use outro email.';
              } else {
                this.registrationError =
                  'Usuário já existe com o email ou username fornecido. Por favor, tente outros dados.';
              }
            } else {
              this.registrationError =
                'Erro ao criar conta. Por favor, tente novamente mais tarde.';
            }
            return of(null);
          })
        )
        .subscribe((response) => {
          if (response) {
            console.log('Usuário registrado com sucesso:', response);

            this.accountCreated = true;

            stepper.next();

            this.startResendCooldown();
          }
        });
    }
  }

  redirect() {
    console.log('Redirecionando para login do servidor...');
  }
}