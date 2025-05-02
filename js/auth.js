// auth.js - 인증 관련 핵심 기능

// API 기본 URL
const API_BASE_URL = 'http://localhost:8443';

// 로컬 스토리지 키
const TOKEN_KEY = 'pettalk_auth_token';
const USER_INFO_KEY = 'pettalk_user_info';

// 페이지 로드 시 실행
document.addEventListener('DOMContentLoaded', () => {
    // 인증 상태에 따라 UI 업데이트
    updateAuthUI();
    
    // 로그인 버튼 이벤트 리스너
    const kakaoLoginBtn = document.getElementById('kakao-login-btn');
    const naverLoginBtn = document.getElementById('naver-login-btn');
    
    if (kakaoLoginBtn) {
        kakaoLoginBtn.addEventListener('click', () => {
            redirectToOAuth('kakao');
        });
    }
    
    if (naverLoginBtn) {
        naverLoginBtn.addEventListener('click', () => {
            redirectToOAuth('naver');
        });
    }
    
    // 회원가입 버튼 이벤트 리스너
    const kakaoRegisterBtn = document.getElementById('kakao-register-btn');
    const naverRegisterBtn = document.getElementById('naver-register-btn');
    
    if (kakaoRegisterBtn) {
        kakaoRegisterBtn.addEventListener('click', () => {
            redirectToOAuth('kakao');
        });
    }
    
    if (naverRegisterBtn) {
        naverRegisterBtn.addEventListener('click', () => {
            redirectToOAuth('naver');
        });
    }
    
    // 로그아웃 버튼 이벤트 리스너
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    
    // 회원 탈퇴 버튼 이벤트 리스너
    const withdrawBtn = document.getElementById('withdraw-btn');
    if (withdrawBtn) {
        withdrawBtn.addEventListener('click', () => {
            if (confirm('정말 회원 탈퇴하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
                withdrawAccount();
            }
        });
    }
    
    // OAuth 콜백 처리
    const urlParams = new URLSearchParams(window.location.search);
    const oauthData = urlParams.get('data');
    const tempToken = urlParams.get('token');
    
    if (oauthData) {
        handleOAuthCallback(oauthData);
    } else if (tempToken) {
        handleRegistrationToken(tempToken);
    }
    
    // 닉네임 중복 확인 이벤트 (등록 페이지)
    const nicknameInput = document.getElementById('nickname');
    if (nicknameInput) {
        nicknameInput.addEventListener('blur', checkNickname);
    }
    
    // 회원가입 폼 제출 이벤트
    const userInfoForm = document.getElementById('user-info-form');
    if (userInfoForm) {
        userInfoForm.addEventListener('submit', handleRegistration);
    }
    
    // 프로필 이미지 업로드 이벤트
    const profileImage = document.getElementById('profile-image');
    if (profileImage) {
        profileImage.addEventListener('change', handleProfileImagePreview);
    }
});

// OAuth 로그인 리다이렉트
function redirectToOAuth(provider) {
    const redirectUri = `${API_BASE_URL}/oauth2/authorization/${provider}`;
    window.location.href = redirectUri;
}

// OAuth 콜백 처리
function handleOAuthCallback(data) {
    try {
        // Base64 디코딩
        const jsonString = atob(data);
        const authData = JSON.parse(jsonString);
        
        if (authData.accessToken) {
            // 토큰 저장
            saveAuthToken(authData.accessToken, authData.refreshToken, authData.expiresIn);
            
            // 사용자 정보 저장
            if (authData.user) {
                localStorage.setItem(USER_INFO_KEY, JSON.stringify(authData.user));
            }
            
            // 홈페이지로 리다이렉트
            window.location.href = '/';
        }
    } catch (error) {
        console.error('OAuth 콜백 처리 중 오류 발생:', error);
        alert('로그인 처리 중 오류가 발생했습니다.');
        window.location.href = '/login.html';
    }
}

// 임시 토큰으로 회원가입 페이지 처리
function handleRegistrationToken(token) {
    document.getElementById('register-form-container').style.display = 'none';
    document.getElementById('additional-info-form').style.display = 'block';
    document.getElementById('temp-token').value = token;
}

// 닉네임 중복 확인
async function checkNickname() {
    const nickname = document.getElementById('nickname').value;
    const nicknameStatus = document.getElementById('nickname-status');
    
    if (!nickname || nickname.trim() === '') {
        nicknameStatus.textContent = '닉네임을 입력해주세요.';
        nicknameStatus.className = 'error';
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/auth/check-nickname?nickname=${encodeURIComponent(nickname)}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (response.ok && data.success && data.data.available) {
            nicknameStatus.textContent = '사용 가능한 닉네임입니다.';
            nicknameStatus.className = 'success';
        } else {
            nicknameStatus.textContent = '이미 사용 중인 닉네임입니다.';
            nicknameStatus.className = 'error';
        }
    } catch (error) {
        console.error('닉네임 확인 중 오류 발생:', error);
        nicknameStatus.textContent = '서버 연결 오류가 발생했습니다.';
        nicknameStatus.className = 'error';
    }
}

// 프로필 이미지 미리보기
function handleProfileImagePreview(event) {
    const file = event.target.files[0];
    const profilePreview = document.getElementById('profile-preview');
    const profileImageUrl = document.getElementById('profile-image-url');
    
    if (!file || !profilePreview) return;
    
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
        profilePreview.src = e.target.result;
        
        // 임시 이미지 URL 저장 (실제 서비스에서는 서버에 업로드 필요)
        if (profileImageUrl) {
            profileImageUrl.value = e.target.result;
        }
    };
    reader.readAsDataURL(file);
}

