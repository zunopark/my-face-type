const consultBtn = document.querySelector(`.consultBtn`)

function handleConsultForm() {
  window.location.href = 'tel:031-282-2464'
  gtag('event', '김민정 관상가 상담 예약 버튼')
}

consultBtn.addEventListener('click', handleConsultForm)
