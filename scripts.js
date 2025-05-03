// 기본 설정
const API_BASE_URL = 'http://localhost:8443'; // 실제 배포 시 변경 필요
const LOCAL_STORAGE_KEYS = {
    ACCESS_TOKEN: 'accessToken',
    REFRESH_TOKEN: 'refreshToken',
    TEMP_TOKEN: 'tempToken'
};

// DOM 요소 접근
const elements = {
    // 인증 관련
    loginBtn: document.getElementById('login-btn'),
    userProfile: document.getElementById('user-profile'),
    userName: document.getElementById('user-name'),
    profileImg: document.getElementById('profile-img'),
    myProfile: document.getElementById('my-profile'),
    logoutBtn: document.getElementById('logout-btn'),
    
    // 모달
    authModal: document.getElementById('auth-modal'),
    editProfileModal: document.getElementById('edit-profile-modal'),
    modalCloses: document.querySelectorAll('.close'),
    
    // 탭
    tabBtns: document.querySelectorAll('.tab-btn'),
    loginTab: document.getElementById('login-tab'),
    registerTab: document.getElementById('register-tab'),
    
    // 소셜 로그인
    kakaoLogin: document.getElementById('kakao-login'),
    naverLogin: document.getElementById('naver-login'),
    
    // 회원가입
    registerForm: document.getElementById('register-form'),
    nicknameInput: document.getElementById('nickname'),
    nicknameStatus: document.getElementById('nickname-status'),
    avatarOptions: document.querySelectorAll('.avatar-option'),
    profileImageUrl: document.getElementById('profile-image-url'),
    
    // 프로필
    profilePage: document.getElementById('profile-page'),
    profilePageImg: document.getElementById('profile-page-img'),
    profilePageName: document.getElementById('profile-page-name'),
    profilePageEmail: document.getElementById('profile-page-email'),
    editProfileBtn: document.getElementById('edit-profile-btn'),
    editProfileForm: document.getElementById('edit-profile-form'),
    editNickname: document.getElementById('edit-nickname'),
    editNicknameStatus: document.getElementById('edit-nickname-status'),
    editProfileImageUrl: document.getElementById('edit-profile-image-url'),

    // 회원 탈퇴 관련
    withdrawBtn: document.getElementById('withdraw-btn'),
    withdrawModal: document.getElementById('withdraw-modal'),
    cancelWithdrawBtn: document.getElementById('cancel-withdraw-btn'),
    confirmWithdrawBtn: document.getElementById('confirm-withdraw-btn'),
    
    // 페이지 내비게이션
    navLinks: document.querySelectorAll('.nav-menu a'),
    pages: document.querySelectorAll('.page'),
    getStartedBtn: document.getElementById('get-started-btn'),
    
    // 알림
    notification: document.getElementById('notification'),
    notificationMessage: document.getElementById('notification-message')
};

// 앱 상태
const appState = {
    isAuthenticated: false,
    user: null,
    accessToken: null,
    refreshToken: null,
    tempToken: null
};

// 유틸리티 함수
const utils = {
    // JWT 토큰에서 정보 추출
    parseJwt: (token) => {
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(
                atob(base64).split('').map(c => {
                    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
                }).join('')
            );
            return JSON.parse(jsonPayload);
        } catch (error) {
            console.error('JWT 파싱 오류:', error);
            return null;
        }
    },
    
    // URL 파라미터 가져오기
    getUrlParams: () => {
        const params = {};
        const searchParams = new URLSearchParams(window.location.search);
        for (const [key, value] of searchParams.entries()) {
            params[key] = value;
        }
        return params;
    },

        // 알림 표시
    showNotification: (message, isSuccess = true) => {
        elements.notificationMessage.textContent = message;
        elements.notification.style.display = 'block';
        elements.notification.querySelector('.notification-content').style.backgroundColor = 
            isSuccess ? 'var(--success-color)' : 'var(--danger-color)';
        
        setTimeout(() => {
            elements.notification.style.display = 'none';
        }, 3000);
    },
    
    // 페이지 변경
    changePage: (pageId) => {
        elements.navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.dataset.page === pageId) {
                link.classList.add('active');
            }
        });
        
        elements.pages.forEach(page => {
            page.classList.remove('active');
        });
        
        document.getElementById(`${pageId}-page`).classList.add('active');
    },
    
    // 모달 열기
    openModal: (modal) => {
        modal.style.display = 'block';
    },
    
    // 모달 닫기
    closeModal: (modal) => {
        modal.style.display = 'none';
    }
};

