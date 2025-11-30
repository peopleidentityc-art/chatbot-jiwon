/**
 * =====================================================
 * 보조금24 AI 챗봇 메인 로직
 * =====================================================
 */

class SubsidyChatbot {
    constructor() {
        // DOM 요소
        this.chatMessages = document.getElementById('chatMessages');
        this.userInput = document.getElementById('userInput');
        this.sendBtn = document.getElementById('sendBtn');
        this.minimizeBtn = document.getElementById('minimizeBtn');
        this.floatBtn = document.getElementById('floatBtn');
        this.chatContainer = document.querySelector('.chatbot-container');

        // 상태 관리
        this.conversationState = 'idle'; // idle, collecting, searching, showing
        this.userProfile = {
            age: null,
            income: null,
            interests: [],
            region: null,
            family: []
        };
        this.currentStep = 0;
        this.collectionSteps = [
            {
                key: 'age',
                question: '먼저, 몇 살이신가요? 🎂\n(숫자만 입력해주세요)',
                type: 'number',
                validation: (value) => value >= 0 && value <= 120
            },
            {
                key: 'income',
                question: '월 평균 소득은 어느 정도인가요? 💰',
                type: 'choice',
                options: [
                    { text: '기초생활수급자', value: 0 },
                    { text: '100만원 미만', value: 50 },
                    { text: '100~300만원', value: 200 },
                    { text: '300~500만원', value: 400 },
                    { text: '500만원 이상', value: 600 }
                ]
            },
            {
                key: 'interests',
                question: '어떤 분야의 지원금에 관심있으신가요? 🎯\n(여러 개 선택 가능)',
                type: 'multi-choice',
                options: [
                    { text: '🏠 주거/임차', value: '주거' },
                    { text: '👶 출산/육아', value: '육아' },
                    { text: '🎓 교육/학자금', value: '교육' },
                    { text: '💼 취업/창업', value: '고용' },
                    { text: '🏥 의료/건강', value: '의료' },
                    { text: '🌾 농어업', value: '농어업' },
                    { text: '🎨 문화/여가', value: '문화' }
                ]
            },
            {
                key: 'family',
                question: '가구 구성은 어떻게 되시나요? 👨‍👩‍👧‍👦\n(해당하는 것을 모두 선택해주세요)',
                type: 'multi-choice',
                options: [
                    { text: '혼자 살아요', value: '1인' },
                    { text: '배우자', value: '배우자' },
                    { text: '자녀', value: '자녀' },
                    { text: '부모님', value: '부모' }
                ]
            }
        ];

        this.init();
    }

