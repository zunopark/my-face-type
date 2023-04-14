const yangbanAppBtn = document.querySelector(`.yangban_app_btn`)

const handleAppBtn = () => {
  location.href = 'http://pf.kakao.com/_Qfuvxj/chat'
  gtag('event', '카카오 플러스 친구 타로', {
    event_category: '카카오 플러스 친구 타로',
    event_label: '카카오 플러스 친구 타로',
  })
}

yangbanAppBtn.addEventListener('click', handleAppBtn)
