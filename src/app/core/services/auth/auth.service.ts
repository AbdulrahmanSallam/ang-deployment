import { jwtDecode } from 'jwt-decode';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpContext } from '@angular/common/http';
import {
  inject,
  Injectable,
  PLATFORM_ID,
  signal,
  computed,
  effect,
  DestroyRef,
} from '@angular/core';
import { Observable, shareReplay, tap, throwError, catchError, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Router } from '@angular/router';
import { UserSignupData } from '../../interfaces/user-signup-data';
import { UserSigninData } from '../../interfaces/user-signin-data';
import { UserData } from '../../interfaces/user-data';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthResponse } from '../../interfaces/auth-response';
import { ForgetPasswordData } from '../../interfaces/forget-password-data';
import { ResetPasswordData } from '../../interfaces/reset-password-data';
import { VerifyForgetPasswordData } from '../../interfaces/verify-forget-password-data';
import { ForgetPasswordResponse } from '../../interfaces/forget-password-response';
import { VerifyForgetPasswordResponse } from '../../interfaces/verify-forget-password-response';
import { ResetPasswordResponse } from '../../interfaces/reset-password-response';
import { SKIP_LOADING } from '../../../core/interceptors/loading/loading.interceptor';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly httpClient = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly notificationsService = inject(NotificationsService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly authURL = `${environment.apiBaseUrl}/api/v1/auth`;
  private readonly skipLoadingContext = new HttpContext().set(SKIP_LOADING, true);

  // Signals for reactive state management
  public readonly userToken = signal<string | null>(null);
  public readonly userData = signal<UserData | null>(null);
  public readonly isInitialized = signal(false);
  public readonly isRefreshing = signal(false);

  // Computed properties
  public readonly isLoggedIn = computed(() => {
    const token = this.userToken();
    return !!token && this.isTokenValid(token);
  });

  public readonly userId = computed(() => this.userData()?.id || null);
  public readonly userName = computed(() => this.userData()?.name || null);

  private tokenRefreshInterval?: number;
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  // Event emitter for login state changes
  private readonly loginStateChanged = signal<boolean>(false);

  constructor() {
    this.setupAutoCleanup();
  }

  /**
   * Get login state changes for external services to listen to
   */
  getLoginStateChanged() {
    return this.loginStateChanged.asReadonly();
  }

  /**
   * Initialize authentication state
   */
  initializeAuth(): void {
    if (this.isBrowser) {
      this.loadTokenFromStorage();

      if (this.userToken() && this.isTokenValid(this.userToken()!)) {
        this.saveUserData();
        this.scheduleTokenRefreshCheck();
        this.loginStateChanged.set(true); // Notify that user is logged in
      } else {
        this.clearAuthState();
      }
    }

    this.isInitialized.set(true);
  }

  /**
   * Setup automatic cleanup and state monitoring
   */
  private setupAutoCleanup(): void {
    // Auto-clear invalid tokens
    effect(() => {
      const token = this.userToken();
      if (token && !this.isTokenValid(token)) {
        this.clearAuthState();
      }
    });

    // Auto-refresh user data when token changes
    effect(() => {
      const token = this.userToken();
      if (token && this.isTokenValid(token)) {
        this.saveUserData();
      }
    });
  }

  /**
   * Enhanced token validation with better error handling
   */
  private isTokenValid(token: string): boolean {
    try {
      if (!token || token.split('.').length !== 3) {
        return false;
      }

      const decoded = jwtDecode(token);
      const currentTime = Date.now() / 1000;
      const bufferTime = 60; // 1 minute buffer

      return !!(decoded.exp && decoded.exp > currentTime + bufferTime);
    } catch {
      return false;
    }
  }

  /**
   * Enhanced authentication methods with better error handling
   */
  register(data: UserSignupData): Observable<AuthResponse> {
    return this.httpClient.post<AuthResponse>(`${this.authURL}/signup`, data).pipe(
      tap((response: AuthResponse) => {
        this.notificationsService.show('success-snackbar', 'Account created successfully!');
        this.handleSuccessfulAuth(response.token);
      }),
      shareReplay({ bufferSize: 1, refCount: true }),
      takeUntilDestroyed(this.destroyRef)
    );
  }

  login(data: UserSigninData): Observable<AuthResponse> {
    return this.httpClient.post<AuthResponse>(`${this.authURL}/signin`, data).pipe(
      tap((response: AuthResponse) => {
        this.notificationsService.show('success-snackbar', 'Login successful!');
        this.handleSuccessfulAuth(response.token);
      }),
      shareReplay({ bufferSize: 1, refCount: true }),
      takeUntilDestroyed(this.destroyRef)
    );
  }

  /**
   * Token refresh method for interceptor
   */
  refreshToken(): Observable<string> {
    if (this.isRefreshing()) {
      return new Observable((observer) => {
        const token = this.userToken();
        if (token) {
          observer.next(token);
          observer.complete();
        } else {
          observer.error('No token available');
        }
      });
    }

    this.isRefreshing.set(true);

    return this.httpClient.post<AuthResponse>(`${this.authURL}/refresh`, {}).pipe(
      tap((response: AuthResponse) => {
        this.saveToken(response.token);
        this.isRefreshing.set(false);
        this.notificationsService.show('success-snackbar', 'Session refreshed');
      }),
      catchError((error) => {
        this.isRefreshing.set(false);
        this.clearAuthState();
        this.notificationsService.show('error-snackbar', 'Session expired. Please login again.');
        this.router.navigate(['/auth/login']);
        return throwError(() => error);
      }),
      map((response) => response.token),
      takeUntilDestroyed(this.destroyRef)
    );
  }

  /**
   * Handle successful authentication
   */
  private handleSuccessfulAuth(token: string): void {
    this.saveToken(token);
    this.scheduleTokenRefreshCheck();
    this.loginStateChanged.set(true); // Notify login
    this.router.navigate(['/']);
  }

  /**
   * Enhanced token management
   */
  private saveToken(token: string): void {
    if (!token || !this.isTokenValid(token)) {
      this.clearAuthState();
      return;
    }

    try {
      if (this.isBrowser) {
        localStorage.setItem('token', token);
      }
      this.userToken.set(token);
    } catch (error) {
      this.clearAuthState();
      this.notificationsService.show('error-snackbar', 'Failed to save authentication token');
    }
  }

  private loadTokenFromStorage(): void {
    if (!this.isBrowser) return;

    try {
      const token = localStorage.getItem('token');
      if (token && this.isTokenValid(token)) {
        this.userToken.set(token);
      } else {
        this.clearAuthState();
      }
    } catch (error) {
      this.clearAuthState();
    }
  }

  private saveUserData(): void {
    try {
      const token = this.userToken();
      if (token) {
        const decodedData = jwtDecode<UserData>(token);
        this.userData.set(decodedData);
      }
    } catch (error) {
      this.clearAuthState();
    }
  }

  /**
   * Enhanced token refresh scheduling
   */
  private scheduleTokenRefreshCheck(): void {
    if (!this.isBrowser) return;

    if (this.tokenRefreshInterval) {
      clearInterval(this.tokenRefreshInterval);
    }

    this.tokenRefreshInterval = window.setInterval(() => {
      const token = this.userToken();
      if (!token || !this.isTokenValid(token)) {
        this.clearAuthState();
        this.notificationsService.show('warning-snackbar', 'Your session has expired');
      }
    }, 60000);
  }

  /**
   * Enhanced session management
   */
  signOut(redirectToLogin = true): void {
    this.clearAuthState();
    this.notificationsService.show('success-snackbar', 'Logged out successfully');
    if (redirectToLogin) {
      this.router.navigate(['/auth/login']);
    }
  }

  clearAuthState(): void {
    if (this.isBrowser) {
      localStorage.removeItem('token');
      if (this.tokenRefreshInterval) {
        clearInterval(this.tokenRefreshInterval);
        this.tokenRefreshInterval = undefined;
      }
    }

    this.userToken.set(null);
    this.userData.set(null);
    this.isRefreshing.set(false);
    this.loginStateChanged.set(false); // Notify logout
  }

  /**
   * Password management with better error handling
   */
  forgetPassword(forgetPasswordData: ForgetPasswordData): Observable<ForgetPasswordResponse> {
    return this.httpClient
      .post<ForgetPasswordResponse>(`${this.authURL}/forgotPasswords`, forgetPasswordData, {
        context: this.skipLoadingContext,
      })
      .pipe(
        tap(() => {
          this.notificationsService.show(
            'success-snackbar',
            'Password reset Code sent to your email'
          );
        }),
        takeUntilDestroyed(this.destroyRef)
      );
  }

  verifyForgetPassword(
    verifyForgetPasswordData: VerifyForgetPasswordData
  ): Observable<VerifyForgetPasswordResponse> {
    return this.httpClient
      .post<VerifyForgetPasswordResponse>(
        `${this.authURL}/verifyResetCode`,
        verifyForgetPasswordData,
        { context: this.skipLoadingContext }
      )
      .pipe(
        tap(() => {
          this.notificationsService.show('success-snackbar', 'Verification code accepted');
        }),
        takeUntilDestroyed(this.destroyRef)
      );
  }

  resetPassword(resetPasswordData: ResetPasswordData): Observable<ResetPasswordResponse> {
    return this.httpClient
      .put<ResetPasswordResponse>(`${this.authURL}/resetPassword`, resetPasswordData, {
        context: this.skipLoadingContext,
      })
      .pipe(
        tap(() => {
          this.notificationsService.show('success-snackbar', 'Password reset successfully');
          this.router.navigate(['/auth/login']);
        }),
        takeUntilDestroyed(this.destroyRef)
      );
  }

  /**
   * Utility methods
   */
  refreshUserData(): void {
    this.saveUserData();
  }

  validateAuthState(): boolean {
    return this.isLoggedIn() && this.isInitialized();
  }
}
