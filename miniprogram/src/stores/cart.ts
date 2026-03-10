import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getCart, addToCart, updateCartItem, removeCartItem, clearCart } from '../api/cart'
import type { CartItem } from '../api/cart'
import Taro from '@tarojs/taro'

export const useCartStore = defineStore('cart', () => {
  const items = ref<CartItem[]>([])
  const loading = ref(false)

  const totalCount = computed(() =>
    items.value.reduce((sum, item) => sum + item.quantity, 0),
  )

  const totalAmount = computed(() =>
    items.value.reduce((sum, item) => {
      return sum + parseFloat(item.sku.price) * item.quantity
    }, 0).toFixed(2),
  )

  const selectedItems = ref<Set<string>>(new Set())

  const selectedAmount = computed(() =>
    items.value
      .filter((item) => selectedItems.value.has(item.id))
      .reduce((sum, item) => sum + parseFloat(item.sku.price) * item.quantity, 0)
      .toFixed(2),
  )

  // 获取购物车
  async function fetchCart() {
    loading.value = true
    try {
      const cart = await getCart()
      items.value = cart.items
    } catch {
      // 未登录时忽略
    } finally {
      loading.value = false
    }
  }

  // 加入购物车
  async function addItem(skuId: number, quantity: number, opts?: {
    customizationText?: string
    selectedFont?: string
  }) {
    await addToCart({ skuId, quantity, ...opts })
    await fetchCart()
    Taro.showToast({ title: '已加入购物车', icon: 'success' })
  }

  // 更新数量
  async function updateItem(id: string, quantity: number) {
    await updateCartItem(id, quantity)
    const item = items.value.find((i) => i.id === id)
    if (item) item.quantity = quantity
  }

  // 删除商品
  async function removeItem(id: string) {
    await removeCartItem(id)
    items.value = items.value.filter((i) => i.id !== id)
    selectedItems.value.delete(id)
  }

  // 清空购物车
  async function clear() {
    await clearCart()
    items.value = []
    selectedItems.value.clear()
  }

  // 全选/取消全选
  function toggleSelectAll(selected: boolean) {
    if (selected) {
      items.value.forEach((item) => selectedItems.value.add(item.id))
    } else {
      selectedItems.value.clear()
    }
  }

  function toggleSelect(id: string) {
    if (selectedItems.value.has(id)) {
      selectedItems.value.delete(id)
    } else {
      selectedItems.value.add(id)
    }
  }

  return {
    items,
    loading,
    totalCount,
    totalAmount,
    selectedItems,
    selectedAmount,
    fetchCart,
    addItem,
    updateItem,
    removeItem,
    clear,
    toggleSelectAll,
    toggleSelect,
  }
})
