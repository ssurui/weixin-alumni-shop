import { get, post } from './request'

// 提交评价（REQ-066）
export const createReview = (data: {
  orderItemId: number
  rating: number
  content?: string
  isAnonymous?: boolean
  images?: string[]
}) => post('/reviews', data)

// 获取商品评价列表（REQ-067）
export const getProductReviews = (productId: string, page = 1, pageSize = 10) =>
  get(`/reviews/products/${productId}?page=${page}&pageSize=${pageSize}`)
