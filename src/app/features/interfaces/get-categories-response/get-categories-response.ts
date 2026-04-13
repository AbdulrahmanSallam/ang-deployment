import { Category } from "../category/category";
import { Metadata } from "../meta-data/meta-data";

export interface GetCategoriesResponse {
    results: number;
    metadata: Metadata;
    data: Category[];
  }
  