    /**
     * 초기화
     */
    init() {
        // 이벤트 리스너
        this.sendBtn.addEventListener('click', () => this.handleSend());
        this.userInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleSend();
        });

        // 퀵 액션 버튼
        document.querySelectorAll('.quick-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.currentTarget.dataset.action;
                this.handleQuickAction(action);
            });
        });

        // 최소화/최대화
        this.minimizeBtn.addEventListener('click', () => this.toggleChatbot());
        this.floatBtn.addEventListener('click', () => this.toggleChatbot());
    }

    /**
     * 퀵 액션 처리
     */
    async handleQuickAction(action) {
        // 퀵 버튼 숨기기
        const quickActions = document.querySelector('.quick-actions');
        if (quickActions) quickActions.style.display = 'none';

        switch (action) {
            case 'start':
                this.startCollection();
                break;
            case 'popular':
                await this.showPopularServices();
                break;
            case 'deadline':
                await this.showDeadlineServices();
                break;
        }
    }

    /**
     * 메시지 전송 처리
     */
    async handleSend() {
        const message = this.userInput.value.trim();
        if (!message) return;

        // 사용자 메시지 표시
        this.addUserMessage(message);
        this.userInput.value = '';

        // 상태에 따라 처리
        if (this.conversationState === 'collecting') {
            await this.handleCollectionResponse(message);
        } else {
            await this.handleGeneralMessage(message);
        }
    }

    /**
     * 정보 수집 시작
     */
    startCollection() {
        this.conversationState = 'collecting';
        this.currentStep = 0;
        this.userProfile = {
            age: null,
            income: null,
            interests: [],
            region: null,
            family: []
        };

        this.addBotMessage('좋아요! 몇 가지만 여쭤볼게요. 😊');
        setTimeout(() => this.askCurrentStep(), 500);
    }

    /**
     * 현재 단계 질문
     */
    askCurrentStep() {
        const step = this.collectionSteps[this.currentStep];
        
        if (step.type === 'choice' || step.type === 'multi-choice') {
            this.addBotMessageWithOptions(step.question, step.options, step.type === 'multi-choice');
        } else {
            this.addBotMessage(step.question);
        }
    }

    /**
     * 수집 응답 처리
     */
    async handleCollectionResponse(message) {
        const step = this.collectionSteps[this.currentStep];
        let isValid = false;
        let value = null;

        // 유효성 검사
        if (step.type === 'number') {
            value = parseInt(message);
            isValid = !isNaN(value) && step.validation(value);
        } else if (step.type === 'choice') {
            const option = step.options.find(opt => 
                opt.text.toLowerCase().includes(message.toLowerCase()) ||
                message.toLowerCase().includes(opt.text.toLowerCase())
            );
            if (option) {
                value = option.value;
                isValid = true;
            }
        } else if (step.type === 'multi-choice') {
            // 멀티 초이스는 버튼으로만 처리
            isValid = false;
        }

        if (isValid) {
            // 프로필에 저장
            if (Array.isArray(this.userProfile[step.key])) {
                this.userProfile[step.key].push(value);
            } else {
                this.userProfile[step.key] = value;
            }

            // 다음 단계로
            this.currentStep++;
            
            if (this.currentStep < this.collectionSteps.length) {
                this.addBotMessage('알겠습니다! 👍');
                setTimeout(() => this.askCurrentStep(), 500);
            } else {
                await this.finishCollection();
            }
        } else {
            this.addBotMessage('죄송해요, 다시 한번 말씀해주시겠어요? 🤔');
        }
    }

    /**
     * 정보 수집 완료
     */
    async finishCollection() {
        this.conversationState = 'searching';
        
        this.addBotMessage('정보 감사합니다! 🙏\n맞춤 지원금을 찾고 있어요...');
        this.showTypingIndicator();

        try {
            const results = await subsidyAPI.searchCustomServices(this.userProfile);
            
            this.removeTypingIndicator();
            
            if (results.length > 0) {
                this.addBotMessage(`총 ${results.length}개의 지원금을 찾았어요! ✨`);
                setTimeout(() => {
                    results.forEach((service, index) => {
                        setTimeout(() => this.addServiceCard(service), index * 200);
                    });
                }, 300);
            } else {
                this.addBotMessage('아쉽게도 현재 조건에 맞는 지원금을 찾지 못했어요. 😢\n조건을 변경해서 다시 검색해보시겠어요?');
            }
        } catch (error) {
            this.removeTypingIndicator();
            this.addBotMessage('죄송합니다. 검색 중 오류가 발생했어요. 😥\n잠시 후 다시 시도해주세요.');
        }

        this.conversationState = 'idle';
    }

    /**
     * 일반 메시지 처리
     */
    async handleGeneralMessage(message) {
        const lowerMessage = message.toLowerCase();

        // 키워드 감지
        if (lowerMessage.includes('인기') || lowerMessage.includes('많이')) {
            await this.showPopularServices();
        } else if (lowerMessage.includes('마감') || lowerMessage.includes('급해')) {
            await this.showDeadlineServices();
        } else if (lowerMessage.includes('처음') || lowerMessage.includes('다시')) {
            this.startCollection();
        } else {
            this.addBotMessage('무엇을 도와드릴까요? 😊\n\n• "지원금 찾기" - 맞춤 지원금 검색\n• "인기 지원금" - 인기 TOP 5\n• "마감 임박" - 마감 임박 지원금');
        }
    }

    /**
     * 인기 지원금 표시
     */
    async showPopularServices() {
        this.addBotMessage('인기 지원금 TOP 5를 가져오고 있어요! 🔥');
        this.showTypingIndicator();

        try {
            const services = await subsidyAPI.getPopularServices(5);
            this.removeTypingIndicator();

            if (services.length > 0) {
                this.addBotMessage('현재 가장 인기있는 지원금이에요! 👇');
                services.forEach((service, index) => {
                    setTimeout(() => this.addServiceCard(service), index * 200);
                });
            } else {
                this.addBotMessage('죄송합니다. 인기 지원금을 가져오지 못했어요. 😥');
            }
        } catch (error) {
            this.removeTypingIndicator();
            this.addBotMessage('오류가 발생했어요. 잠시 후 다시 시도해주세요. 😥');
        }
    }

    /**
     * 마감 임박 지원금 표시
     */
    async showDeadlineServices() {
        this.addBotMessage('마감 임박 지원금을 확인하고 있어요! ⏰');
        this.showTypingIndicator();

        try {
            const services = await subsidyAPI.getDeadlineServices(5);
            this.removeTypingIndicator();

            if (services.length > 0) {
                this.addBotMessage('곧 마감되는 지원금이에요! 서둘러 신청하세요! 🏃‍♂️');
                services.forEach((service, index) => {
                    setTimeout(() => this.addServiceCard(service), index * 200);
                });
            } else {
                this.addBotMessage('현재 마감 임박인 지원금이 없어요. 😊');
            }
        } catch (error) {
            this.removeTypingIndicator();
            this.addBotMessage('오류가 발생했어요. 잠시 후 다시 시도해주세요. 😥');
        }
    }

    /**
     * 봇 메시지 추가
     */
    addBotMessage(text) {
        const wrapper = document.createElement('div');
        wrapper.className = 'message-wrapper bot-message';
        wrapper.innerHTML = `
            <div class="message-avatar">🤖</div>
            <div class="message-content">
                <div class="message-bubble">
                    ${text.split('\n').map(line => `<p>${line}</p>`).join('')}
                </div>
                <div class="message-time">${this.getCurrentTime()}</div>
            </div>
        `;
        this.chatMessages.appendChild(wrapper);
        this.scrollToBottom();
    }

    /**
     * 옵션 버튼 포함 봇 메시지
     */
    addBotMessageWithOptions(text, options, isMulti = false) {
        const wrapper = document.createElement('div');
        wrapper.className = 'message-wrapper bot-message';
        
        const optionsHTML = options.map((opt, idx) => `
            <button class="quick-btn option-btn" data-value="${opt.value}" data-multi="${isMulti}">
                <span>${opt.text}</span>
            </button>
        `).join('');

        wrapper.innerHTML = `
            <div class="message-avatar">🤖</div>
            <div class="message-content">
                <div class="message-bubble">
                    ${text.split('\n').map(line => `<p>${line}</p>`).join('')}
                </div>
                <div class="quick-actions" style="margin-top: 12px;">
                    ${optionsHTML}
                    ${isMulti ? '<button class="quick-btn option-done" style="background: #10B981; color: white; border-color: #10B981;">✓ 선택 완료</button>' : ''}
                </div>
                <div class="message-time">${this.getCurrentTime()}</div>
            </div>
        `;
        
        this.chatMessages.appendChild(wrapper);
        
        // 옵션 버튼 이벤트
        const step = this.collectionSteps[this.currentStep];
        wrapper.querySelectorAll('.option-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const value = e.currentTarget.dataset.value;
                const isMulti = e.currentTarget.dataset.multi === 'true';
                
                if (isMulti) {
                    // 멀티 선택
                    e.currentTarget.classList.toggle('selected');
                    if (!this.userProfile[step.key]) {
                        this.userProfile[step.key] = [];
                    }
                    const index = this.userProfile[step.key].indexOf(value);
                    if (index > -1) {
                        this.userProfile[step.key].splice(index, 1);
                    } else {
                        this.userProfile[step.key].push(value);
                    }
                } else {
                    // 단일 선택
                    this.userProfile[step.key] = value;
                    this.addUserMessage(e.currentTarget.textContent.trim());
                    wrapper.querySelector('.quick-actions').remove();
                    
                    // 다음 단계
                    this.currentStep++;
                    if (this.currentStep < this.collectionSteps.length) {
                        this.addBotMessage('알겠습니다! 👍');
                        setTimeout(() => this.askCurrentStep(), 500);
                    } else {
                        this.finishCollection();
                    }
                }
            });
        });

        // 완료 버튼 이벤트 (멀티 선택용)
        const doneBtn = wrapper.querySelector('.option-done');
        if (doneBtn) {
            doneBtn.addEventListener('click', () => {
                if (!this.userProfile[step.key] || this.userProfile[step.key].length === 0) {
                    alert('최소 1개 이상 선택해주세요!');
                    return;
                }
                
                const selected = this.userProfile[step.key].join(', ');
                this.addUserMessage(selected);
                wrapper.querySelector('.quick-actions').remove();
                
                // 다음 단계
                this.currentStep++;
                if (this.currentStep < this.collectionSteps.length) {
                    this.addBotMessage('알겠습니다! 👍');
                    setTimeout(() => this.askCurrentStep(), 500);
                } else {
                    this.finishCollection();
                }
            });
        }
        
        this.scrollToBottom();
    }

    /**
     * 사용자 메시지 추가
     */
    addUserMessage(text) {
        const wrapper = document.createElement('div');
        wrapper.className = 'message-wrapper user-message';
        wrapper.innerHTML = `
            <div class="message-content">
                <div class="message-bubble">
                    <p>${text}</p>
                </div>
                <div class="message-time">${this.getCurrentTime()}</div>
            </div>
        `;
        this.chatMessages.appendChild(wrapper);
        this.scrollToBottom();
    }

    /**
     * 지원금 카드 추가
     */
    addServiceCard(service) {
        const template = document.getElementById('fundCardTemplate');
        const card = template.content.cloneNode(true);
        
        // 배지
        const badge = card.querySelector('.fund-badge');
        const dday = subsidyAPI.calculateDday(service.신청기한);
        if (dday !== '상시' && dday !== '마감') {
            badge.textContent = dday;
            badge.style.background = '#FEE2E2';
            badge.style.color = '#DC2626';
        } else {
            badge.textContent = '진행중';
            badge.classList.add('new');
        }
        
        // 조회수
        const views = card.querySelector('.fund-views');
        views.textContent = `👁️ ${(service.조회수 || 0).toLocaleString()}`;
        
        // 제목
        card.querySelector('.fund-title').textContent = service.서비스명;
        
        // 설명
        const desc = card.querySelector('.fund-desc');
        desc.textContent = service.서비스목적요약 || service.지원내용 || '상세 내용은 링크를 확인해주세요.';
        
        // 메타 정보
        const meta = card.querySelector('.fund-meta-item');
        meta.textContent = `📌 ${service.소관기관명 || '정부기관'}`;
        
        // 금액 (지원내용에서 추출 시도)
        const amount = card.querySelector('.fund-amount');
        const amountMatch = (service.지원내용 || '').match(/(\d{1,3}(,\d{3})*|\d+)(만원|억|원)/);
        if (amountMatch) {
            amount.textContent = `최대 ${amountMatch[0]}`;
        } else {
            amount.textContent = '지원 가능';
        }
        
        // 링크
        const cta = card.querySelector('.fund-cta');
        if (service.상세조회URL) {
            cta.href = service.상세조회URL;
            cta.target = '_blank';
        }
        
        // 메시지에 추가
        const wrapper = document.createElement('div');
        wrapper.className = 'message-wrapper bot-message';
        wrapper.innerHTML = `
            <div class="message-avatar">💰</div>
            <div class="message-content"></div>
        `;
        wrapper.querySelector('.message-content').appendChild(card);
        
        this.chatMessages.appendChild(wrapper);
        this.scrollToBottom();
    }

    /**
     * 타이핑 인디케이터 표시
     */
    showTypingIndicator() {
        const template = document.getElementById('loadingTemplate');
        const loading = template.content.cloneNode(true);
        loading.querySelector('.message-wrapper').id = 'typingIndicator';
        this.chatMessages.appendChild(loading);
        this.scrollToBottom();
    }

    /**
     * 타이핑 인디케이터 제거
     */
    removeTypingIndicator() {
        const indicator = document.getElementById('typingIndicator');
        if (indicator) indicator.remove();
    }

    /**
     * 챗봇 토글
     */
    toggleChatbot() {
        if (this.chatContainer.style.display === 'none') {
            this.chatContainer.style.display = 'flex';
            this.floatBtn.style.display = 'none';
        } else {
            this.chatContainer.style.display = 'none';
            this.floatBtn.style.display = 'flex';
        }
    }

    /**
     * 스크롤 하단으로
     */
    scrollToBottom() {
        setTimeout(() => {
            this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
        }, 100);
    }

    /**
     * 현재 시간 가져오기
     */
    getCurrentTime() {
        const now = new Date();
        return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    }
}

// DOM 로드 완료 시 챗봇 초기화
document.addEventListener('DOMContentLoaded', () => {
    const chatbot = new SubsidyChatbot();
    console.log('✅ 보조금24 AI 챗봇이 시작되었습니다!');
});
```

---

## 🎉 완성!

이제 챗봇이 완성되었습니다! 

### 📂 최종 파일 구조
```
/chatbot-subsidy/
├── index.html
├── config.js
├── css/
│   └── chatbot.css
└── js/
    ├── api.js
    └── chatbot.js
