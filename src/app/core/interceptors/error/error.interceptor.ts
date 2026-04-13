import {
  HttpInterceptorFn,
  HttpErrorResponse,
  HttpRequest,
  HttpHandlerFn,
  HttpEvent,
  HttpContextToken,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { NotificationsService } from '../../services/notifications/notifications.service';
import { AuthService } from '../../services/auth/auth.service';

// Context token to skip error notifications for specific requests
export const SKIP_ERROR_NOTIFICATION = new HttpContextToken<boolean>(() => false);

export const errorInterceptor: HttpInterceptorFn = (
  request: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
  const notificationsService = inject(NotificationsService);
  const authService = inject(AuthService);
  const router = inject(Router);

  // Skip error handling if requested
  if (request.context.get(SKIP_ERROR_NOTIFICATION)) {
    return next(request);
  }

  return next(request).pipe(
    catchError((error: HttpErrorResponse) => {
      return handleHttpError(error, request, notificationsService, authService, router);
    })
  );
};

/**
 * Handle HTTP errors and show appropriate notifications
 */
const handleHttpError = (
  error: HttpErrorResponse,
  request: HttpRequest<unknown>,
  notificationsService: NotificationsService,
  authService: AuthService,
  router: Router
): Observable<never> => {
  // Handle authentication errors
  if (error.status === 401) {
    authService.clearAuthState();
    notificationsService.show('error-snackbar', 'Your session has expired. Please login again.');
    router.navigate(['/auth/login']);
    return throwError(() => error);
  }

  // Handle forbidden errors
  if (error.status === 403) {
    notificationsService.show(
      'error-snackbar',
      'You do not have permission to perform this action.'
    );
    return throwError(() => error);
  }

  // Don't show notifications for specific conditions
  if (shouldSkipNotification(error, request)) {
    return throwError(() => error);
  }

  const errorMessage = getErrorMessage(error);
  showNotification(error.status, errorMessage, notificationsService);

  return throwError(() => error);
};

/**
 * Determine if error notification should be skipped
 */
const shouldSkipNotification = (
  error: HttpErrorResponse,
  request: HttpRequest<unknown>
): boolean => {
  // Skip for authentication requests to avoid showing errors on login pages
  if (isAuthRequest(request.url)) {
    return true;
  }

  // Skip for validation errors (422) - these are usually handled by forms
  if (error.status === 422) {
    return true;
  }

  // Skip for 404 errors
  if (error.status === 404) {
    return true;
  }

  return false;
};

/**
 * Get user-friendly error message based on status code
 */
const getErrorMessage = (error: HttpErrorResponse): string => {
  switch (error.status) {
    case 0:
      return 'Network error: Please check your internet connection and try again.';

    case 400:
      return extractServerMessage(error) || 'Invalid request. Please check your input.';

    case 409:
      return extractServerMessage(error) || 'A conflict occurred. Please try again.';

    case 429:
      return 'Too many requests. Please slow down and try again later.';

    case 500:
      return 'Server error occurred. Please try again later.';

    case 502:
    case 503:
    case 504:
      return 'Service temporarily unavailable. Please try again later.';

    default:
      return extractServerMessage(error) || 'An unexpected error occurred. Please try again.';
  }
};

/**
 * Extract server message from error response
 */
const extractServerMessage = (error: HttpErrorResponse): string | null => {
  if (!error.error) {
    return null;
  }

  if (typeof error.error === 'string') {
    return error.error;
  }

  if (error.error.message) {
    return error.error.message;
  }

  if (error.error.error) {
    return error.error.error;
  }

  if (error.error.detail) {
    return error.error.detail;
  }

  if (Array.isArray(error.error) && error.error.length > 0) {
    return error.error[0].message || error.error[0].error || null;
  }

  return null;
};

/**
 * Check if request is for authentication endpoints
 */
const isAuthRequest = (url: string): boolean => {
  const authKeywords = ['/auth/', '/login', '/signin', '/signup', '/register', '/password'];
  return authKeywords.some((keyword) => url.includes(keyword));
};

/**
 * Show appropriate notification based on error status
 */
const showNotification = (
  status: number,
  message: string,
  notificationsService: NotificationsService
): void => {
  let panelClass = 'error-snackbar';
  let duration = 5000;

  switch (status) {
    case 429:
      panelClass = 'warning-snackbar';
      break;
    case 400:
    case 409:
      panelClass = 'warning-snackbar';
      duration = 4000;
      break;
    default:
      panelClass = 'error-snackbar';
      duration = 5000;
  }

  notificationsService.show(panelClass, message, duration, 'top', 'center');
};
