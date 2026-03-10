import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getOrders, getOrder, createOrder, cancelOrder, confirmReceived } from '../api/orders'
import type { Order, CreateOrderData } from '../api/orders'

export const useOrderStore = defineStore('order', () => {
  const orders = ref<Order[]>([])
  const currentOrder = ref<Order | null>(null)
  const loading = ref(false)
  const total = ref(0)

  async function fetchOrders(params?: { status?: string; page?: number }) {
    loading.value = true
    try {
      const result = await getOrders(params)
      orders.value = result.list
      total.value = result.total
    } finally {
      loading.value = false
    }
  }

  async function fetchOrder(id: string) {
    loading.value = true
    try {
      currentOrder.value = await getOrder(id)
      return currentOrder.value
    } finally {
      loading.value = false
    }
  }

  async function submitOrder(data: CreateOrderData) {
    const order = await createOrder(data)
    return order
  }

  async function cancel(id: string) {
    await cancelOrder(id)
    if (currentOrder.value?.id === id) {
      currentOrder.value.status = 'cancelled'
    }
  }

  async function confirm(id: string) {
    await confirmReceived(id)
    if (currentOrder.value?.id === id) {
      currentOrder.value.status = 'completed'
    }
  }

  return {
    orders,
    currentOrder,
    loading,
    total,
    fetchOrders,
    fetchOrder,
    submitOrder,
    cancel,
    confirm,
  }
})
