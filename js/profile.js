// profile.js - 프로필 페이지 기능

// API 기본 URL (auth.js에서 가져옴)
// const API_BASE_URL = 'http://localhost:8443';

document.addEventListener('DOMContentLoaded', () => {
    // 인증 상태 확인
    if (!isLoggedIn()) {
        // 비로그인 상태면 로그인 페이지로 리다이렉트
        window.location.href = '/login.html';
        return;
    }

    // 탭 전환 기능 초기화
    initializeTabs();
    
    // 프로필 수정 폼 이벤트 리스너 등록
    const profileEditForm = document.getElementById('profile-edit-form');
    if (profileEditForm) {
        profileEditForm.addEventListener('submit', handleProfileUpdate);
    }
    
    // 프로필 이미지 업로드 이벤트 리스너
    const editProfileImageUpload = document.getElementById('edit-profile-image-upload');
    if (editProfileImageUpload) {
        editProfileImageUpload.addEventListener('change', handleProfileImageUpload);
    }
    
    const editProfileImage = document.getElementById('edit-profile-image');
    if (editProfileImage) {
        editProfileImage.addEventListener('click', () => {
            document.getElementById('edit-profile-image-upload').click();
        });
    }
    
    // 내 신청 내역 가져오기
    fetchMyApplications();
    
    // 내 후기 목록 가져오기
    fetchMyReviews();
});

// 탭 전환 기능 초기화
function initializeTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.getAttribute('data-tab');
            
            // 모든 탭 컨텐츠 숨김
            tabContents.forEach(content => {
                content.style.display = 'none';
            });
            
            // 모든 탭 버튼 비활성화
            tabButtons.forEach(btn => {
                btn.classList.remove('active');
            });
            
            // 선택한 탭 컨텐츠 표시
            document.getElementById(tabId).style.display = 'block';
            
            // 선택한 탭 버튼 활성화
            button.classList.add('active');
        });
    });
}

// 프로필 이미지 업로드 처리
function handleProfileImageUpload(event) {
    const file = event.target.files[0];
    const profileImagePreview = document.getElementById('user-profile-image');
    const profileImageUrl = document.getElementById('edit-profile-image-url');
    
    if (!file || !profileImagePreview) return;
    
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
        profileImagePreview.src = e.target.result;
        
        // 실제 서비스에서는 여기서 이미지를 서버에 업로드하고 URL을 받아와야 함
        // 지금은 임시로 Base64 문자열을 사용
        if (profileImageUrl) {
            profileImageUrl.value = e.target.result;
        }
    };
    reader.readAsDataURL(file);
}

// 프로필 정보 업데이트 처리
async function handleProfileUpdate(event) {
    event.preventDefault();
    
    const nickname = document.getElementById('edit-nickname').value;
    const profileImageUrl = document.getElementById('edit-profile-image-url').value;
    
    if (!nickname) {
        alert('닉네임을 입력해주세요.');
        return;
    }
    
    try {
        const response = await fetchWithAuth('/api/v1/auth/profile', {
            method: 'PUT',
            body: JSON.stringify({
                nickname,
                profileImageUrl
            })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            alert('프로필이 성공적으로 업데이트되었습니다.');
            
            // 로컬 스토리지의 사용자 정보 업데이트
            localStorage.setItem('pettalk_user_info', JSON.stringify(data.data));
            
            // 페이지 새로고침
            window.location.reload();
        } else {
            alert(data.error ? data.error.message : '프로필 업데이트 중 오류가 발생했습니다.');
        }
    } catch (error) {
        console.error('프로필 업데이트 중 오류 발생:', error);
        alert('서버 연결 오류가 발생했습니다.');
    }
}

// 내 신청 내역 가져오기
async function fetchMyApplications() {
    const applicationsContainer = document.getElementById('applications-list');
    if (!applicationsContainer) return;
    
    try {
        applicationsContainer.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i><p>신청 내역을 불러오는 중...</p></div>';
        
        const response = await fetchWithAuth('/api/v1/match/user', {
            method: 'GET'
        });
        
        if (response.ok) {
            const data = await response.json();
            
            if (Array.isArray(data) && data.length > 0) {
                // 신청 내역 렌더링
                applicationsContainer.innerHTML = '';
                
                data.forEach(application => {
                    applicationsContainer.appendChild(createApplicationItem(application));
                });
            } else {
                applicationsContainer.innerHTML = '<div class="empty-list-message">신청 내역이 없습니다.</div>';
            }
        } else {
            applicationsContainer.innerHTML = '<div class="error-message">신청 내역을 불러오는 데 실패했습니다.</div>';
        }
    } catch (error) {
        console.error('신청 내역 불러오기 중 오류 발생:', error);
        applicationsContainer.innerHTML = '<div class="error-message">서버 연결 오류가 발생했습니다.</div>';
    }
}

// 신청 내역 항목 생성 함수
function createApplicationItem(application) {
    const item = document.createElement('div');
    item.className = 'list-item';
    
    // 상태에 따른 클래스 설정
    const statusClass = {
        'PENDING': 'status-pending',
        'APPROVED': 'status-approved',
        'REJECTED': 'status-rejected'
    }[application.status] || '';
    
    // 상태에 따른 텍스트 설정
    const statusText = {
        'PENDING': '신청중',
        'APPROVED': '승인됨',
        'REJECTED': '거절됨'
    }[application.status] || application.status;
    
    // 날짜 포맷 변환
    const createdDate = new Date(application.createdAt).toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    item.innerHTML = `
        <div class="list-item-header">
            <div class="list-item-title">${application.trainerName} 훈련사 상담 신청</div>
            <span class="list-item-status ${statusClass}">${statusText}</span>
        </div>
        <div class="list-item-content">
            <p>${application.content}</p>
            ${application.imageUrl ? `<img src="${application.imageUrl}" alt="첨부 이미지" class="attached-image">` : ''}
            <div class="list-item-date">신청일: ${createdDate}</div>
        </div>
        <div class="list-item-actions">
            <a href="/trainer-detail.html?id=${application.trainerId}" class="btn secondary btn-sm">훈련사 정보</a>
            ${application.status === 'PENDING' 
              ? `<button class="btn danger btn-sm delete-application" data-id="${application.applyId}">신청 취소</button>` 
              : ''}
            ${application.status === 'APPROVED' && !application.hasReview 
              ? `<a href="/review.html?applyId=${application.applyId}" class="btn primary btn-sm">후기 작성</a>` 
              : ''}
        </div>
    `;
    
    // 신청 취소 버튼 이벤트 리스너
    const deleteBtn = item.querySelector('.delete-application');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', () => {
            if (confirm('정말 신청을 취소하시겠습니까?')) {
                deleteApplication(application.applyId);
            }
        });
    }
    
    return item;
}

