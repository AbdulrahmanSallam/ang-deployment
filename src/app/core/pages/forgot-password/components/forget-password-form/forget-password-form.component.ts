import { Component, inject, output, signal } from '@angular/core';
import { AuthService } from '../../../../services/auth/auth.service';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { finalize } from 'rxjs';
import { ForgetPasswordData } from '../../../../interfaces/forget-password-data';
import { ForgetPasswordResponse } from '../../../../interfaces/forget-password-response';
import { VerifyForgetPasswordData } from '../../../../interfaces/verify-forget-password-data';

@Component({
  selector: 'app-forget-password-form',
  imports: [ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  templateUrl: './forget-password-form.component.html',
  styleUrl: './forget-password-form.component.scss',
})
export class ForgetPasswordFormComponent {
  private readonly _authService = inject(AuthService);
  private readonly _snackBar = inject(MatSnackBar);
  private readonly _fb = inject(NonNullableFormBuilder);

  // output data
  forgetPasswordData = output<ForgetPasswordData>();
  forgetPasswordStatus = output<boolean>();

  // form
  forgetPasswordForm = this._fb.group({
    email: this._fb.control('', [Validators.required, Validators.email]),
  });
  readonly isSubmitting = signal(false);

  forgetPassword() {
    if (this.forgetPasswordForm.invalid) {
      this.forgetPasswordForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);

    this._authService
      .forgetPassword(this.forgetPasswordForm.getRawValue())
      .pipe(finalize(() => this.isSubmitting.set(false)))
      .subscribe((response: ForgetPasswordResponse) => this.handleverrificationSuccess(response));
  }

  private handleverrificationSuccess(response: ForgetPasswordResponse): void {
    this.emitVerificationData(this.forgetPasswordForm.getRawValue());
    this.forgetPasswordStatus.emit(true);
    this._snackBar.open('Check Your Mail', 'Close', {
      duration: 4000,
      panelClass: ['success-snackbar'],
    });
  }

  // output forgetPasswordData need it in reset password step
  emitVerificationData(forgetPasswordData: ForgetPasswordData) {
    this.forgetPasswordData.emit(forgetPasswordData);
  }

  getControl(name: string) {
    return this.forgetPasswordForm.get(name);
  }
}
