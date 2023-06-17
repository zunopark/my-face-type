// 사진 올리는거

const aiCont = document.querySelector(`.ai`)

async function readURL(input) {
  if (input.files && input.files[0]) {
    var reader = new FileReader()

    reader.onload = function (e) {
      $('.image-upload-wrap').hide()

      $('.file-upload-image').attr('src', e.target.result)
      $('.file-upload-content').show()

      $('.image-title').html(input.files[0].name)
    }

    await reader.readAsDataURL(input.files[0])
    await init()
    aiCont.classList.add('disblock')
  } else {
    removeUpload()
  }
}

function removeUpload() {
  $('.file-upload-input').replaceWith($('.file-upload-input').clone())
  $('.file-upload-content').hide()
  $('.image-upload-wrap').show()
}
$('.image-upload-wrap').bind('dragover', function () {
  $('.image-upload-wrap').addClass('image-dropping')
})
$('.image-upload-wrap').bind('dragleave', function () {
  $('.image-upload-wrap').removeClass('image-dropping')
})

// url 설정

const URL = 'https://teachablemachine.withgoogle.com/models/FiW0HL4DO/'

let model, webcam, labelContainer, maxPredictions

async function init() {
  const modelURL = URL + 'model.json'
  const metadataURL = URL + 'metadata.json'

  model = await tmImage.load(modelURL, metadataURL)
  maxPredictions = model.getTotalClasses()

  labelContainer = document.getElementById('label-container')
  for (let i = 0; i < maxPredictions; i++) {
    labelContainer.appendChild(document.createElement('span'))
  }
  predict()
  // toggle.classList.add('hidden')
}

