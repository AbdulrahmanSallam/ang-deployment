import { Product } from "../product/product"

export interface CartProduct {
    count: number
    _id: string
    price: number
    product:Product
}
