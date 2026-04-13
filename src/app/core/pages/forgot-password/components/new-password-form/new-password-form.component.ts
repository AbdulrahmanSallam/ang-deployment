import { Component, DestroyRef, effect, inject, input, output, signal } from '@angular/core';
import {
  AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { AuthService } from '../../../../services/auth/auth.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatInputModule } from '@angular/material/input';
import { MatStepperModule } from '@angular/material/stepper';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { HttpErrorResponse } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ResetPasswordData } from '../../../../interfaces/reset-password-data';
import { finalize } from 'rxjs';
import { ForgetPasswordData } from '../../../../interfaces/forget-password-data';
import { ResetPasswordResponse } from '../../../../interfaces/reset-password-response';

@Component({
  selector: 'app-new-password-form',
  imports: [
    MatInputModule,
    MatStepperModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    ReactiveFormsModule,
  ],
  templateUrl: './new-password-form.component.html',
  styleUrl: './new-password-form.component.scss',
})
export class NewPasswordFormComponent {
  private readonly _authService = inject(AuthService);
  private readonly _snackBar = inject(MatSnackBar);
  private readonly _destroyRef = inject(DestroyRef);
  private readonly _fb = inject(NonNullableFormBuilder);

  forgetPasswordData = input.required<ForgetPasswordData>();

  readonly hidePassword = signal(true);
  readonly hideConfirmPassword = signal(true);

  newPasswordForm = this._fb.group({
    password: this._fb.control('', [
      Validators.required,
      Validators.minLength(6),
      Validators.maxLength(20),
    ]),
    rePassword: this._fb.control('', [Validators.required, this.matchPasswordValidator()]),
  });

  readonly isSubmitting = signal(false);

  newPasswordStatus = output<boolean>();

  constructor() {
    this.setupPasswordValidationEffect();
  }

  getControl(name: string) {
    return this.newPasswordForm.get(name);
  }

  resetPassword() {
    if (this.newPasswordForm.invalid) {
      this.newPasswordForm.markAllAsTouched();
      return;
    }

    const { password } = this.newPasswordForm.getRawValue();

    const resetPassowrdData: ResetPasswordData = {
      ...this.forgetPasswordData(),
      newPassword: password,
    };

    this._authService
      .resetPassword(resetPassowrdData)
      .pipe(
        finalize(() => this.isSubmitting.set(false)),
        takeUntilDestroyed(this._destroyRef)
      )
      .subscribe((response: ResetPasswordResponse) => this.handleverrificationSuccess(response));
  }

  private handleverrificationSuccess(response: ResetPasswordResponse): void {
    this._snackBar.open('Account Created !', 'Close', {
      duration: 4000,
      panelClass: ['success-snackbar'],
    });

    this.newPasswordStatus.emit(true);
  }

  // for confirm password
  private setupPasswordValidationEffect(): void {
    effect(() => {
      const passwordControl = this.newPasswordForm.get('password');
      const rePasswordControl = this.newPasswordForm.get('rePassword');
      passwordControl?.valueChanges.pipe(takeUntilDestroyed(this._destroyRef)).subscribe(() => {
        rePasswordControl?.updateValueAndValidity();
      });
    });
  }

  private matchPasswordValidator(): ValidatorFn {
    return (control: AbstractControl) => {
      const password = this.newPasswordForm?.get('password')?.value;
      return password === control.value ? null : { passwordMismatch: true };
    };
  }

  // show password button
  togglePasswordVisibility(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.hidePassword.set(!this.hidePassword());
  }

  toggleConfirmPasswordVisibility(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.hideConfirmPassword.set(!this.hideConfirmPassword());
  }
}
