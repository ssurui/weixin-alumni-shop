<template>
  <view class="reviews-page">
    <!-- 加载中 -->
    <van-loading v-if="loading && reviewList.length === 0" class="page-loading" size="64rpx" vertical>
      加载中...
    </van-loading>

    <!-- 错误状态 -->
    <view v-else-if="error" class="error-state">
      <van-icon name="warning-o" size="80rpx" color="#ee0a24" />
      <text class="error-text">{{ error }}</text>
      <van-button type="primary" @tap="fetchReviews(true)">重试</van-button>
    </view>

    <block v-else>
      <!-- 评分概览 -->
      <view class="rating-overview card">
        <view class="avg-rating-block">
          <text class="avg-number">{{ avgRating.toFixed(1) }}</text>
          <view class="avg-stars">
            <van-icon
              v-for="i in 5"
              :key="i"
              :name="i <= Math.round(avgRating) ? 'star' : 'star-o'"
              size="32rpx"
              :color="i <= Math.round(avgRating) ? '#ffd21e' : '#c8c9cc'"
            />
          </view>
          <text class="total-count">共 {{ total }} 条评价</text>
        </view>
      </view>

      <!-- 筛选 Tab -->
      <view class="filter-tabs">
        <view
          v-for="tab in filterTabs"
          :key="tab.value"
          class="tab-item"
          :class="{ active: activeFilter === tab.value }"
          @tap="switchFilter(tab.value)"
        >
          {{ tab.label }}
        </view>
      </view>

      <!-- 评价列表 -->
      <view v-if="filteredList.length > 0" class="review-list">
        <view
          v-for="review in filteredList"
          :key="review.id"
          class="review-item card"
        >
          <!-- 用户头像和昵称 -->
          <view class="review-header">
            <view class="avatar">
              <text class="avatar-text">
                {{ review.isAnonymous ? '匿' : (review.user?.nickname?.[0] || '?') }}
              </text>
            </view>
            <view class="user-info">
              <text class="nickname">
                {{ review.isAnonymous ? '匿名用户' : (review.user?.nickname || '用户') }}
              </text>
              <!-- 星级 -->
              <view class="stars">
                <van-icon
                  v-for="i in 5"
                  :key="i"
                  :name="i <= review.rating ? 'star' : 'star-o'"
                  size="26rpx"
                  :color="i <= review.rating ? '#ffd21e' : '#c8c9cc'"
                />
              </view>
            </view>
            <text class="review-date">{{ formatDate(review.createdAt) }}</text>
          </view>

          <!-- 评价内容 -->
          <text class="review-content">{{ review.content }}</text>

          <!-- 评价图片 -->
          <view v-if="review.images && review.images.length > 0" class="review-images">
            <image
              v-for="(img, idx) in review.images"
              :key="idx"
              :src="img"
              class="review-img"
              mode="aspectFill"
              @tap="previewReviewImage(review.images!, idx)"
            />
          </view>
        </view>
      </view>

      <!-- 空状态 -->
      <van-empty
        v-else-if="!loading"
        description="暂无相关评价"
        class="empty-state"
      />

      <!-- 加载更多 -->
      <view v-if="filteredList.length > 0" class="load-more-area">
        <van-button
          v-if="hasMore && activeFilter === 'all'"
          plain
          size="small"
          :loading="loadingMore"
          @tap="loadMore"
          class="load-more-btn"
        >
          {{ loadingMore ? '加载中...' : '加载更多' }}
        </van-button>
        <text v-else-if="!hasMore || activeFilter !== 'all'" class="no-more-text">
          {{ total === 0 ? '' : '已显示全部评价' }}
        </text>
      </view>
    </block>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import Taro, { useRouter } from '@tarojs/taro'
import { getProductReviews } from '../../api/reviews'
import dayjs from 'dayjs'

// ---- 评价数据接口 ----
interface Review {
  id: string
  rating: number
  content: string
  isAnonymous: boolean
  user?: { nickname: string }
  createdAt: string
  images?: string[]
}

// ---- 路由参数 ----
const router = useRouter()
const productId = router.params.productId as string

// ---- 状态 ----
const loading = ref(false)
const loadingMore = ref(false)
const error = ref('')
const reviewList = ref<Review[]>([])
const total = ref(0)
const avgRating = ref(0)
const page = ref(1)
const pageSize = 10
const hasMore = ref(false)

// ---- 筛选 Tab ----
const filterTabs = [
  { value: 'all', label: '全部' },
  { value: 'good', label: '好评(4-5星)' },
  { value: 'mid', label: '中评(3星)' },
  { value: 'bad', label: '差评(1-2星)' },
]
const activeFilter = ref('all')

