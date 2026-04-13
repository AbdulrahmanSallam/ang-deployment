import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnDestroy,
  PLATFORM_ID,
  AfterViewInit,
  signal,
} from '@angular/core';
import Swiper from 'swiper';

// Import Swiper modules
import { Autoplay, Pagination } from 'swiper/modules';

@Component({
  selector: 'app-main-slider',
  imports: [],
  templateUrl: './main-slider.component.html',
  styleUrl: './main-slider.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainSliderComponent implements AfterViewInit, OnDestroy {
  private readonly _platformId = inject(PLATFORM_ID);
  swiper = signal<Swiper | null>(null);

  ngAfterViewInit() {
    this.initSwiper();
  }

  private initSwiper() {
    if (isPlatformBrowser(this._platformId)) {
      this.swiper.set(
        new Swiper('.mainSwiper', {
          // Register modules in config
          modules: [Autoplay],
          slidesPerView: 1,
          spaceBetween: 15,
          loop: true,
          speed: 1000, // Add transition speed for smoother fade
          autoplay: {
            delay: 2500,
            disableOnInteraction: false,
          },
        })
      );
    }
  }

  ngOnDestroy() {
    if (this.swiper()) {
      this.swiper()?.destroy(true, true);
    }
  }
}
