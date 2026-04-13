import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { WishlistService } from '../../services/wishlist/wishlist.service';
import { ProductListComponent } from '../../components/product-list/product-list.component';

@Component({
  selector: 'app-wishlist',
  imports: [ProductListComponent],
  templateUrl: './wishlist.component.html',
  styleUrl: './wishlist.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WishlistComponent {
  private readonly _wishlistService: WishlistService = inject(WishlistService);

  wishlistProducts = this._wishlistService.wishlistItems;

  constructor() {}
}
