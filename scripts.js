// API 설정
const API_BASE_URL = 'http://localhost:8443';
const FRONT_URL = 'http://127.0.0.1:5500'; // 프론트엔드 기본 URL (index.html 제외)
const API_ENDPOINTS = {
    CHECK_NICKNAME: '/api/v1/auth/check-nickname',
    REGISTER: '/api/v1/auth/register',
    USER_INFO: '/api/v1/auth/user-info',
    REFRESH_TOKEN: '/api/v1/auth/refresh',
    LOGOUT: '/api/v1/auth/logout',
    UPDATE_PROFILE: '/api/v1/auth/profile',
    DELETE_ACCOUNT: '/api/v1/auth/withdraw',
    VALIDATE_TOKEN: '/api/v1/auth/token/validate'
};

// OAuth 리다이렉트 URL - 절대 경로로 수정
const OAUTH_URLS = {
    KAKAO: `${API_BASE_URL}/oauth2/authorization/kakao`,
    NAVER: `${API_BASE_URL}/oauth2/authorization/naver`
};

// 앱 상태
const appState = {
    user: null,
    accessToken: null,
    refreshToken: null,
    tempToken: null,
    isLoading: false
};

// DOM 요소
const elements = {
    // 인증
    loginBtn: document.getElementById('login-btn'),
    userProfile: document.getElementById('user-profile'),
    profileImg: document.getElementById('profile-img'),
    userName: document.getElementById('user-name'),
    profileBtn: document.getElementById('profile-btn'),
    logoutBtn: document.getElementById('logout-btn'),
    authSection: document.getElementById('auth-section'),
    
    // 모달
    authModal: document.getElementById('auth-modal'),
    editProfileModal: document.getElementById('edit-profile-modal'),
    confirmDeleteModal: document.getElementById('confirm-delete-modal'),
    notificationModal: document.getElementById('notification-modal'),
    notificationMessage: document.querySelector('.notification-message'),
    modalCloseButtons: document.querySelectorAll('.close'),
    
    // 인증 탭
    tabBtns: document.querySelectorAll('.tab-btn'),
    loginTab: document.getElementById('login-tab'),
    registerTab: document.getElementById('register-tab'),
    
    // OAuth 버튼
    oauthButtons: document.querySelectorAll('.oauth-btn'),
    
    // 회원가입 폼
    registerForm: document.getElementById('register-form'),
    nicknameInput: document.getElementById('nickname'),
    nicknameStatus: document.getElementById('nickname-status'),
    avatarOptions: document.querySelectorAll('.avatar-option'),
    profileImageUrl: document.getElementById('profile-image-url'),
    
    // 네비게이션
    navMenu: document.getElementById('nav-menu'),
    navLinks: document.querySelectorAll('#nav-menu a'),
    getStartedBtn: document.getElementById('get-started-btn'),
    
    // 페이지
    pages: document.querySelectorAll('.page'),
    homePage: document.getElementById('home-page'),
    profilePage: document.getElementById('profile-page'),
    trainersPage: document.getElementById('trainers-page'),
    communityPage: document.getElementById('community-page'),
    aboutPage: document.getElementById('about-page'),
    
    // 프로필 페이지
    profilePageImg: document.getElementById('profile-page-img'),
    profilePageName: document.getElementById('profile-page-name'),
    profilePageEmail: document.getElementById('profile-page-email'),
    profileNickname: document.getElementById('profile-nickname'),
    profileRole: document.getElementById('profile-role'),
    editProfileBtn: document.getElementById('edit-profile-btn'),
    deleteAccountBtn: document.getElementById('delete-account-btn'),
    profileTabs: document.querySelectorAll('.profile-tab'),
    profileTabContents: document.querySelectorAll('.profile-tab-content'),
    
    // 프로필 수정
    editProfileForm: document.getElementById('edit-profile-form'),
    editNicknameInput: document.getElementById('edit-nickname'),
    editNicknameStatus: document.getElementById('edit-nickname-status'),
    editProfileImageUrl: document.getElementById('edit-profile-image-url'),
    editAvatarOptions: document.querySelectorAll('#edit-profile-modal .avatar-option'),
    
    // 계정 삭제
    cancelDeleteBtn: document.getElementById('cancel-delete-btn'),
    confirmDeleteBtn: document.getElementById('confirm-delete-btn')
};

