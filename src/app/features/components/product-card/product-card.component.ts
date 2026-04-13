import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  InputSignal,
  output,
} from '@angular/core';
import { Router } from '@angular/router';
import { Product } from '../../interfaces/product/product';
import { AddToWishlistComponent } from '../add-to-wishlist/add-to-wishlist.component';
import { RatingComponent } from '../rating/rating.component';
import { ProductPriceComponent } from '../product-price/product-price.component';
import { AddToCartBtnComponent } from '../add-to-cart-btn/add-to-cart-btn.component';
import { SliceTextPipe } from '../../pipes/slice-text/slice-text.pipe';

@Component({
  selector: 'app-product-card',
  imports: [
    AddToWishlistComponent,
    RatingComponent,
    ProductPriceComponent,
    AddToCartBtnComponent,
    SliceTextPipe,
  ],
  templateUrl: './product-card.component.html',
  styleUrl: './product-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductCardComponent {
  readonly product: InputSignal<Product> = input({} as Product);
  readonly productId = output<string>();
  addToWishlist = output<{ product: Product; isInWishlist: boolean }>();

  emitProductId(productId: string): void {
    this.productId.emit(productId);
  }
}
