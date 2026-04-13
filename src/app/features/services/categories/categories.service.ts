import {
  Injectable,
  inject,
  signal,
  computed,
  DestroyRef,
} from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { shareReplay } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { environment } from '../../../../environments/environment';
import { GetCategoriesResponse } from '../../interfaces/get-categories-response/get-categories-response';
import { GetSubcategoryResponse } from '../../interfaces/get-subcategory-response/get-subcategory-response';

// Constants
const DEFAULT_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const DEFAULT_PAGE_LIMIT = 20;

interface CategoriesState {
  categories: GetCategoriesResponse | null;
  subcategories: Map<string, GetSubcategoryResponse>;
  loading: boolean;
  lastUpdated: number | null;
}

@Injectable({
  providedIn: 'root',
})
export class CategoriesService {
  // Dependencies
  private readonly httpClient = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);

  // Configuration
  private readonly apiUrl = `${environment.apiBaseUrl}/api/v1/categories`;

  // State management
  private readonly state = signal<CategoriesState>({
    categories: null,
    subcategories: new Map(),
    loading: false,
    lastUpdated: null,
  });

  private readonly cacheExpiry = signal(DEFAULT_CACHE_DURATION);
  private readonly defaultLimit = signal(DEFAULT_PAGE_LIMIT);

  // Public computed signals
  public readonly categories = computed(() => this.state().categories);
  public readonly loading = computed(() => this.state().loading);
  public readonly lastUpdated = computed(() => this.state().lastUpdated);

  // Derived state
  public readonly hasCategories = computed(
    () => !!this.state().categories?.data?.length
  );

  public readonly categoriesCount = computed(
    () => this.state().categories?.data?.length ?? 0
  );

  public readonly totalCategories = computed(
    () => this.state().categories?.results ?? 0
  );

  public readonly currentPage = computed(
    () => this.state().categories?.metadata.currentPage ?? 1
  );

  public readonly totalPages = computed(
    () => this.state().categories?.metadata.numberOfPages ?? 0
  );

  public readonly canLoadMore = computed(
    () => this.currentPage() < this.totalPages()
  );

  // Public API

  /**
   * Get categories with pagination and caching
   */
  getCategories(
    page = 1,
    limit: number = this.defaultLimit(),
    forceRefresh = false
  ): Observable<GetCategoriesResponse> {
    if (this.shouldUseCache(page, forceRefresh)) {
      return this.createCachedCategoriesObservable();
    }

    this.setLoading(true);

    return this.httpClient
      .get<GetCategoriesResponse>(this.apiUrl, {
        params: this.buildCategoriesParams(page, limit),
      })
      .pipe(
        tap((response) => this.handleCategoriesResponse(response)),
        shareReplay({ bufferSize: 1, refCount: true }),
        takeUntilDestroyed(this.destroyRef)
      );
  }

  /**
   * Get subcategories for a specific category
   */
  getSubCategories(
    categoryId: string,
    forceRefresh = false
  ): Observable<GetSubcategoryResponse> {
    const cachedResponse = this.getCachedSubCategories(
      categoryId,
      forceRefresh
    );
    if (cachedResponse) {
      return cachedResponse;
    }

    return this.httpClient
      .get<GetSubcategoryResponse>(this.buildSubCategoriesUrl(categoryId))
      .pipe(
        tap((response) => this.cacheSubCategories(categoryId, response)),
        shareReplay({ bufferSize: 1, refCount: true }),
        takeUntilDestroyed(this.destroyRef)
      );
  }

  /**
   * Get subcategories from cache (synchronous)
   */
  getSubCategoriesFromCache(categoryId: string): GetSubcategoryResponse | null {
    return this.state().subcategories.get(categoryId) || null;
  }

  /**
   * Load more categories (pagination)
   */
  loadMoreCategories(
    limit: number = this.defaultLimit()
  ): Observable<GetCategoriesResponse> {
    if (!this.canLoadMore()) {
      return this.createEmptyObservable();
    }

    const nextPage = this.currentPage() + 1;
    return this.getCategories(nextPage, limit, true);
  }

  // Configuration methods

  setCacheExpiry(duration: number): void {
    this.cacheExpiry.set(duration);
  }

  setDefaultLimit(limit: number): void {
    this.defaultLimit.set(limit);
  }

  // Cache management

  refreshAll(): void {
    this.updateState({
      categories: null,
      subcategories: new Map(),
      lastUpdated: null,
    });
  }

  clearCategoriesCache(): void {
    this.updateState({
      categories: null,
      lastUpdated: this.state().lastUpdated,
    });
  }

  clearSubCategoriesCache(categoryId?: string): void {
    if (categoryId) {
      this.removeSubCategoryFromCache(categoryId);
    } else {
      this.clearAllSubCategories();
    }
  }

  // State management

  updateCategories(
    updater: (
      current: GetCategoriesResponse | null
    ) => GetCategoriesResponse | null
  ): void {
    const updated = updater(this.state().categories);
    this.updateState({
      categories: updated,
      lastUpdated: Date.now(),
    });
  }

  reset(): void {
    this.state.set({
      categories: null,
      subcategories: new Map(),
      loading: false,
      lastUpdated: null,
    });
  }

  // Private methods

  private shouldUseCache(page: number, forceRefresh: boolean): boolean {
    return (
      !forceRefresh &&
      this.isCacheValid() &&
      this.state().categories?.metadata.currentPage === page
    );
  }

  private isCacheValid(): boolean {
    const lastUpdated = this.state().lastUpdated;
    return !!lastUpdated && Date.now() - lastUpdated < this.cacheExpiry();
  }

  private createCachedCategoriesObservable(): Observable<GetCategoriesResponse> {
    return new Observable<GetCategoriesResponse>((subscriber) => {
      subscriber.next(this.state().categories!);
      subscriber.complete();
    });
  }

  private createEmptyObservable<T>(): Observable<T> {
    return new Observable<T>((subscriber) => subscriber.complete());
  }

  private buildCategoriesParams(page: number, limit: number): HttpParams {
    return new HttpParams()
      .set('limit', limit.toString())
      .set('page', page.toString());
  }

  private buildSubCategoriesUrl(categoryId: string): string {
    return `${this.apiUrl}/${categoryId}/subcategories`;
  }

  private handleCategoriesResponse(response: GetCategoriesResponse): void {
    this.updateState({
      categories: response,
      loading: false,
      lastUpdated: Date.now(),
    });
  }

  private getCachedSubCategories(
    categoryId: string,
    forceRefresh: boolean
  ): Observable<GetSubcategoryResponse> | null {
    if (!forceRefresh && this.state().subcategories.has(categoryId)) {
      const cached = this.state().subcategories.get(categoryId)!;
      return new Observable<GetSubcategoryResponse>((subscriber) => {
        subscriber.next(cached);
        subscriber.complete();
      });
    }
    return null;
  }

  private cacheSubCategories(
    categoryId: string,
    response: GetSubcategoryResponse
  ): void {
    const newSubcategories = new Map(this.state().subcategories);
    newSubcategories.set(categoryId, response);

    this.updateState({
      subcategories: newSubcategories,
      lastUpdated: Date.now(),
    });
  }

  private removeSubCategoryFromCache(categoryId: string): void {
    const newSubcategories = new Map(this.state().subcategories);
    newSubcategories.delete(categoryId);
    this.updateState({ subcategories: newSubcategories });
  }

  private clearAllSubCategories(): void {
    this.updateState({ subcategories: new Map() });
  }

  private setLoading(loading: boolean): void {
    this.updateState({ loading });
  }

  private updateState(partialState: Partial<CategoriesState>): void {
    this.state.update((current) => ({ ...current, ...partialState }));
  }
}