// 유틸리티 함수
const utils = {
    // 알림 표시
    showNotification: (message, isSuccess = true) => {
        elements.notificationMessage.textContent = message;
        elements.notificationModal.style.display = 'block';
        
        elements.notificationModal.style.backgroundColor = isSuccess ? 'var(--success-color)' : 'var(--danger-color)';
        
        setTimeout(() => {
            elements.notificationModal.style.display = 'none';
        }, 3000);
    },
    
    // 모달 열기
    openModal: (modal) => {
        modal.style.display = 'block';
    },
    
    // 모달 닫기
    closeModal: (modal) => {
        modal.style.display = 'none';
    },
    
    // 탭 전환
    switchTab: (tabs, tabContents, activeTab) => {
        tabs.forEach(tab => tab.classList.remove('active'));
        tabContents.forEach(content => content.classList.remove('active'));
        
        activeTab.classList.add('active');
        const tabId = activeTab.dataset.tab;
        document.getElementById(`${tabId}-tab`).classList.add('active');
    },
    
    // 페이지 변경
    changePage: (pageId) => {
        elements.navLinks.forEach(link => link.classList.remove('active'));
        elements.pages.forEach(page => page.classList.remove('active'));
        
        document.querySelector(`[data-page="${pageId}"]`)?.classList.add('active');
        document.getElementById(`${pageId}-page`).classList.add('active');
    },
    
    // URL 파라미터 가져오기
    getUrlParam: (param) => {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(param);
    },
    
    // JWT 토큰 파싱
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
    
    // 디버그 로그
    debug: (message, data = null) => {
        console.log(`[DEBUG] ${message}`, data || '');
    }
};

// API 서비스
const apiService = {
    // API 요청 보내기
    request: async (endpoint, method = 'GET', data = null, requiresAuth = true) => {
        try {
            appState.isLoading = true;
            
            const url = `${API_BASE_URL}${endpoint}`;
            const headers = {
                'Content-Type': 'application/json'
            };
            
            if (requiresAuth && appState.accessToken) {
                headers['Authorization'] = `Bearer ${appState.accessToken}`;
            }
            
            const config = {
                method,
                headers,
                credentials: 'include'
            };
            
            if (data && (method === 'POST' || method === 'PUT')) {
                config.body = JSON.stringify(data);
            }
            
            utils.debug(`API 요청: ${method} ${url}`, data);
            
            const response = await fetch(url, config);
            
            if (response.status === 401) {
                // 인증 실패 - 토큰이 만료되었을 수 있음
                utils.debug('401 오류: 토큰 새로고침 시도');
                const refreshed = await authService.refreshToken();
                if (refreshed) {
                    // 새 토큰으로 요청 재시도
                    headers['Authorization'] = `Bearer ${appState.accessToken}`;
                    const retryConfig = {
                        ...config,
                        headers
                    };
                    utils.debug('새 토큰으로 요청 재시도', appState.accessToken);
                    const retryResponse = await fetch(url, retryConfig);
                    const retryData = await retryResponse.json();
                    appState.isLoading = false;
                    return retryData;
                } else {
                    // 토큰 갱신 실패, 다시 로그인 필요
                    utils.debug('토큰 갱신 실패, 로그아웃');
                    authService.logout();
                    throw new Error('세션이 만료되었습니다. 다시 로그인해주세요.');
                }
            }
            
            const responseData = await response.json();
            utils.debug(`API 응답: ${url}`, responseData);
            appState.isLoading = false;
            return responseData;
        } catch (error) {
            appState.isLoading = false;
            console.error('API 요청 오류:', error);
            throw error;
        }
    },
    
    // 닉네임 중복 확인
    checkNickname: async (nickname) => {
        const response = await apiService.request(
            `${API_ENDPOINTS.CHECK_NICKNAME}?nickname=${encodeURIComponent(nickname)}`,
            'GET',
            null,
            false
        );
        return response;
    },
    
    // 회원가입
    register: async (userData) => {
        const response = await apiService.request(
            API_ENDPOINTS.REGISTER,
            'POST',
            userData,
            false
        );
        return response;
    },
    
    // 사용자 정보 가져오기
    getUserInfo: async () => {
        const response = await apiService.request(
            API_ENDPOINTS.USER_INFO,
            'GET'
        );
        return response;
    },
    
    // 프로필 업데이트
    updateProfile: async (profileData) => {
        const response = await apiService.request(
            API_ENDPOINTS.UPDATE_PROFILE,
            'PUT',
            profileData
        );
        return response;
    },
    
    // 계정 삭제
    deleteAccount: async () => {
        const response = await apiService.request(
            API_ENDPOINTS.DELETE_ACCOUNT,
            'POST'
        );
        return response;
    },
    
    // 토큰 유효성 검사
    validateToken: async () => {
        try {
            const response = await apiService.request(
                API_ENDPOINTS.VALIDATE_TOKEN,
                'GET'
            );
            return response;
        } catch (error) {
            return { valid: false };
        }
    }
};

