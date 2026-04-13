import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CartService } from '../../services/cart/cart.service';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-add-to-cart-btn',
  imports: [],
  templateUrl: './add-to-cart-btn.component.html',
  styleUrl: './add-to-cart-btn.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddToCartBtnComponent {
  private readonly cartService = inject(CartService);
  private readonly destroyRef = inject(DestroyRef);

  // Inputs
  productId = input.required<string>();

  // State
  readonly isAddingToCart = signal(false);

  addToCart(): void {
    if (this.isAddingToCart() || this.cartService.isOperationPending(this.productId())) return;

    this.isAddingToCart.set(true);

    this.cartService
      .addProduct(this.productId())
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isAddingToCart.set(false))
      )
      .subscribe();
  }
}
