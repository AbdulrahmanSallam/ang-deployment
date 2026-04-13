import {
  ChangeDetectionStrategy,
  Component,
  input,
  InputSignal,
} from '@angular/core';
import { ProductPriceComponent } from '../../../../components/product-price/product-price.component';
import { CartProduct } from '../../../../interfaces/cart-product/cart-product';
import { SliceTextPipe } from '../../../../pipes/slice-text/slice-text.pipe';

@Component({
  selector: 'app-order-product',
  standalone: true,
  imports: [ProductPriceComponent, SliceTextPipe],
  templateUrl: './order-product.component.html',
  styleUrl: './order-product.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderProductComponent {
  cartItem: InputSignal<CartProduct> = input({} as CartProduct);
}
