// 🔵 상품 카드 렌더링
function renderPremiumFeatureResult() {
  const products = [
    {
      key: "base",
      url: (id) => `/new-version2/base/`,
      emoji: "🐍",
      title: "[1,500만명 돌파] 처음 보는 내 관상: 생각 이상으로 자세하네?",
      desc: "3,000+ 글자",
      rating: 4.9,
      views: "4,500+",
      discount: 100,
      price: "무료",
      original_price: 6900,
      thumbnail: "/img/base.png",
    },
    {
      key: "wealth",
      url: () => `/report/wealth/?type=wealth`,
      emoji: "💸",
      title: "[지금 인기] 타고난 부: 10억, 100억 내가 평생 모을 재산은?",
      desc: "10,000+ 글자",
      rating: 4.9,
      views: "10,000+",
      discount: 52,
      price: "16,900원",
      original_price: 34900,
      thumbnail: "/img/wealth.png",
    },
    {
      key: "love",
      url: () => `/report/love/?type=love`,
      emoji: "💖",
      title: "연애 관상: 총 연애 횟수, 내 운명은 어디에?",
      desc: "6,000+ 글자",
      rating: 4.9,
      views: "2,800+",
      discount: 54,
      price: "6,900원",
      original_price: 14900,
      thumbnail: "/img/love.png",
    },
    {
      key: "marriage",
      url: () => `/report/marriage/?id=$type=marriage`,
      emoji: "💍",
      title: "결혼운: 언제, 누구와 결혼할지 얼굴에 다 나와 있다면?",
      desc: "8,000+ 글자",
      rating: 4.8,
      views: "2,300+",
      discount: 42,
      price: "9,900원",
      original_price: 16900,
      thumbnail: "/img/marriage.png",
    },
  ];

  const productCards = products
    .map(
      (product) => `
   <div class="product-card" onclick="
          location.href='${product.url()}';
    " style="cursor: pointer;">
  
    <div class="product-image">
      <img src="${product.thumbnail}" alt="${
        product.key
      }" class="square-image" />
    </div>
    <div class="product-info">
      <div class="product-title">${product.title}</div>
          <div class="product-meta">
          <div class="product-stats">총 ${product.desc}</div>
            <div class="product-meta-price">
              <div class="product-original-price">${product.original_price.toLocaleString()}원</div>
              <div class="discount">${product.discount}%</div>
              <div class="product-price">${product.price}</div>
            </div>
          </div>
    </div>
  </div>
  `
    )
    .join("");

  document.querySelector(".premium_face_product").innerHTML = `
  <div class="face-product-section">${productCards}</div>
  `;
}

function renderFreeFeatureResult() {
  const products = [
    {
      key: "base",
      url: (id) => `/new-version2/base/`,
      emoji: "🐍",
      title: "[1,500만명 돌파] 처음 보는 내 관상: 생각 이상으로 자세하네?",
      desc: "3,000+ 글자",
      rating: 4.9,
      views: "4,500+",
      discount: 100,
      price: "무료",
      original_price: 6900,
      thumbnail: "/img/base.png",
    },
  ];

  const productCards = products
    .map(
      (product) => `
     <div class="product-card" onclick="
            location.href='${product.url()}';
      " style="cursor: pointer;">
    
      <div class="product-image">
        <img src="${product.thumbnail}" alt="${
        product.key
      }" class="square-image" />
      </div>
      <div class="product-info">
        <div class="product-title">${product.title}</div>
            <div class="product-meta">
            <div class="product-stats">총 ${product.desc}</div>
              <div class="product-meta-price">
                <div class="product-original-price">${product.original_price.toLocaleString()}원</div>
                <div class="discount">${product.discount}%</div>
                <div class="product-price">${product.price}</div>
              </div>
            </div>
      </div>
    </div>
    `
    )
    .join("");

  document.querySelector(".free_face_product").innerHTML = `
    <div class="face-product-section">${productCards}</div>
    `;
}

function init() {
  renderPremiumFeatureResult();
  renderFreeFeatureResult(0);
}

init();
