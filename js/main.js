// main.js - 메인 페이지 기능

document.addEventListener('DOMContentLoaded', () => {
    // 테스티모니얼 슬라이더 구현
    initializeTestimonialSlider();
});

// 테스티모니얼 슬라이더 초기화 함수
function initializeTestimonialSlider() {
    const slider = document.querySelector('.testimonial-slider');
    if (!slider) return;

    const testimonials = Array.from(slider.querySelectorAll('.testimonial'));
    if (testimonials.length <= 1) return;

    let currentIndex = 0;
    let autoSlideInterval;

    // 슬라이더 컨트롤 요소 추가
    const controls = document.createElement('div');
    controls.className = 'slider-controls';
    
    const prevBtn = document.createElement('button');
    prevBtn.className = 'slider-btn prev';
    prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
    
    const nextBtn = document.createElement('button');
    nextBtn.className = 'slider-btn next';
    nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
    
    controls.appendChild(prevBtn);
    controls.appendChild(nextBtn);
    
    slider.parentNode.appendChild(controls);

    // 인디케이터 추가
    const indicators = document.createElement('div');
    indicators.className = 'slider-indicators';
    
    testimonials.forEach((_, i) => {
        const dot = document.createElement('span');
        dot.className = 'indicator' + (i === 0 ? ' active' : '');
        dot.addEventListener('click', () => {
            goToSlide(i);
        });
        indicators.appendChild(dot);
    });
    
    slider.parentNode.appendChild(indicators);

    // 슬라이드 이동 함수
    function goToSlide(index) {
        // 범위를 벗어나지 않도록 인덱스 조정
        if (index < 0) index = testimonials.length - 1;
        if (index >= testimonials.length) index = 0;
        
        // 현재 슬라이드 비활성화
        testimonials[currentIndex].classList.remove('active');
        document.querySelectorAll('.slider-indicators .indicator')[currentIndex].classList.remove('active');
        
        // 새 슬라이드 활성화
        currentIndex = index;
        testimonials[currentIndex].classList.add('active');
        document.querySelectorAll('.slider-indicators .indicator')[currentIndex].classList.add('active');
        
        // 슬라이더 스크롤 이동
        const slideWidth = testimonials[0].offsetWidth;
        slider.scrollLeft = currentIndex * slideWidth;
    }

    // 초기 슬라이드 설정
    testimonials.forEach((slide, i) => {
        slide.classList.toggle('active', i === 0);
    });

    // 이벤트 리스너
    prevBtn.addEventListener('click', () => {
        goToSlide(currentIndex - 1);
        resetAutoSlide();
    });
    
    nextBtn.addEventListener('click', () => {
        goToSlide(currentIndex + 1);
        resetAutoSlide();
    });

    // 자동 슬라이드 기능
    function startAutoSlide() {
        autoSlideInterval = setInterval(() => {
            goToSlide(currentIndex + 1);
        }, 5000); // 5초마다 슬라이드 변경
    }

    function resetAutoSlide() {
        clearInterval(autoSlideInterval);
        startAutoSlide();
    }

    // 자동 슬라이드 시작
    startAutoSlide();

    // 슬라이더에 마우스를 올리면 자동 슬라이드 일시 중지
    slider.addEventListener('mouseenter', () => {
        clearInterval(autoSlideInterval);
    });
    
    // 슬라이더에서 마우스가 벗어나면 자동 슬라이드 재시작
    slider.addEventListener('mouseleave', () => {
        startAutoSlide();
    });

    // 모바일 터치 이벤트 처리
    let touchStartX = 0;
    let touchEndX = 0;
    
    slider.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
    });
    
    slider.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    });
    
    function handleSwipe() {
        const swipeThreshold = 50; // 스와이프로 인식할 최소 거리
        
        // 왼쪽으로 스와이프
        if (touchEndX < touchStartX - swipeThreshold) {
            goToSlide(currentIndex + 1);
            resetAutoSlide();
        }
        
        // 오른쪽으로 스와이프
        if (touchEndX > touchStartX + swipeThreshold) {
            goToSlide(currentIndex - 1);
            resetAutoSlide();
        }
    }
}

// 추가적인 메인 페이지 기능들을 여기에 구현...