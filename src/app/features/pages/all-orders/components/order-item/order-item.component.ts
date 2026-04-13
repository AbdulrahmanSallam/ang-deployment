import {
  ChangeDetectionStrategy,
  Component,
  input,
  InputSignal,
  signal,
} from '@angular/core';

import { MatExpansionModule } from '@angular/material/expansion';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { OrderProductComponent } from '../order-product/order-product.component';
import { Order } from '../../../../interfaces/order/order';
@Component({
  selector: 'app-order-item',
  standalone: true,
  imports: [MatExpansionModule, DatePipe, CurrencyPipe, OrderProductComponent],
  templateUrl: './order-item.component.html',
  styleUrl: './order-item.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderItemComponent {
  order: InputSignal<Order> = input({} as Order);
  readonly panelOpenState = signal(false);
}
