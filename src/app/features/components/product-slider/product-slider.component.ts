import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  InputSignal,
  PLATFORM_ID,
  signal, AfterViewInit, OnDestroy,
} from '@angular/core';
import { Product } from '../../interfaces/product/product';
import { isPlatformBrowser } from '@angular/common';
import Swiper from 'swiper';
import { Autoplay, EffectCube } from 'swiper/modules';

@Component({
  selector: 'app-product-slider',
  standalone: true,
  imports: [],
  templateUrl: './product-slider.component.html',
  styleUrl: './product-slider.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductSliderComponent implements AfterViewInit, OnDestroy {
  productInfo: InputSignal<Product> = input({} as Product);

  private readonly _platformId = inject(PLATFORM_ID);
  swiper = signal<Swiper | null>(null);

  ngAfterViewInit() {
    this.initSwiper();
  }

  private initSwiper() {
    if (isPlatformBrowser(this._platformId)) {
      this.swiper.set(
        new Swiper('.productSwiper', {
          modules: [Autoplay, EffectCube],
          autoplay: {
            delay: 2500,
            disableOnInteraction: false,
          },
          effect: 'cube',

          grabCursor: true,
          cubeEffect: {
            shadow: true,
            slideShadows: true,
            shadowOffset: 20,
            shadowScale: 0.94,
          },
          pagination: {
            el: '.swiper-pagination',
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