// API 서비스
const apiService = {
    // API 요청 기본 설정
    request: async (endpoint, method = 'GET', data = null, requiresAuth = true) => {
        try {
            const url = `${API_BASE_URL}${endpoint}`;
            const headers = {
                'Content-Type': 'application/json'
            };
            
            // 인증 토큰 설정
            if (requiresAuth && appState.accessToken) {
                headers['Authorization'] = `Bearer ${appState.accessToken}`;
            }
            
            const config = {
                method,
                headers,
                credentials: 'include'
            };
            
            if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
                config.body = JSON.stringify(data);
            }
            
            const response = await fetch(url, config);
            
            // 인증 오류 처리
            if (response.status === 401) {
                // 액세스 토큰 만료, 리프레시 토큰으로 갱신 시도
                const refreshed = await authService.refreshToken();
                if (refreshed) {
                    // 토큰 갱신 성공 시 요청 재시도
                    headers['Authorization'] = `Bearer ${appState.accessToken}`;
                    const retryConfig = { ...config, headers };
                    const retryResponse = await fetch(url, retryConfig);
                    return await retryResponse.json();
                } else {
                    // 토큰 갱신 실패 시 로그아웃
                    authService.logout();
                    utils.showNotification('세션이 만료되었습니다. 다시 로그인해주세요.', false);
                    throw new Error('인증 만료');
                }
            }
            
            // 응답 반환
            return await response.json();
        } catch (error) {
            console.error('API 요청 오류:', error);
            throw error;
        }
    },
    
    // 닉네임 중복 확인
    checkNickname: async (nickname) => {
        return await apiService.request(
            `/api/v1/auth/check-nickname?nickname=${encodeURIComponent(nickname)}`,
            'GET',
            null,
            false
        );
    },
    
    // 회원가입
    register: async (userData) => {
        return await apiService.request('/api/v1/auth/register', 'POST', userData, false);
    },
    
    // 로그인
    login: async (encodedData) => {
        return await apiService.request('/api/v1/auth/login', 'POST', { encodedData }, false);
    },
    
    // 토큰 검증
    validateToken: async () => {
        return await apiService.request('/api/v1/auth/token/validate', 'GET');
    },
    
    // 토큰 새로고침
    refreshToken: async (refreshToken) => {
        return await apiService.request('/api/v1/auth/refresh', 'POST', { refreshToken }, false);
    },
    
    // 로그아웃
    logout: async (refreshToken) => {
        return await apiService.request('/api/v1/auth/logout', 'POST', { refreshToken });
    },
    
    // 사용자 정보 가져오기
    getUserInfo: async () => {
        return await apiService.request('/api/v1/auth/user-info', 'GET');
    },
    
    // 프로필 업데이트
    updateProfile: async (profileData) => {
        return await apiService.request('/api/v1/auth/profile', 'PUT', profileData);
    },
    
    // 계정 탈퇴
    withdrawUser: async () => {
        return await apiService.request('/api/v1/auth/withdraw', 'POST');
    }
};

