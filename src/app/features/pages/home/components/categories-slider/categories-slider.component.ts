import {
  Component,
  inject,
  signal,
  DestroyRef,
  OnInit,
  ChangeDetectionStrategy,
  OnDestroy,
  PLATFORM_ID,
  afterNextRender,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CategoriesService } from '../../../../services/categories/categories.service';
import { Category } from '../../../../interfaces/category/category';
import { GetCategoriesResponse } from '../../../../interfaces/get-categories-response/get-categories-response';
import Swiper from 'swiper';
import { isPlatformBrowser } from '@angular/common';
import { Autoplay } from 'swiper/modules';

@Component({
  selector: 'app-categories-slider',
  imports: [],
  templateUrl: './categories-slider.component.html',
  styleUrl: './categories-slider.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoriesSliderComponent implements OnInit, OnDestroy {
  private readonly _categoriesService = inject(CategoriesService);
  private readonly _destroyRef = inject(DestroyRef);
  private readonly _platformId = inject(PLATFORM_ID);

  categories = signal<Category[]>([]);
  swiper = signal<Swiper | null>(null);

  constructor() {
    // Use afterNextRender for Swiper initialization to ensure DOM is ready
    if (isPlatformBrowser(this._platformId)) {
      afterNextRender(() => {
        this.initSwiper();
      });
    }
  }

  ngOnInit(): void {
    this.getCategories();
  }

  private getCategories(): void {
    this._categoriesService
      .getCategories(1)
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe((response: GetCategoriesResponse) => {
        this.categories.set(response.data);

        // Reinitialize Swiper after categories load
        if (isPlatformBrowser(this._platformId)) {
          setTimeout(() => this.initSwiper(), 0);
        }
      });
  }

  private initSwiper(): void {
    if (!isPlatformBrowser(this._platformId)) return;

    const categories = this.categories();
    if (categories.length === 0) return;

    // Destroy existing Swiper instance
    if (this.swiper()) {
      this.swiper()?.destroy(true, true);
    }

    // Get current slidesPerView based on screen size
    const currentSlidesPerView = this.getCurrentSlidesPerView();

    // Enable loop if we have MORE slides than slidesPerView
    const shouldEnableLoop = categories.length > currentSlidesPerView;

    const swiperConfig: any = {
      modules: [Autoplay],
      slidesPerView: currentSlidesPerView,
      speed: 1000,
      autoplay: {
        delay: 2500,
        disableOnInteraction: false,
      },
      // Enable loop only if we have more slides than visible at once
      loop: shouldEnableLoop,
      // Better loop performance
      loopAdditionalSlides: shouldEnableLoop ? 2 : 0,
      // Smooth transitions
      effect: 'slide',
      // Allow slide to next/prev even when at boundaries (for non-loop mode)
      resistanceRatio: 0,
      watchOverflow: true,
      breakpoints: {
        // Enable loop at each breakpoint only if categories > slidesPerView
        320: {
          slidesPerView: 2,
          loop: categories.length > 2,
        },
        480: {
          slidesPerView: 3,
          loop: categories.length > 3,
        },
        640: {
          slidesPerView: 3,
          loop: categories.length > 3,
        },
        768: {
          slidesPerView: 4,
          loop: categories.length > 4,
        },
        1024: {
          slidesPerView: 5,
          loop: categories.length > 5,
        },
        1280: {
          slidesPerView: 6,
          loop: categories.length > 6,
        },
      },
      pagination: {
        el: '.swiper-pagination',
        clickable: true,
        dynamicBullets: categories.length > 10, // Only show dynamic bullets for many slides
      },
    };

    this.swiper.set(new Swiper('.categoriesSwiper', swiperConfig));
  }

  getCurrentSlidesPerView(): number {
    if (typeof window === 'undefined') return 2;

    const width = window.innerWidth;

    if (width >= 1280) return 6;
    if (width >= 1024) return 5;
    if (width >= 768) return 4;
    if (width >= 640) return 3;
    if (width >= 480) return 3;
    return 2;
  }

  // Reinitialize Swiper when window resizes
  onResize(): void {
    if (isPlatformBrowser(this._platformId)) {
      setTimeout(() => this.initSwiper(), 100);
    }
  }

  ngOnDestroy(): void {
    if (this.swiper()) {
      this.swiper()?.destroy(true, true);
    }
  }
}
