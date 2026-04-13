import {
  Component,
  inject,
  ChangeDetectionStrategy,
  computed,
  PLATFORM_ID,
  OnInit,
  DestroyRef,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { CurrencyPipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { CartItemComponent } from '../../components/cart-item/cart-item.component';
import { CartService } from '../../services/cart/cart.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CartItemComponent, RouterLink, CurrencyPipe, MatIconModule],
  templateUrl: './cart.component.html',
  styleUrls: ['./cart.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CartComponent implements OnInit {
  // --- Services ---
  private readonly _cartService = inject(CartService);
  private readonly _router = inject(Router);
  private readonly _platformId = inject(PLATFORM_ID);
  private readonly _destroyRef = inject(DestroyRef);

  // --- Reactive State ---
  readonly cart = this._cartService.cart;
  readonly isEmpty = this._cartService.isEmpty;
  readonly loading = this._cartService.loading;

  // --- Computed Values ---
  readonly items = computed(() => this.cart()?.data.products || []);
  readonly totalPrice = computed(() => this._cartService.totalCartPrice());
  readonly itemCount = computed(() => this._cartService.count());

  // --- Lifecycle ---
  ngOnInit(): void {
    if (this._isBrowser()) {
      this._cartService.refresh();
    }
  }

  private _isBrowser(): boolean {
    return isPlatformBrowser(this._platformId);
  }

  // --- Cart Operations ---
  clearCart(): void {
    this._cartService
      .clearCart()
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe({
        next: () => {
          this._router.navigate(['/products']);
        },
      });
  }

  updateQuantity(productId: string, newCount: number): void {
    if (newCount < 1) {
      this.removeItem(productId);
      return;
    }

    this._cartService
      .updateQuantity(productId, newCount)
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe();
  }

  removeItem(productId: string): void {
    this._cartService
      .removeProduct(productId)
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe();
  }
}
