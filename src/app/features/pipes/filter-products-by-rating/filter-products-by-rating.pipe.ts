import { Pipe, PipeTransform } from '@angular/core';
import { Product } from '../../interfaces/product/product';

@Pipe({
  name: 'filterProductsByRating',
})
export class FilterProductsByRatingPipe implements PipeTransform {
  transform(products: Product[], minRating: number): Product[] {
    return products.filter((product) => product.ratingsAverage >= minRating);
  }
}
