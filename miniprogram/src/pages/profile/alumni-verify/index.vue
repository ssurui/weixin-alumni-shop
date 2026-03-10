<template>
  <view class="alumni-verify-page">
    <!-- 已通过认证 -->
    <view v-if="currentStatus === 'approved'" class="status-card status-card--approved">
      <van-icon name="passed" size="80rpx" color="#07c160" />
      <text class="status-card__title">已通过校友认证</text>
      <text class="status-card__desc">您的校友身份已通过审核，可正常下单购买。</text>
    </view>

    <!-- 审核中提示 -->
    <view v-else-if="currentStatus === 'pending'" class="status-card status-card--pending">
      <van-icon name="clock-o" size="80rpx" color="#ff976a" />
      <text class="status-card__title">审核中</text>
      <text class="status-card__desc">您的申请正在审核中，请耐心等待。</text>
    </view>

    <!-- 已拒绝提示 -->
    <view v-if="currentStatus === 'rejected'" class="status-card status-card--rejected">
      <van-icon name="close" size="60rpx" color="#ee0a24" />
      <text class="status-card__title">审核未通过</text>
      <text v-if="reviewRemark" class="status-card__remark">原因：{{ reviewRemark }}</text>
      <text class="status-card__desc">您可以重新提交认证申请。</text>
    </view>

    <!-- 认证申请表单（未申请或被拒绝时显示） -->
    <view v-if="showForm" class="form-section">
      <view class="form-header">
        <van-icon name="certificate" size="40rpx" color="#1989fa" />
        <text class="form-header__title">填写认证信息</text>
      </view>

      <van-cell-group inset>
        <!-- 真实姓名 -->
        <van-field
          :value="form.realName"
          label="真实姓名"
          placeholder="请输入真实姓名"
          required
          :error-message="errors.realName"
          @input="onInput('realName', $event)"
        />

        <!-- 学号/工号 -->
        <van-field
          :value="form.studentId"
          label="学号/工号"
          placeholder="请输入学号或工号"
          required
          :error-message="errors.studentId"
          @input="onInput('studentId', $event)"
        />

        <!-- 毕业年份 -->
        <van-field
          :value="form.graduationYear"
          label="毕业年份"
          placeholder="请输入4位毕业年份"
          type="number"
          maxlength="4"
          :error-message="errors.graduationYear"
          @input="onInput('graduationYear', $event)"
        />

        <!-- 学院/系部 -->
        <van-field
          :value="form.department"
          label="学院/系部"
          placeholder="请输入所在学院或系部"
          @input="onInput('department', $event)"
        />

        <!-- 联系邮箱 -->
        <van-field
          :value="form.email"
          label="联系邮箱"
          placeholder="请输入联系邮箱"
          type="email"
          :error-message="errors.email"
          @input="onInput('email', $event)"
        />

        <!-- 备注说明 -->
        <van-field
          :value="form.notes"
          label="备注说明"
          placeholder="如有其他需要说明的信息，请在此填写"
          type="textarea"
          rows="3"
          autosize
          @input="onInput('notes', $event)"
        />
      </van-cell-group>

      <!-- 提交按钮 -->
      <view class="submit-section">
        <van-button
          type="primary"
          block
          round
          :loading="submitting"
          loading-text="提交中..."
          @click="handleSubmit"
        >
          提交申请
        </van-button>
      </view>

      <view class="form-tips">
        <text class="form-tips__text">提示：审核通常在1~3个工作日内完成，请保持联系方式畅通。</text>
      </view>
    </view>

    <!-- 底部安全距离 -->
    <view class="safe-bottom" />
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue'
import Taro from '@tarojs/taro'
import { useUserStore } from '@/stores/user'
import { applyAlumni } from '@/api/auth'

const userStore = useUserStore()

// 当前校友认证状态
const currentStatus = computed(() => userStore.alumniStatus?.status ?? null)

// 审核拒绝原因
const reviewRemark = computed(() => userStore.alumniStatus?.reviewRemark ?? '')

// 是否显示表单（未申请或已被拒绝时可重新提交）
const showForm = computed(() => {
  return currentStatus.value === null
    || currentStatus.value === 'not_applied'
    || currentStatus.value === 'rejected'
})

// 表单数据
const form = reactive({
  realName: '',
  studentId: '',
  graduationYear: '',
  department: '',
  email: '',
  notes: '',
})

// 表单校验错误信息
const errors = reactive({
  realName: '',
  studentId: '',
  graduationYear: '',
  email: '',
})

// 提交中状态
const submitting = ref(false)

