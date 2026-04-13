import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  ReactiveFormsModule,
  FormGroup,
  FormControl,
  Validators,
  ValidatorFn,
  AbstractControl,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../services/auth/auth.service';
import { finalize } from 'rxjs';
import { AuthResponse } from '../../../../interfaces/auth-response';

@Component({
  selector: 'app-register-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatSnackBarModule,
    RouterLink,
  ],
  templateUrl: './register-form.component.html',
  styleUrl: './register-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterFormComponent {
  private readonly _authService = inject(AuthService);
  private readonly _router = inject(Router);
  private readonly _snackBar = inject(MatSnackBar);
  private readonly _destroyRef = inject(DestroyRef);

  readonly isRegistering = signal(false);
  readonly hidePassword = signal(true);
  readonly hideConfirmPassword = signal(true);
  registerForm!: FormGroup;

  constructor() {
    this.initForm();
  }

  private initForm(): void {
    this.registerForm = new FormGroup({
      name: new FormControl('', [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(20),
      ]),
      email: new FormControl('', [Validators.required, Validators.email]),
      phone: new FormControl('', [Validators.required, Validators.pattern('^01[0125][0-9]{8}$')]),
      password: new FormControl('', [
        Validators.required,
        Validators.minLength(6),
        Validators.maxLength(20),
      ]),
      rePassword: new FormControl('', [Validators.required, this.matchPasswordValidator()]),
    });
  }

  togglePasswordVisibility(event: MouseEvent): void {
    this.hidePassword.set(!this.hidePassword());
    event.stopPropagation();
  }

  toggleConfirmPasswordVisibility(event: MouseEvent): void {
    this.hideConfirmPassword.set(!this.hideConfirmPassword());
    event.stopPropagation();
  }

  private matchPasswordValidator(): ValidatorFn {
    return (control: AbstractControl) => {
      const password = this.registerForm?.get('password')?.value;
      return password === control.value ? null : { passwordMismatch: true };
    };
  }

  register(): void {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.isRegistering.set(true);

    this._authService
      .register(this.registerForm.value)
      .pipe(finalize(() => this.isRegistering.set(false)))
      .subscribe((response: AuthResponse) => this.handleRegistrationSuccess(response));
  }

  private handleRegistrationSuccess(rsponse: AuthResponse): void {
    this._router.navigate(['/auth/login']);
  }

  getControl(name: string) {
    return this.registerForm.get(name);
  }
}
