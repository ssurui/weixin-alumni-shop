<template>
  <view class="order-list-page">
    <!-- 状态筛选 Tab -->
    <van-tabs v-model:active="activeTab" @change="onTabChange">
      <van-tab title="全部" name="" />
      <van-tab title="待支付" name="pending_payment" />
      <van-tab title="待发货" name="paid" />
      <van-tab title="已发货" name="shipped" />
      <van-tab title="已完成" name="completed" />
    </van-tabs>

    <van-loading v-if="orderStore.loading && !orderStore.orders.length" class="loading" size="48rpx" />

    <van-empty v-else-if="!orderStore.loading && !orderStore.orders.length" description="暂无订单" />

    <view v-else class="order-list">
      <view
        v-for="order in orderStore.orders"
        :key="order.id"
        class="order-card card"
        @tap="goDetail(order.id)"
      >
        <!-- 订单头 -->
        <view class="order-header">
          <text class="order-no">订单号：{{ order.orderNo }}</text>
          <text class="order-status" :class="order.status">{{ formatStatus(order.status) }}</text>
        </view>

        <!-- 订单商品（最多显示2个） -->
        <view class="order-items">
          <view v-for="item in order.items.slice(0, 2)" :key="item.id" class="order-item">
            <image
              class="item-img"
              :src="item.product?.coverImage || '/assets/placeholder.png'"
              mode="aspectFill"
            />
            <view class="item-info">
              <text class="item-name">{{ item.product?.name }}</text>
              <text class="item-qty">x{{ item.quantity }}</text>
            </view>
          </view>
          <text v-if="order.items.length > 2" class="more-items">等{{ order.items.length }}件商品</text>
        </view>

        <!-- 订单金额 -->
        <view class="order-footer">
          <text class="order-total">合计：<text class="price">¥{{ parseFloat(order.totalAmount).toFixed(2) }}</text></text>
          <view class="order-actions" @tap.stop="">
            <van-button
              v-if="order.status === 'pending_payment'"
              type="primary"
              size="small"
              @tap.stop="goPay(order)"
            >去支付</van-button>
            <van-button
              v-if="order.status === 'pending_payment'"
              size="small"
              @tap.stop="cancelOrder(order.id)"
            >取消</van-button>
            <van-button
              v-if="order.status === 'shipped'"
              type="primary"
              size="small"
              @tap.stop="confirmOrder(order.id)"
            >确认收货</van-button>
            <van-button
              v-if="order.status === 'completed'"
              size="small"
              @tap.stop="applyAfterSale(order.id)"
            >申请售后</van-button>
          </view>
        </view>

        <!-- 支付倒计时 -->
        <view v-if="order.status === 'pending_payment' && order.expiresAt" class="countdown">
          <van-count-down
            :time="getCountdownTime(order.expiresAt)"
            format="mm:ss"
            @finish="onCountdownFinish(order.id)"
          />
          <text>后自动取消</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import Taro from '@tarojs/taro'
import { useOrderStore } from '../../../stores/order'
import { useUserStore } from '../../../stores/user'
import { ORDER_STATUS_MAP } from '../../../utils/format'
import dayjs from 'dayjs'
import type { Order } from '../../../api/orders'

const orderStore = useOrderStore()
const userStore = useUserStore()
const activeTab = ref('')

onMounted(() => {
  userStore.restoreFromStorage()
  if (userStore.isLoggedIn) orderStore.fetchOrders()
})

function onTabChange(name: string) {
  orderStore.fetchOrders({ status: name || undefined })
}

function formatStatus(status: string) {
  return ORDER_STATUS_MAP[status] || status
}

function getCountdownTime(expiresAt: string) {
  return Math.max(0, dayjs(expiresAt).diff(dayjs(), 'millisecond'))
}

function onCountdownFinish(orderId: string) {
  // 倒计时结束，刷新订单列表
  orderStore.fetchOrders({ status: activeTab.value || undefined })
}

function goDetail(id: string) {
  Taro.navigateTo({ url: `/pages/order/detail/index?id=${id}` })
}

function goPay(order: Order) {
  Taro.navigateTo({ url: `/pages/payment/index?orderId=${order.id}&amount=${order.totalAmount}&currency=${order.currency}` })
}

async function cancelOrder(id: string) {
  Taro.showModal({
    title: '取消订单',
    content: '确认取消该订单？',
    success: async ({ confirm }) => {
      if (confirm) {
        await orderStore.cancel(id)
        orderStore.fetchOrders({ status: activeTab.value || undefined })
        Taro.showToast({ title: '订单已取消', icon: 'success' })
      }
    },
  })
}

async function confirmOrder(id: string) {
  Taro.showModal({
    title: '确认收货',
    content: '确认已收到商品？',
    success: async ({ confirm }) => {
      if (confirm) {
        await orderStore.confirm(id)
        orderStore.fetchOrders()
        Taro.showToast({ title: '确认收货成功', icon: 'success' })
      }
    },
  })
}

function applyAfterSale(orderId: string) {
  Taro.navigateTo({ url: `/pages/after-sales/apply/index?orderId=${orderId}` })
}
</script>

<style lang="scss">
.order-list-page { background: #f5f5f5; min-height: 100vh; }

.loading { display: flex; justify-content: center; padding: 80rpx 0; }

.order-list { padding: 16rpx; }

.order-card {
  background: #fff;
  border-radius: 12rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;

  .order-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 16rpx;

    .order-no { font-size: 24rpx; color: #999; }
    .order-status {
      font-size: 26rpx;
      font-weight: bold;
      &.pending_payment { color: #ff976a; }
      &.paid, &.processing { color: #1989fa; }
      &.shipped { color: #07c160; }
      &.completed { color: #333; }
      &.cancelled { color: #999; }
      &.refunding, &.refunded { color: #ee0a24; }
    }
  }

  .order-items {
    border-top: 1rpx solid #f5f5f5;
    padding-top: 16rpx;

    .order-item {
      display: flex;
      align-items: center;
      gap: 16rpx;
      margin-bottom: 12rpx;

      .item-img { width: 100rpx; height: 100rpx; border-radius: 8rpx; }
      .item-info {
        flex: 1;
        .item-name { font-size: 26rpx; color: #333; }
        .item-qty { font-size: 24rpx; color: #999; }
      }
    }

    .more-items { font-size: 24rpx; color: #999; }
  }

  .order-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 16rpx;
    padding-top: 16rpx;
    border-top: 1rpx solid #f5f5f5;

    .order-total { font-size: 26rpx; color: #333; .price { color: #ee0a24; font-weight: bold; } }
    .order-actions { display: flex; gap: 12rpx; }
  }

  .countdown {
    display: flex;
    align-items: center;
    gap: 8rpx;
    font-size: 24rpx;
    color: #ff976a;
    margin-top: 12rpx;
  }
}
</style>
