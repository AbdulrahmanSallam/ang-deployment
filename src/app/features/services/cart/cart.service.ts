import { HttpClient, HttpContext } from '@angular/common/http';
import {
  Injectable,
  inject,
  signal,
  computed,
  effect,
  PLATFORM_ID,
  DestroyRef,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable, tap, catchError, of } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { CartInfo } from '../../interfaces/cart-info/cart-info';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SKIP_LOADING } from '../../../core/interceptors/loading/loading.interceptor';
import { NotificationsService } from '../../../core/services/notifications/notifications.service';

@Injectable({
  providedIn: 'root',
})
export class CartService {
  // --- Dependencies ---
  private readonly _http = inject(HttpClient);
  private readonly _platformId = inject(PLATFORM_ID);
  private readonly _destroyRef = inject(DestroyRef);
  private readonly _notificationsService = inject(NotificationsService);
  private readonly _apiUrl = `${environment.apiBaseUrl}/api/v1/cart`;
  private readonly _skipLoadingContext = new HttpContext().set(SKIP_LOADING, true);

  // --- State Management ---
  private readonly _cartState = signal<CartInfo | null>(null);
  private readonly _isLoading = signal(false);
  private readonly _isInitialized = signal(false);
  private readonly _pendingOperations = signal<Set<string>>(new Set());

  // --- Public Signals ---
  public readonly cart = this._cartState.asReadonly();
  public readonly count = computed(() => this._cartState()?.numOfCartItems || 0);
  public readonly totalCartPrice = computed(() => this._cartState()?.data?.totalCartPrice || 0);
  public readonly isEmpty = computed(() => this.count() === 0);
  public readonly loading = this._isLoading.asReadonly();
  public readonly initialized = this._isInitialized.asReadonly();
  public readonly items = computed(() => this._cartState()?.data?.products || []);

  // --- Private Helpers ---
  private readonly _isBrowser: boolean;

  constructor() {
    this._isBrowser = isPlatformBrowser(this._platformId);

    if (this._isBrowser) {
      this._initCartPersistence();
    }
  }

  private _initCartPersistence(): void {
    // Hydrate from localStorage
    this._loadCartFromStorage();

    // Persist to localStorage on changes
    effect(() => {
      const cart = this._cartState();
      if (cart && this._isBrowser) {
        try {
          localStorage.setItem('lastKnownCart', JSON.stringify(cart));
        } catch (error) {
          console.error('Error saving cart to localStorage:', error);
        }
      }
    });
  }

  private _loadCartFromStorage(): void {
    if (!this._isBrowser) return;

    try {
      const savedCart = localStorage.getItem('lastKnownCart');
      if (savedCart) {
        const cart = JSON.parse(savedCart) as CartInfo;
        // Validate cart structure
        if (cart && typeof cart === 'object' && 'data' in cart) {
          this._cartState.set(cart);
        } else {
          this._clearLocalStorage();
        }
      }
    } catch (error) {
      console.error('Error loading cart from localStorage:', error);
      this._clearLocalStorage();
    }
  }

  private _clearLocalStorage(): void {
    if (this._isBrowser) {
      try {
        localStorage.removeItem('lastKnownCart');
      } catch (error) {
        console.error('Error clearing cart from localStorage:', error);
      }
    }
  }

  private _updateCart(cart: CartInfo | null): void {
    this._cartState.set(cart);
  }

  private _setLoading(loading: boolean): void {
    this._isLoading.set(loading);
  }

  // --- Public API Methods ---

  /**
   * Initialize cart - public method for app component
   */
  initializeCart(): void {
    if (this._isInitialized()) {
      return;
    }

    if (this._isBrowser) {
      this._loadCartFromStorage();
    }

    this.refresh();
    this._isInitialized.set(true);
  }

  fetchCart(): Observable<CartInfo> {
    this._setLoading(true);

    return this._http
      .get<CartInfo>(this._apiUrl, {
        context: this._skipLoadingContext,
      })
      .pipe(
        tap((cart) => {
          this._updateCart(cart);
          this._setLoading(false);
        }),
        catchError((error) => {
          this._setLoading(false);
          console.error('Error fetching cart:', error);
          return of(error);
        }),
        takeUntilDestroyed(this._destroyRef)
      );
  }