// 인증 서비스
const authService = {
    // 로컬 스토리지에서 인증 초기화
    init: () => {
        const accessToken = localStorage.getItem('accessToken');
        const refreshToken = localStorage.getItem('refreshToken');
        
        if (accessToken) {
            appState.accessToken = accessToken;
            authService.validateSession();
        }
        
        if (refreshToken) {
            appState.refreshToken = refreshToken;
        }
        
        // URL에서 토큰 확인 (OAuth 리다이렉트로부터)
        const token = utils.getUrlParam('token');
        if (token) {
            utils.debug('임시 토큰 발견', token);
            appState.tempToken = token;
            // URL에서 토큰 제거
            window.history.replaceState({}, document.title, window.location.pathname);
            // 회원가입 양식 표시
            utils.openModal(elements.authModal);
            utils.switchTab(
                elements.tabBtns,
                [elements.loginTab, elements.registerTab],
                document.querySelector('.tab-btn[data-tab="register"]')
            );
        }
    },
    
    // 토큰 새로고침
    refreshToken: async () => {
        try {
            if (!appState.refreshToken) {
                utils.debug('리프레시 토큰 없음');
                return false;
            }
            
            utils.debug('토큰 새로고침 시도', appState.refreshToken);
            
            const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.REFRESH_TOKEN}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ refreshToken: appState.refreshToken }),
                credentials: 'include'
            });
            
            if (!response.ok) {
                utils.debug('토큰 새로고침 실패: 응답 에러', response.status);
                return false;
            }
            
            const data = await response.json();
            utils.debug('토큰 새로고침 응답', data);
            
            if (data.success && data.data) {
                authService.setTokens(data.data.accessToken, data.data.refreshToken);
                utils.debug('토큰 새로고침 성공');
                return true;
            }
            
            utils.debug('토큰 새로고침 실패: 유효하지 않은 응답');
            return false;
        } catch (error) {
            console.error('토큰 갱신 오류:', error);
            return false;
        }
    },
    
    // 토큰 설정
    setTokens: (accessToken, refreshToken) => {
        appState.accessToken = accessToken;
        appState.refreshToken = refreshToken;
        
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        
        utils.debug('토큰 저장됨', { accessToken: accessToken.substring(0, 10) + '...', refreshToken: refreshToken.substring(0, 10) + '...' });
    },
    
    // 현재 세션 검증
    validateSession: async () => {
        try {
            utils.debug('세션 검증 시작');
            const response = await apiService.validateToken();
            
            if (response.success && response.data.valid) {
                // 토큰이 유효함, 사용자 정보 가져오기
                utils.debug('토큰 유효함, 사용자 정보 가져오기');
                await userService.fetchUserInfo();
                return true;
            }
            
            // 토큰이 유효하지 않음, 새로고침 시도
            utils.debug('토큰 유효하지 않음, 새로고침 시도');
            const refreshed = await authService.refreshToken();
            if (refreshed) {
                utils.debug('토큰 새로고침 성공, 사용자 정보 가져오기');
                await userService.fetchUserInfo();
                return true;
            }
            
            // 새로고침 실패, 인증 정보 삭제
            utils.debug('토큰 새로고침 실패, 인증 정보 삭제');
            authService.clearAuth();
            return false;
        } catch (error) {
            console.error('세션 검증 오류:', error);
            authService.clearAuth();
            return false;
        }
    },
    
    // 로그아웃
    logout: async () => {
        try {
            if (appState.refreshToken) {
                utils.debug('로그아웃 요청');
                await apiService.request(
                    API_ENDPOINTS.LOGOUT,
                    'POST',
                    { refreshToken: appState.refreshToken }
                );
            }
        } catch (error) {
            console.error('로그아웃 중 오류 발생:', error);
        }
        
        authService.clearAuth();
        uiService.updateAuthUI();
        utils.changePage('home');
        utils.showNotification('로그아웃되었습니다', true);
    },
    
    // 인증 데이터 삭제
    clearAuth: () => {
        appState.user = null;
        appState.accessToken = null;
        appState.refreshToken = null;
        
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        
        utils.debug('인증 정보 삭제됨');
    }
};

