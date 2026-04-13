import { DestroyRef, inject, Injectable, signal, computed, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../../../environments/environment';
import { Observable, tap, catchError, of } from 'rxjs';
import { Product } from '../../interfaces/product/product';
import { HttpClient, HttpContext } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SKIP_LOADING } from '../../../core/interceptors/loading/loading.interceptor';
import { NotificationsService } from '../../../core/services/notifications/notifications.service';
import { AuthService } from '../../../core/services/auth/auth.service';

@Injectable({
  providedIn: 'root',
})
export class WishlistService {
  private readonly apiUrl: string = `${environment.apiBaseUrl}/api/v1/wishlist`;
  private readonly _httpClient: HttpClient = inject(HttpClient);
  private readonly _destroyRef = inject(DestroyRef);
  private readonly _platformId = inject(PLATFORM_ID);
  private readonly _notificationsService = inject(NotificationsService);
  private readonly _authService = inject(AuthService); // Add AuthService

  // State Management
  private readonly _wishlistItems = signal<Product[]>([]);
  private readonly _isLoading = signal(false);
  private readonly _isInitialized = signal(false);
  private readonly _pendingOperations = signal<Set<string>>(new Set());

  // Public Signals
  public readonly wishlistItems = computed(() => {
    // Only return wishlist items if user is logged in and service is initialized
    if (!this._isBrowser || !this._authService.isLoggedIn() || !this._isInitialized()) {
      return [];
    }
    return this._wishlistItems();
  });

  public readonly wishlistCount = computed(() => this.wishlistItems().length);
  public readonly loading = this._isLoading.asReadonly();
  public readonly initialized = this._isInitialized.asReadonly();

  // Computed properties
  public readonly isInWishlist = (productId: string) =>
    this.wishlistItems().some((product) => product._id === productId);

  // Skip Loading Context for all HTTP methods
  private readonly _skipLoadingContext = new HttpContext().set(SKIP_LOADING, true);
  private readonly _isBrowser: boolean;

  constructor() {
    this._isBrowser = isPlatformBrowser(this._platformId);

    // Auto-load wishlist only if user is authenticated
    if (this._isBrowser && this._authService.isLoggedIn()) {
      this._loadWishlistFromStorage();
    }
  }

  /**
   * Initialize wishlist - called from app component
   */
  initializeWishlist(): void {
    if (this._isInitialized()) {
      return;
    }

    // Only initialize in browser environment and if user is logged in
    if (!this._isBrowser || !this._authService.isLoggedIn()) {
      this._isInitialized.set(true);
      return;
    }

    // Load from storage and fetch from API only in browser and when logged in
    this._loadWishlistFromStorage();
    this.getLoggedUserWishlist().subscribe();
    this._isInitialized.set(true);
  }

  private _loadWishlistFromStorage(): void {
    if (!this._isBrowser || !this._authService.isLoggedIn()) return;

    try {
      const savedWishlist = localStorage.getItem('freshcart_wishlist');
      if (savedWishlist) {
        const wishlist = JSON.parse(savedWishlist);
        if (Array.isArray(wishlist)) {
          this._wishlistItems.set(wishlist);
        }
      }
    } catch (error) {
      console.error('Error loading wishlist from storage:', error);
      this._clearLocalStorage();
    }
  }

  private _saveWishlistToStorage(): void {
    if (!this._isBrowser || !this._authService.isLoggedIn()) return;

    try {
      localStorage.setItem('freshcart_wishlist', JSON.stringify(this._wishlistItems()));
    } catch (error) {
      console.error('Error saving wishlist to storage:', error);
    }
  }

  private _clearLocalStorage(): void {
    if (this._isBrowser) {
      try {
        localStorage.removeItem('freshcart_wishlist');
      } catch (error) {
        console.error('Error clearing wishlist from storage:', error);
      }
    }
  }

  /**
   * Enhanced API Methods with authentication check
   */
  addProductToLoggedUserWishlist(productId: string): Observable<any> {
    // Check authentication before making API call
    if (!this._isBrowser || !this._authService.isLoggedIn()) {
      this._notificationsService.show(
        'error-snackbar',
        'Please login to add items to wishlist',
        4000,
      );
      return of({ status: 'auth_required' });
    }

    // Prevent duplicate operations
    if (this._pendingOperations().has(productId)) {
      return of({ status: 'pending' });
    }

    this._pendingOperations().add(productId);
    this._isLoading.set(true);

    return this._httpClient
      .post(this.apiUrl, { productId }, { context: this._skipLoadingContext })
      .pipe(
        tap((response: any) => {
          this._isLoading.set(false);
          this._pendingOperations().delete(productId);

          if (response.status === 'success') {
            this._updateLocalStateAfterAdd(productId);
            this._notificationsService.show(
              'success-snackbar',
              'Product added to wishlist successfully!',
              3000,
            );
          }
        }),
        catchError((error) => {
          this._isLoading.set(false);
          this._pendingOperations().delete(productId);

          // Handle 401 unauthorized specifically
          if (error.status === 401) {
            this._notificationsService.show(
              'error-snackbar',
              'Please login to manage your wishlist',
              4000,
            );
            this.clearWishlist(); // Clear local state on auth error
          } else {
            this._notificationsService.show(
              'error-snackbar',
              'Failed to add product to wishlist. Please try again.',
              4000,
            );
          }
          console.error('Error adding product to wishlist:', error);
          throw error;
        }),
        takeUntilDestroyed(this._destroyRef),
      );
  }

