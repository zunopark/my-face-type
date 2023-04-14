const yangbanAppBtn = document.querySelector(`.yangban_app_btn`)

const handleAppBtn = () => {
  location.href = 'http://pf.kakao.com/_Qfuvxj/chat'
  console.log('click')
}

yangbanAppBtn.addEventListener('click', handleAppBtn)
