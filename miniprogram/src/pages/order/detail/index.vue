<template>
  <view class="order-detail-page" v-if="order">
    <!-- 订单状态 -->
    <view class="status-card">
      <text class="status-text">{{ formatStatus(order.status) }}</text>
      <text v-if="order.status === 'pending_payment' && order.expiresAt" class="expire-tip">
        请在 <van-count-down :time="getCountdownTime(order.expiresAt)" format="mm:ss" /> 内完成支付
      </text>
      <van-button
        v-if="order.status === 'pending_payment'"
        type="primary"
        @tap="goPay"
      >立即支付</van-button>
    </view>

    <!-- 收货地址 -->
    <view class="address-card card">
      <van-icon name="location-o" color="#1989fa" />
      <view class="address-info">
        <view class="address-name">
          <text>{{ order.addressSnapshot?.receiverName }}</text>
          <text class="address-phone">{{ order.addressSnapshot?.phone }}</text>
        </view>
        <text class="address-detail">{{ formatAddress(order.addressSnapshot) }}</text>
      </view>
    </view>

    <!-- 商品列表 -->
    <view class="items-card card">
      <view v-for="item in order.items" :key="item.id" class="order-item">
        <image
          class="item-img"
          :src="item.product?.coverImage || '/assets/placeholder.png'"
          mode="aspectFill"
        />
        <view class="item-info">
          <text class="item-name">{{ item.product?.name }}</text>
          <text class="item-spec">{{ formatSpec(item.sku?.specValues) }}</text>
          <text v-if="item.customizationId" class="item-custom">含刻字定制</text>
          <view class="item-bottom">
            <text class="item-price">¥{{ parseFloat(item.unitPrice).toFixed(2) }}</text>
            <text class="item-qty">x{{ item.quantity }}</text>
          </view>
        </view>
      </view>

      <view class="amount-row">
        <text>商品合计</text>
        <text class="price">¥{{ parseFloat(order.totalAmount).toFixed(2) }}</text>
      </view>
    </view>

    <!-- 物流信息 -->
    <view v-if="order.logistics" class="logistics-card card">
      <view class="section-title">物流信息</view>
      <view class="logistics-info">
        <text>{{ order.logistics.company }}</text>
        <text class="tracking-no">{{ order.logistics.trackingNo }}</text>
      </view>
    </view>

    <!-- 订单信息 -->
    <view class="order-info-card card">
      <view class="section-title">订单信息</view>
      <view class="info-row"><text>订单编号</text><text>{{ order.orderNo }}</text></view>
      <view class="info-row"><text>支付方式</text><text>{{ formatPayMethod(order.paymentMethod) }}</text></view>
      <view class="info-row"><text>创建时间</text><text>{{ formatDate(order.createdAt) }}</text></view>
      <view v-if="order.remark" class="info-row"><text>买家备注</text><text>{{ order.remark }}</text></view>
    </view>

    <!-- 底部操作 -->
    <view class="bottom-bar">
      <van-button
        v-if="order.status === 'pending_payment'"
        @tap="cancelOrder"
      >取消订单</van-button>
      <van-button
        v-if="order.status === 'shipped'"
        type="primary"
        @tap="confirmReceived"
      >确认收货</van-button>
      <van-button
        v-if="order.status === 'completed'"
        @tap="applyAfterSale"
      >申请售后</van-button>
      <van-button
        v-if="order.status === 'pending_payment'"
        type="primary"
        @tap="goPay"
      >立即支付</van-button>
    </view>
  </view>
  <van-loading v-else class="page-loading" size="64rpx" />
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import Taro, { useRouter } from '@tarojs/taro'
import { useOrderStore } from '../../../stores/order'
import { ORDER_STATUS_MAP, formatDate } from '../../../utils/format'
import dayjs from 'dayjs'

const router = useRouter()
const orderStore = useOrderStore()
const order = ref<any>(null)

onMounted(async () => {
  const id = router.params.id as string
  order.value = await orderStore.fetchOrder(id)
})

