<template>
  <view class="payment-page">
    <!-- 支付金额 -->
    <view class="amount-card">
      <text class="amount-label">需支付金额</text>
      <text class="amount-value">
        {{ currency === 'CNY' ? '¥' : '$' }}{{ parseFloat(amount).toFixed(2) }}
      </text>
      <text v-if="currency !== 'CNY' && exchangeRate" class="exchange-tip">
        约合人民币 ¥{{ (parseFloat(amount) * parseFloat(exchangeRate)).toFixed(2) }}
        （汇率 {{ exchangeRate }}）
      </text>
    </view>

    <!-- 支付方式 -->
    <view class="pay-method-card card">
      <view class="section-title">选择支付方式</view>

      <!-- 微信支付（国内用户） -->
      <view
        v-if="!isOverseas"
        class="pay-method-item"
        :class="{ active: selectedMethod === 'wechat' }"
        @tap="selectedMethod = 'wechat'"
      >
        <image class="pay-icon" src="/assets/icons/wechat-pay.png" mode="aspectFit" />
        <text class="pay-name">微信支付</text>
        <van-radio :value="selectedMethod === 'wechat'" />
      </view>

      <!-- PayPal（海外用户） -->
      <view
        v-if="isOverseas"
        class="pay-method-item"
        :class="{ active: selectedMethod === 'paypal' }"
        @tap="selectedMethod = 'paypal'"
      >
        <image class="pay-icon" src="/assets/icons/paypal.png" mode="aspectFit" />
        <text class="pay-name">PayPal</text>
        <text class="pay-sub">国际信用卡 / PayPal账户</text>
        <van-radio :value="selectedMethod === 'paypal'" />
      </view>
    </view>

    <!-- 订单信息 -->
    <view class="order-info-card card">
      <view class="info-row">
        <text>订单ID</text>
        <text>{{ orderId }}</text>
      </view>
    </view>

    <!-- 安全提示 -->
    <view class="security-tip">
      <van-icon name="shield-o" color="#07c160" />
      <text>支付信息经过加密保护，请放心支付</text>
    </view>

    <!-- 支付按钮 -->
    <view class="pay-btn-wrap">
      <van-button
        type="primary"
        size="large"
        :loading="paying"
        :disabled="!selectedMethod"
        @tap="doPay"
      >
        立即支付 {{ currency === 'CNY' ? '¥' : '$' }}{{ parseFloat(amount).toFixed(2) }}
      </van-button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import Taro, { useRouter } from '@tarojs/taro'
import { useUserStore } from '../../stores/user'
import { wxPrepay, paypalCreate, paypalCapture, getExchangeRate } from '../../api/payments'

const router = useRouter()
const userStore = useUserStore()

const orderId = ref('')
const amount = ref('0')
const currency = ref('CNY')
const isOverseas = ref(false)
const selectedMethod = ref<'wechat' | 'paypal' | ''>('')
const paying = ref(false)
const exchangeRate = ref('')

onMounted(async () => {
  userStore.restoreFromStorage()
  orderId.value = router.params.orderId as string
  amount.value = router.params.amount as string
  currency.value = (router.params.currency as string) || 'CNY'
  isOverseas.value = userStore.isOverseas

  if (isOverseas.value) {
    selectedMethod.value = 'paypal'
    // 获取当前汇率
    try {
      const rateData = await getExchangeRate()
      exchangeRate.value = rateData.rate
    } catch {}
  } else {
    selectedMethod.value = 'wechat'
  }
})

async function doPay() {
  if (!selectedMethod.value) return
  paying.value = true

  try {
    if (selectedMethod.value === 'wechat') {
      await doWechatPay()
    } else {
      await doPaypalPay()
    }
  } finally {
    paying.value = false
  }
}

async function doWechatPay() {
  // 1. 获取预支付参数
  const params = await wxPrepay(Number(orderId.value))

  // 2. 调起微信支付
  await Taro.requestPayment({
    timeStamp: params.timeStamp,
    nonceStr: params.nonceStr,
    package: params.package,
    signType: params.signType as any,
    paySign: params.paySign,
  })

  Taro.showToast({ title: '支付成功', icon: 'success' })
  setTimeout(() => {
    Taro.reLaunch({ url: `/pages/order/detail/index?id=${orderId.value}` })
  }, 1500)
}

async function doPaypalPay() {
  // 1. 创建 PayPal 订单
  const result = await paypalCreate(Number(orderId.value))

  // 2. 跳转 PayPal 页面（H5方式或webview）
  // 微信小程序内嵌 WebView 方式
  Taro.navigateTo({
    url: `/pages/payment/paypal-webview/index?paypalOrderId=${result.paypalOrderId}&paymentId=${result.paymentId}`,
  })
}
</script>

<style lang="scss">
.payment-page { background: #f5f5f5; min-height: 100vh; padding-bottom: 160rpx; }

.amount-card {
  background: linear-gradient(135deg, #1989fa, #07c160);
  color: #fff;
  padding: 60rpx 32rpx;
  text-align: center;

  .amount-label { font-size: 28rpx; opacity: 0.9; display: block; margin-bottom: 16rpx; }
  .amount-value { font-size: 72rpx; font-weight: bold; display: block; }
  .exchange-tip { font-size: 24rpx; opacity: 0.8; margin-top: 12rpx; display: block; }
}

.card { background: #fff; margin: 16rpx; padding: 24rpx; border-radius: 12rpx; }

.section-title { font-size: 28rpx; font-weight: bold; color: #333; margin-bottom: 16rpx; }

.pay-method-item {
  display: flex;
  align-items: center;
  padding: 20rpx;
  border: 2rpx solid #eee;
  border-radius: 12rpx;
  margin-bottom: 16rpx;
  gap: 16rpx;

  &.active { border-color: #1989fa; background: #f0f7ff; }

  .pay-icon { width: 60rpx; height: 40rpx; }
  .pay-name { flex: 1; font-size: 28rpx; color: #333; }
  .pay-sub { font-size: 22rpx; color: #999; }
}

.info-row {
  display: flex;
  justify-content: space-between;
  font-size: 26rpx;
  color: #666;
  padding: 8rpx 0;
  text:last-child { color: #333; }
}

.security-tip {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  font-size: 24rpx;
  color: #999;
  padding: 16rpx;
}

.pay-btn-wrap {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 16rpx 24rpx calc(env(safe-area-inset-bottom) + 16rpx);
  background: #fff;
  box-shadow: 0 -2rpx 12rpx rgba(0,0,0,0.08);
}
</style>
