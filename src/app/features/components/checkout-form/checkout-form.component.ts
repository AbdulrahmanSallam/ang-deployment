import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal, OnInit,
} from '@angular/core';
import {
  ReactiveFormsModule,
  FormGroup,
  FormControl,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, NavigationStart, Router } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthResponse } from '../../../core/interfaces/auth-response';
import { OrdersService } from '../../services/orders/orders.service';
import { CreateCashOrderResponse } from '../../interfaces/createCashOrderResponse/create-cash-order-response';
import { CreateOnlineOrderResponse } from '../../interfaces/createOnlineOrderResponse/create-online-order-response';
import { CartService } from '../../services/cart/cart.service';

@Component({
  selector: 'app-checkout-form',
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatSnackBarModule,
  ],
  templateUrl: './checkout-form.component.html',
  styleUrl: './checkout-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CheckoutFormComponent implements OnInit {
  private readonly _ordersService = inject(OrdersService);
  private readonly _activatedRoute = inject(ActivatedRoute);
  private readonly _cartService = inject(CartService);
  private readonly _router = inject(Router);
  private readonly _snackBar = inject(MatSnackBar);

  readonly isLoading = signal(false);
  readonly loginError = signal<string | null>(null);
  private cartID: string | null = null;
  readonly paymentType = signal('');

  checkoutForm: FormGroup = new FormGroup({
    phone: new FormControl('', [
      Validators.required,
      Validators.pattern('^01[0125][0-9]{8}$'),
    ]),
    city: new FormControl('', [
      Validators.required,
      Validators.minLength(4),
      Validators.maxLength(30),
    ]),
    details: new FormControl('', [
      Validators.required,
      Validators.minLength(10),
      Validators.maxLength(100),
    ]),
  });

  constructor() {
    this.getPaymentTypeState();
  }

  ngOnInit() {
    this.getCartId();
  }

  // get cart ID from URL
  private getCartId() {
    this._activatedRoute.paramMap.subscribe((params) => {
      const id = params.get('id');
      if (id) {
        this.cartID = id;
      }
    });
  }

  // Get state(cash or online) from navigation
  private getPaymentTypeState() {
    const navigation = this._router.getCurrentNavigation();
    this.paymentType.set(navigation?.extras?.state?.['paymentType']);
  }

  submit(): void {
    if (this.checkoutForm.invalid) {
      this.checkoutForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.loginError.set(null);

    if (this.paymentType() == 'cash') {
      this.createCashOrder();
    } else if (this.paymentType() == 'online') {
      this.createOnlineOrder();
    }
  }

  private createOnlineOrder() {
    this._ordersService
      .createOnlineOrder(this.cartID!, this.checkoutForm.value)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (response: CreateOnlineOrderResponse) =>
          this.handleCreateOnlineOrderSuccess(response),
        error: (error: HttpErrorResponse) =>
          this.handleCreateOnlineOrderError(error),
      });
  }

  private createCashOrder() {
    this._ordersService
      .createCashOrder(this.cartID!, this.checkoutForm.value)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (response: CreateCashOrderResponse) =>
          this.handleCreateCashOrderSuccess(response),
        error: (error: HttpErrorResponse) =>
          this.handleCreateCashOrderError(error),
      });
  }

  private handleCreateCashOrderSuccess(
    response: CreateCashOrderResponse
  ): void {
    if (response.status == 'success') {
      this._snackBar.open(
        "Your order is confirmed! We'll be in touch soon.",
        'Close',
        {
          duration: 4000,
          panelClass: ['success-snackbar'],
        }
      );
      this._cartService.refresh();
      this._router.navigate(['/home']);
    }
  }

  private handleCreateOnlineOrderSuccess(
    response: CreateOnlineOrderResponse
  ): void {
    if (response.status == 'success') {
      this._snackBar.open(
        'Your Address is confirmed! Please Complete Your Checkout.',
        'Close',
        {
          duration: 4000,
          panelClass: ['success-snackbar'],
        }
      );
      // URL redirection
      if (response?.session?.url) {
        // Use setTimeout to ensure snackbar is visible before redirect
        setTimeout(() => {
          window.location.href = response.session.url;
        }, 1000); // 1 second delay
      }
    }
  }

  private handleCreateCashOrderError(err: HttpErrorResponse): void {
    this._snackBar.open(
      "Your order couldn't be confirmed. Please try again.",
      'Close',
      {
        duration: 4000,
        panelClass: ['error-snackbar'],
      }
    );
  }

  private handleCreateOnlineOrderError(err: HttpErrorResponse): void {
    this._snackBar.open(
      "Your order couldn't be confirmed. Please try again.",
      'Close',
      {
        duration: 4000,
        panelClass: ['error-snackbar'],
      }
    );
  }

  getControl(name: string) {
    return this.checkoutForm.get(name);
  }
}
