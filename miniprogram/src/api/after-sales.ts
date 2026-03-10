import { get, post } from './request'

export interface AfterSale {
  id: string
  afterSaleNo: string
  orderId: string
  type: 'refund' | 'return' | 'exchange'
  reason: string
  status: 'pending' | 'approved' | 'rejected' | 'completed'
  refundAmount?: string
  reviewRemark?: string
  createdAt: string
}

// 申请售后（REQ-054）
export const applyAfterSale = (data: {
  orderId: number
  orderItemId?: number
  type: 'refund' | 'return' | 'exchange'
  reason: string
  images?: string[]
}) => post<AfterSale>('/after-sales', data)

// 获取售后列表（REQ-055）
export const getAfterSales = () => get<AfterSale[]>('/after-sales')

// 获取售后详情（REQ-056）
export const getAfterSale = (id: string) => get<AfterSale>(`/after-sales/${id}`)