  getLoggedUserWishlist(): Observable<any> {
    // Check authentication before making API call
    if (!this._isBrowser || !this._authService.isLoggedIn()) {
      return of({ data: [] });
    }

    this._isLoading.set(true);

    return this._httpClient.get(this.apiUrl, { context: this._skipLoadingContext }).pipe(
      tap((response: any) => {
        this._isLoading.set(false);
        if (response && response.data) {
          this._wishlistItems.set(response.data);
          this._saveWishlistToStorage();
        }
      }),
      catchError((error) => {
        this._isLoading.set(false);

        // Handle 401 unauthorized specifically
        if (error.status === 401) {
          console.warn('User not authenticated, clearing wishlist state');
          this.clearWishlist();
        } else {
          console.error('Error fetching wishlist:', error);
        }
        return of({ data: [] });
      }),
      takeUntilDestroyed(this._destroyRef),
    );
  }

  removeProductFromLoggedUserWishlist(productId: string): Observable<any> {
    // Check authentication before making API call
    if (!this._isBrowser || !this._authService.isLoggedIn()) {
      this._notificationsService.show(
        'error-snackbar',
        'Please login to manage your wishlist',
        4000,
      );
      return of({ status: 'auth_required' });
    }

    // Prevent duplicate operations
    if (this._pendingOperations().has(productId)) {
      return of({ status: 'pending' });
    }

    this._pendingOperations().add(productId);
    this._isLoading.set(true);

    return this._httpClient
      .delete(`${this.apiUrl}/${productId}`, {
        context: this._skipLoadingContext,
      })
      .pipe(
        tap((response: any) => {
          this._isLoading.set(false);
          this._pendingOperations().delete(productId);

          if (response.status === 'success') {
            this._updateLocalStateAfterRemove(productId);
            this._notificationsService.show('info-snackbar', 'Product removed from wishlist', 3000);
          }
        }),
        catchError((error) => {
          this._isLoading.set(false);
          this._pendingOperations().delete(productId);

          // Handle 401 unauthorized specifically
          if (error.status === 401) {
            this._notificationsService.show(
              'error-snackbar',
              'Please login to manage your wishlist',
              4000,
            );
            this.clearWishlist(); // Clear local state on auth error
          } else {
            this._notificationsService.show(
              'error-snackbar',
              'Failed to remove product from wishlist. Please try again.',
              4000,
            );
          }
          throw error;
        }),
        takeUntilDestroyed(this._destroyRef),
      );
  }

  /**
   * Production-ready toggle method with authentication check
   */
  toggleProductInWishlist(product: Product): Observable<any> {
    // Check authentication first
    if (!this._isBrowser || !this._authService.isLoggedIn()) {
      this._notificationsService.show(
        'error-snackbar',
        'Please login to manage your wishlist',
        4000,
      );
      return of({ status: 'auth_required' });
    }

    const productId = product._id;

    if (this._pendingOperations().has(productId)) {
      return of({ status: 'pending' });
    }

    if (this.isInWishlist(productId)) {
      return this.removeProductFromLoggedUserWishlist(productId);
    } else {
      return this.addProductToLoggedUserWishlist(productId);
    }
  }

  /**
   * Enhanced local state management
   */
  addToWishlistItems(product: Product): void {
    if (!this._isBrowser || !this._authService.isLoggedIn()) return;

    if (!this.isInWishlist(product._id)) {
      this._wishlistItems.update((currentItems) => [...currentItems, product]);
      this._saveWishlistToStorage();
    }
  }

  removeFromWishlistItems(productId: string): void {
    if (!this._isBrowser || !this._authService.isLoggedIn()) return;

    this._wishlistItems.update((currentItems) =>
      currentItems.filter((item) => item._id !== productId),
    );
    this._saveWishlistToStorage();
  }

  /**
   * Clear all wishlist items with notification
   */
  clearWishlistWithNotification(): void {
    const itemCount = this.wishlistCount();
    this.clearWishlist();

    if (itemCount > 0) {
      this._notificationsService.show(
        'success-snackbar',
        `Cleared all ${itemCount} items from wishlist`,
        3000,
      );
    }
  }

  /**
   * Refresh wishlist from server
   */
  refreshWishlist(): void {
    if (this._isBrowser && this._authService.isLoggedIn()) {
      this.getLoggedUserWishlist().subscribe();
    }
  }

  /**
   * Clear wishlist state (on logout)
   */
  clearWishlist(): void {
    this._wishlistItems.set([]);
    this._clearLocalStorage();
    this._isInitialized.set(false);
    this._pendingOperations().clear();
  }

  /**
   * Private methods for state management
   */
  private _updateLocalStateAfterAdd(productId: string): void {
    if (this._isBrowser && this._authService.isLoggedIn()) {
      this.getLoggedUserWishlist().subscribe();
    }
  }

  private _updateLocalStateAfterRemove(productId: string): void {
    if (this._isBrowser && this._authService.isLoggedIn()) {
      this._wishlistItems.update((currentItems) =>
        currentItems.filter((item) => item._id !== productId),
      );
      this._saveWishlistToStorage();
    }
  }

  /**
   * Utility method to check if operation is pending
   */
  isOperationPending(productId: string): boolean {
    return this._pendingOperations().has(productId);
  }

  /**
   * Check if user can use wishlist features
   */
  canUseWishlist(): boolean {
    return this._isBrowser && this._authService.isLoggedIn() && this._isInitialized();
  }
}
