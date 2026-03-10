<template>
  <view class="apply-page">
    <!-- 加载中 -->
    <van-loading v-if="loading" class="page-loading" size="64rpx" vertical>加载中...</van-loading>

    <!-- 错误状态 -->
    <view v-else-if="error" class="error-state">
      <van-icon name="warning-o" size="80rpx" color="#ee0a24" />
      <text class="error-text">{{ error }}</text>
      <van-button type="primary" @tap="fetchOrderDetail">重试</van-button>
    </view>

    <!-- 页面主体 -->
    <block v-else>
      <!-- 订单信息卡片 -->
      <view class="order-card card">
        <view class="section-title">订单信息</view>
        <view class="order-no-row">
          <text class="label">订单编号</text>
          <text class="value order-no">{{ order?.orderNo }}</text>
        </view>

        <!-- 商品列表 -->
        <view v-for="item in order?.items" :key="item.id" class="order-item">
          <image
            class="item-img"
            :src="item.product?.coverImage || '/assets/placeholder.png'"
            mode="aspectFill"
          />
          <view class="item-info">
            <text class="item-name">{{ item.product?.name }}</text>
            <text class="item-spec">{{ formatSpec(item.sku?.specValues) }}</text>
            <view class="item-bottom">
              <text class="item-price">¥{{ parseFloat(item.unitPrice).toFixed(2) }}</text>
              <text class="item-qty">x{{ item.quantity }}</text>
            </view>
          </view>
        </view>

        <!-- 订单总金额 -->
        <view class="total-row">
          <text class="label">订单金额</text>
          <text class="total-price">¥{{ order ? parseFloat(order.totalAmount).toFixed(2) : '0.00' }}</text>
        </view>
      </view>

      <!-- 售后申请表单 -->
      <view class="form-card card">
        <view class="section-title">售后信息</view>

        <!-- 售后类型 -->
        <view class="form-item">
          <view class="form-label required">售后类型</view>
          <view class="radio-group">
            <view
              v-for="opt in typeOptions"
              :key="opt.value"
              class="radio-item"
              :class="{ active: form.type === opt.value }"
              @tap="form.type = opt.value"
            >
              <view class="radio-dot">
                <view v-if="form.type === opt.value" class="radio-dot-inner" />
              </view>
              <view class="radio-label">
                <text class="radio-title">{{ opt.label }}</text>
                <text class="radio-desc">{{ opt.desc }}</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 申请原因 -->
        <view class="form-item">
          <view class="form-label required">申请原因</view>
          <van-field
            v-model="form.reason"
            type="textarea"
            placeholder="请详细描述您的售后原因（必填）"
            :maxlength="200"
            autosize
            show-word-limit
            class="reason-field"
          />
        </view>

        <!-- 上传凭证图片 -->
        <view class="form-item">
          <view class="form-label">上传凭证图片 <text class="optional">（选填，最多3张）</text></view>
          <view class="image-upload-area">
            <!-- 已选图片 -->
            <view
              v-for="(img, idx) in form.images"
              :key="idx"
              class="image-slot image-slot--filled"
            >
              <image :src="img" class="preview-img" mode="aspectFill" @tap="previewImage(idx)" />
              <view class="remove-btn" @tap.stop="removeImage(idx)">
                <van-icon name="cross" size="24rpx" color="#fff" />
              </view>
            </view>

            <!-- 添加按钮（未达3张时显示） -->
            <view
              v-if="form.images.length < 3"
              class="image-slot image-slot--add"
              @tap="chooseImage"
            >
              <van-icon name="photograph" size="48rpx" color="#c8c9cc" />
              <text class="add-text">添加图片</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 提交按钮 -->
      <view class="submit-bar">
        <van-button
          type="primary"
          block
          :loading="submitting"
          :disabled="submitting"
          @tap="submitForm"
        >
          提交申请
        </van-button>
      </view>
    </block>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import Taro, { useRouter } from '@tarojs/taro'
import { getOrder } from '../../../api/orders'
import { applyAfterSale } from '../../../api/after-sales'
import type { Order } from '../../../api/orders'

// ---- 路由参数 ----
const router = useRouter()
const orderId = router.params.orderId as string

// ---- 状态 ----
const loading = ref(false)
const submitting = ref(false)
const error = ref('')
const order = ref<Order | null>(null)

// ---- 售后类型选项 ----
const typeOptions = [
  { value: 'refund', label: '仅退款', desc: '未收到货或与商家协商同意退款' },
  { value: 'return', label: '退货退款', desc: '已收到货，需退货后退款' },
  { value: 'exchange', label: '换货', desc: '已收到货，商品存在问题需要更换' },
]

// ---- 表单数据 ----
const form = reactive({
  type: 'refund' as 'refund' | 'return' | 'exchange',
  reason: '',
  images: [] as string[],
})

// ---- 初始化 ----
onMounted(() => {
  if (!orderId) {
    error.value = '订单ID缺失，无法申请售后'
    return
  }
  fetchOrderDetail()
})

// ---- 获取订单详情 ----
async function fetchOrderDetail() {
  loading.value = true
  error.value = ''
  try {
    order.value = await getOrder(orderId)
  } catch (e: any) {
    error.value = e?.message || '获取订单信息失败，请重试'
  } finally {
    loading.value = false
  }
}

// ---- 格式化规格 ----
function formatSpec(specValues?: Record<string, string>): string {
  if (!specValues) return ''
  return Object.values(specValues).join(' / ')
}

// ---- 选择图片 ----
function chooseImage() {
  const remaining = 3 - form.images.length
  if (remaining <= 0) return
  Taro.chooseImage({
    count: remaining,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: (res) => {
      // 将选中的临时路径添加到预览列表
      const newImages = res.tempFilePaths.slice(0, remaining)
      form.images.push(...newImages)
    },
  })
}

