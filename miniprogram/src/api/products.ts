import { get } from './request'

export interface Product {
  id: string
  name: string
  nameEn?: string
  description?: string
  coverImage?: string
  price: string
  stock: number
  salesCount: number
  isCustomizable: boolean
  status: string
  categoryId?: string
  skus: ProductSku[]
  images?: ProductImage[]
}

export interface ProductSku {
  id: string
  skuCode: string
  price: string
  stock: number
  specValues?: Record<string, string>
  imageUrl?: string
}

export interface ProductCategory {
  id: string
  name: string
  iconUrl?: string
  children?: ProductCategory[]
}

export interface ProductImage {
  id: string
  imageUrl: string
  sortOrder: number
}

export interface ProductListResult {
  list: Product[]
  total: number
  page: number
  pageSize: number
}

// 获取商品分类（REQ-016）
export const getCategories = () => get<ProductCategory[]>('/products/categories', null, false)

// 获取商品列表（REQ-017）
export const getProducts = (params: {
  page?: number
  pageSize?: number
  categoryId?: number
  keyword?: string
}) => get<ProductListResult>('/products', params, false)

// 获取商品详情（REQ-019）
export const getProduct = (id: string) => get<Product>(`/products/${id}`, null, false)
