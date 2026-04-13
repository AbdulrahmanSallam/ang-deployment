import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  OnInit,
  signal,
  computed,
} from '@angular/core';
import { CategoriesSliderComponent } from './components/categories-slider/categories-slider.component';
import { MainSliderComponent } from './components/main-slider/main-slider.component';
import { ProductListComponent } from '../../components/product-list/product-list.component';
import { ProductsService } from '../../services/products/products.service';
import { Product } from '../../interfaces/product/product';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-home',
  imports: [CategoriesSliderComponent, MainSliderComponent, ProductListComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent implements OnInit {
  private readonly _destroyRef = inject(DestroyRef);
  private readonly _productsService = inject(ProductsService);

  // State signals
  products = signal<Product[]>([]);
  pageSize = signal<number>(0);
  page = signal<number>(1);
  total = signal<number>(0);
  isLoading = signal<boolean>(true);
  error = signal<string | null>(null);

  // ✅ CORRECTED Computed properties
  showLoading = computed(() => this.isLoading());
  showEmpty = computed(() => !this.isLoading() && this.products().length === 0 && !this.error());
  showError = computed(() => !this.isLoading() && this.error() !== null);
  showContent = computed(() => !this.isLoading() && this.products().length > 0 && !this.error());

  ngOnInit(): void {
    this.getProducts();
  }

  private getProducts(): void {
    this.isLoading.set(true);
    this.error.set(null);

    this._productsService
      .getAllProducts(this.page(), 30)
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe({
        next: (response) => {
          this.products.set(response.data);
          this.pageSize.set(response.metadata.limit);
          this.page.set(response.metadata.currentPage);
          this.total.set(response.results);
          this.isLoading.set(false);
        },
        error: (error) => {
          console.error('Failed to load products:', error);
          this.error.set('Failed to load products. Please try again later.');
          this.isLoading.set(false);
          this.products.set([]);
        },
      });
  }

  getCurrentPage(page: number): void {
    if (this.page() === page) return;

    this.page.set(page);
    this.getProducts();
  }

  retryLoading(): void {
    this.error.set(null);
    this.getProducts();
  }
}
