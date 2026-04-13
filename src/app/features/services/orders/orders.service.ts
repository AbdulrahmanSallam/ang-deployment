import { DestroyRef, inject, Injectable, signal } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { HttpClient, HttpContext } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ShippingAddress } from '../../interfaces/shipping-address/shipping-address';
import { Observable, tap, catchError, of, shareReplay } from 'rxjs';
import { Order } from '../../interfaces/order/order';
import { SKIP_LOADING } from '../../../core/interceptors/loading/loading.interceptor';
import { NotificationsService } from '../../../core/services/notifications/notifications.service';

@Injectable({
  providedIn: 'root',
})
export class OrdersService {
  private readonly _http = inject(HttpClient);
  private readonly _destroyRef = inject(DestroyRef);
  private readonly _notificationsService = inject(NotificationsService);
  private readonly _ordersUrl = `${environment.apiBaseUrl}/api/v1/orders`;
  private readonly _skipLoadingContext = new HttpContext().set(SKIP_LOADING, true);

  // State management for caching
  private readonly _userOrdersCache = new Map<string, Order[]>();
  private readonly _isLoading = signal<boolean>(false);
  private readonly _error = signal<string | null>(null);

  // Public signals
  public readonly loading = this._isLoading.asReadonly();
  public readonly error = this._error.asReadonly();

  constructor() {}

  createCashOrder(cartId: string, shippingAddress: ShippingAddress): Observable<any> {
    this._isLoading.set(true);
    this._error.set(null);

    return this._http
      .post(`${this._ordersUrl}/${cartId}`, shippingAddress, {
        context: this._skipLoadingContext,
      })
      .pipe(
        tap(() => {
          this._isLoading.set(false);
          this._notificationsService.show('success-snackbar', 'Order placed successfully!', 3000);
        }),
        catchError((error) => {
          this._isLoading.set(false);
          this._error.set('Failed to create order');
          this._notificationsService.show(
            'error-snackbar',
            'Failed to place order. Please try again.',
            4000
          );
          console.error('Error creating cash order:', error);
          throw error;
        }),
        takeUntilDestroyed(this._destroyRef)
      );
  }

  createOnlineOrder(cartId: string, shippingAddress: ShippingAddress): Observable<any> {
    this._isLoading.set(true);
    this._error.set(null);

    return this._http
      .post(
        `${this._ordersUrl}/checkout-session/${cartId}?url=http://localhost:4200`,
        shippingAddress,
        { context: this._skipLoadingContext }
      )
      .pipe(
        tap(() => {
          this._isLoading.set(false);
          this._notificationsService.show('success-snackbar', 'Redirecting to payment...', 3000);
        }),
        catchError((error) => {
          this._isLoading.set(false);
          this._error.set('Failed to create online order');
          this._notificationsService.show(
            'error-snackbar',
            'Failed to initiate payment. Please try again.',
            4000
          );
          console.error('Error creating online order:', error);
          throw error;
        }),
        takeUntilDestroyed(this._destroyRef)
      );
  }

  getUserOrders(userId: string, forceRefresh = false): Observable<Order[]> {
    // Return cached data if available and not forcing refresh
    if (!forceRefresh && this._userOrdersCache.has(userId)) {
      return of(this._userOrdersCache.get(userId)!);
    }

    this._isLoading.set(true);
    this._error.set(null);

    return this._http
      .get<Order[]>(`${this._ordersUrl}/user/${userId}`, {
        context: this._skipLoadingContext,
      })
      .pipe(
        tap((orders) => {
          // Cache the orders
          this._userOrdersCache.set(userId, orders);
          this._isLoading.set(false);
        }),
        catchError((error) => {
          this._isLoading.set(false);
          this._error.set('Failed to load orders');
          console.error('Error fetching user orders:', error);
          return of([]); // Return empty array instead of throwing
        }),
        shareReplay({ bufferSize: 1, refCount: true }),
        takeUntilDestroyed(this._destroyRef)
      );
  }

  // Clear cache for a specific user
  clearUserCache(userId: string): void {
    this._userOrdersCache.delete(userId);
  }

  // Clear all cache
  clearCache(): void {
    this._userOrdersCache.clear();
  }

  // Get order by ID (if needed in the future)
  getOrderById(orderId: string): Observable<Order> {
    return this._http
      .get<Order>(`${this._ordersUrl}/${orderId}`, {
        context: this._skipLoadingContext,
      })
      .pipe(takeUntilDestroyed(this._destroyRef));
  }
}
