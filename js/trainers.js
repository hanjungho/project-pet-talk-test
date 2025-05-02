// trainers.js - 훈련사 목록 관련 기능

// API 기본 URL
const API_BASE_URL = 'http://localhost:8443';

// 전역 변수
let trainers = []; // 훈련사 목록을 저장할 배열
let currentFilters = { // 현재 적용된 필터를 저장할 객체
    specialization: '',
    rating: ''
};

document.addEventListener('DOMContentLoaded', () => {
    // 필터 이벤트 리스너 등록
    const specializationFilter = document.getElementById('specialization');
    const ratingFilter = document.getElementById('rating');
    const searchBtn = document.getElementById('search-btn');
    
    if (specializationFilter) {
        specializationFilter.addEventListener('change', (e) => {
            currentFilters.specialization = e.target.value;
        });
    }
    
    if (ratingFilter) {
        ratingFilter.addEventListener('change', (e) => {
            currentFilters.rating = e.target.value;
        });
    }
    
    if (searchBtn) {
        searchBtn.addEventListener('click', () => {
            filterTrainers();
        });
    }
    
    // 초기 훈련사 목록 로드
    fetchTrainers();
});

// 훈련사 목록 가져오기
async function fetchTrainers() {
    const trainersContainer = document.getElementById('trainers-list');
    if (!trainersContainer) return;
    
    try {
        // 로딩 표시
        trainersContainer.innerHTML = `
            <div class="loading">
                <i class="fas fa-spinner fa-spin"></i>
                <p>훈련사 정보를 불러오는 중...</p>
            </div>
        `;
        
        // 실제 API에서는 아래와 같이 모든 훈련사 목록을 가져오는 엔드포인트가 필요
        // 현재 백엔드에는 이 API가 구현되어 있지 않아 임시 데이터 사용
        // 실제 구현 시에는 주석 해제
        /*
        const response = await fetch(`${API_BASE_URL}/api/v1/trainers`, {
            method: 'GET'
        });
        
        if (response.ok) {
            trainers = await response.json();
            renderTrainers(trainers);
        } else {
            throw new Error('훈련사 목록을 불러오는 데 실패했습니다.');
        }
        */
        
        // 임시 데이터 (실제 구현 시 삭제)
        setTimeout(() => {
            trainers = [
                {
                    trainerId: '123e4567-e89b-12d3-a456-426614174000',
                    nickname: '김훈련',
                    profileImageUrl: '/api/placeholder/300/300',
                    introduction: '10년 경력의 반려동물 행동 전문가입니다.',
                    experienceYears: 10,
                    specializations: ['기본훈련', '분리불안', '공격성'],
                    averageRating: 4.8,
                    reviewCount: 32
                },
                {
                    trainerId: '223e4567-e89b-12d3-a456-426614174001',
                    nickname: '박상담',
                    profileImageUrl: '/api/placeholder/300/300',
                    introduction: '특수견 훈련 전문가입니다.',
                    experienceYears: 5,
                    specializations: ['기본훈련', '문제행동', '사회화'],
                    averageRating: 4.5,
                    reviewCount: 18
                },
                {
                    trainerId: '323e4567-e89b-12d3-a456-426614174002',
                    nickname: '이멍멍',
                    profileImageUrl: '/api/placeholder/300/300',
                    introduction: '강아지 유치원을 운영하고 있습니다.',
                    experienceYears: 7,
                    specializations: ['사회화', '배변훈련', '기본훈련'],
                    averageRating: 4.9,
                    reviewCount: 27
                },
                {
                    trainerId: '423e4567-e89b-12d3-a456-426614174003',
                    nickname: '최고양',
                    profileImageUrl: '/api/placeholder/300/300',
                    introduction: '고양이 행동 전문가입니다.',
                    experienceYears: 8,
                    specializations: ['배변훈련', '스크래치', '사회화'],
                    averageRating: 4.7,
                    reviewCount: 20
                },
                {
                    trainerId: '523e4567-e89b-12d3-a456-426614174004',
                    nickname: '정애견',
                    profileImageUrl: '/api/placeholder/300/300',
                    introduction: '노견 케어 전문가입니다.',
                    experienceYears: 12,
                    specializations: ['노견케어', '건강관리', '기본훈련'],
                    averageRating: 5.0,
                    reviewCount: 45
                }
            ];
            
            renderTrainers(trainers);
        }, 1000); // 1초 지연 (로딩 효과 시뮬레이션)
    } catch (error) {
        console.error('훈련사 목록 로드 중 오류 발생:', error);
        
        // 오류 메시지 표시
        trainersContainer.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-circle"></i>
                <p>훈련사 정보를 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.</p>
            </div>
        `;
    }
}

// 훈련사 목록 렌더링
function renderTrainers(trainersData) {
    const trainersContainer = document.getElementById('trainers-list');
    if (!trainersContainer) return;
    
    // 목록이 비어있는 경우
    if (!trainersData || trainersData.length === 0) {
        trainersContainer.innerHTML = `
            <div class="empty-list-message">
                <i class="fas fa-search"></i>
                <p>조건에 맞는 훈련사가 없습니다.</p>
            </div>
        `;
        return;
    }
    
    // 훈련사 카드 생성
    trainersContainer.innerHTML = '';
    trainersData.forEach(trainer => {
        const card = createTrainerCard(trainer);
        trainersContainer.appendChild(card);
    });
}

// 훈련사 카드 생성
function createTrainerCard(trainer) {
    const card = document.createElement('div');
    card.className = 'trainer-card';
    
    // 별점 HTML 생성
    const stars = generateStarsHtml(trainer.averageRating);
    
    // 전문 분야 태그 HTML 생성
    const specialtiesTags = trainer.specializations.map(specialty => 
        `<span class="tag">${specialty}</span>`
    ).join('');
    
    card.innerHTML = `
        <div class="trainer-card-image">
            <img src="${trainer.profileImageUrl}" alt="${trainer.nickname} 프로필">
        </div>
        <div class="trainer-card-content">
            <h3 class="trainer-card-name">${trainer.nickname} 훈련사</h3>
            <div class="trainer-card-rating">
                <div class="stars">${stars}</div>
                <span class="count">(${trainer.reviewCount}개 후기)</span>
            </div>
            <div class="trainer-card-specialties">
                <div class="title">전문 분야</div>
                <div class="tags">
                    ${specialtiesTags}
                </div>
            </div>
            <div class="trainer-card-experience">
                <i class="fas fa-briefcase"></i> 경력 ${trainer.experienceYears}년
            </div>
            <div class="trainer-card-actions">
                <a href="/trainer-detail.html?id=${trainer.trainerId}" class="btn primary full-width">자세히 보기</a>
            </div>
        </div>
    `;
    
    return card;
}

// 별점 HTML 생성 함수
function generateStarsHtml(rating) {
    let html = '';
    
    // 정수 부분과 소수 부분 분리
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    
    // 꽉 찬 별
    for (let i = 0; i < fullStars; i++) {
        html += '<i class="fas fa-star"></i>';
    }
    
    // 반 별
    if (hasHalfStar) {
        html += '<i class="fas fa-star-half-alt"></i>';
    }
    
    // 빈 별
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    for (let i = 0; i < emptyStars; i++) {
        html += '<i class="far fa-star"></i>';
    }
    
    return html;
}

// 훈련사 필터링 함수
function filterTrainers() {
    if (!trainers || trainers.length === 0) return;
    
    const filtered = trainers.filter(trainer => {
        // 전문 분야 필터
        if (currentFilters.specialization && 
            !trainer.specializations.includes(currentFilters.specialization)) {
            return false;
        }
        
        // 평점 필터
        if (currentFilters.rating && 
            trainer.averageRating < parseInt(currentFilters.rating)) {
            return false;
        }
        
        return true;
    });
    
    // 필터링된 목록 렌더링
    renderTrainers(filtered);
}