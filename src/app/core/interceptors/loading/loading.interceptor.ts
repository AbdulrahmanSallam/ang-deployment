// loading.interceptor.ts
import { HttpContextToken, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs/operators';
import { LoadingService } from '../../services/loading/loading.service';

export const SKIP_LOADING = new HttpContextToken<boolean>(() => false);

export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  const _loadingService = inject(LoadingService);

  // Skip loading for requests with the SKIP_LOADING context
  if (req.context.get(SKIP_LOADING)) {
    return next(req);
  }

  _loadingService.show();

  return next(req).pipe(
    finalize(() => {
      _loadingService.hide();
    })
  );
};