// 신청 취소 함수
async function deleteApplication(applyId) {
    try {
        const response = await fetchWithAuth(`/api/v1/match/${applyId}/delete`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            alert('신청이 취소되었습니다.');
            fetchMyApplications(); // 목록 새로고침
        } else {
            const data = await response.json();
            alert(data.error ? data.error.message : '신청 취소 중 오류가 발생했습니다.');
        }
    } catch (error) {
        console.error('신청 취소 중 오류 발생:', error);
        alert('서버 연결 오류가 발생했습니다.');
    }
}

// 내 후기 목록 가져오기
async function fetchMyReviews() {
    const reviewsContainer = document.getElementById('reviews-list');
    if (!reviewsContainer) return;
    
    try {
        reviewsContainer.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i><p>후기 목록을 불러오는 중...</p></div>';
        
        const response = await fetchWithAuth('/api/v1/reviews/users/me', {
            method: 'GET'
        });
        
        if (response.ok) {
            const data = await response.json();
            
            if (Array.isArray(data) && data.length > 0) {
                // 후기 목록 렌더링
                reviewsContainer.innerHTML = '';
                
                data.forEach(review => {
                    reviewsContainer.appendChild(createReviewItem(review));
                });
            } else {
                reviewsContainer.innerHTML = '<div class="empty-list-message">작성한 후기가 없습니다.</div>';
            }
        } else {
            reviewsContainer.innerHTML = '<div class="error-message">후기 목록을 불러오는 데 실패했습니다.</div>';
        }
    } catch (error) {
        console.error('후기 목록 불러오기 중 오류 발생:', error);
        reviewsContainer.innerHTML = '<div class="error-message">서버 연결 오류가 발생했습니다.</div>';
    }
}

// 후기 항목 생성 함수
function createReviewItem(review) {
    const item = document.createElement('div');
    item.className = 'list-item';
    
    // 날짜 포맷 변환
    const createdDate = new Date(review.createdAt).toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    // 별점 HTML 생성
    const starsHtml = generateStarsHtml(review.rating);
    
    item.innerHTML = `
        <div class="list-item-header">
            <div class="list-item-title">${review.trainerName} 훈련사 후기</div>
            <div class="review-rating">${starsHtml}</div>
        </div>
        <div class="list-item-content">
            <h3>${review.title}</h3>
            <p>${review.comment}</p>
            ${review.reviewImageUrl ? `<img src="${review.reviewImageUrl}" alt="후기 이미지" class="review-image">` : ''}
            <div class="list-item-date">작성일: ${createdDate}</div>
        </div>
        <div class="list-item-actions">
            <a href="/trainer-detail.html?id=${review.trainerId}" class="btn secondary btn-sm">훈련사 정보</a>
            <button class="btn primary btn-sm edit-review" data-id="${review.reviewId}">수정</button>
            <button class="btn danger btn-sm delete-review" data-id="${review.reviewId}">삭제</button>
        </div>
    `;
    
    // 후기 수정 버튼 이벤트 리스너
    const editBtn = item.querySelector('.edit-review');
    if (editBtn) {
        editBtn.addEventListener('click', () => {
            window.location.href = `/review-edit.html?id=${review.reviewId}`;
        });
    }
    
    // 후기 삭제 버튼 이벤트 리스너
    const deleteBtn = item.querySelector('.delete-review');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', () => {
            if (confirm('정말 후기를 삭제하시겠습니까?')) {
                deleteReview(review.reviewId);
            }
        });
    }
    
    return item;
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
    
    return html + ` <span>(${rating}점)</span>`;
}

// 후기 삭제 함수
async function deleteReview(reviewId) {
    try {
        const response = await fetchWithAuth(`/api/v1/reviews/${reviewId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            alert('후기가 삭제되었습니다.');
            fetchMyReviews(); // 후기 목록 새로고침
        } else {
            const data = await response.json();
            alert(data.error ? data.error.message : '후기 삭제 중 오류가 발생했습니다.');
        }
    } catch (error) {
        console.error('후기 삭제 중 오류 발생:', error);
        alert('서버 연결 오류가 발생했습니다.');
    }
}