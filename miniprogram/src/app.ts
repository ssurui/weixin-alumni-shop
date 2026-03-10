import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './app.scss'

const app = createApp({
  onShow() {
    console.log('App onShow')
  },
})

app.use(createPinia())

export default app