// 사용자 서비스
const userService = {
    // 사용자 정보 가져오기
    fetchUserInfo: async () => {
        try {
            const response = await apiService.getUserInfo();
            
            if (response.success && response.data) {
                appState.user = response.data;
                uiService.updateAuthUI();
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('사용자 정보 가져오기 오류:', error);
            return false;
        }
    },
    
    // 새 사용자 등록
    register: async (formData) => {
        try {
            // localStorage에서 tempToken 가져오기
            const tempToken = localStorage.getItem('tempToken') || appState.tempToken;
            
            if (!tempToken) {
                utils.showNotification('유효한 임시 토큰이 없습니다. 다시 로그인해 주세요.', false);
                return false;
            }
            
            const userData = {
                tempToken: tempToken,
                name: formData.get('name'),
                nickname: formData.get('nickname'),
                profileImageUrl: formData.get('profileImageUrl')
            };
            
            console.log('회원가입 데이터:', userData);
            
            const response = await apiService.register(userData);
            
            if (response.success && response.data) {
                const { accessToken, refreshToken, user } = response.data;
                authService.setTokens(accessToken, refreshToken);
                appState.user = user;
                
                // 임시 토큰 삭제
                localStorage.removeItem('tempToken');
                appState.tempToken = null;
                
                uiService.updateAuthUI();
                utils.closeModal(elements.authModal);
                utils.showNotification('회원가입이 완료되었습니다!', true);
                return true;
            }
            
            utils.showNotification(response.error?.message || '회원가입에 실패했습니다', false);
            return false;
        } catch (error) {
            console.error('회원가입 중 오류 발생:', error);
            utils.showNotification('회원가입 실패: ' + error.message, false);
            return false;
        }
    },
    
    // 사용자 프로필 업데이트
    updateProfile: async (formData) => {
        try {
            const profileData = {
                nickname: formData.get('nickname'),
                profileImageUrl: formData.get('profileImageUrl')
            };
            
            utils.debug('프로필 업데이트 요청', profileData);
            const response = await apiService.updateProfile(profileData);
            
            if (response.success && response.data) {
                appState.user = response.data;
                uiService.updateAuthUI();
                uiService.updateProfileUI();
                utils.closeModal(elements.editProfileModal);
                utils.showNotification('프로필이 성공적으로 업데이트되었습니다!', true);
                return true;
            }
            
            utils.showNotification(response.error?.message || '프로필 업데이트에 실패했습니다', false);
            return false;
        } catch (error) {
            console.error('프로필 업데이트 오류:', error);
            utils.showNotification('프로필 업데이트 실패: ' + error.message, false);
            return false;
        }
    },
    
    // 사용자 계정 삭제
    deleteAccount: async () => {
        try {
            utils.debug('계정 삭제 요청');
            const response = await apiService.deleteAccount();
            
            if (response.success) {
                authService.clearAuth();
                uiService.updateAuthUI();
                utils.closeModal(elements.confirmDeleteModal);
                utils.changePage('home');
                utils.showNotification('계정이 삭제되었습니다', true);
                return true;
            }
            
            utils.showNotification(response.error?.message || '계정 삭제에 실패했습니다', false);
            return false;
        } catch (error) {
            console.error('계정 삭제 오류:', error);
            utils.showNotification('계정 삭제 실패: ' + error.message, false);
            return false;
        }
    }
};

// UI 서비스
const uiService = {
    // 로그인 상태에 따라 인증 UI 업데이트
    updateAuthUI: () => {
        if (appState.user) {
            // 사용자 로그인됨
            elements.loginBtn.style.display = 'none';
            elements.userProfile.style.display = 'flex';
            elements.profileImg.src = appState.user.profileImageUrl || '/api/placeholder/32/32';
            elements.userName.textContent = appState.user.nickname || appState.user.name;
            utils.debug('UI 업데이트: 로그인 상태');
        } else {
            // 사용자 로그아웃됨
            elements.loginBtn.style.display = 'block';
            elements.userProfile.style.display = 'none';
            utils.debug('UI 업데이트: 로그아웃 상태');
        }
    },
    
    // 프로필 페이지 UI 업데이트
    updateProfileUI: () => {
        if (!appState.user) return;
        
        elements.profilePageImg.src = appState.user.profileImageUrl || '/api/placeholder/150/150';
        elements.profilePageName.textContent = appState.user.name;
        elements.profilePageEmail.textContent = appState.user.email || '이메일 정보 없음';
        elements.profileNickname.textContent = appState.user.nickname;
        elements.profileRole.textContent = appState.user.role === 'ROLE_TRAINER' ? '훈련사' : '일반 사용자';
        
        // 프로필 수정 폼 설정
        elements.editNicknameInput.value = appState.user.nickname;
        elements.editProfileImageUrl.value = appState.user.profileImageUrl;
        
        // 현재 아바타 선택
        elements.editAvatarOptions.forEach(option => {
            option.classList.remove('selected');
            const imgUrl = option.querySelector('img').dataset.url;
            if (imgUrl === appState.user.profileImageUrl) {
                option.classList.add('selected');
            }
        });
        
        utils.debug('프로필 UI 업데이트 완료');
    }
};

// 이벤트 핸들러
const eventHandlers = {
    // 모든 이벤트 리스너 초기화
    init: () => {
        // 로그인 버튼
        elements.loginBtn.addEventListener('click', () => {
            utils.openModal(elements.authModal);
        });
        
        // 모달 닫기 버튼
        elements.modalCloseButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                utils.closeModal(modal);
            });
        });
        
        // 모달 외부 클릭 시 닫기
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                utils.closeModal(e.target);
            }
        });
        
        // 탭 전환
        elements.tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                utils.switchTab(
                    elements.tabBtns,
                    [elements.loginTab, elements.registerTab],
                    btn
                );
            });
        });
        
        // OAuth 로그인 버튼
        document.querySelector('.oauth-btn.kakao').addEventListener('click', () => {
            utils.debug('카카오 로그인 시작', OAUTH_URLS.KAKAO);
            window.location.href = OAUTH_URLS.KAKAO;
        });
        
        document.querySelector('.oauth-btn.naver').addEventListener('click', () => {
            utils.debug('네이버 로그인 시작', OAUTH_URLS.NAVER);
            window.location.href = OAUTH_URLS.NAVER;
        });
        
        // 닉네임 유효성 검사
        elements.nicknameInput.addEventListener('input', async () => {
            const nickname = elements.nicknameInput.value.trim();
            
            if (nickname.length < 3) {
                elements.nicknameStatus.textContent = '닉네임은 최소 3자 이상이어야 합니다';
                elements.nicknameStatus.style.color = 'var(--warning-color)';
                return;
            }
            
            try {
                const response = await apiService.checkNickname(nickname);
                
                if (response.success) {
                    const available = response.data.available;
                    elements.nicknameStatus.textContent = available ? 
                        '사용 가능한 닉네임입니다' : '이미 사용 중인 닉네임입니다';
                    elements.nicknameStatus.style.color = available ? 
                        'var(--success-color)' : 'var(--danger-color)';
                }
            } catch (error) {
                console.error('닉네임 확인 오류:', error);
            }
        });
        
        // 프로필 수정 닉네임 유효성 검사
        elements.editNicknameInput.addEventListener('input', async () => {
            const nickname = elements.editNicknameInput.value.trim();
            
            if (nickname === appState.user.nickname) {
                elements.editNicknameStatus.textContent = '';
                return;
            }
            
            if (nickname.length < 3) {
                elements.editNicknameStatus.textContent = '닉네임은 최소 3자 이상이어야 합니다';
                elements.editNicknameStatus.style.color = 'var(--warning-color)';
                return;
            }
            
            try {
                const response = await apiService.checkNickname(nickname);
                
                if (response.success) {
                    const available = response.data.available;
                    elements.editNicknameStatus.textContent = available ? 
                        '사용 가능한 닉네임입니다' : '이미 사용 중인 닉네임입니다';
                    elements.editNicknameStatus.style.color = available ? 
                        'var(--success-color)' : 'var(--danger-color)';
                }
            } catch (error) {
                console.error('닉네임 확인 오류:', error);
            }
        });
        
        // 회원가입 아바타 선택
        elements.avatarOptions.forEach(option => {
            option.addEventListener('click', () => {
                elements.avatarOptions.forEach(opt => opt.classList.remove('selected'));
                option.classList.add('selected');
                elements.profileImageUrl.value = option.querySelector('img').dataset.url;
            });
        });
        
        // 프로필 수정 아바타 선택
        elements.editAvatarOptions.forEach(option => {
            option.addEventListener('click', () => {
                elements.editAvatarOptions.forEach(opt => opt.classList.remove('selected'));
                option.classList.add('selected');
                elements.editProfileImageUrl.value = option.querySelector('img').dataset.url;
            });
        });
        
        // 회원가입 폼 제출
        elements.registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(elements.registerForm);
            await userService.register(formData);
        });
        
        // 네비게이션 메뉴
        elements.navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const pageId = link.dataset.page;
                utils.changePage(pageId);
            });
        });
        
        // 시작하기 버튼
        elements.getStartedBtn.addEventListener('click', () => {
            if (appState.user) {
                utils.changePage('trainers');
            } else {
                utils.openModal(elements.authModal);
            }
        });
        
        // 프로필 버튼
        elements.profileBtn.addEventListener('click', (e) => {
            e.preventDefault();
            utils.changePage('profile');
            uiService.updateProfileUI();
        });
        
        // 로그아웃 버튼
        elements.logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            authService.logout();
        });
        
        // 프로필 페이지 탭
        elements.profileTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                utils.switchTab(
                    elements.profileTabs,
                    elements.profileTabContents,
                    tab
                );
            });
        });
        
        // 프로필 수정 버튼
        elements.editProfileBtn.addEventListener('click', () => {
            utils.openModal(elements.editProfileModal);
        });
        
        // 프로필 수정 폼 제출
        elements.editProfileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(elements.editProfileForm);
            await userService.updateProfile(formData);
        });
        
        // 계정 삭제 버튼
        elements.deleteAccountBtn.addEventListener('click', () => {
            utils.openModal(elements.confirmDeleteModal);
        });
        
        // 삭제 취소 버튼
        elements.cancelDeleteBtn.addEventListener('click', () => {
            utils.closeModal(elements.confirmDeleteModal);
        });
        
        // 삭제 확인 버튼
        elements.confirmDeleteBtn.addEventListener('click', async () => {
            await userService.deleteAccount();
        });
    }
};

// 앱 초기화
const initApp = async () => {
    utils.debug('앱 초기화 시작');
    
    // 인증 초기화
    authService.init();
    
    // 이벤트 리스너 설정
    eventHandlers.init();
    
    // 인증 상태에 따라 UI 업데이트
    uiService.updateAuthUI();
    
    // 페이지 변경 필요한지 확인
    const pageId = window.location.hash.slice(1);
    if (pageId) {
        utils.changePage(pageId);
    }
    
    // 개발 도구 콘솔에 백엔드 접속 정보 출력
    console.log(`펫톡 프론트엔드가 백엔드 API에 연결됨: ${API_BASE_URL}`);
    utils.debug('앱 초기화 완료');
};

// 앱 실행
document.addEventListener('DOMContentLoaded', initApp);