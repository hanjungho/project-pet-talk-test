// API 설정
const API_BASE_URL = 'http://localhost:8443';
const FRONTEND_URL = window.location.origin + window.location.pathname.split('/').slice(0, -1).join('/');

// OAuth 리다이렉트 URL
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

// DOM 요소 참조
const elements = {
    // 인증 관련 요소
    loginBtn: document.getElementById('login-btn'),
    userProfile: document.getElementById('user-profile'),
    profileImg: document.getElementById('profile-img'),
    userName: document.getElementById('user-name'),
    profileBtn: document.getElementById('profile-btn'),
    logoutBtn: document.getElementById('logout-btn'),
    
    // 모달 관련 요소
    authModal: document.getElementById('auth-modal'),
    notificationModal: document.getElementById('notification-modal'),
    notificationMessage: document.querySelector('.notification-message'),
    modalCloseButtons: document.querySelectorAll('.close'),
    
    // 탭 관련 요소
    tabBtns: document.querySelectorAll('.tab-btn'),
    loginTab: document.getElementById('login-tab'),
    registerTab: document.getElementById('register-tab'),
    
    // 회원가입 관련 요소
    registerForm: document.getElementById('register-form'),
    nicknameInput: document.getElementById('nickname'),
    nicknameStatus: document.getElementById('nickname-status'),
    avatarOptions: document.querySelectorAll('.avatar-option'),
    profileImageUrl: document.getElementById('profile-image-url'),
    
    // 페이지 관련 요소
    navLinks: document.querySelectorAll('#nav-menu a'),
    pages: document.querySelectorAll('.page'),
    getStartedBtn: document.getElementById('get-started-btn')
};

// 유틸리티 함수
const utils = {
    // 알림 표시
    showNotification: (message, isSuccess = true) => {
        elements.notificationMessage.textContent = message;
        elements.notificationModal.style.display = 'block';
        elements.notificationModal.style.backgroundColor = 
            isSuccess ? 'var(--success-color)' : 'var(--danger-color)';
        
        setTimeout(() => {
            elements.notificationModal.style.display = 'none';
        }, 3000);
    },
    
    // 모달 열기/닫기
    openModal: (modal) => { modal.style.display = 'block'; },
    closeModal: (modal) => { modal.style.display = 'none'; },
    
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
            
            const response = await fetch(url, config);
            
            if (response.status === 401) {
                // 인증 실패 - 토큰이 만료되었을 수 있음
                const refreshed = await authService.refreshToken();
                if (refreshed) {
                    // 새 토큰으로 요청 재시도
                    headers['Authorization'] = `Bearer ${appState.accessToken}`;
                    const retryConfig = { ...config, headers };
                    const retryResponse = await fetch(url, retryConfig);
                    const retryData = await retryResponse.json();
                    appState.isLoading = false;
                    return retryData;
                } else {
                    // 토큰 갱신 실패, 다시 로그인 필요
                    authService.logout();
                    throw new Error('세션이 만료되었습니다. 다시 로그인해주세요.');
                }
            }
            
            const responseData = await response.json();
            appState.isLoading = false;
            return responseData;
        } catch (error) {
            appState.isLoading = false;
            console.error('API 요청 오류:', error);
            throw error;
        }
    },
    
    // API 엔드포인트 함수들
    checkNickname: async (nickname) => {
        return await apiService.request(
            `/api/v1/auth/check-nickname?nickname=${encodeURIComponent(nickname)}`,
            'GET', null, false
        );
    },
    
    register: async (userData) => {
        return await apiService.request('/api/v1/auth/register', 'POST', userData, false);
    },
    
    getUserInfo: async () => {
        return await apiService.request('/api/v1/auth/user-info', 'GET');
    },
    
    updateProfile: async (profileData) => {
        return await apiService.request('/api/v1/auth/profile', 'PUT', profileData);
    },
    
    deleteAccount: async () => {
        return await apiService.request('/api/v1/auth/withdraw', 'POST');
    },
    
    validateToken: async () => {
        try {
            return await apiService.request('/api/v1/auth/token/validate', 'GET');
        } catch (error) {
            return { valid: false };
        }
    }
};

// 인증 서비스
const authService = {
    // 초기화
    init: () => {
        const accessToken = localStorage.getItem('accessToken');
        const refreshToken = localStorage.getItem('refreshToken');
        const tempToken = localStorage.getItem('tempToken');
        
        if (accessToken) {
            appState.accessToken = accessToken;
            authService.validateSession();
        }
        
        if (refreshToken) {
            appState.refreshToken = refreshToken;
        }
        
        if (tempToken) {
            appState.tempToken = tempToken;
            // 회원가입 모달 표시
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
            if (!appState.refreshToken) return false;
            
            const response = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken: appState.refreshToken }),
                credentials: 'include'
            });
            
            if (!response.ok) return false;
            
            const data = await response.json();
            
            if (data.success && data.data) {
                authService.setTokens(data.data.accessToken, data.data.refreshToken);
                return true;
            }
            
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
    },
    
    // 세션 검증
    validateSession: async () => {
        try {
            const response = await apiService.validateToken();
            
            if (response.success && response.data.valid) {
                await userService.fetchUserInfo();
                return true;
            }
            
            // 토큰이 유효하지 않음, 새로고침 시도
            const refreshed = await authService.refreshToken();
            if (refreshed) {
                await userService.fetchUserInfo();
                return true;
            }
            
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
                await apiService.request(
                    '/api/v1/auth/logout',
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
        appState.tempToken = null;
        
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('tempToken');
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
            // localStorage 또는 appState에서 tempToken 가져오기
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
            elements.profileImg.src = appState.user.profileImageUrl || 'https://via.placeholder.com/32';
            elements.userName.textContent = appState.user.nickname || appState.user.name;
        } else {
            // 사용자 로그아웃됨
            elements.loginBtn.style.display = 'block';
            elements.userProfile.style.display = 'none';
        }
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
            window.location.href = OAUTH_URLS.KAKAO;
        });
        
        document.querySelector('.oauth-btn.naver').addEventListener('click', () => {
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
        
        // 회원가입 아바타 선택
        elements.avatarOptions.forEach(option => {
            option.addEventListener('click', () => {
                elements.avatarOptions.forEach(opt => opt.classList.remove('selected'));
                option.classList.add('selected');
                elements.profileImageUrl.value = option.querySelector('img').dataset.url;
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
        });
        
        // 로그아웃 버튼
        elements.logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            authService.logout();
        });
    }
};

// 앱 초기화
const initApp = async () => {
    console.log('펫톡 앱 초기화 중...');
    
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
    
    console.log(`펫톡 프론트엔드가 백엔드 API에 연결됨: ${API_BASE_URL}`);
};

// 앱 실행
document.addEventListener('DOMContentLoaded', initApp);