// ---- 筛选后的列表 ----
const filteredList = computed<Review[]>(() => {
  if (activeFilter.value === 'all') return reviewList.value
  if (activeFilter.value === 'good') return reviewList.value.filter((r) => r.rating >= 4)
  if (activeFilter.value === 'mid') return reviewList.value.filter((r) => r.rating === 3)
  if (activeFilter.value === 'bad') return reviewList.value.filter((r) => r.rating <= 2)
  return reviewList.value
})

// ---- 初始化 ----
onMounted(() => {
  if (!productId) {
    error.value = '商品ID缺失'
    return
  }
  fetchReviews(true)
})

// ---- 拉取评价 ----
async function fetchReviews(reset = false) {
  if (reset) {
    page.value = 1
    reviewList.value = []
    loading.value = true
    error.value = ''
  } else {
    loadingMore.value = true
  }

  try {
    const res = await getProductReviews(productId, page.value, pageSize) as any
    // 接口返回：{ list, total, avgRating }
    const list: Review[] = res.list || []
    const resTotal: number = res.total || 0
    const resAvg: number = res.avgRating || 0

    if (reset) {
      reviewList.value = list
    } else {
      reviewList.value.push(...list)
    }
    total.value = resTotal
    avgRating.value = resAvg
    hasMore.value = reviewList.value.length < resTotal
  } catch (e: any) {
    error.value = e?.message || '获取评价失败，请重试'
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

// ---- 加载更多 ----
async function loadMore() {
  if (loadingMore.value || !hasMore.value) return
  page.value++
  await fetchReviews(false)
}

// ---- 切换筛选 ----
function switchFilter(value: string) {
  activeFilter.value = value
}

// ---- 格式化日期 ----
function formatDate(dateStr: string): string {
  return dayjs(dateStr).format('YYYY-MM-DD')
}

// ---- 预览图片 ----
function previewReviewImage(images: string[], index: number) {
  Taro.previewImage({
    current: images[index],
    urls: images,
  })
}
</script>

<style lang="scss">
.reviews-page {
  background: #f5f5f5;
  min-height: 100vh;
  padding-bottom: 40rpx;
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

  .error-text { font-size: 28rpx; color: #666; text-align: center; }
}

/* 通用卡片 */
.card {
  background: #fff;
  border-radius: 12rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.05);
}

/* 评分概览 */
.rating-overview {
  margin: 16rpx;
  padding: 32rpx 24rpx;
}

.avg-rating-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;

  .avg-number {
    font-size: 72rpx;
    font-weight: bold;
    color: #333;
    line-height: 1;
  }

  .avg-stars {
    display: flex;
    gap: 4rpx;
  }

  .total-count {
    font-size: 26rpx;
    color: #999;
  }
}

/* 筛选 Tab */
.filter-tabs {
  display: flex;
  background: #fff;
  margin: 0 16rpx 16rpx;
  border-radius: 12rpx;
  overflow: hidden;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.05);

  .tab-item {
    flex: 1;
    text-align: center;
    padding: 20rpx 0;
    font-size: 24rpx;
    color: #666;
    border-bottom: 4rpx solid transparent;
    transition: all 0.2s;

    &.active {
      color: #1989fa;
      font-weight: bold;
      border-bottom-color: #1989fa;
    }
  }
}

/* 评价列表 */
.review-list {
  padding: 0 16rpx;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.review-item {
  padding: 24rpx;
}

.review-header {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
  margin-bottom: 16rpx;

  .avatar {
    width: 72rpx;
    height: 72rpx;
    border-radius: 50%;
    background: linear-gradient(135deg, #1989fa, #07c160);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;

    .avatar-text {
      font-size: 28rpx;
      color: #fff;
      font-weight: bold;
    }
  }

  .user-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 8rpx;

    .nickname { font-size: 28rpx; color: #333; font-weight: 500; }
    .stars { display: flex; gap: 2rpx; }
  }

  .review-date {
    font-size: 22rpx;
    color: #c8c9cc;
    flex-shrink: 0;
  }
}

.review-content {
  font-size: 28rpx;
  color: #666;
  line-height: 1.6;
  display: block;
  margin-bottom: 16rpx;
}

/* 评价图片 */
.review-images {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;

  .review-img {
    width: 140rpx;
    height: 140rpx;
    border-radius: 8rpx;
    background: #f5f5f5;
  }
}

/* 空状态 */
.empty-state {
  padding-top: 80rpx;
}

/* 加载更多 */
.load-more-area {
  display: flex;
  justify-content: center;
  padding: 32rpx 0;

  .load-more-btn {
    width: 240rpx;
    border-radius: 40rpx;
  }

  .no-more-text {
    font-size: 26rpx;
    color: #c8c9cc;
  }
}
</style>
