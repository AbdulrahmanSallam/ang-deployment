import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  output,
  signal,
  ViewChild,
} from '@angular/core';
import { ReactiveFormsModule, Validators, NonNullableFormBuilder } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../../services/auth/auth.service';
import { finalize } from 'rxjs';

import { MatStepper } from '@angular/material/stepper';

import { VerifyForgetPasswordResponse } from '../../interfaces/verify-forget-password-response';

@Component({
  selector: 'app-verification-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSnackBarModule,
  ],
  templateUrl: './verification-form.component.html',
  styleUrl: './verification-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VerificationFormComponent {
  @ViewChild('stepper') stepper!: MatStepper;
  private readonly _authService = inject(AuthService);
  private readonly _snackBar = inject(MatSnackBar);
  private readonly _fb = inject(NonNullableFormBuilder);

  email = input<string>('');

  verificationStatus = output<boolean>();
  readonly isSubmitting = signal(false);

  verificationForm = this._fb.group({
    resetCode: this._fb.control('', [Validators.required, Validators.pattern('^[0-9]{6}$')]),
  });

  get verificationCodeControl() {
    return this.verificationForm.controls.resetCode;
  }

  verify() {
    if (this.verificationForm.invalid) {
      this.verificationForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);

    this._authService
      .verifyForgetPassword(this.verificationForm.getRawValue())
      .pipe(finalize(() => this.isSubmitting.set(false)))
      .subscribe((response: VerifyForgetPasswordResponse) =>
        this.handleVerificationSuccess(
          response,
          'Your code has been verified! You can now set a new password for your account'
        )
      );
  }

  private handleVerificationSuccess(response: VerifyForgetPasswordResponse, message: string): void {
    this._snackBar.open(message, 'Close', {
      duration: 4000,
      panelClass: ['success-snackbar'],
    });
    this.verificationStatus.emit(true);
  }
}
