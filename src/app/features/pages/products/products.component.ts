import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  OnInit,
  signal,
  WritableSignal,
} from '@angular/core';
import { Product } from '../../interfaces/product/product';
import { ProductsService } from '../../services/products/products.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ProductListComponent } from '../../components/product-list/product-list.component';
import { SearchInputComponent } from '../../components/search-input/search-input.component';

@Component({
  selector: 'app-products',
  imports: [ProductListComponent, SearchInputComponent],
  templateUrl: './products.component.html',
  styleUrl: './products.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductsComponent implements OnInit {
  private readonly _destroyRef = inject(DestroyRef);
  private readonly _productsService = inject(ProductsService);

  readonly searchQuery = signal('');
  readonly products = signal([]);
  readonly pageSize = signal(0);
  readonly page = signal(1);
  readonly total = signal(0);

  constructor() {}

  ngOnInit(): void {
    this.getProducts();
  }

  getSearchText(query: string): void {
    this.searchQuery.set(query);
  }

  getProducts(): void {
    this._productsService
      .getAllProducts(this.page(), 30)
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe((response: any) => {
        this.products.set(response.data);
        this.pageSize.set(response.metadata.limit);
        this.page.set(response.metadata.currentPage);
        this.total.set(response.results);
      });
  }

  getCurrentPage(page: number): void {
    this.page.set(page);
    this.getProducts();
  }
}
