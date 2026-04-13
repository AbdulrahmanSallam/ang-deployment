import { Injectable, inject, signal, computed, DestroyRef } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { shareReplay } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { environment } from '../../../../environments/environment';
import { GetBrandsResponse } from '../../interfaces/get-brands-response/get-brands-response';
import { GetSpecificBrandResponse } from '../../interfaces/get-specific-brand-response/get-specific-brand-response';

// Constants
const DEFAULT_CACHE_DURATION = 10 * 60 * 1000; // 10 minutes
const DEFAULT_PAGE_LIMIT = 20;

interface BrandsState {
  brands: GetBrandsResponse | null;
  selectedBrand: GetSpecificBrandResponse | null;
  loading: boolean;
  lastUpdated: number | null;
}

@Injectable({
  providedIn: 'root',
})
export class BrandsService {
  // Dependencies
  private readonly httpClient = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);

  // Configuration
  private readonly apiUrl = `${environment.apiBaseUrl}/api/v1/brands`;

  // State management
  private readonly state = signal<BrandsState>({
    brands: null,
    selectedBrand: null,
    loading: false,
    lastUpdated: null,
  });

  private readonly cacheExpiry = signal(DEFAULT_CACHE_DURATION);
  private readonly defaultLimit = signal(DEFAULT_PAGE_LIMIT);

  // Public computed signals
  public readonly brands = computed(() => this.state().brands);
  public readonly selectedBrand = computed(() => this.state().selectedBrand);
  public readonly loading = computed(() => this.state().loading);
  public readonly lastUpdated = computed(() => this.state().lastUpdated);

  // Derived state
  public readonly hasBrands = computed(() => !!this.state().brands?.data?.length);

  public readonly brandsCount = computed(() => this.state().brands?.data?.length ?? 0);

  public readonly totalBrands = computed(() => this.state().brands?.results ?? 0);

  public readonly currentPage = computed(() => this.state().brands?.metadata.currentPage ?? 1);

  public readonly totalPages = computed(() => this.state().brands?.metadata.numberOfPages ?? 0);

  public readonly canLoadMore = computed(() => this.currentPage() < this.totalPages());

  // Public API

  /**
   * Get brands with pagination and caching
   */
  getBrands(
    page = 1,
    limit: number = this.defaultLimit(),
    forceRefresh = false
  ): Observable<GetBrandsResponse> {
    if (this.shouldUseCache(page, forceRefresh)) {
      return this.createCachedBrandsObservable();
    }

    this.setLoading(true);

    return this.httpClient
      .get<GetBrandsResponse>(this.apiUrl, {
        params: this.buildBrandsParams(page, limit),
      })
      .pipe(
        tap((response) => this.handleBrandsResponse(response)),
        shareReplay({ bufferSize: 1, refCount: true }),
        takeUntilDestroyed(this.destroyRef)
      );
  }

  /**
   * Get specific brand by ID
   */
  getSpecificBrand(
    id: string,
    forceRefresh = false
  ): Observable<GetSpecificBrandResponse> {
    // Check if brand exists in current brands data
    const existingBrand = this.findBrandInState(id);
    if (existingBrand && !forceRefresh) {
      this.setSelectedBrand(existingBrand);
      return this.createCachedBrandObservable(existingBrand);
    }

    return this.httpClient.get<GetSpecificBrandResponse>(this.buildBrandUrl(id)).pipe(
      tap((response) => this.handleBrandResponse(response)),
      shareReplay({ bufferSize: 1, refCount: true }),
      takeUntilDestroyed(this.destroyRef)
    );
  }

  /**
   * Load more brands (pagination)
   */
  loadMoreBrands(limit: number = this.defaultLimit()): Observable<GetBrandsResponse> {
    if (!this.canLoadMore()) {
      return this.createEmptyObservable();
    }

    const nextPage = this.currentPage() + 1;
    return this.getBrands(nextPage, limit, true);
  }

  // Configuration methods

  setCacheExpiry(duration: number): void {
    this.cacheExpiry.set(duration);
  }

  setDefaultLimit(limit: number): void {
    this.defaultLimit.set(limit);
  }

  // State management

  setSelectedBrand(brand: GetSpecificBrandResponse | null): void {
    this.updateState({ selectedBrand: brand });
  }

  clearSelectedBrand(): void {
    this.updateState({ selectedBrand: null });
  }

  refreshAll(): void {
    this.updateState({
      brands: null,
      selectedBrand: null,
      lastUpdated: null,
    });
  }

  clearBrandsCache(): void {
    this.updateState({
      brands: null,
      lastUpdated: this.state().lastUpdated,
    });
  }

  updateBrands(updater: (current: GetBrandsResponse | null) => GetBrandsResponse | null): void {
    const updated = updater(this.state().brands);
    this.updateState({
      brands: updated,
      lastUpdated: Date.now(),
    });
  }

  reset(): void {
    this.state.set({
      brands: null,
      selectedBrand: null,
      loading: false,
      lastUpdated: null,
    });
  }

  // Utility methods

  getBrandOptions(): { value: string; label: string }[] {
    return (
      this.state().brands?.data?.map((brand) => ({
        value: brand._id,
        label: brand.name,
      })) ?? []
    );
  }

  findBrandByName(name: string): GetSpecificBrandResponse | null {
    const brand = this.state().brands?.data?.find(
      (b) => b.name.toLowerCase() === name.toLowerCase()
    );
    return brand ? { data: brand } : null;
  }

  // Private methods

  private shouldUseCache(page: number, forceRefresh: boolean): boolean {
    return (
      !forceRefresh && this.isCacheValid() && this.state().brands?.metadata.currentPage === page
    );
  }

  private isCacheValid(): boolean {
    const lastUpdated = this.state().lastUpdated;
    return !!lastUpdated && Date.now() - lastUpdated < this.cacheExpiry();
  }

  private createCachedBrandsObservable(): Observable<GetBrandsResponse> {
    return new Observable<GetBrandsResponse>((subscriber) => {
      subscriber.next(this.state().brands!);
      subscriber.complete();
    });
  }

  private createCachedBrandObservable(
    brand: GetSpecificBrandResponse
  ): Observable<GetSpecificBrandResponse> {
    return new Observable<GetSpecificBrandResponse>((subscriber) => {
      subscriber.next(brand);
      subscriber.complete();
    });
  }

  private createEmptyObservable<T>(): Observable<T> {
    return new Observable<T>((subscriber) => subscriber.complete());
  }

  private buildBrandsParams(page: number, limit: number): HttpParams {
    return new HttpParams().set('limit', limit.toString()).set('page', page.toString());
  }

  private buildBrandUrl(id: string): string {
    return `${this.apiUrl}/${id}`;
  }

  private handleBrandsResponse(response: GetBrandsResponse): void {
    this.updateState({
      brands: response,
      loading: false,
      lastUpdated: Date.now(),
    });
  }

  private handleBrandResponse(response: GetSpecificBrandResponse): void {
    this.updateState({
      selectedBrand: response,
      lastUpdated: Date.now(),
    });
  }

  private findBrandInState(id: string): GetSpecificBrandResponse | null {
    const brand = this.state().brands?.data?.find((b) => b._id === id);
    return brand ? { data: brand } : null;
  }

  private setLoading(loading: boolean): void {
    this.updateState({ loading });
  }

  private updateState(partialState: Partial<BrandsState>): void {
    this.state.update((current) => ({ ...current, ...partialState }));
  }
}