// ---- 预览图片 ----
function previewImage(index: number) {
  Taro.previewImage({
    current: form.images[index],
    urls: form.images,
  })
}

// ---- 移除图片 ----
function removeImage(index: number) {
  form.images.splice(index, 1)
}

// ---- 提交表单 ----
async function submitForm() {
  // 校验
  if (!form.reason.trim()) {
    Taro.showToast({ title: '请填写申请原因', icon: 'none' })
    return
  }
  if (form.reason.trim().length < 5) {
    Taro.showToast({ title: '申请原因至少5个字', icon: 'none' })
    return
  }

  submitting.value = true
  try {
    await applyAfterSale({
      orderId: Number(orderId),
      type: form.type,
      reason: form.reason.trim(),
      images: form.images.length > 0 ? form.images : undefined,
    })
    Taro.showToast({ title: '售后申请已提交', icon: 'success' })
    // 延迟返回，让 toast 显示完毕
    setTimeout(() => {
      Taro.navigateBack()
    }, 1500)
  } catch (e: any) {
    Taro.showToast({ title: e?.message || '提交失败，请重试', icon: 'none' })
  } finally {
    submitting.value = false
  }
}
</script>

<style lang="scss">
.apply-page {
  background: #f5f5f5;
  min-height: 100vh;
  padding-bottom: 160rpx;
}

/* 加载居中 */
.page-loading {
  display: flex;
  justify-content: center;
  padding: 120rpx 0;
}

/* 错误状态 */
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 120rpx 48rpx;
  gap: 24rpx;

  .error-text {
    font-size: 28rpx;
    color: #666;
    text-align: center;
  }
}

/* 通用卡片 */
.card {
  background: #fff;
  margin: 16rpx;
  padding: 28rpx 24rpx;
  border-radius: 12rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.05);
}

.section-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 20rpx;
  padding-bottom: 16rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

/* 订单信息卡片 */
.order-no-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;

  .label { font-size: 26rpx; color: #999; }
  .order-no { font-size: 24rpx; color: #666; }
}

.order-item {
  display: flex;
  gap: 16rpx;
  margin-bottom: 16rpx;
  padding-bottom: 16rpx;
  border-bottom: 1rpx solid #f9f9f9;

  &:last-of-type { border-bottom: none; }

  .item-img {
    width: 120rpx;
    height: 120rpx;
    border-radius: 8rpx;
    background: #f5f5f5;
    flex-shrink: 0;
  }

  .item-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 8rpx;

    .item-name { font-size: 28rpx; color: #333; line-height: 1.4; }
    .item-spec { font-size: 24rpx; color: #999; }

    .item-bottom {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: auto;

      .item-price { font-size: 28rpx; color: #ee0a24; font-weight: bold; }
      .item-qty { font-size: 26rpx; color: #999; }
    }
  }
}

.total-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 16rpx;
  border-top: 1rpx solid #f0f0f0;

  .label { font-size: 28rpx; color: #333; }
  .total-price { font-size: 32rpx; color: #ee0a24; font-weight: bold; }
}

/* 表单卡片 */
.form-item {
  margin-bottom: 32rpx;

  &:last-child { margin-bottom: 0; }
}

.form-label {
  font-size: 28rpx;
  color: #333;
  margin-bottom: 16rpx;
  font-weight: 500;

  &.required::before {
    content: '*';
    color: #ee0a24;
    margin-right: 4rpx;
  }

  .optional {
    font-size: 24rpx;
    color: #999;
    font-weight: normal;
  }
}

/* 单选组 */
.radio-group {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.radio-item {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
  padding: 20rpx;
  border: 2rpx solid #e8e8e8;
  border-radius: 10rpx;
  transition: all 0.2s;

  &.active {
    border-color: #1989fa;
    background: #f0f8ff;
  }

  .radio-dot {
    width: 36rpx;
    height: 36rpx;
    border-radius: 50%;
    border: 2rpx solid #c8c9cc;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    margin-top: 4rpx;

    .radio-dot-inner {
      width: 20rpx;
      height: 20rpx;
      border-radius: 50%;
      background: #1989fa;
    }
  }

  &.active .radio-dot {
    border-color: #1989fa;
  }

  .radio-label {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 6rpx;

    .radio-title { font-size: 28rpx; color: #333; font-weight: 500; }
    .radio-desc { font-size: 24rpx; color: #999; line-height: 1.4; }
  }
}

/* 申请原因文本框 */
.reason-field {
  border: 1rpx solid #e8e8e8;
  border-radius: 8rpx;
  font-size: 28rpx;
}

/* 图片上传区域 */
.image-upload-area {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.image-slot {
  width: 180rpx;
  height: 180rpx;
  border-radius: 8rpx;
  overflow: hidden;
  position: relative;

  &--add {
    border: 2rpx dashed #c8c9cc;
    background: #fafafa;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8rpx;

    .add-text {
      font-size: 22rpx;
      color: #c8c9cc;
    }
  }

  &--filled {
    .preview-img {
      width: 100%;
      height: 100%;
    }

    .remove-btn {
      position: absolute;
      top: 4rpx;
      right: 4rpx;
      width: 40rpx;
      height: 40rpx;
      border-radius: 50%;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
    }
  }
}

/* 提交按钮栏 */
.submit-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 20rpx 32rpx calc(env(safe-area-inset-bottom) + 20rpx);
  background: #fff;
  box-shadow: 0 -2rpx 12rpx rgba(0, 0, 0, 0.08);
}
</style>
