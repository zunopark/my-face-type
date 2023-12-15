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
  toggle.classList.add('hidden')
  const gender = document.querySelector(`.gender_wrap`)
  gender.classList.add('hidden')
}

// 성별 토글
var toggle = document.getElementById('container')
var toggleContainer = document.getElementById('toggle-container')
var toggleNumber = false
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

async function predict() {
  let image = document.getElementById('face-image')
  const prediction = await model.predict(image, false)

  let arr = new Map()
  let description
  if (toggleNumber) {
    description = {
      강민경: [
        'A round forehead suggests a liking for outdoor activities over household chores, good interpersonal relationships, and social fortune. Eyebrows indicate wealth and a broad space between them denotes a free spirit. Eyes with a hint of stubbornness and pride, attracting many wemen, signify a fortune with the opposite sex. The jawline indicates wealth but can also imply fickleness in romance, so caution with relationships is advised. Overall, a face born for success and advancement.',
        'A face born with an open personality',
        `Cha Eunwoo (ASTRO)`,
        `Tzuyu (TWICE)`,
        `https://i.ibb.co/g9TrJqt/Cha-Eunwoo.webp`,
        `https://i.ibb.co/DC6v6LJ/tzuyu.jpg`,
      ],
      강동원: [
        'Blessed with a good forehead, this face shows a strong and calm personality. Eyes resembling those of a phoenix suggest wealth and the ability to attract people. Eyebrows reflect a firm character with strong pride and determination. Ears indicate good social fortune and a compassionate nature. A slightly sharp jawline reveals an amiable personality, while reserved lips suggest thoughtfulness. Overall, a face with an aura that draws people in, opening paths to success.',
        'A face born with a lifetime of wealth',
        `Jimmin (BTS)`,
        `Sana (TWICE)`,
        `https://i.ibb.co/pLyRpJG/jimmin.webp`,
        `https://i.ibb.co/0hFmxyR/sana.jpg`,
      ],
      강소라: [
        `A well-proportioned forehead suggests good luck in marriage, with eyebrows indicating wealth and strong pride. Full lips denote good fortune in love and adeptness in household management. A strong jaw suggests wealth and a fortunate later life, paired with a friendly nature. Ears resembling those of a donkey indicate good social fortune and career prospects. Although spending might be on the higher side, overall, it's a facial reading of kindness and good fortune.`,
        `A face born to find happiness in marriage`,
        `Hyunjin (STRAY KIDS)`,
        `Winter (AESPA)`,
        `https://i.ibb.co/KzR0K05/hyunjin.png`,
        `https://i.ibb.co/NYMtL9S/winter.jpg`,
      ],
      김수현: [
        `Thick and dark eyebrows signal wealth and perseverance. The lack of flesh between the eyebrows and the eyes suggests a bit of egotism but also a meticulous nature. Sharp eyes indicate keen observation and quick wits. The nose suggests a strong desire for wealth, while the philtrum indicates talent, particularly in the arts. Overall, the face indicates a positive, untroubled later life.`,
        `A face born with delicacy, perseverance, and strong will`,
        `Korean Hoon`,
        `Karina (AESPA)`,
        `https://i.ibb.co/9YX56XS/hoon.jpg`,
        `https://i.ibb.co/GnDwFVD/karina.jpg`,
      ],
      김옥빈: [
        `A moderate forehead suggests a bold character, while long, dark eyebrows indicate wealth. Eyes that allure the opposite sex, strong energy, and powerful romantic fortune. Lips that are adept in attracting love, with strong pride. Cheeks suggest ambition and stubbornness, but also wealth and strong vitality. Overall, a flawless face but with a strong energy emanating from it.`,
        `A face born with strong energy`,
        `Felix (STRAY KIDS)`,
        `Irene (RED VELVET)`,
        `https://i.ibb.co/y40c6Cp/felix.webp`,
        `https://i.ibb.co/0yCMKSb/irene.png`,
      ],
      박해일: [
        `A clean, handsome forehead indicates good luck in love and intelligence, with a tendency towards self-admiration, strong will, and focus. Eyes that suggest strong romantic and materialistic desires. A face that seeks both splendor and purity. The corners of the mouth and slightly protruding lips indicate good speaking skills and a positive mindset.`,
        `A face born with strong romantic fortune`,
        `Suga (BTS)`,
        `Dahyun (TWICE)`,
        `https://i.ibb.co/ydXP5rF/suga.webp`,
        `https://i.ibb.co/xfhBPB5/dahyeon.jpg`,
      ],
      송중기: [
        `A forehead resembling a character from a popular comic, indicating intelligence and wisdom. A natural talent rather than hard work. A nose indicating wealth and luck in love. A face indicating strong career fortune and a neat later life, with versatile talents. Resembling a monkey, it suggests a glamorous life through talent.`,
        `A face born of a genius mind`,
        `Jungkook (BTS)`,
        `Taeyeon (GIRLS GENERATION)`,
        `https://i.ibb.co/ctBsR59/jungkook.webp`,
        `https://i.ibb.co/DfSRrhq/taeyeon.jpg`,
      ],
      안소희: [
        `A seagull-shaped forehead indicates a wise and intelligent man. Eyebrows like those of a wealthy family, good fortune with parents and spouse. Enchanting eyes with strong romantic fortune but attracting unwanted attention if not successful. A strong inclination towards the arts, with a gentle and kind nature.`,
        `A face born with strong social skills and charm`,
        `RM (BTS)`,
        `Seulgi (RED VELVET)`,
        `https://i.ibb.co/CvHFBmC/rm.webp`,
        `https://i.ibb.co/bFbHWx5/seulgi.jpg`,
      ],
      수지: [
        `A forehead that might bring heartache due to a spouse, yet a sociable and friendly nature. Good romantic fortune and orderly eyebrows suggest a calm demeanor. A strong personality but can be cold-hearted when turned away. A face with a strong individual character, attracting people's hearts.`,
        `A face born with good romantic fortune`,
        `Taeyong (SUPERM)`,
        `Chaewon (LE SSERAFIM)`,
        `https://i.ibb.co/RSRqMXz/taeyong.webp`,
        `https://i.ibb.co/D5cG8Hz/chaewon.jpg`,
      ],
      유승호: [
        `A clean, refreshing forehead indicates a straightforward personality, good social skills, and lucky eyes indicating wealth and kindness. The nose suggests keen senses, talent, good interpersonal skills, and a calm yet somewhat impatient nature. Large lips indicate decisiveness, a refreshing character, and a generous heart.`,
        'A face born with overall perfection',
        `V (BTS)`,
        `Nayeon (TWICE)`,
        `https://i.ibb.co/p1jwFV0/v.webp`,
        `https://i.ibb.co/P6QQYQK/nayeon.webp`,
      ],
      유아인: [
        `A forehead suggesting a kind and generous nature, but also a streak of stubbornness. Eyes that are affectionate and calm, yet rebellious and strong-willed. Disliking ordinary life and seeking a unique path. A strong jaw indicates wealth and good later life, but also sensitivity.`,
        `A face born not to lead an ordinary life`,
        `J-hope (BTS)`,
        `Yuqi ([G]I-DLE)`,
        `https://i.ibb.co/bQcvt5b/jhope.webp`,
        `https://i.ibb.co/K5q2XFN/yuqi.jpg`,
      ],
      김태희: [
        `Ears resembling those of a donkey, indicating wealth and good social fortune. A small and pretty frontal head shape suggests high judgment and intelligence. Eyebrows longer than the tail of the eyes indicate great wealth. Large teeth in proportion to the head suggest a straightforward personality.`,
        `A face born with good wealth and social fortune`,
        `Bang Chan (STRAY KIDS)`,
        `Soyeon ([G]I-DLE)`,
        `https://i.ibb.co/T41R2Dm/bangchan.webp`,
        `https://i.ibb.co/khGrJn6/soyeon.jpg`,
      ],
      문채원: [
        `Eyebrows indicating good wealth. Eyes that are good at supporting a spouse. Lips that do not reveal one's inner thoughts easily. A jawline indicating good fortune in the later years, especially towards the end of the year. Ears suggest a tendency to overspend and need for restraint. Overall, a good face if matched with a kind spouse.`,
        `A face born to be a good spouse, if well-matched`,
        `Lee Know (STRAY KIDS)`,
        `ROSÉ (BLACKPINK)`,
        `https://i.ibb.co/nDHwGWQ/leeknow.webp`,
        `https://i.ibb.co/kxqSzQr/rose.jpg`,
      ],
      박보영: [
        `A forehead that subtly controls the spouse, with eyebrows and a nose indicating great wealth. Realist eyes and ears, with slightly small lips indicating a tendency to keep one's true feelings hidden. Eyes that are slightly sharp, indicating a strong will to manage the household according to one's principles.`,
        `A face born with hidden sincerity`,
        `Seungmin (STRAY KIDS)`,
        `Wonyoung (IVE)`,
        `https://i.ibb.co/Jx9zTkD/seungmin.png`,
        `https://i.ibb.co/dD6RD8n/wonyoung.png`,
      ],
      소지섭: [
        `A forehead with a vertical wrinkle, indicating a tycoon or CEO. Eyes resembling those of a carp or whale, signifying great wealth. Ears not very visible, suggesting stubbornness and a reserved nature. A face indicating a calm personality but sometimes strong temper, leading a life similar to others in later years.`,
        'A face born with taciturnity and firm principles',
        `Kai (EXO)`,
        `Ryujin (ITZY)`,
        `https://i.ibb.co/tP0Trnp/kai.webp`,
        `https://i.ibb.co/vZ2rvfk/ryujin.jpg`,
      ],
      손예진: [
        `A seagull-shaped forehead indicates a wise and virtuous woman. A large nose in proportion to the face suggests incoming wealth. Ears indicating success for further wealth accumulation. A sharp jawline suggests a pleasant personality. Though there may be troubles with the spouse due to the forehead, wisdom will prevail in handling situations.`,
        `A face born with intelligence and wisdom`,
        `Changbin (STRAY KIDS)`,
        `Momo (TWICE)`,
        `https://i.ibb.co/zm3GfWw/changbin.webp`,
        `https://i.ibb.co/vJdhXNH/momo.jpg`,
      ],
      원빈: [
        `A nose and ears indicating great wealth, especially perfect ears for wealth. A slightly extravagant nature but not a major concern. A handsome face shape suggesting a good fit for a celebrity career, with a square forehead indicating great sociability. Eyes that are not just handsome but beautiful, indicating a tendency to be swayed by emotions. A face indicating quick judgment and intelligence but also a hint of loneliness, suggesting marriage at one's own timing. Overall, a calm and reticent face.`,
        `A face born to achieve anything once set in mind`,
        `Jin (BTS)`,
        `JENNIE (BLACKPINK)`,
        `https://i.ibb.co/0ZK9YNy/jin.webp`,
        `https://i.ibb.co/D9ktshf/jennie.jpg`,
      ],
      이광수: [
        `A forehead indicating strong official fortune and individualistic tendencies. Long, dark eyebrows suggest good wealth, with strong vitality indicated by the eyebrow bone and nose. Eyes indicating devotion to family. A hasty but good-natured personality with strong career fortune and ambitious desires. Ears indicating potential for success and social fortune. Overall, a flawless and fortunate face.`,
        `A face born with exceptional vitality`,
        `Teayang (BIGBANG)`,
        `Jihyo (TWICE)`,
        `https://i.ibb.co/LvKzdGs/taeyang.webp`,
        `https://i.ibb.co/j8F5gfj/image.png`,
      ],
      이승기: [
        `A face indicating strong career fortune, with a square forehead suggesting strong sociability and a preference for work over family. A nose indicating strength and vitality, suitable for business. Large ears suggest good social fortune, belonging to the mood-based and very loyal types. A slightly sharp jawline suggests a life without major ups and downs, with large lips indicating a refreshing and optimistic personality.`,
        `A face born without major life troubles`,
        `GD (BIGBANG)`,
        `Lisa (BLACKPINK)`,
        `https://i.ibb.co/103j7gH/GD.webp`,
        `https://i.ibb.co/k9BnDLq/lisa.jpg`,
      ],
      크리스탈: [
        `A wide, round forehead suggests a slight risk of divorce, but generally good relations with others besides the spouse. Eyebrows that are caring, eyes with strong pride, and a nose indicating wealth. Thin lips suggest keeping one's true feelings hidden. Ears not very visible from the front, indicating a hidden inner world, but overall good sociability and approachability.`,
        `A face born with mastery in interpersonal relationships`,
        `Taemin (SUPERM)`,
        `Yeji (ITZY)`,
        `https://i.ibb.co/fM1pWqb/taemin.webp`,
        `https://i.ibb.co/bFFL9gw/yeji.webp`,
      ],
      손나은: [
        `A forehead of moderate size indicating cleverness and quick wit. Long, orderly eyebrows suggesting femininity. Eyes with a bit of slyness but strong romantic fortune. A short nose with visible nostrils indicating coquettishness and generosity, but a weak fortune with the spouse. The short philtrum suggests smooth interpersonal relationships, preferring to associate with similar-minded people. Overall, a face with strong romantic fortune but needs careful consideration when choosing a spouse.`,
        `A face born to attract unnecessary attention from the opposite sex`,
        `Baekhyun (SUPERM)`,
        `Jisoo (BLACKPINK)`,
        `https://i.ibb.co/gtvgjHc/baekhyun.webp`,
        `https://i.ibb.co/hcjKfkN/jisoo.webp`,
      ],
    }
  } else {
    description = {
      강민경: [
        'A round forehead suggests a liking for outdoor activities over household chores, good interpersonal relationships, and social fortune. Eyebrows indicate wealth and a broad space between them denotes a free spirit. Eyes with a hint of stubbornness and pride, attracting many men, signify a fortune with the opposite sex. The jawline indicates wealth but can also imply fickleness in romance, so caution with relationships is advised. Overall, a face born for success and advancement.',
        'A face born with an open personality',
        `Jisoo (BLACKPINK)`,
        `Baekhyun (SUPERM)`,
        `https://i.ibb.co/hcjKfkN/jisoo.webp`,
        `https://i.ibb.co/gtvgjHc/baekhyun.webp`,
      ],
      강동원: [
        'Blessed with a good forehead, this face shows a strong and calm personality. Eyes resembling those of a phoenix suggest wealth and the ability to attract people. Eyebrows reflect a firm character with strong pride and determination. Ears indicate good social fortune and a compassionate nature. A slightly sharp jawline reveals an amiable personality, while reserved lips suggest thoughtfulness. Overall, a face with an aura that draws people in, opening paths to success.',
        'A face born with a lifetime of wealth',
        `Yeji (ITZY)`,
        `Taemin (SUPERM)`,
        `https://i.ibb.co/bFFL9gw/yeji.webp`,
        `https://i.ibb.co/fM1pWqb/taemin.webp`,
      ],
      강소라: [
        `A well-proportioned forehead suggests good luck in marriage, with eyebrows indicating wealth and strong pride. Full lips denote good fortune in love and adeptness in household management. A strong jaw suggests wealth and a fortunate later life, paired with a friendly nature. Ears resembling those of a donkey indicate good social fortune and career prospects. Although spending might be on the higher side, overall, it's a facial reading of kindness and good fortune.`,
        `A face born to find happiness in marriage`,
        `Lisa (BLACKPINK)`,
        `GD (BIGBANG)`,
        `https://i.ibb.co/k9BnDLq/lisa.jpg`,
        `https://i.ibb.co/103j7gH/GD.webp`,
      ],
      김수현: [
        `Thick and dark eyebrows signal wealth and perseverance. The lack of flesh between the eyebrows and the eyes suggests a bit of egotism but also a meticulous nature. Sharp eyes indicate keen observation and quick wits. The nose suggests a strong desire for wealth, while the philtrum indicates talent, particularly in the arts. Overall, the face indicates a positive, untroubled later life.`,
        `A face born with delicacy, perseverance, and strong will`,
        `Jihyo (TWICE)`,
        `Teayang (BIGBANG)`,
        `https://i.ibb.co/j8F5gfj/image.png`,
        `https://i.ibb.co/LvKzdGs/taeyang.webp`,
      ],
      김옥빈: [
        `A moderate forehead suggests a bold character, while long, dark eyebrows indicate wealth. Eyes that allure the opposite sex, strong energy, and powerful romantic fortune. Lips that are adept in attracting love, with strong pride. Cheeks suggest ambition and stubbornness, but also wealth and strong vitality. Overall, a flawless face but with a strong energy emanating from it.`,
        `A face born with strong energy`,
        `JENNIE (BLACKPINK)`,
        `Jin (BTS)`,
        `https://i.ibb.co/D9ktshf/jennie.jpg`,
        `https://i.ibb.co/0ZK9YNy/jin.webp`,
      ],
      박해일: [
        `A clean, handsome forehead indicates good luck in love and intelligence, with a tendency towards self-admiration, strong will, and focus. Eyes that suggest strong romantic and materialistic desires. A face that seeks both splendor and purity. The corners of the mouth and slightly protruding lips indicate good speaking skills and a positive mindset.`,
        `A face born with strong romantic fortune`,
        `Momo (TWICE)`,
        `Changbin (STRAY KIDS)`,
        `https://i.ibb.co/vJdhXNH/momo.jpg`,
        `https://i.ibb.co/zm3GfWw/changbin.webp`,
      ],
      송중기: [
        `A forehead resembling a character from a popular comic, indicating intelligence and wisdom. A natural talent rather than hard work. A nose indicating wealth and luck in love. A face indicating strong career fortune and a neat later life, with versatile talents. Resembling a monkey, it suggests a glamorous life through talent.`,
        `A face born of a genius mind`,
        `Ryujin (ITZY)`,
        `Kai (EXO)`,
        `https://i.ibb.co/vZ2rvfk/ryujin.jpg`,
        `https://i.ibb.co/tP0Trnp/kai.webp`,
      ],
      안소희: [
        `A seagull-shaped forehead indicates a wise and intelligent woman. Eyebrows like those of a wealthy family, good fortune with parents and spouse. Enchanting eyes with strong romantic fortune but attracting unwanted attention if not successful. A strong inclination towards the arts, with a gentle and kind nature.`,
        `A face born with strong social skills and charm`,
        `Wonyoung (IVE)`,
        `Seungmin (STRAY KIDS)`,
        `https://i.ibb.co/dD6RD8n/wonyoung.png`,
        `https://i.ibb.co/Jx9zTkD/seungmin.png`,
      ],
      수지: [
        `A forehead that might bring heartache due to a spouse, yet a sociable and friendly nature. Good romantic fortune and orderly eyebrows suggest a feminine and calm demeanor. A strong personality but can be cold-hearted when turned away. A face with a strong individual character, attracting people's hearts.`,
        `A face born with good romantic fortune`,
        `ROSÉ (BLACKPINK)`,
        `Lee Know (STRAY KIDS)`,
        `https://i.ibb.co/kxqSzQr/rose.jpg`,
        `https://i.ibb.co/nDHwGWQ/leeknow.webp`,
      ],
      유승호: [
        `A clean, refreshing forehead indicates a straightforward personality, good social skills, and lucky eyes indicating wealth and kindness. The nose suggests keen senses, talent, good interpersonal skills, and a calm yet somewhat impatient nature. Large lips indicate decisiveness, a refreshing character, and a generous heart.`,
        'A face born with overall perfection',
        `Soyeon ([G]I-DLE)`,
        `Bang Chan (STRAY KIDS)`,
        `https://i.ibb.co/khGrJn6/soyeon.jpg`,
        `https://i.ibb.co/T41R2Dm/bangchan.webp`,
      ],
      유아인: [
        `A forehead suggesting a kind and generous nature, but also a streak of stubbornness. Eyes that are affectionate and calm, yet rebellious and strong-willed. Disliking ordinary life and seeking a unique path. A strong jaw indicates wealth and good later life, but also sensitivity.`,
        `A face born not to lead an ordinary life`,
        `Yuqi ([G]I-DLE)`,
        `J-hope (BTS)`,
        `https://i.ibb.co/K5q2XFN/yuqi.jpg`,
        `https://i.ibb.co/bQcvt5b/jhope.webp`,
      ],
      김태희: [
        `Ears resembling those of a donkey, indicating wealth and good social fortune. A small and pretty frontal head shape suggests high judgment and intelligence. Eyebrows longer than the tail of the eyes indicate great wealth. Large teeth in proportion to the head suggest a straightforward personality.`,
        `A face born with good wealth and social fortune`,
        `Nayeon (TWICE)`,
        `V (BTS)`,
        `https://i.ibb.co/P6QQYQK/nayeon.webp`,
        `https://i.ibb.co/p1jwFV0/v.webp`,
      ],
      문채원: [
        `Eyebrows indicating good wealth. Eyes that are good at supporting a spouse. Lips that do not reveal one's inner thoughts easily. A jawline indicating good fortune in the later years, especially towards the end of the year. Ears suggest a tendency to overspend and need for restraint. Overall, a good face if matched with a kind spouse.`,
        `A face born to be a good spouse, if well-matched`,
        `Chaewon (LE SSERAFIM)`,
        `Taeyong (SUPERM)`,
        `https://i.ibb.co/D5cG8Hz/chaewon.jpg`,
        `https://i.ibb.co/RSRqMXz/taeyong.webp`,
      ],
      박보영: [
        `A forehead that subtly controls the spouse, with eyebrows and a nose indicating great wealth. Realist eyes and ears, with slightly small lips indicating a tendency to keep one's true feelings hidden. Eyes that are slightly sharp, indicating a strong will to manage the household according to one's principles.`,
        `A face born with hidden sincerity`,
        `Seulgi (RED VELVET)`,
        `RM (BTS)`,
        `https://i.ibb.co/bFbHWx5/seulgi.jpg`,
        `https://i.ibb.co/CvHFBmC/rm.webp`,
      ],
      소지섭: [
        `A forehead with a vertical wrinkle, indicating a tycoon or CEO. Eyes resembling those of a carp or whale, signifying great wealth. Ears not very visible, suggesting stubbornness and a reserved nature. A face indicating a calm personality but sometimes strong temper, leading a life similar to others in later years.`,
        'A face born with taciturnity and firm principles',
        `Taeyeon (GIRLS GENERATION)`,
        `Jungkook (BTS)`,
        `https://i.ibb.co/DfSRrhq/taeyeon.jpg`,
        `https://i.ibb.co/ctBsR59/jungkook.webp`,
      ],
      손예진: [
        `A seagull-shaped forehead indicates a wise and virtuous woman. A large nose in proportion to the face suggests incoming wealth. Ears indicating success for further wealth accumulation. A sharp jawline suggests a pleasant personality. Though there may be troubles with the spouse due to the forehead, wisdom will prevail in handling situations.`,
        `A face born with intelligence and wisdom`,
        `Dahyun (TWICE)`,
        `Suga (BTS)`,
        `https://i.ibb.co/xfhBPB5/dahyeon.jpg`,
        `https://i.ibb.co/ydXP5rF/suga.webp`,
      ],
      원빈: [
        `A nose and ears indicating great wealth, especially perfect ears for wealth. A slightly extravagant nature but not a major concern. A pretty face shape suggesting a good fit for a celebrity career, with a square forehead indicating great sociability. Eyes that are not just pretty but beautiful, indicating a tendency to be swayed by emotions. A face indicating quick judgment and intelligence but also a hint of loneliness, suggesting marriage at one's own timing. Overall, a calm and reticent face.`,
        `A face born to achieve anything once set in mind`,
        `Irene (RED VELVET)`,
        `Felix (STRAY KIDS)`,
        `https://i.ibb.co/0yCMKSb/irene.png`,
        `https://i.ibb.co/y40c6Cp/felix.webp`,
      ],
      이광수: [
        `A forehead suggesting a strong career fortune and individualistic tendencies. Long, dark eyebrows indicate good wealth management abilities, with vitality reflected in the arch of the eyebrows and the shape of the nose. Eyes that show deep devotion to family. A personality that is quick yet kind-hearted, with a strong drive for professional success and ambitious aspirations. Ears that hint at potential achievements and social connections. Overall, a face that exudes grace and good fortune.`,
        `A face born with exceptional vitality`,
        `Karina (AESPA)`,
        `Korean Hoon`,
        `https://i.ibb.co/GnDwFVD/karina.jpg`,
        `https://i.ibb.co/9YX56XS/hoon.jpg`,
      ],
      이승기: [
        `A face indicating strong career fortune, with a square forehead suggesting strong sociability and a preference for work over family. A nose indicating strength and vitality, suitable for business. Large ears suggest good social fortune, belonging to the mood-based and very loyal types. A slightly sharp jawline suggests a life without major ups and downs, with large lips indicating a refreshing and optimistic personality.`,
        `A face born without major life troubles`,
        `Winter (AESPA)`,
        `Hyunjin (STRAY KIDS)`,
        `https://i.ibb.co/NYMtL9S/winter.jpg`,
        `https://i.ibb.co/KzR0K05/hyunjin.png`,
      ],
      크리스탈: [
        `A wide, round forehead suggests a slight risk of divorce, but generally good relations with others besides the spouse. Eyebrows that are caring, eyes with strong pride, and a nose indicating wealth. Thin lips suggest keeping one's true feelings hidden. Ears not very visible from the front, indicating a hidden inner world, but overall good sociability and approachability.`,
        `A face born with mastery in interpersonal relationships`,
        `Sana (TWICE)`,
        `Jimmin (BTS)`,
        `https://i.ibb.co/0hFmxyR/sana.jpg`,
        `https://i.ibb.co/pLyRpJG/jimmin.webp`,
      ],
      손나은: [
        `A forehead of moderate size indicating cleverness and quick wit. Long, orderly eyebrows suggesting femininity. Eyes with a bit of slyness but strong romantic fortune. A short nose with visible nostrils indicating coquettishness and generosity, but a weak fortune with the spouse. The short philtrum suggests smooth interpersonal relationships, preferring to associate with similar-minded people. Overall, a face with strong romantic fortune but needs careful consideration when choosing a spouse.`,
        `A face born to attract unnecessary attention from the opposite sex`,
        `Tzuyu (TWICE)`,
        `Cha Eunwoo (ASTRO)`,
        `https://i.ibb.co/DC6v6LJ/tzuyu.jpg`,
        `https://i.ibb.co/g9TrJqt/Cha-Eunwoo.webp`,
      ],
    }
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
        <div class="other_star_img_wrapper">
        <img src="${
          description[resultArray[j].key][5]
        }" alt="k-pop_AI" class="other_star_img" />
        </div>
        <div class="other_star_result_wrapper">
      <div class="star__list__img">
      ${description[resultArray[j].key][3]}
      </div> 
      <div class="percent_bar">
      <div class="percent zero" style="width: 1%">
      ${resultArray[j].value}%
      </div>
      </div>
      </div>
    </div>
      `
    } else if (resultArray[j].value > 0 && resultArray[j].value <= 10) {
      starsListImg =
        starsListImg +
        ` <div class="star__list__wrap">
        <div class="other_star_img_wrapper">
        <img src="${
          description[resultArray[j].key][5]
        }" alt="k-pop_AI" class="other_star_img" />
        </div>
        <div class="other_star_result_wrapper">
      <div class="star__list__img">
      ${description[resultArray[j].key][3]}
      </div> 
      <div class="percent_bar">
      <div class="percent zeroone" style="width: ${resultArray[j].value}%">
      ${resultArray[j].value}%
      </div>
      </div>
      </div>
    </div>
      `
    } else if (resultArray[j].value > 10 && resultArray[j].value <= 20) {
      starsListImg =
        starsListImg +
        ` <div class="star__list__wrap">
        <div class="other_star_img_wrapper">
        <img src="${
          description[resultArray[j].key][5]
        }" alt="k-pop_AI" class="other_star_img" />
        </div>
        <div class="other_star_result_wrapper">
      <div class="star__list__img">
      ${description[resultArray[j].key][3]}
      </div> 
      <div class="percent_bar">
      <div class="percent onetwo" style="width: ${resultArray[j].value}%">
      ${resultArray[j].value}%
      </div>
      </div>
      </div>
    </div>
      `
    } else if (resultArray[j].value > 20 && resultArray[j].value <= 30) {
      starsListImg =
        starsListImg +
        ` <div class="star__list__wrap">
        <div class="other_star_img_wrapper">
        <img src="${
          description[resultArray[j].key][5]
        }" alt="k-pop_AI" class="other_star_img" />
        </div>
        <div class="other_star_result_wrapper">
      <div class="star__list__img">
      ${description[resultArray[j].key][3]}
      </div> 
      <div class="percent_bar">
      <div class="percent twothree" style="width: ${resultArray[j].value}%">
      ${resultArray[j].value}%
      </div>
      </div>
      </div>
    </div>
      `
    } else if (resultArray[j].value > 30 && resultArray[j].value <= 40) {
      starsListImg =
        starsListImg +
        ` <div class="star__list__wrap">
        <div class="other_star_img_wrapper">
        <img src="${
          description[resultArray[j].key][5]
        }" alt="k-pop_AI" class="other_star_img" />
        </div>
        <div class="other_star_result_wrapper">
      <div class="star__list__img">
      ${description[resultArray[j].key][3]}
      </div> 
      <div class="percent_bar">
      <div class="percent threefour" style="width: ${resultArray[j].value}%">
      ${resultArray[j].value}%
      </div>
      </div>
      </div>
    </div>
      `
    } else if (resultArray[j].value > 40 && resultArray[j].value <= 50) {
      starsListImg =
        starsListImg +
        ` <div class="star__list__wrap">
        <div class="other_star_img_wrapper">
        <img src="${
          description[resultArray[j].key][5]
        }" alt="k-pop_AI" class="other_star_img" />
        </div>
        <div class="other_star_result_wrapper">
      <div class="star__list__img">
      ${description[resultArray[j].key][3]}
      </div> 
      <div class="percent_bar">
      <div class="percent fourfive" style="width: ${resultArray[j].value}%">
      ${resultArray[j].value}%
      </div>
      </div>
      </div>
    </div>
      `
    } else if (resultArray[j].value > 50 && resultArray[j].value <= 60) {
      starsListImg =
        starsListImg +
        ` <div class="star__list__wrap">
        <div class="other_star_img_wrapper">
        <img src="${
          description[resultArray[j].key][5]
        }" alt="k-pop_AI" class="other_star_img" />
        </div>
        <div class="other_star_result_wrapper">
      <div class="star__list__img">
      ${description[resultArray[j].key][3]}
      </div> 
      <div class="percent_bar">
      <div class="percent fivesix" style="width: ${resultArray[j].value}%">
      ${resultArray[j].value}%
      </div>
      </div>
      </div>
    </div>
      `
    } else if (resultArray[j].value > 60 && resultArray[j].value <= 70) {
      starsListImg =
        starsListImg +
        ` <div class="star__list__wrap">
        <div class="other_star_img_wrapper">
        <img src="${
          description[resultArray[j].key][5]
        }" alt="k-pop_AI" class="other_star_img" />
        </div>
        <div class="other_star_result_wrapper">
      <div class="star__list__img">
      ${description[resultArray[j].key][3]}
      </div> 
      <div class="percent_bar">
      <div class="percent sixseven" style="width: ${resultArray[j].value}%">
      ${resultArray[j].value}%
      </div>
      </div>
      </div>
    </div>
      `
    } else if (resultArray[j].value > 70 && resultArray[j].value <= 80) {
      starsListImg =
        starsListImg +
        ` <div class="star__list__wrap">
        <div class="other_star_img_wrapper">
        <img src="${
          description[resultArray[j].key][5]
        }" alt="k-pop_AI" class="other_star_img" />
        </div>
        <div class="other_star_result_wrapper">
      <div class="star__list__img">
      ${description[resultArray[j].key][3]}
      </div> 
      <div class="percent_bar">
      <div class="percent seveneight" style="width: ${resultArray[j].value}%">
      ${resultArray[j].value}%
      </div>
      </div>
      </div>
    </div>
      `
    } else if (resultArray[j].value > 80 && resultArray[j].value <= 90) {
      starsListImg =
        starsListImg +
        ` <div class="star__list__wrap">
        <div class="other_star_img_wrapper">
        <img src="${
          description[resultArray[j].key][5]
        }" alt="k-pop_AI" class="other_star_img" />
        </div>
        <div class="other_star_result_wrapper">
      <div class="star__list__img">
      ${description[resultArray[j].key][3]}
      </div> 
      <div class="percent_bar">
      <div class="percent eightnine" style="width: ${resultArray[j].value}%">
      ${resultArray[j].value}%
      </div>
      </div>
      </div>
    </div>
      `
    } else if (resultArray[j].value > 90 && resultArray[j].value <= 100) {
      starsListImg =
        starsListImg +
        ` <div class="star__list__wrap">
        <div class="other_star_img_wrapper">
        <img src="${
          description[resultArray[j].key][5]
        }" alt="k-pop_AI" class="other_star_img" />
        </div>
        <div class="other_star_result_wrapper">
      <div class="star__list__img">
      ${description[resultArray[j].key][3]}
      </div> 
      <div class="percent_bar">
      <div class="percent nineten" style="width: ${resultArray[j].value}%">
      ${resultArray[j].value}%
      </div>
      </div>
      </div>
    </div>
      `
    }
  }

  let result = document.createElement('div')
  result.classList.add('result_face')
  result.textContent = `${description[answer][1]}`
  labelContainer.appendChild(result)

  let result2 = document.createElement('div')
  result2.classList.add('celebrity')
  result2.innerHTML = `You look like <span style="font-weight: bold">${description[answer][2]}</span>`
  labelContainer.appendChild(result2)

  // let desc = document.createElement('div')
  // desc.classList.add('main__result__content__p')
  // desc.textContent = description[answer][0]
  // labelContainer.appendChild(desc)

  let desc = document.createElement('div')
  desc.classList.add('main__result__content__p')
  desc.innerHTML = `<div class="main_result_content_wrap">
<div class=main_result_content_img_wrapper>
                      <img src="${description[answer][4]}" alt="k-pop_AI" class="main_result_content_img" /></div>
                      <p>${description[answer][0]}</p>
                    </div>`
  labelContainer.appendChild(desc)

  let coupleTitle = document.createElement('div')
  coupleTitle.classList.add('couple__title')
  coupleTitle.textContent = `A Match Made In Haeven Celebrity`
  labelContainer.appendChild(coupleTitle)

  let otherResult = document.createElement('div')
  otherResult.classList.add('other__result')
  otherResult.innerHTML = `${starsListImg}`
  labelContainer.appendChild(otherResult)

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
