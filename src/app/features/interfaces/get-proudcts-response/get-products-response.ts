import { Brand } from '../brand/brand';
import { Category } from '../category/category';
import { Metadata } from '../meta-data/meta-data';
import { Product } from '../product/product';
import { Subcategory } from '../subcategory/subcategory';

export interface GetProductsResponse {
  results: number;
  metadata: Metadata;
  data: Product[];
}
