// 훈련사 리뷰 가져오기
async function fetchTrainerReviews(trainerId) {
    try {
        // API 요청 - 훈련사 리뷰 가져오기
        const response = await fetch(`${API_BASE_URL}/api/v1/reviews/trainers/${trainerId}`, {
            method: 'GET'
        });
        
        if (response.ok) {
            const reviews = await response.json();
            renderTrainerReviews(reviews);
        } else {
            throw new Error('리뷰 정보를 불러오는 데 실패했습니다.');
        }
    } catch (error) {
        console.error('리뷰 목록 로드 중 오류 발생:', error);
        
        const reviewsList = document.getElementById('reviews-list');
        if (reviewsList) {
            reviewsList.innerHTML = `
                <div class="error-message">
                    <p>리뷰 정보를 불러오는 데 실패했습니다.</p>
                </div>
            `;
        }
    }
}

// 훈련사 리뷰 렌더링
function renderTrainerReviews(reviews) {
    const reviewsList = document.getElementById('reviews-list');
    const totalReviews = document.getElementById('total-reviews');
    
    if (!reviewsList) return;
    
    if (totalReviews) {
        totalReviews.textContent = `(${reviews.length})`;
    }
    
    if (!reviews || reviews.length === 0) {
        reviewsList.innerHTML = `
            <div class="empty-list-message">
                <p>아직 작성된 후기가 없습니다.</p>
            </div>
        `;
        return;
    }
    
    reviewsList.innerHTML = '';
    reviews.forEach(review => {
        reviewsList.appendChild(createReviewItem(review));
    });
}

// 리뷰 항목 생성 함수
function createReviewItem(review) {
    const reviewItem = document.createElement('div');
    reviewItem.className = 'review-item';
    
    // 날짜 포맷 변환
    const createdDate = new Date(review.createdAt).toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    // 별점 HTML 생성
    const starsHtml = generateStarsHtml(review.rating);
    
    reviewItem.innerHTML = `
        <div class="review-header">
            <div class="review-author">
                <img src="/api/placeholder/40/40" alt="${review.userName} 프로필">
                <span class="review-author-name">${review.userName}</span>
            </div>
            <div class="review-date">${createdDate}</div>
        </div>
        <div class="review-rating">${starsHtml}</div>
        <div class="review-content">
            <div class="review-title">${review.title}</div>
            <div class="review-text">${review.comment}</div>
            ${review.reviewImageUrl ? `<img src="${review.reviewImageUrl}" alt="후기 이미지" class="review-image">` : ''}
        </div>
        <div class="review-actions">
            <button class="like-btn ${review.hasLiked ? 'liked' : ''}" data-review-id="${review.reviewId}">
                <i class="far fa-thumbs-up"></i> 도움됨 (${review.likeCount})
            </button>
        </div>
    `;
    
    // 좋아요 버튼 이벤트 리스너
    const likeBtn = reviewItem.querySelector('.like-btn');
    if (likeBtn) {
        likeBtn.addEventListener('click', () => {
            if (isLoggedIn()) {
                toggleReviewLike(review.reviewId, likeBtn, review.hasLiked);
            } else {
                if (confirm('로그인이 필요한 서비스입니다. 로그인 페이지로 이동하시겠습니까?')) {
                    window.location.href = '/login.html';
                }
            }
        });
    }
    
    return reviewItem;
}

// 별점 HTML 생성 함수
function generateStarsHtml(rating) {
    let html = '';
    
    for (let i = 1; i <= 5; i++) {
        if (i <= rating) {
            html += '<i class="fas fa-star"></i>';
        } else {
            html += '<i class="far fa-star"></i>';
        }
    }
    
    return html;
}

