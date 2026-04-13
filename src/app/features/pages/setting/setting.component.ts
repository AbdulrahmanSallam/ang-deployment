import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { AuthService } from '../../../core/services/auth/auth.service';
import { AccountService } from '../../../core/services/account/account.service';
import { Router } from '@angular/router';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { MatTabsModule } from '@angular/material/tabs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { UserAccountData } from '../../../core/interfaces/user-account-data';
import { EditAccountForm } from '../../../core/interfaces/edit-account-form';
import { EditPasswordForm } from '../../../core/interfaces/edit-password-form';

@Component({
  selector: 'app-setting',
  imports: [
    ReactiveFormsModule,
    MatTabsModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatSnackBarModule,
  ],
  templateUrl: './setting.component.html',
  styleUrl: './setting.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingComponent implements OnInit {
  private readonly _authService = inject(AuthService);
  private readonly _accountService = inject(AccountService);
  private readonly _router = inject(Router);
  private readonly _destroyRef = inject(DestroyRef);

  // Signals
  readonly isLoading = signal(false);
  readonly formSubmitting = signal(false);
  readonly hideCurrentPassword = signal(true);
  readonly hideNewPassword = signal(true);
  readonly hideConfirmPassword = signal(true);
  readonly dataLoaded = signal(false);
  readonly formChanged = signal(false);
  readonly passwordFormChanged = signal(false);

  // Use the service signal directly instead of local signal
  readonly userAccountData = this._accountService.userAccountData;

  // Computed signals
  readonly userId = computed(() => this._authService.userData()?.id);

  // Forms
  readonly editAccountForm = new FormGroup({
    name: new FormControl('', [
      Validators.required,
      Validators.minLength(3),
      Validators.maxLength(20),
    ]),
    email: new FormControl('', [Validators.required, Validators.email]),
    phone: new FormControl('', [
      Validators.required,
      Validators.pattern('^01[0125][0-9]{8}$'),
    ]),
  });

  readonly editPasswordForm = new FormGroup({
    currentPassword: new FormControl('', [
      Validators.required,
      Validators.minLength(6),
      Validators.maxLength(20),
    ]),
    password: new FormControl('', [
      Validators.required,
      Validators.minLength(6),
      Validators.maxLength(20),
    ]),
    rePassword: new FormControl('', [
      Validators.required,
      this.matchPasswordValidator(),
    ]),
  });

  constructor() {
    // Use effect to watch for changes in the service signal and update form
    effect(() => {
      const data = this.userAccountData();
      if (data) {
        this.initializeFormData(data);
      }
    });

    // Track account form changes
    this.editAccountForm.valueChanges
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe((value) => {
        this.formChanged.set(true);
      });

    // Track password form changes - FIXED: No manual validity updates
    this.editPasswordForm.valueChanges
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe((value) => {
        this.passwordFormChanged.set(true);
      });
  }

  ngOnInit(): void {
    this.getUserAccountData();
  }

  getUserAccountData(): void {
    this.isLoading.set(true);

    this._accountService
      .getUserData(this.userId() as string)
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe({
        next: (res) => {
          this.dataLoaded.set(true);
        },
        error: (error) => {
          this.isLoading.set(false);
          this.dataLoaded.set(true);
        },
        complete: () => {
          this.isLoading.set(false);
        },
      });
  }

  editAccount(): void {
    if (this.editAccountForm.invalid || !this.hasAccountChanges()) {
      this.editAccountForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);

    const changedData = this.getChangedAccountData();

    this._accountService
      .editAccount(changedData)
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe({
        next: (res) => {
          if (res.message === 'success') {
            this.formChanged.set(false);
            this._router.navigate(['/home']);
          }
        },
        error: (error) => {
          console.error('Failed to update account:', error);
          this.isLoading.set(false);
        },
        complete: () => this.isLoading.set(false),
      });
  }

  editPassword(): void {
    if (this.editPasswordForm.invalid || !this.hasPasswordChanges()) {
      this.editPasswordForm.markAllAsTouched();

      // Force validation update
      Object.keys(this.editPasswordForm.controls).forEach((key) => {
        const control = this.editPasswordForm.get(key);
        control?.markAsTouched();
        control?.updateValueAndValidity();
      });
      return;
    }

    this.formSubmitting.set(true);

    this._accountService
      .editPassword(this.editPasswordForm.value)
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe({
        next: (res) => {
          if (res.message === 'success') {
            this.editPasswordForm.reset();
            this.passwordFormChanged.set(false);
            this._router.navigate(['/home']);
          }
        },
        error: (error) => {
          console.error('Failed to change password:', error);
          this.formSubmitting.set(false);
        },
        complete: () => this.formSubmitting.set(false),
      });
  }

  private initializeFormData(userAccountData: UserAccountData): void {
    const formData = {
      name: userAccountData.name || '',
      email: userAccountData.email || '',
      phone: userAccountData.phone || '',
    };

    this.editAccountForm.setValue(formData, { emitEvent: false });
    this.formChanged.set(false);
  }

  private matchPasswordValidator(): ValidatorFn {
    return (control: AbstractControl) => {
      // Get the parent form group directly from the control
      const formGroup = control.parent as FormGroup;
      if (!formGroup) {
        return null;
      }

      const password = formGroup.get('password')?.value;
      const confirmPassword = control.value;

      // If either field is empty, don't show mismatch error
      if (!password || !confirmPassword) {
        return null;
      }

      return password === confirmPassword ? null : { passwordMismatch: true };
    };
  }

  hasAccountChanges(): boolean {
    const currentData = this.userAccountData();
    if (!currentData) return false;

    const formValue = this.editAccountForm.value;

    const nameChanged =
      (formValue.name || '').trim() !== (currentData.name || '').trim();
    const emailChanged =
      (formValue.email || '').trim() !== (currentData.email || '').trim();
    const phoneChanged =
      (formValue.phone || '').trim() !== (currentData.phone || '').trim();

    const hasChanges = nameChanged || emailChanged || phoneChanged;

    return hasChanges;
  }

  hasPasswordChanges(): boolean {
    const formValue = this.editPasswordForm.value;

    // Check if all fields have values and new password is different from current password
    const allFieldsFilled = !!(
      formValue.currentPassword &&
      formValue.password &&
      formValue.rePassword
    );

    // Check if new password is different from current password
    const differentFromCurrent =
      formValue.currentPassword !== formValue.password;

    // Check if passwords match
    const passwordsMatch = formValue.password === formValue.rePassword;

    const hasValidChanges =
      allFieldsFilled && differentFromCurrent && passwordsMatch;

    return hasValidChanges;
  }

  private getChangedAccountData(): any {
    const currentData = this.userAccountData();
    const formValue = this.editAccountForm.value;

    if (!currentData) return formValue;

    const changedData: any = {};

    if ((formValue.name || '').trim() !== (currentData.name || '').trim()) {
      changedData.name = formValue.name;
    }
    if ((formValue.email || '').trim() !== (currentData.email || '').trim()) {
      changedData.email = formValue.email;
    }
    if ((formValue.phone || '').trim() !== (currentData.phone || '').trim()) {
      changedData.phone = formValue.phone;
    }

    return changedData;
  }

  togglePasswordVisibility(
    passwordType: 'current' | 'new' | 'confirm',
    event: MouseEvent
  ): void {
    const signalMap = {
      current: this.hideCurrentPassword,
      new: this.hideNewPassword,
      confirm: this.hideConfirmPassword,
    };

    signalMap[passwordType].set(!signalMap[passwordType]());
    event.stopPropagation();
  }

  // Helper methods
  getFormControl(
    controlName: keyof EditAccountForm | keyof EditPasswordForm,
    formType: 'account' | 'password' = 'account'
  ): AbstractControl | null {
    if (formType === 'account') {
      return this.editAccountForm.get(controlName as keyof EditAccountForm);
    } else {
      return this.editPasswordForm.get(controlName as keyof EditPasswordForm);
    }
  }

  shouldShowError(
    controlName: keyof EditAccountForm | keyof EditPasswordForm,
    formType: 'account' | 'password' = 'account'
  ): boolean {
    const control = this.getFormControl(controlName, formType);
    const shouldShow = !!(
      control?.invalid &&
      (control?.touched || control?.dirty)
    );

    // Special handling for password mismatch - show immediately when typing
    if (
      formType === 'password' &&
      controlName === 'rePassword' &&
      control?.dirty
    ) {
      return !!control?.errors?.['passwordMismatch'];
    }

    return shouldShow;
  }

  getErrorMessage(
    controlName: keyof EditAccountForm | keyof EditPasswordForm,
    formType: 'account' | 'password' = 'account'
  ): string {
    const control = this.getFormControl(controlName, formType);

    if (!control?.errors) return '';

    // For current password field, only show required error
    if (formType === 'password' && controlName === 'currentPassword') {
      if (control.hasError('required')) {
        return 'Password is required';
      }
      // Don't show minlength/maxlength errors for current password
      return '';
    }

    if (control.hasError('required')) {
      return `${this.getFieldLabel(controlName)} is required`;
    }

    if (control.hasError('email')) {
      return 'Please enter a valid email address';
    }

    if (control.hasError('minlength')) {
      const requiredLength = control.errors['minlength'].requiredLength;
      return `At least ${requiredLength} characters required`;
    }

    if (control.hasError('maxlength')) {
      const requiredLength = control.errors['maxlength'].requiredLength;
      return `Maximum ${requiredLength} characters allowed`;
    }

    if (control.hasError('pattern')) {
      return 'Egyptian phone number only';
    }

    if (control.hasError('passwordMismatch')) {
      return 'Passwords do not match';
    }

    return 'Invalid value';
  }

  private getFieldLabel(controlName: string): string {
    const labels: Record<string, string> = {
      name: 'Name',
      email: 'Email',
      phone: 'Phone',
      currentPassword: 'Current password',
      password: 'New password',
      rePassword: 'Confirm password',
    };
    return labels[controlName] || controlName;
  }
}
