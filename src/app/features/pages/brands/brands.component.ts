import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  computed,
  signal,
  DestroyRef,
} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { NgxPaginationModule } from 'ngx-pagination';
import { BrandsService } from '../../services/brands/brands.service';
import { CustomCardComponent } from '../../components/custom-card/custom-card.component';
import { BrandDialogComponent } from './components/brand-dialog/brand-dialog.component';

@Component({
  selector: 'app-brands',
  imports: [CustomCardComponent, NgxPaginationModule],
  templateUrl: './brands.component.html',
  styleUrl: './brands.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BrandsComponent implements OnInit {
  // Services
  private readonly brandsService = inject(BrandsService);
  private readonly dialog = inject(MatDialog);
  private readonly _destroyRef = inject(DestroyRef);

  // Use computed signals that automatically update when service state changes
  readonly page = computed(() => this.brandsService.currentPage());
  readonly total = computed(() => this.brandsService.totalBrands());
  readonly brands = computed(() => this.brandsService.brands()?.data ?? []);
  readonly pageSize = computed(() => this.brandsService.brands()?.metadata?.limit ?? 20);
  readonly loading = computed(() => this.brandsService.loading());

  // Local page state for pagination control
  readonly currentPageIndex = signal(1);

  // Error state
  readonly error = signal<string | null>(null);

  // Computed properties for template states
  readonly showLoading = computed(() => this.loading());
  readonly showEmpty = computed(
    () => !this.loading() && this.brands().length === 0 && !this.error()
  );
  readonly showError = computed(() => !this.loading() && this.error() !== null);
  readonly showContent = computed(
    () => !this.loading() && this.brands().length > 0 && !this.error()
  );

  ngOnInit(): void {
    this.loadBrands();
  }

  /**
   * Load brands for current page
   */
  loadBrands(): void {
    this.error.set(null);

    this.brandsService.getBrands(this.currentPageIndex()).subscribe({
      error: (error) => {
        console.error('Failed to load brands:', error);
        this.error.set('Failed to load brands. Please try again later.');
      },
    });
  }

  /**
   * Handle page change event
   */
  pageChangeEvent(newPage: number): void {
    this.currentPageIndex.set(newPage);
    this.loadBrands();

    // Optional: Scroll to top when page changes
    this.scrollToTop();
  }

  /**
   * Get specific brand and open dialog
   */
  getSpecificBrand(brandId: string): void {
    this.brandsService.getSpecificBrand(brandId).subscribe({
      next: () => {
        this.openBrandDialog();
      },
      error: (error) => {
        console.error('Failed to load brand details:', error);
        // You could show a toast notification here for brand loading error
      },
    });
  }

  /**
   * Open brand dialog with current selected brand
   */
  openBrandDialog(): void {
    const selectedBrand = this.brandsService.selectedBrand();
    if (!selectedBrand?.data) {
      console.warn('No brand selected');
      return;
    }

    const dialogRef = this.dialog.open(BrandDialogComponent, {
      data: {
        brand: selectedBrand.data,
      },
      width: '500px',
      maxWidth: '90vw',
      panelClass: 'brand-dialog',
    });

    dialogRef.afterClosed().subscribe(() => {
      // Clear selected brand when dialog closes
      this.brandsService.clearSelectedBrand();
    });
  }

  /**
   * Scroll to top of page
   */
  private scrollToTop(): void {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  /**
   * Retry loading brands
   */
  retryLoading(): void {
    this.error.set(null);
    this.loadBrands();
  }
}
