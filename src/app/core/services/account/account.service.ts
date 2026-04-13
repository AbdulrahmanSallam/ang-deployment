import { HttpClient, HttpContext } from '@angular/common/http';
import { DestroyRef, inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SKIP_LOADING } from '../../../core/interceptors/loading/loading.interceptor';
import { UserAccountData } from '../../interfaces/user-account-data';
import { AuthService } from '../auth/auth.service';
import { EditAccountResponse } from '../../interfaces/edit-account-response';
import { EditPasswordResponse } from '../../interfaces/edit-password-response';

@Injectable({
  providedIn: 'root',
})
export class AccountService {
  // Dependencies
  private readonly _httpClient = inject(HttpClient);
  private readonly _authService = inject(AuthService);
  private readonly _destroyRef = inject(DestroyRef);

  // Configuration
  private readonly apiUrl = `${environment.apiBaseUrl}/api/v1/users`;

  // User Account Data Signal
  readonly userAccountData = signal<UserAccountData | null>(null);

  // Skip Loading Context
  private readonly _skipLoadingContext = new HttpContext().set(
    SKIP_LOADING,
    true
  );

  getUserData(userId: string): Observable<{ data: UserAccountData }> {
    return this._httpClient
      .get<{ data: UserAccountData }>(`${this.apiUrl}/${userId}`, {
        context: this._skipLoadingContext,
      })
      .pipe(
        tap((response) => {
          // Update the signal with the received user data
          this.userAccountData.set(response.data);
        }),
        takeUntilDestroyed(this._destroyRef)
      );
  }

  editAccount(editAccountForm: any): Observable<EditAccountResponse> {
    return this._httpClient
      .put<EditAccountResponse>(`${this.apiUrl}/updateMe`, editAccountForm, {
        context: this._skipLoadingContext,
      })
      .pipe(
        tap((res) => {
          this._authService.userData.update((val) => {
            return val ? { ...val, name: res.user.name } : val;
          });
          this.updateUserDataFromForm(editAccountForm);
        }),
        takeUntilDestroyed(this._destroyRef)
      );
  }

  editPassword(newPasswordForm: any): Observable<EditPasswordResponse> {
    return this._httpClient
      .put<EditPasswordResponse>(
        `${this.apiUrl}/changeMyPassword`,
        newPasswordForm,
        {
          context: this._skipLoadingContext,
        }
      )
      .pipe(takeUntilDestroyed(this._destroyRef));
  }

  /**
   * Helper method to update user data from edit form
   * This merges the form data with existing user data
   */
  private updateUserDataFromForm(formData: any): void {
    const currentData = this.userAccountData();
    if (currentData) {
      // Merge existing data with form data
      const updatedData = { ...currentData, ...formData };
      this.userAccountData.set(updatedData);
    } else {
      // If no current data, set the form data directly
      this.userAccountData.set(formData);
    }
  }

  /**
   * Clear the user account data signal
   */
  clearUserData(): void {
    this.userAccountData.set(null);
  }

  /**
   * Manually update the user account data signal
   */
  setUserData(data: UserAccountData): void {
    this.userAccountData.set(data);
  }
}
