import { Metadata } from '../meta-data/meta-data';
import { Subcategory } from '../subcategory/subcategory';

export interface GetSubcategoryResponse {
  results: number;
  metadata: Metadata;
  data: Subcategory[];
}
