import { get, post } from './request'

export interface Font {
  name: string
  displayName: string
  preview: string
}

export interface CustomizationPreview {
  id: string
  previewImageUrl: string
  textContent: string
  fontName?: string
}

// 获取字体列表（REQ-059）
export const getFonts = () => get<Font[]>('/customization/fonts')

// 校验刻字内容（REQ-060）
export const validateText = (text: string) =>
  post<{ valid: boolean; charCount: number; maxChars: number }>(
    '/customization/validate',
    { text },
  )

// 生成刻字预览（REQ-061）
export const createPreview = (data: {
  productId: number
  textContent: string
  fontName?: string
}) => post<CustomizationPreview>('/customization/preview', data)
