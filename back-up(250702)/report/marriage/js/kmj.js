// const consultBtn = document.querySelector(`.consultBtn`)

// function handleConsultForm() {
//   window.location.href = 'tel:031-282-2464'
//   gtag('event', '김민정 관상가 상담 예약 버튼')
// }

// consultBtn.addEventListener('click', handleConsultForm)

const consultBtn = document.querySelector(`.consultBtn`)

function handleConsultForm() {
  window.open('https://forms.gle/BoQ3qKFgCbcMjtFG6', '_blank')
  gtag('event', '김민정 관상가 1:1 상담 신청')
}

consultBtn.addEventListener('click', handleConsultForm)