// 인증 서비스
const authService = {
        // 인증 초기화
        init: () => {
            // 로컬 스토리지에서 토큰 가져오기
        const accessToken = localStorage.getItem(LOCAL_STORAGE_KEYS.ACCESS_TOKEN);
        const refreshToken = localStorage.getItem(LOCAL_STORAGE_KEYS.REFRESH_TOKEN);
        const tempToken = localStorage.getItem(LOCAL_STORAGE_KEYS.TEMP_TOKEN);
        
        if (accessToken && refreshToken) {
            appState.accessToken = accessToken;
            appState.refreshToken = refreshToken;
            // 토큰 유효성 검사
            authService.validateSession();
        }
        
        if (tempToken) {
            appState.tempToken = tempToken;
        }
        
        // 세션 스토리지에서 OAuth 데이터 확인
        const oauthData = sessionStorage.getItem('oauthData');
        if (oauthData) {
            // OAuth 데이터로 로그인 처리
            authService.loginWithEncodedData(oauthData);
            // 처리 후 세션 스토리지에서 삭제
            sessionStorage.removeItem('oauthData');
        }
        
        // URL 파라미터 처리
        const urlParams = utils.getUrlParams();
        
        // 임시 토큰 처리 (회원가입용)
        if (urlParams.token) {
            localStorage.setItem(LOCAL_STORAGE_KEYS.TEMP_TOKEN, urlParams.token);
            appState.tempToken = urlParams.token;
            
            // URL에서 토큰 파라미터 제거
            const url = new URL(window.location.href);
            url.searchParams.delete('token');
            window.history.replaceState({}, document.title, url);
            
            // 회원가입 모달 표시
            setTimeout(() => {
                utils.openModal(elements.authModal);
                // 회원가입 탭으로 전환
                elements.tabBtns.forEach(btn => {
                    if (btn.dataset.tab === 'register') {
                        btn.click();
                    }
                });
            }, 500);
        }
        
        // OAuth 콜백 데이터 처리 (로그인용)
        if (urlParams.data) {
            try {
                const encodedData = urlParams.data;
                // data 파라미터로 로그인 처리
                authService.loginWithEncodedData(encodedData);
                
                // URL에서 data 파라미터 제거
                const url = new URL(window.location.href);
                url.searchParams.delete('data');
                window.history.replaceState({}, document.title, url);
            } catch (error) {
                console.error('OAuth 콜백 데이터 처리 오류:', error);
            }
        }
    },
    
    // 세션 유효성 검사
    validateSession: async () => {
        try {
            const response = await apiService.validateToken();
            
            if (response.success && response.data.valid) {
                // 토큰이 유효한 경우 사용자 정보 가져오기
                await authService.getUserInfo();
                return true;
            } else {
                // 토큰이 유효하지 않은 경우 리프레시 토큰으로 갱신 시도
                const refreshed = await authService.refreshToken();
                if (refreshed) {
                    await authService.getUserInfo();
                    return true;
                } else {
                    // 갱신 실패 시 로그아웃
                    authService.logout(false);
                    return false;
                }
            }
        } catch (error) {
            console.error('세션 검증 오류:', error);
            authService.logout(false);
            return false;
        }
    },
    
    // 인코딩된 데이터로 로그인
    loginWithEncodedData: async (encodedData) => {
        try {
            const response = await apiService.login(encodedData);
            
            if (response.success && response.data) {
                // 토큰 저장
                authService.setTokens(
                    response.data.accessToken,
                    response.data.refreshToken,
                    response.data.user
                );
                utils.showNotification('로그인되었습니다.');
                return true;
            } else {
                utils.showNotification(
                    response.error?.message || '로그인에 실패했습니다.',
                    false
                );
                return false;
            }
        } catch (error) {
            console.error('로그인 오류:', error);
            utils.showNotification('로그인 처리 중 오류가 발생했습니다.', false);
            return false;
        }
    },
    
    // 사용자 정보 가져오기
    getUserInfo: async () => {
        try {
            const response = await apiService.getUserInfo();
            
            if (response.success && response.data) {
                appState.user = response.data;
                appState.isAuthenticated = true;
                authService.updateAuthUI();
                return true;
            } else {
                return false;
            }
        } catch (error) {
            console.error('사용자 정보 가져오기 오류:', error);
            return false;
        }
    },
    
    // 회원가입
    register: async (formData) => {
        try {
            const tempToken = localStorage.getItem(LOCAL_STORAGE_KEYS.TEMP_TOKEN);
            
            if (!tempToken) {
                utils.showNotification('유효한 임시 토큰이 없습니다.', false);
                return false;
            }
            
            const userData = {
                tempToken: tempToken,
                name: formData.get('name'),
                nickname: formData.get('nickname'),
                profileImageUrl: formData.get('profileImageUrl')
            };
            
            const response = await apiService.register(userData);
            
            if (response.success && response.data) {
                // 토큰 저장
                authService.setTokens(
                    response.data.accessToken,
                    response.data.refreshToken,
                    response.data.user
                );
                
                // 임시 토큰 삭제
                localStorage.removeItem(LOCAL_STORAGE_KEYS.TEMP_TOKEN);
                appState.tempToken = null;
                
                utils.showNotification('회원가입이 완료되었습니다.');
                utils.closeModal(elements.authModal);
                return true;
            } else {
                utils.showNotification(
                    response.error?.message || '회원가입에 실패했습니다.',
                    false
                );
                return false;
            }
        } catch (error) {
            console.error('회원가입 오류:', error);
            utils.showNotification('회원가입 처리 중 오류가 발생했습니다.', false);
            return false;
        }
    },
    
    // 토큰 새로고침
    refreshToken: async () => {
        try {
            if (!appState.refreshToken) return false;
            
            const response = await apiService.refreshToken(appState.refreshToken);
            
            if (response.success && response.data) {
                // 새 토큰 저장
                localStorage.setItem(LOCAL_STORAGE_KEYS.ACCESS_TOKEN, response.data.accessToken);
                localStorage.setItem(LOCAL_STORAGE_KEYS.REFRESH_TOKEN, response.data.refreshToken);
                
                appState.accessToken = response.data.accessToken;
                appState.refreshToken = response.data.refreshToken;
                
                return true;
            } else {
                return false;
            }
        } catch (error) {
            console.error('토큰 갱신 오류:', error);
            return false;
        }
    },
    
    // 로그아웃
    logout: async (showNotification = true) => {
        try {
            if (appState.refreshToken) {
                await apiService.logout(appState.refreshToken);
            }
        } catch (error) {
            console.error('로그아웃 오류:', error);
        }
        
        // 로컬 스토리지 및 상태 초기화
        localStorage.removeItem(LOCAL_STORAGE_KEYS.ACCESS_TOKEN);
        localStorage.removeItem(LOCAL_STORAGE_KEYS.REFRESH_TOKEN);
        
        appState.isAuthenticated = false;
        appState.user = null;
        appState.accessToken = null;
        appState.refreshToken = null;
        
        authService.updateAuthUI();
        
        if (showNotification) {
            utils.showNotification('로그아웃되었습니다.');
        }
        
        // 홈 페이지로 이동
        utils.changePage('home');
    },
    
    // 토큰 설정
    setTokens: (accessToken, refreshToken, user) => {
        localStorage.setItem(LOCAL_STORAGE_KEYS.ACCESS_TOKEN, accessToken);
        localStorage.setItem(LOCAL_STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
        
        appState.accessToken = accessToken;
        appState.refreshToken = refreshToken;
        appState.user = user;
        appState.isAuthenticated = true;
        
        authService.updateAuthUI();
    },
    
    // 인증 UI 업데이트
    updateAuthUI: () => {
        if (appState.isAuthenticated && appState.user) {
            elements.loginBtn.style.display = 'none';
            elements.userProfile.style.display = 'flex';
            elements.userName.textContent = appState.user.nickname || appState.user.name;
            elements.profileImg.src = appState.user.profileImageUrl || 'https://via.placeholder.com/40';
            
            // 프로필 페이지 정보 업데이트
            elements.profilePageImg.src = appState.user.profileImageUrl || 'https://via.placeholder.com/150';
            elements.profilePageName.textContent = appState.user.nickname || appState.user.name;
            elements.profilePageEmail.textContent = appState.user.email || '이메일 정보 없음';
        } else {
            elements.loginBtn.style.display = 'block';
            elements.userProfile.style.display = 'none';
        }
    },
    
    // 프로필 업데이트
    updateProfile: async (formData) => {
        try {
            const profileData = {
                nickname: formData.get('nickname'),
                profileImageUrl: formData.get('profileImageUrl')
            };
            
            const response = await apiService.updateProfile(profileData);
            
            if (response.success && response.data) {
                appState.user = response.data;
                authService.updateAuthUI();
                utils.closeModal(elements.editProfileModal);
                utils.showNotification('프로필이 업데이트되었습니다.');
                return true;
            } else {
                utils.showNotification(
                    response.error?.message || '프로필 업데이트에 실패했습니다.',
                    false
                );
                return false;
            }
        } catch (error) {
            console.error('프로필 업데이트 오류:', error);
            utils.showNotification('프로필 업데이트 중 오류가 발생했습니다.', false);
            return false;
        }
    }
};

// 이벤트 핸들러
const eventHandlers = {
    init: () => {
        // 탭 전환
        elements.tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const tabType = btn.dataset.tab;
                
                // 탭 버튼 활성화
                elements.tabBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                // 탭 콘텐츠 활성화
                document.querySelectorAll('.tab-content').forEach(content => {
                    content.classList.remove('active');
                });
                document.getElementById(`${tabType}-tab`).classList.add('active');
            });
        });
        
        // 모달 닫기 버튼
        elements.modalCloses.forEach(closeBtn => {
            closeBtn.addEventListener('click', () => {
                const modal = closeBtn.closest('.modal');
                utils.closeModal(modal);
            });
        });
        
        // 모달 외부 클릭 시 닫기
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                utils.closeModal(e.target);
            }
        });
        
        // 로그인 버튼
        elements.loginBtn.addEventListener('click', () => {
            utils.openModal(elements.authModal);
        });
        
        // 로그아웃 버튼
        elements.logoutBtn.addEventListener('click', () => {
            authService.logout();
        });
        
        // 소셜 로그인 버튼
        elements.kakaoLogin.addEventListener('click', () => {
            window.location.href = `${API_BASE_URL}/oauth2/authorization/kakao`;
        });
        
        elements.naverLogin.addEventListener('click', () => {
            window.location.href = `${API_BASE_URL}/oauth2/authorization/naver`;
        });
        
        // 아바타 선택
        document.querySelectorAll('.avatar-option').forEach(option => {
            option.addEventListener('click', (e) => {
                const parent = option.closest('.avatar-selection');
                parent.querySelectorAll('.avatar-option').forEach(opt => {
                    opt.classList.remove('selected');
                });
                option.classList.add('selected');
                
                const imageUrl = option.querySelector('img').dataset.url;
                const form = option.closest('form');
                
                if (form.id === 'register-form') {
                    elements.profileImageUrl.value = imageUrl;
                } else if (form.id === 'edit-profile-form') {
                    elements.editProfileImageUrl.value = imageUrl;
                }
            });
        });
        
        // 닉네임 입력 시 중복 확인
        elements.nicknameInput.addEventListener('input', async () => {
            const nickname = elements.nicknameInput.value.trim();
            
            if (nickname.length < 2) {
                elements.nicknameStatus.textContent = '닉네임은 2자 이상이어야 합니다.';
                elements.nicknameStatus.style.color = 'var(--warning-color)';
                return;
            }
            
            try {
                const response = await apiService.checkNickname(nickname);
                
                if (response.success) {
                    const available = response.data.available;
                    elements.nicknameStatus.textContent = available ? 
                        '사용 가능한 닉네임입니다.' : '이미 사용 중인 닉네임입니다.';
                    elements.nicknameStatus.style.color = available ? 
                        'var(--success-color)' : 'var(--danger-color)';
                }
            } catch (error) {
                console.error('닉네임 중복 확인 오류:', error);
            }
        });
        
        // 프로필 수정 시 닉네임 중복 확인
        elements.editNickname.addEventListener('input', async () => {
            const nickname = elements.editNickname.value.trim();
            
            if (nickname.length < 2) {
                elements.editNicknameStatus.textContent = '닉네임은 2자 이상이어야 합니다.';
                elements.editNicknameStatus.style.color = 'var(--warning-color)';
                return;
            }
            
            // 현재 닉네임과 같으면 중복 확인 불필요
            if (nickname === appState.user.nickname) {
                elements.editNicknameStatus.textContent = '현재 사용 중인 닉네임입니다.';
                elements.editNicknameStatus.style.color = 'var(--success-color)';
                return;
            }
            
            try {
                const response = await apiService.checkNickname(nickname);
                
                if (response.success) {
                    const available = response.data.available;
                    elements.editNicknameStatus.textContent = available ? 
                        '사용 가능한 닉네임입니다.' : '이미 사용 중인 닉네임입니다.';
                    elements.editNicknameStatus.style.color = available ? 
                        'var(--success-color)' : 'var(--danger-color)';
                }
            } catch (error) {
                console.error('닉네임 중복 확인 오류:', error);
            }
        });
        
        // 회원가입 폼 제출
        elements.registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(elements.registerForm);
            await authService.register(formData);
        });
        
        // 프로필 수정 폼 제출
        elements.editProfileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(elements.editProfileForm);
            await authService.updateProfile(formData);
        });
        
        // 내 프로필 버튼
        elements.myProfile.addEventListener('click', (e) => {
            e.preventDefault();
            utils.changePage('profile');
        });
        
        // 프로필 수정 버튼
        elements.editProfileBtn.addEventListener('click', () => {
            // 현재 사용자 정보로 폼 초기화
            elements.editNickname.value = appState.user.nickname || '';
            elements.editProfileImageUrl.value = appState.user.profileImageUrl || 'https://via.placeholder.com/200/ff9800/ffffff?text=1';
            
            // 프로필 이미지 선택 업데이트
            const avatarOptions = elements.editProfileModal.querySelectorAll('.avatar-option');
            avatarOptions.forEach(option => {
                const imageUrl = option.querySelector('img').dataset.url;
                if (imageUrl === appState.user.profileImageUrl) {
                    option.classList.add('selected');
                } else {
                    option.classList.remove('selected');
                }
            });
            
            utils.openModal(elements.editProfileModal);
        });
        
        // 네비게이션 링크
        elements.navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const pageId = link.dataset.page;
                utils.changePage(pageId);
            });
        });
        
        // 시작하기 버튼
        elements.getStartedBtn.addEventListener('click', () => {
            if (appState.isAuthenticated) {
                utils.changePage('trainers');
            } else {
                utils.openModal(elements.authModal);
            }
        });

        // 회원 탈퇴 버튼
        elements.withdrawBtn.addEventListener('click', () => {
            utils.openModal(elements.withdrawModal);
        });
        
        // 탈퇴 취소 버튼
        elements.cancelWithdrawBtn.addEventListener('click', () => {
            utils.closeModal(elements.withdrawModal);
        });
        
        // 탈퇴 확인 버튼
        elements.confirmWithdrawBtn.addEventListener('click', async () => {
            try {
                const response = await apiService.withdrawUser();
                
                if (response.success) {
                    utils.closeModal(elements.withdrawModal);
                    
                    // 로그아웃과 동일한 처리
                    localStorage.removeItem(LOCAL_STORAGE_KEYS.ACCESS_TOKEN);
                    localStorage.removeItem(LOCAL_STORAGE_KEYS.REFRESH_TOKEN);
                    
                    appState.isAuthenticated = false;
                    appState.user = null;
                    appState.accessToken = null;
                    appState.refreshToken = null;
                    
                    authService.updateAuthUI();
                    
                    utils.showNotification('회원 탈퇴가 완료되었습니다.');
                    
                    // 홈 페이지로 이동
                    utils.changePage('home');
                } else {
                    utils.showNotification(
                        response.error?.message || '회원 탈퇴 처리 중 오류가 발생했습니다.',
                        false
                    );
                }
            } catch (error) {
                console.error('회원 탈퇴 처리 중 오류:', error);
                utils.showNotification('회원 탈퇴 처리 중 오류가 발생했습니다.', false);
            }
        });
    }
};

// 앱 초기화
document.addEventListener('DOMContentLoaded', () => {
    // 이벤트 핸들러 초기화
    eventHandlers.init();
    
    // 인증 상태 초기화
    authService.init();
});