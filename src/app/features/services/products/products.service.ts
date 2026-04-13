import { Injectable, inject, signal, computed, DestroyRef } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { shareReplay } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { environment } from '../../../../environments/environment';
import { GetProductsResponse } from '../../interfaces/get-proudcts-response/get-products-response';
import { Product } from '../../interfaces/product/product';
import { GetSpecificProductResponse } from '../../interfaces/Get-Specific-Product-response/get-specific-product';

// Constants
const DEFAULT_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const DEFAULT_PAGE_LIMIT = 20;

interface ProductsState {
  products: GetProductsResponse | null;
  selectedProduct: GetSpecificProductResponse | null;
  featuredProducts: Product[];
  loading: boolean;
  lastUpdated: number | null;
}

@Injectable({
  providedIn: 'root',
})
export class ProductsService {
  // Dependencies
  private readonly httpClient = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);

  // Configuration
  private readonly apiUrl = `${environment.apiBaseUrl}/api/v1/products`;

  // State management
  private readonly state = signal<ProductsState>({
    products: null,
    selectedProduct: null,
    featuredProducts: [],
    loading: false,
    lastUpdated: null,
  });

  private readonly cacheExpiry = signal(DEFAULT_CACHE_DURATION);
  private readonly defaultLimit = signal(DEFAULT_PAGE_LIMIT);

  // Public computed signals
  public readonly products = computed(() => this.state().products);
  public readonly selectedProduct = computed(() => this.state().selectedProduct);
  public readonly featuredProducts = computed(() => this.state().featuredProducts);
  public readonly loading = computed(() => this.state().loading);
  public readonly lastUpdated = computed(() => this.state().lastUpdated);

  // Derived state
  public readonly hasProducts = computed(() => !!this.state().products?.data?.length);

  public readonly productsCount = computed(() => this.state().products?.data?.length ?? 0);

  public readonly totalProducts = computed(() => this.state().products?.results ?? 0);

  public readonly currentPage = computed(() => this.state().products?.metadata.currentPage ?? 1);

  public readonly totalPages = computed(() => this.state().products?.metadata.numberOfPages ?? 0);

  public readonly canLoadMore = computed(() => this.currentPage() < this.totalPages());

  public readonly hasFeaturedProducts = computed(() => this.state().featuredProducts.length > 0);

  // Public API

  /**
   * Get all products with pagination and caching
   */
  getAllProducts(
    page = 1,
    limit: number = this.defaultLimit(),
    forceRefresh = false,
  ): Observable<GetProductsResponse> {
    if (this.shouldUseCache(page, forceRefresh)) {
      return this.createCachedProductsObservable();
    }

    this.setLoading(true);

    return this.httpClient
      .get<GetProductsResponse>(this.apiUrl, {
        params: this.buildProductsParams(page, limit),
      })
      .pipe(
        tap((response) => this.handleProductsResponse(response)),
        shareReplay({ bufferSize: 1, refCount: true }),
        takeUntilDestroyed(this.destroyRef),
      );
  }

  /**
   * Get specific product by ID
   */
  getSpecificProduct(id: string, forceRefresh = false): Observable<GetSpecificProductResponse> {
    // Check if product exists in current products data
    const existingProduct = this.findProductInState(id);
    if (existingProduct && !forceRefresh) {
      this.setSelectedProduct(existingProduct);
      return this.createCachedProductObservable(existingProduct);
    }

    return this.httpClient.get<GetSpecificProductResponse>(this.buildProductUrl(id)).pipe(
      tap((response) => this.handleProductResponse(response)),
      shareReplay({ bufferSize: 1, refCount: true }),
      takeUntilDestroyed(this.destroyRef),
    );
  }

  /**
   * Get product by slug
   */
  getProductBySlug(slug: string): Observable<GetSpecificProductResponse> {
    return this.httpClient.get<GetSpecificProductResponse>(`${this.apiUrl}/slug/${slug}`).pipe(
      tap((response) => this.setSelectedProduct(response)),
      takeUntilDestroyed(this.destroyRef),
    );
  }

  /**
   * Get featured products
   */
  getFeaturedProducts(limit = 8): Observable<GetProductsResponse> {
    const params = new HttpParams()
      .set('featured', 'true')
      .set('limit', limit.toString())
      .set('sort', '-createdAt');

    return this.httpClient.get<GetProductsResponse>(this.apiUrl, { params }).pipe(
      tap((response) => this.cacheFeaturedProducts(response.data)),
      takeUntilDestroyed(this.destroyRef),
    );
  }

  /**
   * Search products by name or description
   */
  searchProducts(
    query: string,
    page = 1,
    limit: number = this.defaultLimit(),
  ): Observable<GetProductsResponse> {
    const params = new HttpParams()
      .set('search', query)
      .set('limit', limit.toString())
      .set('page', page.toString())
      .set('sort', '-score,name');

    return this.httpClient
      .get<GetProductsResponse>(`${this.apiUrl}/search`, { params })
      .pipe(takeUntilDestroyed(this.destroyRef));
  }

  /**
   * Get products by category
   */
  getProductsByCategory(
    categoryId: string,
    page = 1,
    limit: number = this.defaultLimit(),
  ): Observable<GetProductsResponse> {
    const params = new HttpParams()
      .set('category', categoryId)
      .set('limit', limit.toString())
      .set('page', page.toString())
      .set('sort', 'name');

    return this.httpClient
      .get<GetProductsResponse>(this.apiUrl, { params })
      .pipe(takeUntilDestroyed(this.destroyRef));
  }

  /**
   * Get products by brand
   */
  getProductsByBrand(
    brandId: string,
    page = 1,
    limit: number = this.defaultLimit(),
  ): Observable<GetProductsResponse> {
    const params = new HttpParams()
      .set('brand', brandId)
      .set('limit', limit.toString())
      .set('page', page.toString())
      .set('sort', 'name');

    return this.httpClient
      .get<GetProductsResponse>(this.apiUrl, { params })
      .pipe(takeUntilDestroyed(this.destroyRef));
  }

  /**
   * Load more products (pagination)
   */
  loadMoreProducts(limit: number = this.defaultLimit()): Observable<GetProductsResponse> {
    if (!this.canLoadMore()) {
      return this.createEmptyObservable();
    }

    const nextPage = this.currentPage() + 1;
    return this.getAllProducts(nextPage, limit, true);
  }

  // Configuration methods

  setCacheExpiry(duration: number): void {
    this.cacheExpiry.set(duration);
  }

  setDefaultLimit(limit: number): void {
    this.defaultLimit.set(limit);
  }

  // State management

  setSelectedProduct(product: GetSpecificProductResponse | null): void {
    this.updateState({ selectedProduct: product });
  }

  clearSelectedProduct(): void {
    this.updateState({ selectedProduct: null });
  }

  refreshAll(): void {
    this.updateState({
      products: null,
      selectedProduct: null,
      featuredProducts: [],
      lastUpdated: null,
    });
  }

  clearProductsCache(): void {
    this.updateState({
      products: null,
      lastUpdated: this.state().lastUpdated,
    });
  }

  clearFeaturedProductsCache(): void {
    this.updateState({ featuredProducts: [] });
  }

  updateProducts(
    updater: (current: GetProductsResponse | null) => GetProductsResponse | null,
  ): void {
    const updated = updater(this.state().products);
    this.updateState({
      products: updated,
      lastUpdated: Date.now(),
    });
  }

  reset(): void {
    this.state.set({
      products: null,
      selectedProduct: null,
      featuredProducts: [],
      loading: false,
      lastUpdated: null,
    });
  }

  // Private methods

  private shouldUseCache(page: number, forceRefresh: boolean): boolean {
    return (
      !forceRefresh && this.isCacheValid() && this.state().products?.metadata.currentPage === page
    );
  }

  private isCacheValid(): boolean {
    const lastUpdated = this.state().lastUpdated;
    return !!lastUpdated && Date.now() - lastUpdated < this.cacheExpiry();
  }

  private createCachedProductsObservable(): Observable<GetProductsResponse> {
    return new Observable<GetProductsResponse>((subscriber) => {
      subscriber.next(this.state().products!);
      subscriber.complete();
    });
  }

  private createCachedProductObservable(
    product: GetSpecificProductResponse,
  ): Observable<GetSpecificProductResponse> {
    return new Observable<GetSpecificProductResponse>((subscriber) => {
      subscriber.next(product);
      subscriber.complete();
    });
  }

  private createEmptyObservable<T>(): Observable<T> {
    return new Observable<T>((subscriber) => subscriber.complete());
  }

  private buildProductsParams(page: number, limit: number): HttpParams {
    return new HttpParams()
      .set('limit', limit.toString())
      .set('page', page.toString())
      .set('sort', '-createdAt');
  }

  private buildProductUrl(id: string): string {
    return `${this.apiUrl}/${id}`;
  }

  private handleProductsResponse(response: GetProductsResponse): void {
    this.updateState({
      products: response,
      loading: false,
      lastUpdated: Date.now(),
    });
  }

  private handleProductResponse(response: GetSpecificProductResponse): void {
    this.updateState({
      selectedProduct: response,
      lastUpdated: Date.now(),
    });
  }

  private cacheFeaturedProducts(products: Product[]): void {
    this.updateState({
      featuredProducts: products,
      lastUpdated: Date.now(),
    });
  }

  private findProductInState(id: string): GetSpecificProductResponse | null {
    const product = this.state().products?.data?.find((p) => p._id === id);
    return product ? { data: product } : null;
  }

  private setLoading(loading: boolean): void {
    this.updateState({ loading });
  }

  private updateState(partialState: Partial<ProductsState>): void {
    this.state.update((current) => ({ ...current, ...partialState }));
  }
}