// 회원가입 폼 제출 처리
async function handleRegistration(event) {
    event.preventDefault();
    
    const tempToken = document.getElementById('temp-token').value;
    const name = document.getElementById('name').value;
    const nickname = document.getElementById('nickname').value;
    const profileImageUrl = document.getElementById('profile-image-url').value;
    
    if (!name || !nickname) {
        alert('이름과 닉네임을 입력해주세요.');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                tempToken,
                name,
                nickname,
                profileImageUrl
            })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            // 토큰 저장
            saveAuthToken(data.data.accessToken, data.data.refreshToken, data.data.expiresIn);
            
            // 사용자 정보 저장
            if (data.data.user) {
                localStorage.setItem(USER_INFO_KEY, JSON.stringify(data.data.user));
            }
            
            alert('회원가입이 완료되었습니다.');
            window.location.href = '/';
        } else {
            alert(data.error ? data.error.message : '회원가입 중 오류가 발생했습니다.');
        }
    } catch (error) {
        console.error('회원가입 중 오류 발생:', error);
        alert('서버 연결 오류가 발생했습니다.');
    }
}

// 로그아웃 처리
async function handleLogout() {
    try {
        const refreshToken = getRefreshToken();
        
        if (refreshToken) {
            await fetch(`${API_BASE_URL}/api/v1/auth/logout`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getAccessToken()}`
                },
                body: JSON.stringify({ refreshToken })
            });
        }
    } catch (error) {
        console.error('로그아웃 요청 중 오류 발생:', error);
    } finally {
        // 로컬 스토리지 토큰 삭제
        clearAuthData();
        
        // 홈페이지로 리다이렉트
        window.location.href = '/';
    }
}

// 회원 탈퇴 처리
async function withdrawAccount() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/auth/withdraw`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getAccessToken()}`
            }
        });
        
        if (response.ok) {
            alert('회원 탈퇴가 완료되었습니다.');
            clearAuthData();
            window.location.href = '/';
        } else {
            const data = await response.json();
            alert(data.error ? data.error.message : '회원 탈퇴 중 오류가 발생했습니다.');
        }
    } catch (error) {
        console.error('회원 탈퇴 중 오류 발생:', error);
        alert('서버 연결 오류가 발생했습니다.');
    }
}

// 토큰 저장
function saveAuthToken(accessToken, refreshToken, expiresIn) {
    const expiry = Date.now() + (expiresIn * 1000);
    
    const tokenData = {
        accessToken,
        refreshToken,
        expiry
    };
    
    localStorage.setItem(TOKEN_KEY, JSON.stringify(tokenData));
}

// 액세스 토큰 가져오기
function getAccessToken() {
    try {
        const tokenData = JSON.parse(localStorage.getItem(TOKEN_KEY));
        
        if (!tokenData) {
            return null;
        }
        
        // 토큰 만료 확인
        if (Date.now() > tokenData.expiry) {
            // 토큰 갱신 시도
            refreshAuthToken();
            return null;
        }
        
        return tokenData.accessToken;
    } catch (error) {
        console.error('토큰 파싱 중 오류 발생:', error);
        return null;
    }
}

// 리프레시 토큰 가져오기
function getRefreshToken() {
    try {
        const tokenData = JSON.parse(localStorage.getItem(TOKEN_KEY));
        return tokenData ? tokenData.refreshToken : null;
    } catch (error) {
        console.error('리프레시 토큰 파싱 중 오류 발생:', error);
        return null;
    }
}

// 토큰 갱신
async function refreshAuthToken() {
    const refreshToken = getRefreshToken();
    
    if (!refreshToken) {
        clearAuthData();
        return null;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ refreshToken })
        });
        
        if (response.ok) {
            const data = await response.json();
            
            if (data.success) {
                saveAuthToken(data.data.accessToken, data.data.refreshToken, data.data.expiresIn);
                return data.data.accessToken;
            }
        }
        
        // 갱신 실패 시 로그아웃
        clearAuthData();
        return null;
    } catch (error) {
        console.error('토큰 갱신 중 오류 발생:', error);
        clearAuthData();
        return null;
    }
}

// 인증 데이터 초기화
function clearAuthData() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_INFO_KEY);
}

// 로그인 상태 확인
function isLoggedIn() {
    return getAccessToken() !== null;
}

// 인증 상태에 따른 UI 업데이트
function updateAuthUI() {
    const loginMenu = document.getElementById('login-menu');
    const profileMenu = document.getElementById('profile-menu');
    
    if (isLoggedIn()) {
        // 로그인 상태
        if (loginMenu) loginMenu.style.display = 'none';
        if (profileMenu) profileMenu.style.display = 'block';
        
        // 사용자 정보 표시
        updateUserProfileInfo();
    } else {
        // 비로그인 상태
        if (loginMenu) loginMenu.style.display = 'block';
        if (profileMenu) profileMenu.style.display = 'none';
    }
}

// 사용자 프로필 정보 업데이트
function updateUserProfileInfo() {
    try {
        const userInfo = JSON.parse(localStorage.getItem(USER_INFO_KEY));
        
        if (userInfo) {
            const userNickname = document.getElementById('user-nickname');
            const userEmail = document.getElementById('user-email');
            const userProfileImage = document.getElementById('user-profile-image');
            const editNickname = document.getElementById('edit-nickname');
            
            if (userNickname) userNickname.textContent = userInfo.nickname || '사용자';
            if (userEmail) userEmail.textContent = userInfo.email || '';
            if (userProfileImage) userProfileImage.src = userInfo.profileImageUrl || '/api/placeholder/150/150';
            if (editNickname) editNickname.value = userInfo.nickname || '';
        }
    } catch (error) {
        console.error('사용자 정보 업데이트 중 오류 발생:', error);
    }
}

// API 요청 헬퍼 함수 (인증 토큰 포함)
async function fetchWithAuth(url, options = {}) {
    // 액세스 토큰 가져오기
    let accessToken = getAccessToken();
    
    // 토큰이 없으면 갱신 시도
    if (!accessToken) {
        accessToken = await refreshAuthToken();
        
        // 갱신 실패 시 로그인 페이지로 리다이렉트
        if (!accessToken) {
            window.location.href = '/login.html';
            return null;
        }
    }
    
    // 헤더 설정
    const headers = {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers
    };
    
    try {
        const response = await fetch(`${API_BASE_URL}${url}`, {
            ...options,
            headers
        });
        
        // 인증 오류 시 토큰 갱신 후 재시도
        if (response.status === 401) {
            accessToken = await refreshAuthToken();
            
            if (accessToken) {
                headers.Authorization = `Bearer ${accessToken}`;
                return fetch(`${API_BASE_URL}${url}`, {
                    ...options,
                    headers
                });
            } else {
                window.location.href = '/login.html';
                return null;
            }
        }
        
        return response;
    } catch (error) {
        console.error('API 요청 중 오류 발생:', error);
        throw error;
    }
}