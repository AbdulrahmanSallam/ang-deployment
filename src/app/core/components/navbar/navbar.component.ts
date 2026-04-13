import {
  Component,
  computed,
  inject,
  signal,
  DestroyRef,
  PLATFORM_ID,
  ChangeDetectionStrategy,
  OnInit,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, NavigationEnd } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth/auth.service';
import { WishlistService } from '../../../features/services/wishlist/wishlist.service';
import { CartService } from '../../../features/services/cart/cart.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, MatIconModule],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavbarComponent implements OnInit {
  // Dependency injections
  private readonly _router = inject(Router);
  private readonly _authService = inject(AuthService);
  private readonly _wishlistService = inject(WishlistService);
  private readonly _cartService = inject(CartService);
  private readonly _destroyRef = inject(DestroyRef);
  private readonly _platformId = inject(PLATFORM_ID);

  // Signals refrences
  readonly userData = this._authService.userData;
  readonly isLoggedIn = this._authService.isLoggedIn;
  readonly wishlistCount = this._wishlistService.wishlistCount;
  readonly cartCount = this._cartService.count;

  // signal
  readonly profileMenuOpen = signal(false);
  readonly mobileMenuOpen = signal(false);
  readonly currentRoute = signal('');

  private readonly _isBrowser: boolean;

  constructor() {
    this._isBrowser = isPlatformBrowser(this._platformId);
  }

  ngOnInit(): void {
    this._setupRouteTracking();
    if (this._isBrowser) {
      this._setupClickOutsideListener();
    }
  }

  /**
   * Set up route tracking to close menus on navigation
   */
  private _setupRouteTracking(): void {
    this._router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(this._destroyRef),
      )
      .subscribe((event) => {
        const navigationEvent = event as NavigationEnd;
        this.currentRoute.set(navigationEvent.urlAfterRedirects);
        this._closeAllMenus();
      });
  }

  /**
   * Set up click outside listener for dropdowns
   */
  private _setupClickOutsideListener(): void {
    if (!this._isBrowser) return;

    document.addEventListener('click', (event: MouseEvent) => {
      this._handleClickOutside(event);
    });
  }

  /**
   * Handle clicks outside dropdown menus
   */
  private _handleClickOutside(event: MouseEvent): void {
    if (this.profileMenuOpen() && !this._isClickInsideProfileDropdown(event)) {
      this.profileMenuOpen.set(false);
    }

    if (this.mobileMenuOpen() && !this._isClickInsideMobileMenu(event)) {
      this.mobileMenuOpen.set(false);
    }
  }

  /**
   * Check if click is inside profile dropdown
   */
  private _isClickInsideProfileDropdown(event: MouseEvent): boolean {
    const profileDropdown = document.getElementById('user-menu-dropdown');
    const profileButton = document.querySelector('[aria-label="User account menu"]');

    const isInDropdown = profileDropdown?.contains(event.target as Node) ?? false;
    const isInButton = profileButton?.contains(event.target as Node) ?? false;

    return isInDropdown || isInButton;
  }

  /**
   * Check if click is inside mobile menu
   */
  private _isClickInsideMobileMenu(event: MouseEvent): boolean {
    const mobileMenu = document.getElementById('navbar-menu');
    const mobileMenuButton = document.querySelector('[aria-label*="main menu"]');

    const isInMenu = mobileMenu?.contains(event.target as Node) ?? false;
    const isInButton = mobileMenuButton?.contains(event.target as Node) ?? false;

    return isInMenu || isInButton;
  }

  // ========== Public Methods ========== //

  /**
   * Toggle profile menu
   */
  toggleProfileMenu(): void {
    if (!this.isLoggedIn()) return;

    this.profileMenuOpen.update((prev) => {
      const newState = !prev;
      if (newState) {
        this.mobileMenuOpen.set(false);
      }
      return newState;
    });
  }

  /**
   * Toggle mobile menu
   */
  toggleMobileMenu(): void {
    this.mobileMenuOpen.update((prev) => {
      const newState = !prev;
      if (newState) {
        this.profileMenuOpen.set(false);
      }
      return newState;
    });
  }

  /**
   * Close all menus
   */
  private _closeAllMenus(): void {
    this.profileMenuOpen.set(false);
    this.mobileMenuOpen.set(false);
  }

  /**
   * Check if route is active
   */
  isRouteActive(route: string): boolean {
    return (
      this.currentRoute() === route ||
      this._router.isActive(route, {
        paths: 'exact',
        queryParams: 'ignored',
        fragment: 'ignored',
        matrixParams: 'ignored',
      })
    );
  }

  /**
   * Sign out user
   */
  signOut(): void {
    this._closeAllMenus();
    this._authService.signOut(false);
  }
}
