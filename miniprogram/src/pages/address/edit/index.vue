<template>
  <view class="address-edit-page">
    <van-form @submit="onSubmit" ref="formRef">
      <!-- 收货人 -->
      <van-cell-group inset class="form-group">
        <van-field
          v-model="form.receiverName"
          name="receiverName"
          label="收货人"
          placeholder="请输入收货人姓名"
          :rules="[{ required: true, message: '请填写收货人姓名' }]"
          clearable
        />

        <!-- 手机号码 -->
        <van-field
          v-model="form.phone"
          name="phone"
          label="手机号码"
          placeholder="请输入11位手机号"
          type="tel"
          maxlength="11"
          :rules="[
            { required: true, message: '请填写手机号码' },
            { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号码' },
          ]"
          clearable
        />

        <!-- 省份 -->
        <van-field
          v-model="form.province"
          name="province"
          label="省份"
          placeholder="请输入省份，如：广东省"
          :rules="[{ required: true, message: '请填写省份' }]"
          clearable
        />

        <!-- 城市 -->
        <van-field
          v-model="form.city"
          name="city"
          label="城市"
          placeholder="请输入城市，如：广州市"
          :rules="[{ required: true, message: '请填写城市' }]"
          clearable
        />

        <!-- 区/县 -->
        <van-field
          v-model="form.district"
          name="district"
          label="区/县"
          placeholder="请输入区/县，如：天河区"
          :rules="[{ required: true, message: '请填写区/县' }]"
          clearable
        />

        <!-- 详细地址 -->
        <van-field
          v-model="form.detail"
          name="detail"
          label="详细地址"
          placeholder="请输入街道、楼栋、门牌号等"
          type="textarea"
          rows="3"
          autosize
          :rules="[{ required: true, message: '请填写详细地址' }]"
        />
      </van-cell-group>

      <!-- 设为默认地址 -->
      <van-cell-group inset class="form-group default-group">
        <van-cell title="设为默认地址" center>
          <template #right-icon>
            <van-switch v-model="form.isDefault" size="44rpx" />
          </template>
        </van-cell>
      </van-cell-group>

      <!-- 保存按钮 -->
      <view class="save-btn-wrap">
        <van-button
          type="primary"
          block
          native-type="submit"
          :loading="saving"
          loading-text="保存中..."
          class="save-btn"
        >
          保存地址
        </van-button>
      </view>
    </van-form>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import Taro, { useRouter } from '@tarojs/taro'
import {
  getAddresses,
  createAddress,
  updateAddress,
  type Address,
} from '../../../api/logistics'

// ---- 路由参数 ----
const router = useRouter()
const addressId = router.params.id as string | undefined  // 有 id 则为编辑模式
const isEdit = !!addressId

// ---- 表单数据 ----
const form = reactive({
  receiverName: '',
  phone: '',
  province: '',
  city: '',
  district: '',
  detail: '',
  isDefault: false,
  country: '中国', // 默认国内地址
})

// ---- 状态 ----
const saving = ref(false)
const formRef = ref<any>(null)

// ---- 初始化：编辑模式下拉取地址详情 ----
onMounted(async () => {
  if (!isEdit) return
  try {
    Taro.showLoading({ title: '加载中...' })
    // 通过列表接口查找对应地址（无单条查询接口时降级处理）
    const list = await getAddresses()
    const target = list.find((a: Address) => a.id === addressId)
    if (target) {
      form.receiverName = target.receiverName
      form.phone = target.phone
      form.province = target.province ?? ''
      form.city = target.city ?? ''
      form.district = target.district ?? ''
      form.detail = target.detail
      form.isDefault = target.isDefault
      form.country = target.country || '中国'
    } else {
      Taro.showToast({ title: '地址不存在', icon: 'none' })
      Taro.navigateBack()
    }
  } catch {
    Taro.showToast({ title: '获取地址失败', icon: 'none' })
  } finally {
    Taro.hideLoading()
  }
})

// ---- 表单提交 ----
async function onSubmit() {
  saving.value = true
  try {
    const payload: Omit<Address, 'id'> = {
      receiverName: form.receiverName.trim(),
      phone: form.phone.trim(),
      province: form.province.trim(),
      city: form.city.trim(),
      district: form.district.trim(),
      detail: form.detail.trim(),
      isDefault: form.isDefault,
      country: form.country,
    }

    if (isEdit && addressId) {
      // 更新地址
      await updateAddress(addressId, payload)
      Taro.showToast({ title: '地址已更新', icon: 'success' })
    } else {
      // 新增地址
      await createAddress(payload)
      Taro.showToast({ title: '地址已保存', icon: 'success' })
    }

    // 短暂延迟后返回，让用户看到 toast
    setTimeout(() => {
      Taro.navigateBack()
    }, 800)
  } catch {
    Taro.showToast({ title: '保存失败，请重试', icon: 'none' })
  } finally {
    saving.value = false
  }
}
</script>

<style lang="scss">
.address-edit-page {
  background: #f5f5f5;
  min-height: 100vh;
  padding-bottom: 160rpx; /* 为底部按钮留空间 */
}

/* 表单分组间距 */
.form-group {
  margin-top: 24rpx !important;
}

.default-group {
  margin-top: 24rpx !important;
}

/* 保存按钮 */
.save-btn-wrap {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 20rpx 32rpx;
  background: #fff;
  box-shadow: 0 -2rpx 12rpx rgba(0, 0, 0, 0.08);

  .save-btn {
    border-radius: 48rpx;
  }
}
</style>
