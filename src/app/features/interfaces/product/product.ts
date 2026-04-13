import { Brand } from "../brand/brand"
import { Category } from "../category/category"
import { Subcategory } from "../subcategory/subcategory"

export interface Product {
  sold: number
  images: string[]
  subcategory: Subcategory[]
  ratingsQuantity: number
  _id: string
  title: string
  slug: string
  description: string
  quantity: number
  price: number
  imageCover: string
  category: Category
  brand: Brand
  ratingsAverage: number
  createdAt: string
  updatedAt: string
  __v: number
  reviews: any[]
  id: string
}





