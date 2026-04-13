import { Pipe, PipeTransform } from '@angular/core';
import { Product } from '../../interfaces/product/product';

@Pipe({
  name: 'filterProductsByName'
})
export class FilterProductsByNamePipe implements PipeTransform {

  transform(products:Product[],searchText:string): Product[] {
    return products.filter((product)=> product.title.toLowerCase().includes(searchText.toLowerCase()));
  }

}
