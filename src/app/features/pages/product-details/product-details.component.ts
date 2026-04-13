import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  PLATFORM_ID,
  signal,
  computed,
} from '@angular/core';

import { ProductPriceComponent } from '../../components/product-price/product-price.component';
import { RatingComponent } from '../../components/rating/rating.component';
import { ProductSliderComponent } from '../../components/product-slider/product-slider.component';
import { AddToWishlistComponent } from '../../components/add-to-wishlist/add-to-wishlist.component';
import { AddToCartBtnComponent } from '../../components/add-to-cart-btn/add-to-cart-btn.component';
import { Product } from '../../interfaces/product/product';
import { ProductsService } from '../../services/products/products.service';
import { ActivatedRoute } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-product-details',
  standalone: true,
  imports: [
    ProductPriceComponent,
    RatingComponent,
    ProductSliderComponent,
    AddToWishlistComponent,
    AddToCartBtnComponent,
  ],
  templateUrl: './product-details.component.html',
  styleUrl: './product-details.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductDetailsComponent implements OnInit {
  private readonly _productsService = inject(ProductsService);
  private readonly _activatedRoute = inject(ActivatedRoute);
  private readonly _PLATFORM_ID = inject(PLATFORM_ID);

  private productId = '';
  product = signal<Product>({} as Product);
  isLoading = signal<boolean>(true);
  error = signal<string | null>(null);

  // Computed properties for template states
  readonly showLoading = computed(() => this.isLoading());
  readonly showError = computed(() => !this.isLoading() && this.error() !== null);
  readonly showContent = computed(() => !this.isLoading() && this.product()._id && !this.error());
  readonly showEmpty = computed(() => !this.isLoading() && !this.product()._id && !this.error());

  constructor() {}

  ngOnInit(): void {
    if (isPlatformBrowser(this._PLATFORM_ID)) {
      this._activatedRoute.params.subscribe({
        next: (response: any) => {
          this.productId = response.id;
          if (this.productId) {
            this.getProductInfo(this.productId);
          }
        },
        error: (error) => {
          console.error('Failed to get route parameters:', error);
          this.error.set('Failed to load product details.');
          this.isLoading.set(false);
        },
      });
    }
  }

  getProductInfo(productId: string): void {
    this.isLoading.set(true);
    this.error.set(null);

    this._productsService.getSpecificProduct(productId).subscribe({
      next: (response) => {
        this.product.set(response.data);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Failed to load product:', error);
        this.error.set('Failed to load product details. Please try again later.');
        this.isLoading.set(false);
        this.product.set({} as Product);
      },
    });
  }

  retryLoading(): void {
    if (this.productId) {
      this.getProductInfo(this.productId);
    }
  }
}
