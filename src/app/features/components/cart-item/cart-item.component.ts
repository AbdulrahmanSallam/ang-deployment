import { ChangeDetectionStrategy, Component, inject, input, InputSignal } from '@angular/core';

import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { CartOperations } from '../../interfaces/cart-operations/cart-operations';
import { CartProduct } from '../../interfaces/cart-product/cart-product';
import { CartService } from '../../services/cart/cart.service';
import { ProductPriceComponent } from '../product-price/product-price.component';
import { SliceTextPipe } from '../../pipes/slice-text/slice-text.pipe';

@Component({
  selector: 'app-cart-item',
  standalone: true,
  imports: [ProductPriceComponent, SliceTextPipe],
  templateUrl: './cart-item.component.html',
  styleUrls: ['./cart-item.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CartItemComponent {
  public cartProudct: InputSignal<CartProduct> = input({} as CartProduct);
  private readonly _cartService = inject(CartService);
  private readonly _router = inject(Router);

  constructor() {}

  updateCartQuantity(count: number): void {
    this._cartService
      .updateQuantity(this.cartProudct().product._id, count)

      .subscribe({
        next: (response: CartOperations) => {
          if (response.status === 'success') {
            this._cartService.refresh();
          }
        },
        error: (error: HttpErrorResponse) => {
          console.error('Error updating cart quantity:', error);
        },
      });
  }

  removeProduct(): void {
    this._cartService.removeProduct(this.cartProudct().product._id).subscribe({
      next: (response: CartOperations) => {
        if (response.status === 'success') {
          this._cartService.refresh();
        }
      },
      error: (error: HttpErrorResponse) => {
        console.error('Error removing product:', error);
      },
    });
  }

  goToProductDetails(): void {
    this._router.navigate(['product-details', this.cartProudct().product.id]);
  }
}
