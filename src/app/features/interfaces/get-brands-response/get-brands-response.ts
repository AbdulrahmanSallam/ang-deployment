import { Brand } from '../brand/brand';
import { Metadata } from '../meta-data/meta-data';

export interface GetBrandsResponse {
  results: number;
  metadata: Metadata;
  data: Brand[];
}
