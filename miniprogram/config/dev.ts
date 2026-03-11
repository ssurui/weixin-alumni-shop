import type { UserConfigExport } from '@tarojs/cli'

export default {
  logger: {
    quiet: false,
    stats: true,
  },
  env: {
    TARO_APP_API_URL: JSON.stringify('http://localhost:3000/api/v1'),
  },
  defineConstants: {
    'process.env.TARO_APP_API_URL': JSON.stringify('http://localhost:3000/api/v1'),
  },
  mini: {},
  h5: {},
} satisfies UserConfigExport
