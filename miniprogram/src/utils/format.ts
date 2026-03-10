import dayjs from 'dayjs'

// 格式化金额
export function formatPrice(price: string | number): string {
  const num = typeof price === 'string' ? parseFloat(price) : price
  return `¥${num.toFixed(2)}`
}

// 格式化海外金额（USD）
export function formatUSD(amount: string | number): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  return `$${num.toFixed(2)}`
}

// 格式化日期
export function formatDate(date: string | Date, fmt = 'YYYY-MM-DD HH:mm'): string {
  return dayjs(date).format(fmt)
}

// 格式化订单状态
export const ORDER_STATUS_MAP: Record<string, string> = {
  pending_payment: '待支付',
  paid: '已支付',
  processing: '处理中',
  shipped: '已发货',
  completed: '已完成',
  cancelled: '已取消',
  refunding: '退款中',
  refunded: '已退款',
}

export function formatOrderStatus(status: string): string {
  return ORDER_STATUS_MAP[status] || status
}

// 格式化倒计时
export function formatCountdown(expiresAt: string): string {
  const diff = dayjs(expiresAt).diff(dayjs(), 'second')
  if (diff <= 0) return '已超时'
  const mins = Math.floor(diff / 60)
  const secs = diff % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}
