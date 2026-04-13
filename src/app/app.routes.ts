import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  {
    path: 'home',
    loadComponent: () =>
      import('./features/pages/home/home.component').then((c) => c.HomeComponent),
  },
  {
    path: 'products',
    loadComponent: () =>
      import('./features/pages/products/products.component').then((c) => c.ProductsComponent),
  },
  {
    path: 'product-details/:id',
    loadComponent: () =>
      import('./features/pages/product-details/product-details.component').then(
        (c) => c.ProductDetailsComponent
      ),
  },
  {
    path: 'categories',
    loadComponent: () =>
      import('./features/pages/categories/categories.component').then((c) => c.CategoriesComponent),
  },
  {
    path: 'brands',
    loadComponent: () =>
      import('./features/pages/brands/brands.component').then((c) => c.BrandsComponent),
  },
  {
    path: 'cart',
    loadComponent: () =>
      import('./features/pages/cart/cart.component').then((c) => c.CartComponent),
    canActivate: [authGuard],
  },
  {
    path: 'checkout/:id',
    loadComponent: () =>
      import('./features/pages/checkout/checkout.component').then((c) => c.CheckoutComponent),
    canActivate: [authGuard],
  },
  {
    path: 'wishlist',
    loadComponent: () =>
      import('./features/pages/wishlist/wishlist.component').then((c) => c.WishlistComponent),
    canActivate: [authGuard],
  },
  {
    path: 'setting',
    loadComponent: () =>
      import('./features/pages/setting/setting.component').then((c) => c.SettingComponent),
    canActivate: [authGuard],
  },
  {
    path: 'allorders',
    loadComponent: () =>
      import('./features/pages/all-orders/all-orders.component').then((c) => c.AllOrdersComponent),
    canActivate: [authGuard],
  },
  {
    path: 'auth',
    children: [
      { path: '', redirectTo: 'login', pathMatch: 'full' },
      {
        path: 'login',
        loadComponent: () =>
          import('./core/pages/login/login.component').then((c) => c.LoginComponent),
      },
      {
        path: 'register',
        loadComponent: () =>
          import('./core/pages/register/register.component').then((c) => c.RegisterComponent),
      },
      {
        path: 'forget-password',
        loadComponent: () =>
          import('./core/pages/forgot-password/forget-password.component').then(
            (c) => c.ForgetPasswordComponent
          ),
      },
    ],
  },
  {
    path: '**',
    loadComponent: () =>
      import('./core/pages/page-not-found/page-not-found.component').then(
        (c) => c.PageNotFoundComponent
      ),
  },
];
