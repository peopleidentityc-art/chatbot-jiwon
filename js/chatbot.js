/**
 * =====================================================
 * ALSN 보조금 챗봇 - 프론트엔드 스크립트
 * 파일: alsn-chatbot.js
 * 용도: 워드프레스 테마 또는 플러그인에 enqueue
 * 보안: API 호출은 PHP(서버사이드)에서 처리
 * =====================================================
 */

(function() {
    'use strict';

    // ===== 챗봇 초기화 =====
    const AlsnChatbot = {
        // 상태 관리
        state: {
            step: 0,
            answers: {},
            isProcessing: false
        },

        // DOM 요소
        elements: {},

        // 질문 데이터 (보조금24 간편찾기 기반)
        questions: [
            {
                id: 'intro',
                type: 'single',
                message: '안녕하세요! 👋\n맞춤 지원금을 찾아드릴게요.\n\n어떤 유형으로 검색하시겠어요?',
                options: [
                    { value: 'personal', label: '👤 개인/가구', desc: '개인 또는 가구 단위 지원금' },
                    { value: 'business', label: '🏪 소상공인', desc: '소상공인/자영업자 지원금' },
                    { value: 'corp', label: '🏢 법인/기관', desc: '기업/법인/단체 지원금' }
                ],
                gridClass: ''
            },
            // 개인/가구 질문
            {
                id: 'region',
                type: 'region',
                condition: { intro: 'personal' },
                message: '거주하시는 지역을 선택해주세요.',
                progressText: '1/5 단계'
            },
            {
                id: 'birthGender',
                type: 'birthGender',
                condition: { intro: 'personal' },
                message: '생년월일과 성별을 알려주세요.',
                progressText: '2/5 단계'
            },
            {
                id: 'income',
                type: 'single',
                condition: { intro: 'personal' },
                message: '가구의 소득 수준을 선택해주세요.\n\n💡 기준중위소득 100%는 4인 가구 기준 약 572만원입니다.',
                options: [
                    { value: '0~50', label: '50% 이하' },
                    { value: '51~75', label: '51~75%' },
                    { value: '76~100', label: '76~100%' },
                    { value: '101~200', label: '101~200%' },
                    { value: '200~', label: '200% 초과' }
                ],
                gridClass: 'grid-3',
                progressText: '3/5 단계'
            },
            {
                id: 'personalChar',
                type: 'multi',
                condition: { intro: 'personal' },
                message: '해당되는 개인 특성을 모두 선택해주세요.',
                options: [
                    { value: 'JA0101', label: '예비부부/난임' },
                    { value: 'JA0102', label: '임신부' },
                    { value: 'JA0103', label: '출산/입양' },
                    { value: 'JA0201', label: '영유아 (0~5세)' },
                    { value: 'JA0202', label: '아동 (6~12세)' },
                    { value: 'JA0301', label: '장애인' },
                    { value: 'JA0302', label: '국가보훈대상자' },
                    { value: 'JA0401', label: '농업인' },
                    { value: 'JA0403', label: '어업인' },
                    { value: 'JA0501', label: '중/고등학생' },
                    { value: 'JA0502', label: '대학생/대학원생' },
                    { value: 'JA0601', label: '근로자/직장인' },
                    { value: 'JA0602', label: '구직자/실업자' },
                    { value: 'JA0104', label: '질병/질환자' },
                    { value: 'JA9999', label: '해당없음' }
                ],
                gridClass: 'grid-2',
                progressText: '4/5 단계'
            },
            {
                id: 'familyChar',
                type: 'multi',
                condition: { intro: 'personal' },
                message: '해당되는 가구 특성을 모두 선택해주세요.',
                options: [
                    { value: 'JA0701', label: '다문화가정' },
                    { value: 'JA0702', label: '북한이탈주민' },
                    { value: 'JA0703', label: '한부모/조손가정' },
                    { value: 'JA0704', label: '1인 가구' },
                    { value: 'JA0705', label: '다자녀 가구' },
                    { value: 'JA0706', label: '무주택 세대' },
                    { value: 'JA0707', label: '신규전입' },
                    { value: 'JA0708', label: '확대가족' },
                    { value: 'JA9999', label: '해당없음' }
                ],
                gridClass: 'grid-2',
                progressText: '5/5 단계'
            },
            // 소상공인 질문
            {
                id: 'bizStatus',
                type: 'single',
                condition: { intro: 'business' },
                message: '현재 사업 상황을 선택해주세요.',
                options: [
                    { value: 'ready', label: '🌱 예비 창업자' },
                    { value: 'running', label: '🏃 영업 중' },
                    { value: 'closing', label: '😢 폐업 예정/생계곤란' }
                ],
                progressText: '1/3 단계'
            },
            {
                id: 'bizRegion',
                type: 'region',
                condition: { intro: 'business' },
                message: '사업장 소재지를 선택해주세요.',
                progressText: '2/3 단계'
            },
            {
                id: 'bizType',
                type: 'single',
                condition: { intro: 'business' },
                message: '업종을 선택해주세요.',
                options: [
                    { value: 'food', label: '🍽️ 음식점업' },
                    { value: 'manufacture', label: '🏭 제조업' },
                    { value: 'retail', label: '🛒 도소매업' },
                    { value: 'service', label: '💼 서비스업' },
                    { value: 'other', label: '📦 기타' }
                ],
                gridClass: 'grid-2',
                progressText: '3/3 단계'
            },
            // 법인/기관 질문
            {
                id: 'corpType',
                type: 'single',
                condition: { intro: 'corp' },
                message: '사업장 형태를 선택해주세요.',
                options: [
                    { value: 'sme', label: '🏢 중소기업' },
                    { value: 'welfare', label: '🏥 사회복지시설' },
                    { value: 'org', label: '🏛️ 기관/단체' }
                ],
                progressText: '1/3 단계'
            },
            {
                id: 'corpRegion',
                type: 'region',
                condition: { intro: 'corp' },
                message: '사업장 소재지를 선택해주세요.',
                progressText: '2/3 단계'
            },
            {
                id: 'corpBizType',
                type: 'single',
                condition: { intro: 'corp' },
                message: '업종을 선택해주세요.',
                options: [
                    { value: 'manufacture', label: '🏭 제조업' },
                    { value: 'agri', label: '🌾 농림어업' },
                    { value: 'it', label: '💻 정보통신업' },
                    { value: 'other', label: '📦 기타' }
                ],
                gridClass: 'grid-2',
                progressText: '3/3 단계'
            }
        ],

        // 지역 데이터 (시/도 + 시/군/구)
        regions: {
            '서울': ['강남구', '강동구', '강북구', '강서구', '관악구', '광진구', '구로구', '금천구', '노원구', '도봉구', '동대문구', '동작구', '마포구', '서대문구', '서초구', '성동구', '성북구', '송파구', '양천구', '영등포구', '용산구', '은평구', '종로구', '중구', '중랑구'],
            '부산': ['강서구', '금정구', '기장군', '남구', '동구', '동래구', '부산진구', '북구', '사상구', '사하구', '서구', '수영구', '연제구', '영도구', '중구', '해운대구'],
            '대구': ['남구', '달서구', '달성군', '동구', '북구', '서구', '수성구', '중구'],
            '인천': ['강화군', '계양구', '남동구', '동구', '미추홀구', '부평구', '서구', '연수구', '옹진군', '중구'],
            '광주': ['광산구', '남구', '동구', '북구', '서구'],
            '대전': ['대덕구', '동구', '서구', '유성구', '중구'],
            '울산': ['남구', '동구', '북구', '울주군', '중구'],
            '세종': ['세종시 전체'],
            '경기': ['가평군', '고양시', '과천시', '광명시', '광주시', '구리시', '군포시', '김포시', '남양주시', '동두천시', '부천시', '성남시', '수원시', '시흥시', '안산시', '안성시', '안양시', '양주시', '양평군', '여주시', '연천군', '오산시', '용인시', '의왕시', '의정부시', '이천시', '파주시', '평택시', '포천시', '하남시', '화성시'],
            '강원': ['강릉시', '고성군', '동해시', '삼척시', '속초시', '양구군', '양양군', '영월군', '원주시', '인제군', '정선군', '철원군', '춘천시', '태백시', '평창군', '홍천군', '화천군', '횡성군'],
            '충북': ['괴산군', '단양군', '보은군', '영동군', '옥천군', '음성군', '제천시', '증평군', '진천군', '청주시', '충주시'],
            '충남': ['계룡시', '공주시', '금산군', '논산시', '당진시', '보령시', '부여군', '서산시', '서천군', '아산시', '예산군', '천안시', '청양군', '태안군', '홍성군'],
            '전북': ['고창군', '군산시', '김제시', '남원시', '무주군', '부안군', '순창군', '완주군', '익산시', '임실군', '장수군', '전주시', '정읍시', '진안군'],
            '전남': ['강진군', '고흥군', '곡성군', '광양시', '구례군', '나주시', '담양군', '목포시', '무안군', '보성군', '순천시', '신안군', '여수시', '영광군', '영암군', '완도군', '장성군', '장흥군', '진도군', '함평군', '해남군', '화순군'],
            '경북': ['경산시', '경주시', '고령군', '구미시', '군위군', '김천시', '문경시', '봉화군', '상주시', '성주군', '안동시', '영덕군', '영양군', '영주시', '영천시', '예천군', '울릉군', '울진군', '의성군', '청도군', '청송군', '칠곡군', '포항시'],
            '경남': ['거제시', '거창군', '고성군', '김해시', '남해군', '밀양시', '사천시', '산청군', '양산시', '의령군', '진주시', '창녕군', '창원시', '통영시', '하동군', '함안군', '함양군', '합천군'],
            '제주': ['서귀포시', '제주시']
        },

        // 초기화
        init() {
            this.cacheElements();
            this.bindEvents();
            this.startChat();
        },

        // DOM 요소 캐싱
        cacheElements() {
            this.elements = {
                messages: document.getElementById('chatbotMessages'),
                inputArea: document.getElementById('chatbotInputArea'),
                progressFill: document.getElementById('progressFill'),
                progressText: document.getElementById('progressText'),
                resetBtn: document.getElementById('chatbotResetBtn'),
                resultModal: document.getElementById('resultModal'),
                resultBody: document.getElementById('resultModalBody'),
                resultCloseBtn: document.getElementById('resultCloseBtn')
            };
        },

        // 이벤트 바인딩
        bindEvents() {
            this.elements.resetBtn?.addEventListener('click', () => this.reset());
            this.elements.resultCloseBtn?.addEventListener('click', () => this.closeModal());
            this.elements.resultModal?.querySelector('.result-modal-overlay')?.addEventListener('click', () => this.closeModal());
        },

        // 채팅 시작
        startChat() {
            this.showQuestion(0);
        },

        // 리셋
        reset() {
            this.state = { step: 0, answers: {}, isProcessing: false };
            this.elements.messages.innerHTML = '';
            this.updateProgress(0, '시작하기');
            this.startChat();
        },

        // 현재 사용자 유형에 맞는 다음 질문 찾기
        getNextQuestion(currentIndex) {
            const userType = this.state.answers.intro;
            
            for (let i = currentIndex + 1; i < this.questions.length; i++) {
                const q = this.questions[i];
                
                // 조건이 없으면 (intro 질문) 표시
                if (!q.condition) return i;
                
                // 조건 체크
                const conditionMet = Object.entries(q.condition).every(
                    ([key, value]) => this.state.answers[key] === value
                );
                
                if (conditionMet) return i;
            }
            
            return -1; // 더 이상 질문 없음
        },

        // 질문 표시
        showQuestion(index) {
            const question = this.questions[index];
            if (!question) {
                this.submitAnswers();
                return;
            }

            this.state.step = index;
            
            // 진행률 업데이트
            if (question.progressText) {
                const [current, total] = question.progressText.match(/\d+/g);
                const percent = (parseInt(current) / parseInt(total)) * 100;
                this.updateProgress(percent, question.progressText);
            }

            // 타이핑 애니메이션 후 메시지 표시
            this.showTyping();
            
            setTimeout(() => {
                this.hideTyping();
                this.addBotMessage(question.message);
                this.showInputOptions(question);
            }, 800);
        },

        // 진행률 업데이트
        updateProgress(percent, text) {
            this.elements.progressFill.style.width = `${percent}%`;
            this.elements.progressText.textContent = text;
        },

        // 타이핑 인디케이터 표시
        showTyping() {
            const typing = document.createElement('div');
            typing.className = 'chat-message bot typing-message';
            typing.innerHTML = `
                <div class="message-avatar">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
                    </svg>
                </div>
                <div class="message-bubble">
                    <div class="typing-indicator">
                        <span></span><span></span><span></span>
                    </div>
                </div>
            `;
            this.elements.messages.appendChild(typing);
            this.scrollToBottom();
        },

        // 타이핑 인디케이터 숨기기
        hideTyping() {
            const typing = this.elements.messages.querySelector('.typing-message');
            if (typing) typing.remove();
        },

        // 봇 메시지 추가
        addBotMessage(text) {
            const message = document.createElement('div');
            message.className = 'chat-message bot';
            message.innerHTML = `
                <div class="message-avatar">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
                    </svg>
                </div>
                <div class="message-bubble">${text.replace(/\n/g, '<br>')}</div>
            `;
            this.elements.messages.appendChild(message);
            this.scrollToBottom();
        },

        // 사용자 메시지 추가
        addUserMessage(text) {
            const message = document.createElement('div');
            message.className = 'chat-message user';
            message.innerHTML = `<div class="message-bubble">${text}</div>`;
            this.elements.messages.appendChild(message);
            this.scrollToBottom();
        },

        // 스크롤 하단으로
        scrollToBottom() {
            this.elements.messages.scrollTop = this.elements.messages.scrollHeight;
        },

        // 입력 옵션 표시
        showInputOptions(question) {
            this.elements.inputArea.innerHTML = '';

            switch (question.type) {
                case 'single':
                    this.renderSingleSelect(question);
                    break;
                case 'multi':
                    this.renderMultiSelect(question);
                    break;
                case 'region':
                    this.renderRegionSelect(question);
                    break;
                case 'birthGender':
                    this.renderBirthGender(question);
                    break;
            }
        },

        // 단일 선택
        renderSingleSelect(question) {
            const container = document.createElement('div');
            container.className = `input-options ${question.gridClass || ''}`;

            question.options.forEach(opt => {
                const btn = document.createElement('button');
                btn.className = 'option-btn';
                btn.innerHTML = opt.label;
                btn.addEventListener('click', () => {
                    this.addUserMessage(opt.label);
                    this.state.answers[question.id] = opt.value;
                    this.proceedToNext();
                });
                container.appendChild(btn);
            });

            this.elements.inputArea.appendChild(container);
        },

        // 다중 선택
        renderMultiSelect(question) {
            const container = document.createElement('div');
            container.className = `input-options ${question.gridClass || ''}`;
            const selected = new Set();

            question.options.forEach(opt => {
                const btn = document.createElement('button');
                btn.className = 'option-btn multi-select';
                btn.textContent = opt.label;
                btn.dataset.value = opt.value;

                btn.addEventListener('click', () => {
                    // "해당없음" 처리
                    if (opt.value === 'JA9999') {
                        selected.clear();
                        container.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
                        btn.classList.add('selected');
                        selected.add(opt.value);
                    } else {
                        // 해당없음 선택 해제
                        const noneBtn = container.querySelector('[data-value="JA9999"]');
                        if (noneBtn) {
                            noneBtn.classList.remove('selected');
                            selected.delete('JA9999');
                        }

                        if (selected.has(opt.value)) {
                            selected.delete(opt.value);
                            btn.classList.remove('selected');
                        } else {
                            selected.add(opt.value);
                            btn.classList.add('selected');
                        }
                    }

                    // 확인 버튼 상태 업데이트
                    confirmBtn.disabled = selected.size === 0;
                });

                container.appendChild(btn);
            });

            const confirmBtn = document.createElement('button');
            confirmBtn.className = 'confirm-btn';
            confirmBtn.textContent = '선택 완료';
            confirmBtn.disabled = true;
            confirmBtn.addEventListener('click', () => {
                const selectedLabels = Array.from(selected).map(v => {
                    const opt = question.options.find(o => o.value === v);
                    return opt ? opt.label : v;
                });
                this.addUserMessage(selectedLabels.join(', '));
                this.state.answers[question.id] = Array.from(selected);
                this.proceedToNext();
            });

            this.elements.inputArea.appendChild(container);
            this.elements.inputArea.appendChild(confirmBtn);
        },

        // 지역 선택
        renderRegionSelect(question) {
            const container = document.createElement('div');
            container.className = 'region-select-wrap';

            // 시/도 선택
            const sidoSelect = document.createElement('select');
            sidoSelect.className = 'region-select';
            sidoSelect.innerHTML = '<option value="">시/도 선택</option>';
            Object.keys(this.regions).forEach(sido => {
                sidoSelect.innerHTML += `<option value="${sido}">${sido}</option>`;
            });

            // 시/군/구 선택
            const gugunSelect = document.createElement('select');
            gugunSelect.className = 'region-select';
            gugunSelect.innerHTML = '<option value="">시/군/구 선택</option>';
            gugunSelect.disabled = true;

            sidoSelect.addEventListener('change', () => {
                const sido = sidoSelect.value;
                gugunSelect.innerHTML = '<option value="">시/군/구 선택</option>';
                
                if (sido && this.regions[sido]) {
                    gugunSelect.disabled = false;
                    this.regions[sido].forEach(gugun => {
                        gugunSelect.innerHTML += `<option value="${gugun}">${gugun}</option>`;
                    });
                } else {
                    gugunSelect.disabled = true;
                }
                confirmBtn.disabled = true;
            });

            gugunSelect.addEventListener('change', () => {
                confirmBtn.disabled = !gugunSelect.value;
            });

            const confirmBtn = document.createElement('button');
            confirmBtn.className = 'confirm-btn';
            confirmBtn.textContent = '선택 완료';
            confirmBtn.disabled = true;
            confirmBtn.addEventListener('click', () => {
                const region = `${sidoSelect.value} ${gugunSelect.value}`;
                this.addUserMessage(region);
                this.state.answers[question.id] = {
                    sido: sidoSelect.value,
                    gugun: gugunSelect.value
                };
                this.proceedToNext();
            });

            container.appendChild(sidoSelect);
            container.appendChild(gugunSelect);
            this.elements.inputArea.appendChild(container);
            this.elements.inputArea.appendChild(confirmBtn);
        },

        // 생년월일/성별 입력
        renderBirthGender(question) {
            const container = document.createElement('div');
            container.className = 'birth-gender-wrap';

            // 생년월일 입력
            const birthGroup = document.createElement('div');
            birthGroup.className = 'birth-input-group';

            const yearInput = document.createElement('input');
            yearInput.type = 'text';
            yearInput.className = 'birth-input';
            yearInput.placeholder = '년도 (예: 1990)';
            yearInput.maxLength = 4;
            yearInput.inputMode = 'numeric';

            const monthInput = document.createElement('input');
            monthInput.type = 'text';
            monthInput.className = 'birth-input';
            monthInput.placeholder = '월';
            monthInput.maxLength = 2;
            monthInput.inputMode = 'numeric';

            const dayInput = document.createElement('input');
            dayInput.type = 'text';
            dayInput.className = 'birth-input';
            dayInput.placeholder = '일';
            dayInput.maxLength = 2;
            dayInput.inputMode = 'numeric';

            birthGroup.appendChild(yearInput);
            birthGroup.appendChild(monthInput);
            birthGroup.appendChild(dayInput);

            // 성별 선택
            const genderGroup = document.createElement('div');
            genderGroup.className = 'gender-buttons';
            let selectedGender = '';

            ['남성', '여성'].forEach(gender => {
                const btn = document.createElement('button');
                btn.className = 'option-btn';
                btn.textContent = gender;
                btn.addEventListener('click', () => {
                    genderGroup.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
                    btn.classList.add('selected');
                    selectedGender = gender;
                    updateConfirmBtn();
                });
                genderGroup.appendChild(btn);
            });

            const confirmBtn = document.createElement('button');
            confirmBtn.className = 'confirm-btn';
            confirmBtn.textContent = '선택 완료';
            confirmBtn.disabled = true;

            const updateConfirmBtn = () => {
                const year = yearInput.value;
                const month = monthInput.value;
                const day = dayInput.value;
                confirmBtn.disabled = !(year.length === 4 && month && day && selectedGender);
            };

            [yearInput, monthInput, dayInput].forEach(input => {
                input.addEventListener('input', updateConfirmBtn);
            });

            confirmBtn.addEventListener('click', () => {
                const year = yearInput.value;
                const month = monthInput.value.padStart(2, '0');
                const day = dayInput.value.padStart(2, '0');
                const birthDate = `${year}-${month}-${day}`;
                
                this.addUserMessage(`${birthDate}, ${selectedGender}`);
                this.state.answers[question.id] = {
                    year, month, day,
                    gender: selectedGender === '남성' ? 'M' : 'F'
                };
                this.proceedToNext();
            });

            container.appendChild(birthGroup);
            container.appendChild(genderGroup);
            this.elements.inputArea.appendChild(container);
            this.elements.inputArea.appendChild(confirmBtn);
        },

        // 다음 질문으로 진행
        proceedToNext() {
            this.elements.inputArea.innerHTML = '';
            const nextIndex = this.getNextQuestion(this.state.step);
            
            if (nextIndex === -1) {
                this.submitAnswers();
            } else {
                setTimeout(() => this.showQuestion(nextIndex), 300);
            }
        },

        // 결과 제출
        submitAnswers() {
            this.updateProgress(100, '검색 중...');
            this.showTyping();

            // AJAX로 서버에 요청 (API 키는 서버에서 처리)
            const formData = new FormData();
            formData.append('action', 'alsn_subsidy_search');
            formData.append('nonce', alsnChatbot.nonce);
            formData.append('answers', JSON.stringify(this.state.answers));

            fetch(alsnChatbot.ajaxUrl, {
                method: 'POST',
                body: formData
            })
            .then(res => res.json())
            .then(data => {
                this.hideTyping();
                
                if (data.success) {
                    this.showResults(data.data);
                } else {
                    this.addBotMessage('죄송합니다. 검색 중 오류가 발생했습니다.\n잠시 후 다시 시도해주세요.');
                }
            })
            .catch(err => {
                console.error('Search error:', err);
                this.hideTyping();
                this.addBotMessage('네트워크 오류가 발생했습니다.\n인터넷 연결을 확인해주세요.');
            });
        },

        // 결과 표시
        showResults(data) {
            const { services, totalCount } = data;
            
            this.addBotMessage(`🎉 검색이 완료되었어요!\n\n총 <strong>${totalCount}개</strong>의 맞춤 지원금을 찾았습니다.`);
            
            setTimeout(() => {
                this.renderResultModal(services, totalCount);
            }, 500);
        },

        // 결과 모달 렌더링
        renderResultModal(services, totalCount) {
            let html = '';

            if (totalCount === 0) {
                html = `
                    <div class="no-result">
                        <div class="no-result-icon">🔍</div>
                        <div class="no-result-title">검색 결과가 없습니다</div>
                        <div class="no-result-desc">선택하신 조건에 맞는 지원금이 없습니다.<br>조건을 변경하여 다시 검색해보세요.</div>
                    </div>
                `;
            } else {
                html = `
                    <div class="result-stats">
                        <div class="stat-card highlight">
                            <div class="stat-number">${totalCount}</div>
                            <div class="stat-label">검색된 지원금</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-number">${services.length}</div>
                            <div class="stat-label">표시된 항목</div>
                        </div>
                    </div>
                    <div class="result-list">
                        ${services.map(s => `
                            <div class="result-card">
                                <div class="result-card-header">
                                    <span class="result-card-badge">${s.category || '지원금'}</span>
                                    <h4 class="result-card-title">${s.servNm || '지원금명 없음'}</h4>
                                </div>
                                <p class="result-card-org">${s.jurMnofNm || ''} ${s.jurOrgNm || ''}</p>
                                <p class="result-card-desc">${s.servDgst || ''}</p>
                                <a href="https://www.gov.kr/portal/rcvfvrSvc/dtlEx/${s.servId}" 
                                   target="_blank" 
                                   class="result-card-link">
                                    자세히 보기
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                                        <polyline points="15 3 21 3 21 9"/>
                                        <line x1="10" y1="14" x2="21" y2="3"/>
                                    </svg>
                                </a>
                            </div>
                        `).join('')}
                    </div>
                `;
            }

            this.elements.resultBody.innerHTML = html;
            this.openModal();
        },

        // 모달 열기
        openModal() {
            this.elements.resultModal.classList.add('active');
            document.body.style.overflow = 'hidden';
        },

        // 모달 닫기
        closeModal() {
            this.elements.resultModal.classList.remove('active');
            document.body.style.overflow = '';
        }
    };

    // DOM 로드 후 초기화
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => AlsnChatbot.init());
    } else {
        AlsnChatbot.init();
    }
})();
