const yangbanAppBtn = document.querySelector(`.yangban_app_btn`)

const handleAppBtn = () => {
  location.href = 'http://pf.kakao.com/_Qfuvxj/chat'
  gtag('event', '카카오 플러스 친구 궁합')
}

yangbanAppBtn.addEventListener('click', handleAppBtn)
