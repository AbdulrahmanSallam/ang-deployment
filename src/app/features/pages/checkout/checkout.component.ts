import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CheckoutFormComponent } from '../../components/checkout-form/checkout-form.component';

@Component({
  selector: 'app-checkout',
  imports: [CheckoutFormComponent],
  templateUrl: './checkout.component.html',
  styleUrl: './checkout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CheckoutComponent {}
