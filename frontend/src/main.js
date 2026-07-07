import Vue from 'vue'
import Vuetify from 'vuetify'
import 'vuetify/dist/vuetify.min.css'
import { createPinia, PiniaVuePlugin } from 'pinia'
import App from './App.vue'

Vue.use(Vuetify)
Vue.use(PiniaVuePlugin)

const vuetify = new Vuetify({
  theme: {
    dark: true,
    themes: {
      dark: {
        primary: '#00BCD4',
        secondary: '#37474F',
        accent: '#FF5722',
        background: '#121212',
      },
    },
  },
})

const pinia = createPinia()

new Vue({
  vuetify,
  pinia,
  render: h => h(App),
}).$mount('#app')
