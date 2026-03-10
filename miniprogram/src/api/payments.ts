import { get, post } from './request'

// 获取汇率（REQ-048）
export const getExchangeRate = (from = 'USD', to = 'CNY') =>
  get<{ rate: string; source: string }>(`/payments/exchange-rate?from=${from}&to=${to}`, null, false)

// 微信支付预下单（REQ-041）
export const wxPrepay = (orderId: number) =>
  post<{
    timeStamp: string
    nonceStr: string
    package: string
    signType: string
    paySign: string
    paymentId: string
  }>('/payments/wx/prepay', { orderId })

// 创建 PayPal 订单（REQ-044）
export const paypalCreate = (orderId: number) =>
  post<{
    paypalOrderId: string
    paymentId: string
    amount: string
    currency: string
  }>('/payments/paypal/create', { orderId })

// 捕获 PayPal 支付（REQ-045）
export const paypalCapture = (paypalOrderId: string) =>
  post('/payments/paypal/capture', { paypalOrderId })
