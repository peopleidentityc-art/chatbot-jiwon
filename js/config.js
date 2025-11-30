/**
 * =====================================================
 * API 설정 파일
 * =====================================================
 */

const API_CONFIG = {
    // 보조금24 API 기본 정보
    BASE_URL: 'https://api.odcloud.kr/api',
    
    // API 인증키 (발급받은 키로 교체하세요)
    API_KEY: 'sBFDCD7k4HuoN9JXUos2JrKXTFBtHoDVeAUtypKvQJc6INY/z3sWPo4qqAiHJrKToSaQxhXXWYVbQVIBYvjg+Q==',
    
    // 엔드포인트
    ENDPOINTS: {
        SERVICE_LIST: '/gov24/v3/serviceList',
        SERVICE_DETAIL: '/gov24/v3/serviceDetail',
        SUPPORT_CONDITIONS: '/gov24/v3/supportConditions'
    },
    
    // 페이징 설정
    PAGINATION: {
        DEFAULT_PAGE: 1,
        DEFAULT_PER_PAGE: 10,
        MAX_PER_PAGE: 100
    },
    
    // 카테고리 매핑
    CATEGORIES: {
        '청년': ['청년', '대학생', '취업', '창업', '주거', '학자금'],
        '육아': ['출산', '육아', '보육', '양육', '자녀', '아동'],
        '주거': ['주택', '전세', '월세', '임대', '주거'],
        '고용': ['실업', '취업', '창업', '고용', '일자리'],
        '교육': ['학비', '등록금', '장학금', '교육'],
        '의료': ['건강', '의료', '치료', '질병'],
        '복지': ['기초생활', '저소득', '복지', '지원'],
        '농어업': ['농업', '어업', '농촌', '어촌'],
        '문화': ['문화', '체육', '관광', '여가']
    },
    
    // 연령대 구분
    AGE_GROUPS: {
        '청소년': { min: 13, max: 18, keywords: ['청소년', '학생'] },
        '청년': { min: 19, max: 34, keywords: ['청년', '대학생', '취업준비생'] },
        '중년': { min: 35, max: 49, keywords: ['중장년', '경력'] },
        '장년': { min: 50, max: 64, keywords: ['중장년', '은퇴준비'] },
        '노년': { min: 65, max: 120, keywords: ['노인', '어르신', '경로'] }
    },
    
    // 소득 수준
    INCOME_LEVELS: {
        '기초생활수급': { max: 0, keywords: ['기초생활', '수급', '차상위'] },
        '저소득': { max: 50, keywords: ['저소득', '소득하위'] },
        '중위소득': { max: 100, keywords: ['중위소득'] },
        '일반': { max: 999, keywords: ['일반'] }
    }
};

// API 요청 헬퍼
const API_HELPER = {
    /**
     * 전체 URL 생성
     */
    buildUrl(endpoint, params = {}) {
        const url = new URL(API_CONFIG.BASE_URL + endpoint);
        
        // 기본 파라미터
        url.searchParams.append('page', params.page || API_CONFIG.PAGINATION.DEFAULT_PAGE);
        url.searchParams.append('perPage', params.perPage || API_CONFIG.PAGINATION.DEFAULT_PER_PAGE);
        
        // 추가 파라미터
        Object.keys(params).forEach(key => {
            if (key !== 'page' && key !== 'perPage') {
                url.searchParams.append(key, params[key]);
            }
        });
        
        return url.toString();
    },
    
    /**
     * 헤더 생성
     */
    getHeaders() {
        return {
            'Authorization': `Infuser ${API_CONFIG.API_KEY}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        };
    }
};
