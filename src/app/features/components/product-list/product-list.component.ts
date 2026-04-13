import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  InputSignal,
  output,
} from '@angular/core';
import { Product } from '../../interfaces/product/product';
import { WishlistService } from '../../services/wishlist/wishlist.service';
import { FilterProductsByNamePipe } from '../../pipes/filter-products-by-name/filter-products-by-name.pipe';
import { FilterProductsByRatingPipe } from '../../pipes/filter-products-by-rating/filter-products-by-rating.pipe';
import { ProductCardComponent } from '../product-card/product-card.component';
import { NgxPaginationModule } from 'ngx-pagination';
import { Router } from '@angular/router';

@Component({
  selector: 'app-product-list',
  imports: [
    FilterProductsByNamePipe,
    FilterProductsByRatingPipe,
    ProductCardComponent,
    NgxPaginationModule,
  ],
  templateUrl: './product-list.component.html',
  styleUrl: './product-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductListComponent {
  private readonly _wishlistService = inject(WishlistService);
  private _router: Router = inject(Router);

  products: InputSignal<Product[]> = input([] as Product[]);

  // Safe wishlist access - only show wishlist data when user is logged in
  wishlistProducts = computed(() => {
    if (this._wishlistService.canUseWishlist()) {
      return this._wishlistService.wishlistItems();
    }
    return [];
  });

  readonly rating = input(0);
  readonly name = input('');
  readonly pageSize = input(0);
  readonly page = input(1);
  readonly total = input(0);
  readonly currentPage = output<number>();

  constructor() {}

  // * take id from product-card component
  goToProudctDetails(e: string) {
    this._router.navigate(['product-details', e]);
  }

  pageChangeEvent(event: number) {
    this.currentPage.emit(event);
    this.scrollToTop();
  }

  private scrollToTop(): void {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }
}
