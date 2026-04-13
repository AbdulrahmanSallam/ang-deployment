import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, InputSignal } from '@angular/core';

@Component({
  selector: 'app-product-price',
  imports: [CurrencyPipe],
  templateUrl: './product-price.component.html',
  styleUrl: './product-price.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductPriceComponent {
  price = input(0);
}