// 리뷰 좋아요 토글 함수
async function toggleReviewLike(reviewId, likeBtn, hasLiked) {
    try {
        let response;
        
        if (!hasLiked) {
            // 좋아요 추가
            response = await fetchWithAuth(`/api/v1/reviews/${reviewId}/likes`, {
                method: 'POST'
            });
        } else {
            // 좋아요 제거
            response = await fetchWithAuth(`/api/v1/reviews/${reviewId}/likes`, {
                method: 'DELETE'
            });
        }
        
        if (response.ok) {
            // 좋아요 상태 및 카운트 업데이트
            const countResponse = await fetch(`${API_BASE_URL}/api/v1/reviews/${reviewId}/likes/count`);
            const countData = await countResponse.json();
            
            // 좋아요 버튼 업데이트
            likeBtn.classList.toggle('liked');
            likeBtn.querySelector('i').className = likeBtn.classList.contains('liked') 
                ? 'fas fa-thumbs-up' 
                : 'far fa-thumbs-up';
            
            // 좋아요 카운트 업데이트
            likeBtn.innerHTML = `<i class="${likeBtn.classList.contains('liked') ? 'fas' : 'far'} fa-thumbs-up"></i> 도움됨 (${countData.likeCount})`;
        } else {
            console.error('좋아요 처리 중 오류 발생');
        }
    } catch (error) {
        console.error('좋아요 요청 중 오류 발생:', error);
    }
}

// 상담 신청 모달 열기
function openApplyModal(trainerId) {
    const modal = document.getElementById('apply-modal');
    const trainerIdInput = document.getElementById('trainer-id');
    
    if (modal && trainerIdInput) {
        trainerIdInput.value = trainerId;
        modal.style.display = 'block';
    }
}

// 상담 신청 모달 닫기
function closeApplyModal() {
    const modal = document.getElementById('apply-modal');
    const form = document.getElementById('apply-form');
    
    if (modal && form) {
        modal.style.display = 'none';
        form.reset();
        
        // 이미지 미리보기 초기화
        const imagePreviewContainer = document.querySelector('.image-preview-container');
        if (imagePreviewContainer) {
            imagePreviewContainer.style.display = 'none';
        }
    }
}

// 이미지 업로드 처리
function handleImageUpload(event) {
    const file = event.target.files[0];
    const imagePreviewContainer = document.querySelector('.image-preview-container');
    const imagePreview = document.getElementById('image-preview');
    const imageUrl = document.getElementById('image-url');
    
    if (!file || !imagePreviewContainer || !imagePreview) return;
    
    // 파일 유형 검증
    if (!file.type.startsWith('image/')) {
        alert('이미지 파일만 업로드 가능합니다.');
        return;
    }
    
    // 파일 크기 제한 (5MB)
    if (file.size > 5 * 1024 * 1024) {
        alert('파일 크기는 5MB 이하여야 합니다.');
        return;
    }
    
    // 이미지 미리보기 설정
    const reader = new FileReader();
    reader.onload = function(e) {
        imagePreview.src = e.target.result;
        imagePreviewContainer.style.display = 'block';
        
        // 실제 서비스에서는 여기서 이미지를 서버에 업로드하고 URL을 받아와야 함
        // 지금은 임시로 Base64 문자열을 사용
        if (imageUrl) {
            imageUrl.value = e.target.result;
        }
    };
    reader.readAsDataURL(file);
}

// 상담 신청 폼 제출 처리
async function handleApplySubmit(event) {
    event.preventDefault();
    
    if (!isLoggedIn()) {
        alert('로그인이 필요한 서비스입니다.');
        return;
    }
    
    const trainerId = document.getElementById('trainer-id').value;
    const content = document.getElementById('content').value;
    const imageUrl = document.getElementById('image-url').value;
    const videoUrl = document.getElementById('video-url').value;
    
    if (!content) {
        alert('상담 내용을 입력해주세요.');
        return;
    }
    
    try {
        const response = await fetchWithAuth('/api/v1/match', {
            method: 'POST',
            body: JSON.stringify({
                trainerId,
                content,
                imageUrl,
                videoUrl
            })
        });
        
        if (response.ok) {
            alert('상담 신청이 완료되었습니다.');
            closeApplyModal();
        } else {
            const data = await response.json();
            alert(data.error ? data.error.message : '상담 신청 중 오류가 발생했습니다.');
        }
    } catch (error) {
        console.error('상담 신청 중 오류 발생:', error);
        alert('서버 연결 오류가 발생했습니다.');
    }
}// trainer-detail.js - 훈련사 상세 정보 페이지 기능

// API 기본 URL (auth.js에서 가져옴)
// const API_BASE_URL = 'https://api.hanjungho.pet-talk-test.com';