async function predict() {
  let image = document.getElementById('face-image')
  const prediction = await model.predict(image, false)

  let arr = new Map()
  let description = {
    강민경: [
      'The forehead is rounded, so it is a forehead that likes outside work more than housework, and has good interpersonal relationships. The eyebrows have good jae bok and a wide brow, so it is a free personality. The eyes are eyes with a little stubbornness and pride, and are the eyes that men follow a lot. The chin has good fortune, but can be fickle, and you should be careful with the opposite sex, as you have strong love luck and are lucky. As a result, you are strong in career and success',
      'The face of an open-minded personality.',
    ],
    강동원: [
      'You have a good forehead, strong in character and static. Your eyes are close to phoenix eyes, so you have good fortune and attract people. Your eyebrows show that you have a strong character, so you are proud and stubborn. The ears are well-fed and affectionate. The jawline is slightly slender, so the personality is amicable, and the mouth is heavy. The overall aura of attracting people is strong, so it is a face with open success luck',
      'A face with a lifetime of good fortune.',
    ],
    강소라: [
      'The forehead is moderate, so it is small and has good marriage luck, and the eyebrows have good fortune and strong self-respect. The lips are full, indicating good love luck and good management. The jaw is strong, with good fortune, good later life, and an easy-going personality. The face is close to that of a donkey, with good career luck and good interpersonal relationships. The writing is large, but it is gentle, so it can be seen as a good contemplative',
      'A face that will live well if married',
    ],
    김수현: [
      'The eyebrows are thick and dark, indicating good fortune. There is not much flesh between the eyebrows and the eyes, and there is a little egotistical tendency, but the personality is attentive. The sharp eyes are sharp, observant, and quick. The nose indicates good fortune and greed for wealth. It is a person with good skills and talents and is a good subordinate for the entertainment industry. They have a positive disposition and have a good later life',
      'Delicate, persistent, and strong-willed face.',
    ],
    김옥빈: [
      'The forehead is moderate and has an assertive side, and the eyebrows are long and dark with good fortune. The eyes are strong as eyes that seduce the opposite sex and have strong love luck. The mouth is good at seducing the opposite sex and has a strong sense of pride. The cheeks are greedy, stubborn, and selfish, but they have good fortune, strong livelihood, and a good stomach. Overall, it is a flawless contemplative image, but on the downside, the qi emanating from the face is strong',
      'A face with a strong energy.',
    ],
    박해일: [
      'The forehead is flawless and clean, showing good rationality and a good brain. The narcissistic tendency is also strong, and the personality is strong-willed and focused on anything. Looking at the eyes, the rationality is strong, and the obsession with wealth is strong. They like things that are colorful and at the same time clean and neat. They are good at speaking, with the corners of their mouth and mouth being finely drawn, which shows their optimistic and positive mindset',
      'A face that is popular with the opposite sex.',
    ],
    송중기: [
      `My forehead is almost like a chan gui, which makes me intelligent and wise. He doesn't make much effort, but he is a talented person. The nose is good for fortune, and the eyes are good for love. It is strong and has good career luck, a neat final year, and versatile talents. It is close to the monkey statue, so you may live a colorful life through your talents`,
      'A genius-type face with a brilliant mind.',
    ],
    안소희: [
      `The forehead of a seagull represents a wise and wise woman. She has the eyebrows of a chaebol, and her parents' clothes are good and her husband's clothes are good. Her eyes are mesmerizing and angry, so she is loved by people and can attract a lot of men who don't need her if she doesn't rise up. 'It has eyes that attract the opposite sex a lot, a strong entertainment temperament, and a mild and good natured personality`,
      'A strong face with good social skills.',
    ],
    수지: [
      `It is a forehead that can make men flirt and suffer for their husbands. It has a masculine side, and it has a good personality, and it has good social skills. It has good love luck, and it is feminine and calm because it has fine eyebrows. You've got all the makings of a good personality. But when you turn around, you can be very aloof. It's a face with a strong personality, so it attracts people's hearts`,
      `A face with good love luck`,
    ],
    유승호: [
      `Your forehead is clean and cool, so you have a cool personality, good social skills, and auspicious eyes. If you look at the nose, you have good senses, a lot of talent, good interpersonal relationships, and a calm personality, but a little bit of a rush. You have a large mouth, so you're decisive and cool, and you're big-hearted and compassionate`,
      'An overall perfect face',
    ],
    유아인: [
      `When you look at your forehead, you have a good personality and a lot of recognition, but you also have a short temper and tend to not listen to others. The eyes are affectionate, calm, contemplative, rebellious, individualistic, and subjective. It is the eye that lives a different life and hates ordinary life. The jaw is strong, so it has good fortune, but it also has a sensitive side`,
      'A face that will not live an ordinary life.',
    ],
    김태희: [
      `My ears are donkey ears, so I have good fortune and good inbok. The small and pretty frontal head has high judgment, quick head rotation and intelligence, and the eyebrows are longer than the corners of the eyes, so the jaebok is very good. The teeth are large compared to the head, so the personality will also be cool`,
      'A face with good jaebok and inbok',
    ],
    문채원: [
      `Your eyebrows are well-built eyebrows. Your eyes are eyes that are good at listening. The mouth doesn't seem to speak its mind very often, and the chin is lucky, so you can expect good fortune at the end of the year. The ears are wasteful and should be excised. The one problem is your forehead, which may cause your husband to have accidents, but it is a good face to have a good husband`,
      `It's a face that should meet a good husband.`,
    ],
    박보영: [
      `The forehead that is moderate and slightly unusual is the forehead that controls my husband. The eyebrows and nose are very well-fitted. I am also a realist because my ears and eye corners are on the side. Her mouth is a little small compared to her face, which means she doesn't tell others what she really thinks, but unlike men, women don't mind having a small mouth. Her eyes are a little beaky, so they're the eyes that will run the household`,
      `A face that hides what you're really thinking, but no one knows.`,
    ],
    소지섭: [
      `There is one vertical wrinkle on my forehead, so it's a chaebol or CEO face. My eyes are crucian/whale eyes, so my fortune is very good. My ears are hard to see, so I'm stubborn and don't speak my mind to anyone. It is a silent and calm personality, and in some cases, it seems to have a strong temper. It is a face that will live a life similar to others`,
      'Stoic, stern face',
    ],
    손예진: [
      `He is wise because his forehead is like a gull, and his nose is large compared to his face, but his nostrils are not visible, so he is the one who will have riches, and his ears are the ones who will have a lot of riches. Her chin is also strong, which indicates good character, and her forehead is so broad that she might get into trouble with her husband, but because she is wise, she can deal with everything wisely`,
      `A face with a good head and wisdom.`,
    ],
    원빈: [
      `The nose and ears are very good, especially the ears, which are perfect for jacketing. There is a bit of a waste wall, but you don't have to worry about it. Your face shape is handsome, so you'll be well suited to be an entertainer, and your forehead is square, so your social skills are very good. Your eyes are beautiful eyes, beyond handsome. Beautiful eyes are weak in love, and because they are sunken, they are quick to judge and turn their heads. However, it's a bit of a loner, and you can marry when you want to. Overall, it is a static and reticent face`,
      `A face that can do anything if it sets its mind to it.`,
    ],
    이광수: [
      `The forehead is moderate, with a strong sense of guanyin and a tendency toward individualism. The eyebrows are long and dark, indicating good fortune, and the browbone and nose are very strong. The eyes of this horse are also very loyal to the family. Although they are quick-tempered, they are usually good at building interpersonal relationships, but they have strong career luck and are greedy. The ears seem to be the ears of success and advancement, and of course, they are good ears. Overall, it is a good face that is not absorbing`,
      `A face with more virility than anyone else's`,
    ],
    이승기: [
      `I have very strong career luck because I am a horse. It has a square forehead, so it is a personality that values work more than family. The nose is strong and energetic, so it is a very good face for business. The ears are large, so it is a face with a good stomach, belonging to a moody personality, and very strong loyalty. The chin below the ears is thin, so it looks like there is no bend in life, and the mouth is large, so it can be said to be a cool personality and an optimistic personality.`,
      `A face that will have no bends in life`,
    ],
    크리스탈: [
      `Your forehead is broad and rounded, giving you a slight appearance of divorce. But you'll always be on good terms with everyone except your husband. Your eyebrows are bushy, your eyes are proud, and your nose is a snub nose. Your mouth is a thin one, so you don't say much. The ears are also hard to see from the front, so you can't tell what they're really thinking, but on the outside, they're nice to everyone, so overall, it's a very good interpersonal face with good social skills and good stickiness`,
      `Interpersonal master face`,
    ],
    손나은: [
      `The forehead is moderate in size, so it's a quick-reading forehead. The eyebrows are long, bushy, and feminine. The eyes have a shy temperament, but they are very strong eyes. His nose is short and his nostrils are clearly visible, so he is affectionate and has strong writing skills. However, it is a weak nose for a husband. Through the nose, you can see that useless men will be attached. Injung is short, so interpersonal relationships are good, but this kind of Injung tries to get acquainted with people who are similar to her. Overall, it's a face with a strong Lee Sung-woon, but you should think carefully when meeting your spouse`,
      `A face that men cling to uselessly`,
    ],
  }

  for (let i = 0; i < maxPredictions; i++) {
    const classPrediction =
      prediction[i].className + ': ' + prediction[i].probability.toFixed(2)
    arr.set(
      prediction[i].className,
      parseInt((prediction[i].probability * 100).toFixed(0)),
    )
  }

  maxV = 0
  answer = ''
  let resultArray = []
  arr.forEach((value, key, mapObject) => {
    resultArray.push({ key, value })
    if (value > maxV) {
      maxV = value
      answer = key
    }
  })

  Array.prototype.shuffle = function () {
    var length = this.length
    while (length) {
      var index = Math.floor(length-- * Math.random())
      var temp = this[length]
      this[length] = this[index]
      this[index] = temp
    }
    return this
  }

  resultArray.shuffle()

  for (let i = 0; i < resultArray.length - 1; i++) {
    for (let j = i + 1; j < resultArray.length; j++) {
      if (resultArray[j].value > resultArray[i].value) {
        let temp = resultArray[i]
        resultArray[i] = resultArray[j]
        resultArray[j] = temp
      }
    }
  }

  const starsEng = []

  for (let i = 0; i < 5; i++) {
    let a = description[resultArray[i].key]
    starsEng.push(a[2])
  }

  let starsListImg = ''

  for (let j = 0; j < 5; j++) {
    if (resultArray[j].value === 0) {
      starsListImg =
        starsListImg +
        ` <div class="star__list__wrap">
        <div class="star__list__img">
        ${resultArray[j].key}
        </div> 
        <div class="percent zero">${resultArray[j].value}%</div>
      </div>
        `
    } else if (resultArray[j].value > 0 && resultArray[j].value <= 10) {
      starsListImg =
        starsListImg +
        ` <div class="star__list__wrap">
        <div class="star__list__img">
        ${resultArray[j].key}
        </div> 
        <div class="percent zeroone">${resultArray[j].value}%</div>
      </div>
        `
    } else if (resultArray[j].value > 10 && resultArray[j].value <= 20) {
      starsListImg =
        starsListImg +
        ` <div class="star__list__wrap">
        <div class="star__list__img">
        ${resultArray[j].key}
        </div> 
        <div class="percent onetwo">${resultArray[j].value}%</div>
      </div>
        `
    } else if (resultArray[j].value > 20 && resultArray[j].value <= 30) {
      starsListImg =
        starsListImg +
        ` <div class="star__list__wrap">
        <div class="star__list__img">
        ${resultArray[j].key}
        </div> 
        <div class="percent twothree">${resultArray[j].value}%</div>
      </div>
        `
    } else if (resultArray[j].value > 30 && resultArray[j].value <= 40) {
      starsListImg =
        starsListImg +
        ` <div class="star__list__wrap">
        <div class="star__list__img">
        ${resultArray[j].key}
        </div> 
        <div class="percent threefour">${resultArray[j].value}%</div>
      </div>
        `
    } else if (resultArray[j].value > 40 && resultArray[j].value <= 50) {
      starsListImg =
        starsListImg +
        ` <div class="star__list__wrap">
        <div class="star__list__img">
        ${resultArray[j].key}
        </div> 
        <div class="percent fourfive">${resultArray[j].value}%</div>
      </div>
        `
    } else if (resultArray[j].value > 50 && resultArray[j].value <= 60) {
      starsListImg =
        starsListImg +
        ` <div class="star__list__wrap">
        <div class="star__list__img">
        ${resultArray[j].key}
        </div> 
        <div class="percent fivesix">${resultArray[j].value}%</div>
      </div>
        `
    } else if (resultArray[j].value > 60 && resultArray[j].value <= 70) {
      starsListImg =
        starsListImg +
        ` <div class="star__list__wrap">
        <div class="star__list__img">
        ${resultArray[j].key}
        </div> 
        <div class="percent sixseven">${resultArray[j].value}%</div>
      </div>
        `
    } else if (resultArray[j].value > 70 && resultArray[j].value <= 80) {
      starsListImg =
        starsListImg +
        ` <div class="star__list__wrap">
        <div class="star__list__img">
        ${resultArray[j].key}
        </div> 
        <div class="percent seveneight">${resultArray[j].value}%</div>
      </div>
        `
    } else if (resultArray[j].value > 80 && resultArray[j].value <= 90) {
      starsListImg =
        starsListImg +
        ` <div class="star__list__wrap">
        <div class="star__list__img">
        ${resultArray[j].key}
        </div> 
        <div class="percent eightnine">${resultArray[j].value}%</div>
      </div>
        `
    } else if (resultArray[j].value > 90 && resultArray[j].value <= 100) {
      starsListImg =
        starsListImg +
        ` <div class="star__list__wrap">
        <div class="star__list__img">
        ${resultArray[j].key}
        </div> 
        <div class="percent nineten">${resultArray[j].value}%</div>
      </div>
        `
    }
  }

  let result = document.createElement('div')
  result.textContent = `${description[answer][1]}`
  labelContainer.appendChild(result)

  // let result2 = document.createElement('div')
  // result2.classList.add('celebrity')
  // result2.textContent = `나와 같은 관상을 가진 연예인 : ${answer}`
  // labelContainer.appendChild(result2)

  let desc = document.createElement('p')
  desc.classList.add('main__result__content__p')
  desc.textContent = description[answer][0]
  labelContainer.appendChild(desc)

  // let otherResult = document.createElement('div')
  // otherResult.classList.add('other__result')
  // otherResult.innerHTML = `${starsListImg}`
  // labelContainer.appendChild(otherResult)

  let reset = document.createElement('button')
  reset.innerHTML = 'Try another photo'
  reset.classList.add('reset__btn')
  reset.onclick = function () {
    gtag('event', 'en/한번더 클릭')
  }
  labelContainer.appendChild(reset)

  reset.addEventListener('click', handleReset)

  const privacy = document.querySelector(`.noti`)
  privacy.style.display = 'none'

  function handleReset(e) {
    location.reload(true)
    location.href = location.href
    history.go(0)
  }
}

var toggle = document.getElementById('container')
var toggleContainer = document.getElementById('toggle-container')
var toggleNumber
let changePicture = document.querySelector('.image-upload-wrap')
if (toggle) {
  toggle.addEventListener('click', function () {
    toggleNumber = !toggleNumber
    if (toggleNumber) {
      toggleContainer.style.clipPath = 'inset(0 0 0 50%)'
      toggleContainer.style.backgroundColor = 'dodgerblue'
      changePicture.style.backgroundImage =
        'url(https://i.ibb.co/B2kj8Pk/man.png)'
    } else {
      toggleContainer.style.clipPath = 'inset(0 50% 0 0)'
      toggleContainer.style.backgroundColor = '#D74046'
      changePicture.style.backgroundImage =
        'url(https://i.ibb.co/B2kj8Pk/man.png)'
    }
  })
}