function formatStatus(s: string) { return ORDER_STATUS_MAP[s] || s }
function getCountdownTime(t: string) { return Math.max(0, dayjs(t).diff(dayjs(), 'millisecond')) }
function formatAddress(a: any) {
  if (!a) return ''
  return [a.province, a.city, a.district, a.detail].filter(Boolean).join(' ')
}
function formatSpec(s?: any) {
  if (!s) return ''
  return Object.values(s).join(' / ')
}
function formatPayMethod(m?: string) {
  return m === 'wechat' ? '微信支付' : m === 'paypal' ? 'PayPal' : '未支付'
}

function goPay() {
  if (!order.value) return
  Taro.navigateTo({
    url: `/pages/payment/index?orderId=${order.value.id}&amount=${order.value.totalAmount}&currency=${order.value.currency}`,
  })
}

async function cancelOrder() {
  Taro.showModal({
    title: '取消订单',
    content: '确认取消该订单？',
    success: async ({ confirm }) => {
      if (confirm && order.value) {
        await orderStore.cancel(order.value.id)
        order.value.status = 'cancelled'
        Taro.showToast({ title: '已取消', icon: 'success' })
      }
    },
  })
}

async function confirmReceived() {
  Taro.showModal({
    title: '确认收货',
    content: '确认已收到商品？',
    success: async ({ confirm }) => {
      if (confirm && order.value) {
        await orderStore.confirm(order.value.id)
        order.value.status = 'completed'
        Taro.showToast({ title: '已确认收货', icon: 'success' })
      }
    },
  })
}

function applyAfterSale() {
  if (order.value) Taro.navigateTo({ url: `/pages/after-sales/apply/index?orderId=${order.value.id}` })
}
</script>

<style lang="scss">
.order-detail-page { background: #f5f5f5; padding-bottom: 160rpx; }
.page-loading { display: flex; justify-content: center; padding: 120rpx 0; }

.status-card {
  background: linear-gradient(135deg, #1989fa, #07c160);
  color: #fff;
  padding: 48rpx 32rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;

  .status-text { font-size: 40rpx; font-weight: bold; }
  .expire-tip { font-size: 26rpx; opacity: 0.9; display: flex; align-items: center; gap: 8rpx; }
}

.card {
  background: #fff;
  margin: 16rpx;
  padding: 24rpx;
  border-radius: 12rpx;
}

.section-title {
  font-size: 28rpx;
  font-weight: bold;
  margin-bottom: 16rpx;
  color: #333;
}

.address-card {
  display: flex;
  gap: 16rpx;

  .address-info {
    .address-name {
      display: flex;
      gap: 24rpx;
      margin-bottom: 8rpx;
      font-weight: bold;
      font-size: 28rpx;
      .address-phone { color: #666; font-weight: normal; }
    }
    .address-detail { font-size: 26rpx; color: #666; }
  }
}

.order-item {
  display: flex;
  gap: 16rpx;
  margin-bottom: 16rpx;

  .item-img { width: 120rpx; height: 120rpx; border-radius: 8rpx; }
  .item-info {
    flex: 1;
    .item-name { font-size: 28rpx; color: #333; }
    .item-spec { font-size: 24rpx; color: #999; }
    .item-custom { font-size: 22rpx; color: #1989fa; }
    .item-bottom { display: flex; justify-content: space-between; margin-top: 8rpx;
      .item-price { color: #ee0a24; font-weight: bold; }
      .item-qty { color: #999; font-size: 26rpx; }
    }
  }
}

.amount-row {
  display: flex;
  justify-content: space-between;
  padding-top: 16rpx;
  border-top: 1rpx solid #f5f5f5;
  font-size: 28rpx;
  .price { color: #ee0a24; font-weight: bold; }
}

.info-row {
  display: flex;
  justify-content: space-between;
  font-size: 26rpx;
  color: #666;
  padding: 12rpx 0;
  border-bottom: 1rpx solid #f9f9f9;

  &:last-child { border-bottom: none; }
  text:last-child { color: #333; }
}

.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #fff;
  padding: 16rpx 24rpx calc(env(safe-area-inset-bottom) + 16rpx);
  display: flex;
  gap: 16rpx;
  justify-content: flex-end;
  box-shadow: 0 -2rpx 12rpx rgba(0,0,0,0.08);
}
</style>