  addProduct(productId: string): Observable<CartInfo> {
    // Prevent duplicate operations
    if (this._pendingOperations().has(productId)) {
      return of({} as CartInfo);
    }

    this._pendingOperations().add(productId);
    this._setLoading(true);

    return this._http
      .post<CartInfo>(this._apiUrl, { productId }, { context: this._skipLoadingContext })
      .pipe(
        tap((cart) => {
          this._updateCart(cart);
          this._setLoading(false);
          this._pendingOperations().delete(productId);

          this._notificationsService.show(
            'success-snackbar',
            'Product added to cart successfully!',
            3000
          );
        }),
        catchError((error) => {
          this._setLoading(false);
          this._pendingOperations().delete(productId);

          this._notificationsService.show(
            'error-snackbar',
            'Failed to add product to cart. Please try again.',
            4000
          );
          console.error('Error adding product to cart:', error);
          throw error;
        }),
        takeUntilDestroyed(this._destroyRef)
      );
  }

  updateQuantity(productId: string, count: number): Observable<CartInfo> {
    if (count < 1) {
      return this.removeProduct(productId);
    }

    // Prevent duplicate operations
    if (this._pendingOperations().has(`update-${productId}`)) {
      return of({} as CartInfo);
    }

    this._pendingOperations().add(`update-${productId}`);
    this._setLoading(true);

    return this._http
      .put<CartInfo>(
        `${this._apiUrl}/${productId}`,
        { count },
        { context: this._skipLoadingContext }
      )
      .pipe(
        tap((cart) => {
          this._updateCart(cart);
          this._setLoading(false);
          this._pendingOperations().delete(`update-${productId}`);

          this._notificationsService.show('success-snackbar', 'Cart updated successfully', 2000);
        }),
        catchError((error) => {
          this._setLoading(false);
          this._pendingOperations().delete(`update-${productId}`);

          this._notificationsService.show(
            'error-snackbar',
            'Failed to update cart. Please try again.',
            3000
          );
          console.error('Error updating cart quantity:', error);
          throw error;
        }),
        takeUntilDestroyed(this._destroyRef)
      );
  }

  removeProduct(productId: string): Observable<CartInfo> {
    // Prevent duplicate operations
    if (this._pendingOperations().has(productId)) {
      return of({} as CartInfo);
    }

    this._pendingOperations().add(productId);
    this._setLoading(true);

    return this._http
      .delete<CartInfo>(`${this._apiUrl}/${productId}`, {
        context: this._skipLoadingContext,
      })
      .pipe(
        tap((cart) => {
          this._updateCart(cart);
          this._setLoading(false);
          this._pendingOperations().delete(productId);

          this._notificationsService.show('info-snackbar', 'Product removed from cart', 3000);
        }),
        catchError((error) => {
          this._setLoading(false);
          this._pendingOperations().delete(productId);

          this._notificationsService.show(
            'error-snackbar',
            'Failed to remove product from cart. Please try again.',
            4000
          );
          console.error('Error removing product from cart:', error);
          throw error;
        }),
        takeUntilDestroyed(this._destroyRef)
      );
  }

  clearCart(): Observable<{ message: string }> {
    this._setLoading(true);

    return this._http
      .delete<{ message: string }>(this._apiUrl, {
        context: this._skipLoadingContext,
      })
      .pipe(
        tap((response) => {
          this._updateCart(null);
          this._clearLocalStorage();
          this._setLoading(false);

          this._notificationsService.show('success-snackbar', 'Cart cleared successfully', 3000);
        }),
        catchError((error) => {
          this._setLoading(false);

          this._notificationsService.show(
            'error-snackbar',
            'Failed to clear cart. Please try again.',
            4000
          );
          console.error('Error clearing cart:', error);
          throw error;
        }),
        takeUntilDestroyed(this._destroyRef)
      );
  }

  // --- Utility Methods ---
  getCurrentCart(): CartInfo | null {
    return this._cartState();
  }

  refresh(): void {
    this.fetchCart().subscribe();
  }

  getProductQuantity(productId: string): number {
    const product = this.items().find((item) => item.product._id === productId);
    return product?.count || 0;
  }

  isOperationPending(productId: string): boolean {
    return this._pendingOperations().has(productId);
  }
}
