const consultBtn = document.querySelector(`.consultBtn`)

function handleConsultForm() {
  window.open('https://forms.gle/BoQ3qKFgCbcMjtFG6', '_blank')
  gtag('event', '김민정 관상가 1:1 상담 신청')
}

consultBtn.addEventListener('click', handleConsultForm)