onMounted(async () => {
  userStore.restoreFromStorage()
  // 获取最新校友认证状态
  if (userStore.isLoggedIn) {
    await userStore.fetchAlumniStatus()
  }
})

// 处理字段输入
function onInput(field: string, event: any) {
  const value = event.detail?.value ?? event
  ;(form as any)[field] = value
  // 清除对应字段的错误
  if (field in errors) {
    ;(errors as any)[field] = ''
  }
}

// 邮箱格式校验
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

// 表单校验
function validateForm(): boolean {
  let valid = true

  // 校验真实姓名
  if (!form.realName.trim()) {
    errors.realName = '请输入真实姓名'
    valid = false
  } else {
    errors.realName = ''
  }

  // 校验学号/工号
  if (!form.studentId.trim()) {
    errors.studentId = '请输入学号或工号'
    valid = false
  } else {
    errors.studentId = ''
  }

  // 校验毕业年份（选填但若填写需为4位数字）
  if (form.graduationYear) {
    const year = parseInt(form.graduationYear, 10)
    if (
      isNaN(year)
      || form.graduationYear.length !== 4
      || year < 1900
      || year > new Date().getFullYear() + 5
    ) {
      errors.graduationYear = '请输入有效的4位毕业年份'
      valid = false
    } else {
      errors.graduationYear = ''
    }
  } else {
    errors.graduationYear = ''
  }

  // 校验邮箱（选填但若填写需格式正确）
  if (form.email && !isValidEmail(form.email)) {
    errors.email = '请输入有效的邮箱地址'
    valid = false
  } else {
    errors.email = ''
  }

  return valid
}

// 提交申请
async function handleSubmit() {
  if (!validateForm()) {
    Taro.showToast({ title: '请检查表单填写是否正确', icon: 'none' })
    return
  }

  submitting.value = true
  try {
    await applyAlumni({
      realName: form.realName.trim(),
      studentId: form.studentId.trim() || undefined,
      graduationYear: form.graduationYear ? parseInt(form.graduationYear, 10) : undefined,
      major: form.department.trim() || undefined,
    })

    // 更新本地校友认证状态为 pending
    await userStore.fetchAlumniStatus()

    Taro.showToast({ title: '申请已提交，等待审核', icon: 'success' })

    // 延迟返回，让用户看到提示
    setTimeout(() => {
      Taro.navigateBack()
    }, 1500)
  } catch (err: any) {
    const message = err?.message || '提交失败，请稍后重试'
    Taro.showToast({ title: message, icon: 'none' })
  } finally {
    submitting.value = false
  }
}
</script>

<style lang="scss">
.alumni-verify-page {
  min-height: 100vh;
  background: #f5f5f5;
  padding-bottom: 40rpx;
}

/* 状态卡片通用样式 */
.status-card {
  margin: 24rpx 24rpx 0;
  padding: 48rpx 32rpx;
  border-radius: 16rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
  text-align: center;

  &__title {
    font-size: 36rpx;
    font-weight: bold;
    margin-top: 8rpx;
  }

  &__desc {
    font-size: 26rpx;
    color: #666;
    line-height: 1.6;
  }

  &__remark {
    font-size: 26rpx;
    color: #ee0a24;
    background: #fff2f0;
    padding: 12rpx 24rpx;
    border-radius: 8rpx;
    width: 100%;
    text-align: left;
  }

  /* 已通过 */
  &--approved {
    background: #f6ffed;
    border: 2rpx solid #b7eb8f;

    .status-card__title {
      color: #07c160;
    }
  }

  /* 审核中 */
  &--pending {
    background: #fff7e6;
    border: 2rpx solid #ffd591;

    .status-card__title {
      color: #ff976a;
    }
  }

  /* 已拒绝 */
  &--rejected {
    background: #fff2f0;
    border: 2rpx solid #ffa39e;

    .status-card__title {
      color: #ee0a24;
    }
  }
}

/* 表单区域 */
.form-section {
  margin-top: 24rpx;
}

/* 表单标题 */
.form-header {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 24rpx 32rpx 16rpx;

  &__title {
    font-size: 30rpx;
    font-weight: bold;
    color: #333;
  }
}

/* 提交按钮区域 */
.submit-section {
  margin: 40rpx 32rpx 24rpx;
}

/* 表单提示 */
.form-tips {
  padding: 0 32rpx;

  &__text {
    font-size: 24rpx;
    color: #999;
    line-height: 1.6;
  }
}

/* 底部安全距离 */
.safe-bottom {
  height: env(safe-area-inset-bottom);
  padding-bottom: 40rpx;
}
</style>
