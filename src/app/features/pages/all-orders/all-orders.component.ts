import {
  Component,
  inject,
  OnInit,
  signal,
  computed,
  ChangeDetectionStrategy,
  DestroyRef,
  effect,
} from '@angular/core';
import { OrdersService } from '../../services/orders/orders.service';
import { AuthService } from '../../../core/services/auth/auth.service';
import { Order } from '../../interfaces/order/order';
import { MatIconModule } from '@angular/material/icon';
import { OrderItemComponent } from './components/order-item/order-item.component';
import { NgxPaginationModule } from 'ngx-pagination';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-all-orders',
  imports: [MatIconModule, OrderItemComponent, NgxPaginationModule],
  templateUrl: './all-orders.component.html',
  styleUrl: './all-orders.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AllOrdersComponent implements OnInit {
  private readonly _ordersService = inject(OrdersService);
  private readonly _authService = inject(AuthService);
  private readonly _destroyRef = inject(DestroyRef);

  // Signals for state management
  readonly orders = signal<Order[]>([]);
  readonly currentOrders = signal<Order[]>([]);
  readonly isLoading = signal<boolean>(true);
  readonly error = signal<string | null>(null);
  readonly authInitialized = signal<boolean>(false);

  // Pagination
  readonly pageSize = signal(5);
  readonly page = signal(1);
  readonly total = signal(0);

  // Computed properties for template
  readonly showLoading = computed(() => this.isLoading() || !this.authInitialized());
  readonly showError = computed(
    () => !this.isLoading() && this.authInitialized() && this.error() !== null
  );
  readonly showEmpty = computed(
    () => !this.isLoading() && this.authInitialized() && this.orders().length === 0 && !this.error()
  );
  readonly showContent = computed(
    () => !this.isLoading() && this.authInitialized() && this.orders().length > 0 && !this.error()
  );
  readonly showPagination = computed(() => this.orders().length > this.pageSize());

  constructor() {
    // Watch for auth initialization
    effect(() => {
      const isAuthInitialized = this._authService.isInitialized();
      this.authInitialized.set(isAuthInitialized);

      // When auth is initialized and user is logged in, load orders
      if (isAuthInitialized && this._authService.isLoggedIn()) {
        this.getAllOrders();
      } else if (isAuthInitialized && !this._authService.isLoggedIn()) {
        // If auth is initialized but user is not logged in
        this.error.set('Please login to view your orders');
        this.isLoading.set(false);
      }
    });
  }

  ngOnInit(): void {
    // Initial check for auth state
    if (this._authService.isInitialized()) {
      this.authInitialized.set(true);
      if (this._authService.isLoggedIn()) {
        this.getAllOrders();
      } else {
        this.error.set('Please login to view your orders');
        this.isLoading.set(false);
      }
    }
  }

  getAllOrders(forceRefresh = false): void {
    const userId = this._authService.userId();

    // Double-check that user is logged in
    if (!userId || !this._authService.isLoggedIn()) {
      this.error.set('Please login to view your orders');
      this.isLoading.set(false);
      return;
    }

    this.isLoading.set(true);
    this.error.set(null);

    this._ordersService
      .getUserOrders(userId, forceRefresh)
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe({
        next: (response: Order[]) => {
          const sortedOrders = response.reverse(); // Most recent first
          this.orders.set(sortedOrders);
          this.total.set(sortedOrders.length);
          this.updateCurrentOrders();
          this.isLoading.set(false);
        },
        error: (err) => {
          this.error.set(err.error?.message || 'Failed to load orders. Please try again later.');
          this.isLoading.set(false);
          console.error('Error fetching orders:', err);
        },
      });
  }

  private updateCurrentOrders(): void {
    const startIndex = (this.page() - 1) * this.pageSize();
    const endIndex = startIndex + this.pageSize();
    this.currentOrders.set(this.orders().slice(startIndex, endIndex));
  }

  pageChangeEvent(event: number): void {
    this.page.set(event);
    this.updateCurrentOrders();

    // Smooth scroll to top
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  retryLoading(): void {
    this.getAllOrders(true); // Force refresh
  }

  trackByOrderId(index: number, order: Order): string {
    return order._id;
  }
}