document.addEventListener('DOMContentLoaded', () => {
    // URL에서 훈련사 ID 가져오기
    const urlParams = new URLSearchParams(window.location.search);
    const trainerId = urlParams.get('id');
    
    if (!trainerId) {
        alert('훈련사 정보가 없습니다.');
        window.location.href = '/trainers.html';
        return;
    }
    
    // 훈련사 상세 정보 로드
    fetchTrainerDetail(trainerId);
    
    // 상담 신청 버튼 이벤트 리스너
    const applyBtn = document.getElementById('apply-btn');
    if (applyBtn) {
        applyBtn.addEventListener('click', () => {
            if (isLoggedIn()) {
                openApplyModal(trainerId);
            } else {
                if (confirm('로그인이 필요한 서비스입니다. 로그인 페이지로 이동하시겠습니까?')) {
                    window.location.href = '/login.html';
                }
            }
        });
    }
    
    // 모달 닫기 버튼 이벤트 리스너
    const closeModal = document.querySelector('.close');
    if (closeModal) {
        closeModal.addEventListener('click', closeApplyModal);
    }
    
    // 모달 취소 버튼 이벤트 리스너
    const cancelBtn = document.querySelector('.cancel-btn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', closeApplyModal);
    }
    
    // 신청 폼 제출 이벤트 리스너
    const applyForm = document.getElementById('apply-form');
    if (applyForm) {
        applyForm.addEventListener('submit', handleApplySubmit);
    }
    
    // 이미지 업로드 이벤트 리스너
    const imageUpload = document.getElementById('image-upload');
    if (imageUpload) {
        imageUpload.addEventListener('change', handleImageUpload);
    }
    
    // 이미지 삭제 버튼 이벤트 리스너
    const removeImage = document.getElementById('remove-image');
    if (removeImage) {
        removeImage.addEventListener('click', () => {
            const imagePreviewContainer = document.querySelector('.image-preview-container');
            const imagePreview = document.getElementById('image-preview');
            const imageUrl = document.getElementById('image-url');
            
            imagePreviewContainer.style.display = 'none';
            imagePreview.src = '';
            imageUrl.value = '';
            
            // 파일 입력 초기화
            document.getElementById('image-upload').value = '';
        });
    }
});

