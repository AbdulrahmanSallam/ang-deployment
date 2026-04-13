import {
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  signal,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
} from '@angular/core';
import { WishlistService } from '../../services/wishlist/wishlist.service';
import { Product } from '../../interfaces/product/product';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-add-to-wishlist',
  standalone: true,
  imports: [],
  templateUrl: './add-to-wishlist.component.html',
  styleUrl: './add-to-wishlist.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddToWishlistComponent implements OnInit {
  // Services
  private readonly _wishlistService = inject(WishlistService);
  private readonly _destroyRef = inject(DestroyRef);

  // Input
  product = input.required<Product>();

  // State
  isProcessing = signal(false);
  isInWishlist = computed(() => this._wishlistService.isInWishlist(this.product()._id));

  ngOnInit(): void {
    // Ensure wishlist is initialized when component loads
    if (!this._wishlistService.initialized()) {
      this._wishlistService.initializeWishlist();
    }
  }

  /**
   * Toggles the wishlist status for the current product
   */
  toggleWishlist(): void {
    if (this.isProcessing()) return;

    const productId = this.product()._id;
    const currentlyInWishlist = this.isInWishlist();

    this.isProcessing.set(true);

    const operation$ = currentlyInWishlist
      ? this._wishlistService.removeProductFromLoggedUserWishlist(productId)
      : this._wishlistService.addProductToLoggedUserWishlist(productId);

    operation$
      .pipe(
        takeUntilDestroyed(this._destroyRef),
        finalize(() => this.isProcessing.set(false))
      )
      .subscribe({
        next: (response) => {
          if (response.status === 'success') {
            // Update local state immediately for better UX
            if (currentlyInWishlist) {
              this._wishlistService.removeFromWishlistItems(productId);
            } else {
              this._wishlistService.addToWishlistItems(this.product());
            }

            // Refresh from server to ensure consistency
            this._wishlistService.refreshWishlist();
          }
        },
        error: (error) => {
          console.error('Error toggling wishlist:', error);
          // Revert local state on error
          if (currentlyInWishlist) {
            this._wishlistService.addToWishlistItems(this.product());
          } else {
            this._wishlistService.removeFromWishlistItems(productId);
          }
        },
      });
  }

  /**
   * Get ARIA label for accessibility
   */
  getAriaLabel(): string {
    return this.isInWishlist() ? 'Remove from wishlist' : 'Add to wishlist';
  }

  /**
   * Get tooltip text
   */
  getTooltipText(): string {
    return this.isInWishlist() ? 'Remove from wishlist' : 'Add to wishlist';
  }
}
