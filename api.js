/**
 * =====================================================
 * 보조금24 API 연동 모듈
 * =====================================================
 */

class SubsidyAPI {
    constructor() {
        this.baseUrl = API_CONFIG.BASE_URL;
        this.apiKey = API_CONFIG.API_KEY;
    }

    /**
     * 공공서비스 목록 조회
     */
    async getServiceList(params = {}) {
        try {
            const url = API_HELPER.buildUrl(API_CONFIG.ENDPOINTS.SERVICE_LIST, params);
            
            const response = await fetch(url, {
                method: 'GET',
                headers: API_HELPER.getHeaders()
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('서비스 목록 조회 오류:', error);
            throw error;
        }
    }

    /**
     * 인기 지원금 조회
     */
    async getPopularServices(limit = 5) {
        try {
            const data = await this.getServiceList({
                perPage: limit,
                // 조회수 기준 정렬은 API가 지원하지 않으므로 클라이언트에서 처리
            });

            if (data.data && Array.isArray(data.data)) {
                // 조회수 기준 정렬
                const sorted = data.data.sort((a, b) => (b.조회수 || 0) - (a.조회수 || 0));
                return sorted.slice(0, limit);
            }

            return [];
        } catch (error) {
            console.error('인기 지원금 조회 오류:', error);
            return [];
        }
    }

    /**
     * 마감 임박 지원금 조회
     */
    async getDeadlineServices(limit = 5) {
        try {
            const data = await this.getServiceList({
                perPage: 50 // 많이 가져와서 필터링
            });

            if (data.data && Array.isArray(data.data)) {
                const today = new Date();
                
                // 신청기한이 있는 것만 필터링
                const withDeadline = data.data.filter(service => {
                    if (!service.신청기한 || service.신청기한 === '상시신청') return false;
                    
                    // 날짜 파싱 시도
                    const deadlineMatch = service.신청기한.match(/(\d{4})[.-](\d{1,2})[.-](\d{1,2})/);
                    if (!deadlineMatch) return false;
                    
                    const deadline = new Date(deadlineMatch[1], deadlineMatch[2] - 1, deadlineMatch[3]);
                    const daysLeft = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));
                    
                    // 30일 이내 마감
                    return daysLeft > 0 && daysLeft <= 30;
                });

                // 마감일 가까운 순 정렬
                withDeadline.sort((a, b) => {
                    const dateA = this.parseDeadline(a.신청기한);
                    const dateB = this.parseDeadline(b.신청기한);
                    return dateA - dateB;
                });

                return withDeadline.slice(0, limit);
            }

            return [];
        } catch (error) {
            console.error('마감 임박 지원금 조회 오류:', error);
            return [];
        }
    }

    /**
     * 맞춤형 지원금 검색
     */
    async searchCustomServices(userProfile) {
        try {
            const { age, income, interests, region, family } = userProfile;
            
            // 키워드 생성
            const keywords = this.generateKeywords(userProfile);
            
            // 여러 키워드로 검색
            const promises = keywords.map(keyword => 
                this.getServiceList({
                    'cond[서비스명::LIKE]': keyword,
                    perPage: 20
                })
            );

            const results = await Promise.all(promises);
            
            // 중복 제거 및 병합
            const allServices = [];
            const serviceIds = new Set();
            
            results.forEach(result => {
                if (result.data && Array.isArray(result.data)) {
                    result.data.forEach(service => {
                        if (!serviceIds.has(service.서비스ID)) {
                            serviceIds.add(service.서비스ID);
                            allServices.push(service);
                        }
                    });
                }
            });

            // 적합도 점수 계산
            const scored = allServices.map(service => ({
                ...service,
                matchScore: this.calculateMatchScore(service, userProfile)
            }));

            // 점수 순 정렬
            scored.sort((a, b) => b.matchScore - a.matchScore);

            return scored.slice(0, 10);
        } catch (error) {
            console.error('맞춤 검색 오류:', error);
            return [];
        }
    }