// 훈련사 상세 정보 가져오기
async function fetchTrainerDetail(trainerId) {
    const trainerLoading = document.getElementById('trainer-loading');
    const trainerContent = document.getElementById('trainer-detail-content');
    
    if (!trainerLoading || !trainerContent) return;
    
    trainerLoading.style.display = 'block';
    trainerContent.style.display = 'none';
    
    try {
        // API 요청 - 훈련사 상세 정보 가져오기
        try {
            const response = await fetch(`${API_BASE_URL}/api/v1/trainers/${trainerId}`, {
                method: 'GET'
            });
            
            if (response.ok) {
                const trainer = await response.json();
                renderTrainerDetail(trainer);
                
                // 훈련사 리뷰 가져오기
                fetchTrainerReviews(trainerId);
            } else {
                throw new Error('훈련사 정보를 불러오는 데 실패했습니다.');
            }
        } catch (error) {
            console.error('API 오류:', error);
            
            // API 오류 시 임시 데이터 사용
            setTimeout(() => {
                const trainer = {
                    trainerId: trainerId,
                    nickname: '김훈련',
                    profileImageUrl: '/api/placeholder/200/200',
                    email: 'trainer@pettalk.kr',
                    introduction: '안녕하세요! 10년 경력의 반려동물 행동 전문가입니다. 다양한 문제 행동에 대한 솔루션을 제공해 드립니다. 특히 분리불안과 공격성 문제에 대한 상담과 훈련을 전문으로 하고 있습니다.',
                    experienceYears: 10,
                    specializations: ['기본훈련', '분리불안', '공격성'],
                    certifications: [
                        {
                            certId: 1,
                            certName: '국제 반려동물 훈련사 자격증',
                            issuingBody: '국제 동물행동학회',
                            issueDate: '2015-05-12'
                        },
                        {
                            certId: 2,
                            certName: '반려동물 행동 상담사 1급',
                            issuingBody: '한국 애견협회',
                            issueDate: '2018-03-20'
                        }
                    ],
                    averageRating: 4.8,
                    reviewCount: 32
                };
                
                renderTrainerDetail(trainer);
                
                // 임시 리뷰 데이터 렌더링
                renderTrainerReviews([
                    {
                        reviewId: 1,
                        userId: '111e4567-e89b-12d3-a456-426614174001',
                        userName: '박선영',
                        trainerId: trainerId,
                        trainerName: '김훈련',
                        rating: 5,
                        title: '우리 강아지 분리불안이 많이 좋아졌어요',
                        comment: '분리불안이 심했던 우리 강아지가 훈련사님의 도움으로 많이 좋아졌어요. 친절하고 자세한 설명으로 집에서도 쉽게 따라할 수 있었습니다. 정말 감사합니다!',
                        reviewImageUrl: '/api/placeholder/200/200',
                        likeCount: 12,
                        hasLiked: false,
                        createdAt: '2023-10-15 14:30:00'
                    },
                    {
                        reviewId: 2,
                        userId: '222e4567-e89b-12d3-a456-426614174002',
                        userName: '김철수',
                        trainerId: trainerId,
                        trainerName: '김훈련',
                        rating: 4,
                        title: '기본 훈련 습득이 빨라졌어요',
                        comment: '앉아, 엎드려, 기다려 등 기본 훈련을 배웠는데 강아지가 생각보다 빨리 습득했습니다. 훈련사님이 알려주신 방법대로 하니 효과가 좋았어요.',
                        reviewImageUrl: null,
                        likeCount: 5,
                        hasLiked: true,
                        createdAt: '2023-09-28 10:15:00'
                    }
                ]);
                
                trainerLoading.style.display = 'none';
                trainerContent.style.display = 'block';
            }, 1000); // 1초 지연 (로딩 효과 시뮬레이션)
        }
    } catch (error) {
        console.error('훈련사 상세 정보 로드 중 오류 발생:', error);
        
        trainerLoading.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-circle"></i>
                <p>훈련사 정보를 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.</p>
                <button class="btn primary mt-2" onclick="window.location.reload()">다시 시도</button>
            </div>
        `;
    }
}

// 훈련사 상세 정보 렌더링
function renderTrainerDetail(trainer) {
    document.getElementById('trainer-image').src = trainer.profileImageUrl || '/api/placeholder/200/200';
    document.getElementById('trainer-name').textContent = `${trainer.nickname} 훈련사`;
    document.getElementById('trainer-rating').textContent = trainer.averageRating.toFixed(1);
    document.getElementById('review-count').textContent = `(${trainer.reviewCount}개 후기)`;
    document.getElementById('experience-years').textContent = `경력 ${trainer.experienceYears}년`;
    document.getElementById('trainer-introduction-text').textContent = trainer.introduction;
    
    // 전문 분야 렌더링
    const specialtiesList = document.getElementById('specialties-list');
    if (specialtiesList) {
        specialtiesList.innerHTML = '';
        trainer.specializations.forEach(specialty => {
            const tag = document.createElement('span');
            tag.className = 'tag';
            tag.textContent = specialty;
            specialtiesList.appendChild(tag);
        });
    }
    
    // 자격증 목록 렌더링
    const certificationsList = document.getElementById('certifications-list');
    if (certificationsList) {
        certificationsList.innerHTML = '';
        if (trainer.certifications && trainer.certifications.length > 0) {
            trainer.certifications.forEach(cert => {
                const li = document.createElement('li');
                const certDate = new Date(cert.issueDate).toLocaleDateString('ko-KR', {
                    year: 'numeric',
                    month: 'long'
                });
                
                li.innerHTML = `
                    <div class="cert-name">${cert.certName}</div>
                    <div class="cert-issuer">${cert.issuingBody}</div>
                    <div class="cert-date">취득일: ${certDate}</div>
                `;
                certificationsList.appendChild(li);
            });
        } else {
            certificationsList.innerHTML = '<li>등록된 자격증이 없습니다.</li>';
        }
    }
    
    // 훈련사 ID 설정
    const trainerIdInput = document.getElementById('trainer-id');
    if (trainerIdInput) {
        trainerIdInput.value = trainer.trainerId;
    }
    
    // 로딩 완료 표시
    document.getElementById('trainer-loading').style.display = 'none';
    document.getElementById('trainer-detail-content').style.display = 'block';
}