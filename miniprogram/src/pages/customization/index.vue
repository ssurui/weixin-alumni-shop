<template>
  <view class="customization-page">
    <view class="section">
      <view class="section-title">刻字内容</view>
      <van-field
        v-model="engravingText"
        placeholder="请输入刻字内容（最多20字）"
        :maxlength="20"
        show-word-limit
        type="textarea"
        rows="3"
        autosize
      />
    </view>

    <view class="section preview-section" v-if="previewUrl">
      <view class="section-title">预览效果</view>
      <image :src="previewUrl" mode="widthFix" class="preview-image" />
    </view>

    <view class="bottom-bar">
      <van-button
        type="default"
        class="preview-btn"
        :loading="previewing"
        loading-text="生成中..."
        @click="onPreview"
      >
        预览效果
      </van-button>
      <van-button
        type="primary"
        class="confirm-btn"
        :disabled="!engravingText.trim()"
        @click="onConfirm"
      >
        确认刻字
      </van-button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import Taro, { useRouter } from '@tarojs/taro'

const router = useRouter()
const orderId = router.params.orderId as string | undefined

const engravingText = ref('')
const previewUrl = ref('')
const previewing = ref(false)

async function onPreview() {
  if (!engravingText.value.trim()) {
    Taro.showToast({ title: '请输入刻字内容', icon: 'none' })
    return
  }
  previewing.value = true
  try {
    // TODO: 调用后端刻字预览接口（REQ-059）
    Taro.showToast({ title: '预览功能开发中', icon: 'none' })
  } finally {
    previewing.value = false
  }
}

function onConfirm() {
  if (!engravingText.value.trim()) {
    Taro.showToast({ title: '请输入刻字内容', icon: 'none' })
    return
  }
  // 将刻字内容传回上一页
  const pages = Taro.getCurrentPages()
  if (pages.length >= 2) {
    const prevPage = pages[pages.length - 2] as any
    prevPage.setData?.({ engravingText: engravingText.value })
  }
  Taro.navigateBack()
}
</script>

<style lang="scss">
.customization-page {
  background: #f5f5f5;
  min-height: 100vh;
  padding-bottom: 160rpx;
}

.section {
  background: #fff;
  margin-top: 24rpx;
  padding: 24rpx 32rpx;

  .section-title {
    font-size: 28rpx;
    font-weight: 600;
    color: #333;
    margin-bottom: 16rpx;
  }
}

.preview-section {
  .preview-image {
    width: 100%;
    border-radius: 8rpx;
  }
}

.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  gap: 24rpx;
  padding: 20rpx 32rpx;
  background: #fff;
  box-shadow: 0 -2rpx 12rpx rgba(0, 0, 0, 0.08);

  .preview-btn,
  .confirm-btn {
    flex: 1;
    border-radius: 48rpx;
  }
}
</style>
