import { isPlatformBrowser } from '@angular/common';
import { Component, inject, PLATFORM_ID, signal, effect, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './core/services/auth/auth.service';
import { WishlistService } from './features/services/wishlist/wishlist.service';
import { CartService } from './features/services/cart/cart.service';
import { FooterComponent } from './core/components/footer/footer.component';
import { NavbarComponent } from './core/components/navbar/navbar.component';
import { LoadingComponent } from './core/components/loading/loading.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NavbarComponent, FooterComponent, LoadingComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  protected readonly title = signal('FreshCart');

  private readonly _authService = inject(AuthService);
  private readonly _wishlistService = inject(WishlistService);
  private readonly _cartService = inject(CartService);
  private readonly _platformId = inject(PLATFORM_ID);

  private readonly _isBrowser: boolean;

  constructor() {
    this._isBrowser = isPlatformBrowser(this._platformId);

    // Setup auto-initialization without circular dependency
    this.setupAutoServiceInitialization();
  }

  ngOnInit(): void {
    if (this._isBrowser) {
      this._initializeApp();
    }
  }

  private setupAutoServiceInitialization(): void {
    // Listen to auth state changes and initialize services accordingly
    effect(() => {
      const isLoggedIn = this._authService.isLoggedIn();
      const isInitialized = this._authService.isInitialized();

      if (this._isBrowser && isInitialized && isLoggedIn) {
        console.log('🔄 Auto-initializing cart and wishlist services...');
        this._cartService.initializeCart();
        this._wishlistService.initializeWishlist();
      }

      if (this._isBrowser && isInitialized && !isLoggedIn) {
        console.log('🔄 Clearing cart and wishlist services...');
        this._cartService.clearCart();
        this._wishlistService.clearWishlist();
      }
    });
  }

  private _initializeApp(): void {
    try {
      // Initialize auth only - services will auto-initialize via the effect
      this._authService.initializeAuth();
    } catch (error) {
      console.error('Error during app initialization:', error);
    }
  }
}