    /**
     * 검색 키워드 생성
     */
    generateKeywords(userProfile) {
        const keywords = [];
        
        // 연령대별 키워드
        for (const [ageGroup, config] of Object.entries(API_CONFIG.AGE_GROUPS)) {
            if (userProfile.age >= config.min && userProfile.age <= config.max) {
                keywords.push(...config.keywords);
            }
        }

        // 관심사별 키워드
        if (userProfile.interests && userProfile.interests.length > 0) {
            userProfile.interests.forEach(interest => {
                const categoryKeywords = API_CONFIG.CATEGORIES[interest];
                if (categoryKeywords) {
                    keywords.push(...categoryKeywords);
                }
            });
        }

        // 소득 수준별 키워드
        for (const [level, config] of Object.entries(API_CONFIG.INCOME_LEVELS)) {
            if (userProfile.income <= config.max) {
                keywords.push(...config.keywords);
                break;
            }
        }

        // 가구 구성별 키워드
        if (userProfile.family) {
            if (userProfile.family.includes('자녀')) keywords.push('자녀', '육아', '양육');
            if (userProfile.family.includes('배우자')) keywords.push('부부', '가정');
            if (userProfile.family.includes('부모')) keywords.push('부양', '효도');
        }

        // 중복 제거
        return [...new Set(keywords)];
    }

    /**
     * 매칭 점수 계산
     */
    calculateMatchScore(service, userProfile) {
        let score = 0;
        const text = `${service.서비스명} ${service.서비스목적요약 || ''} ${service.지원대상 || ''}`.toLowerCase();

        // 연령 매칭
        for (const [ageGroup, config] of Object.entries(API_CONFIG.AGE_GROUPS)) {
            if (userProfile.age >= config.min && userProfile.age <= config.max) {
                config.keywords.forEach(keyword => {
                    if (text.includes(keyword.toLowerCase())) score += 10;
                });
            }
        }

        // 관심사 매칭
        if (userProfile.interests) {
            userProfile.interests.forEach(interest => {
                const keywords = API_CONFIG.CATEGORIES[interest];
                if (keywords) {
                    keywords.forEach(keyword => {
                        if (text.includes(keyword.toLowerCase())) score += 8;
                    });
                }
            });
        }

        // 소득 수준 매칭
        for (const [level, config] of Object.entries(API_CONFIG.INCOME_LEVELS)) {
            if (userProfile.income <= config.max) {
                config.keywords.forEach(keyword => {
                    if (text.includes(keyword.toLowerCase())) score += 7;
                });
                break;
            }
        }

        // 가구 구성 매칭
        if (userProfile.family) {
            if (userProfile.family.includes('자녀') && (text.includes('자녀') || text.includes('육아'))) score += 6;
            if (userProfile.family.includes('배우자') && text.includes('부부')) score += 4;
        }

        // 조회수 보너스 (인기도)
        if (service.조회수) {
            score += Math.min(service.조회수 / 1000, 5);
        }

        return score;
    }

    /**
     * 날짜 파싱 헬퍼
     */
    parseDeadline(dateStr) {
        if (!dateStr || dateStr === '상시신청') return new Date(2099, 11, 31);
        
        const match = dateStr.match(/(\d{4})[.-](\d{1,2})[.-](\d{1,2})/);
        if (match) {
            return new Date(match[1], match[2] - 1, match[3]);
        }
        
        return new Date(2099, 11, 31);
    }

    /**
     * D-day 계산
     */
    calculateDday(dateStr) {
        if (!dateStr || dateStr === '상시신청') return '상시';
        
        const deadline = this.parseDeadline(dateStr);
        const today = new Date();
        const diff = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));
        
        if (diff < 0) return '마감';
        if (diff === 0) return 'D-Day';
        return `D-${diff}`;
    }
}

// 전역 API 인스턴스 생성
const subsidyAPI = new SubsidyAPI();
