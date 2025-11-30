<?php
/**
 * =====================================================
 * ALSN 보조금 챗봇 - 서버사이드 API 처리
 * 파일: alsn-chatbot-ajax.php
 * 용도: 테마의 functions.php에 include 또는 플러그인으로 사용
 * 
 * ⚠️ 보안 주의사항:
 * 1. API 키는 wp-config.php에 상수로 정의
 * 2. 이 파일은 절대 공개 저장소에 업로드 금지
 * 3. 프로덕션 배포 전 ALSN_DEV_MODE를 false로 설정
 * =====================================================
 */

// 직접 접근 차단
if (!defined('ABSPATH')) {
    exit('Direct access not allowed');
}

/**
 * ===== 설정 상수 (wp-config.php에 추가 권장) =====
 * 
 * wp-config.php에 다음을 추가하세요:
 * 
 * define('ALSN_SUBSIDY_API_KEY', '여기에_API_키_입력');
 * define('ALSN_DEV_MODE', false);
 */

// 개발 모드 기본값 (프로덕션에서는 false)
if (!defined('ALSN_DEV_MODE')) {
    define('ALSN_DEV_MODE', false);
}

/**
 * 챗봇 스크립트 및 스타일 등록
 */
function alsn_chatbot_enqueue_scripts() {
    // 챗봇이 있는 페이지에서만 로드 (조건 커스터마이즈 가능)
    if (!is_page('subsidy-finder') && !has_shortcode(get_post()->post_content ?? '', 'alsn_chatbot')) {
        return;
    }

    // CSS
    wp_enqueue_style(
        'alsn-chatbot-style',
        get_template_directory_uri() . '/assets/css/11-section-subsidy-chatbot.css',
        array(),
        filemtime(get_template_directory() . '/assets/css/11-section-subsidy-chatbot.css')
    );

    // JavaScript
    wp_enqueue_script(
        'alsn-chatbot-script',
        get_template_directory_uri() . '/assets/js/alsn-chatbot.js',
        array(),
        filemtime(get_template_directory() . '/assets/js/alsn-chatbot.js'),
        true
    );

    // AJAX URL 및 Nonce 전달 (API 키는 전달하지 않음!)
    wp_localize_script('alsn-chatbot-script', 'alsnChatbot', array(
        'ajaxUrl' => admin_url('admin-ajax.php'),
        'nonce'   => wp_create_nonce('alsn_chatbot_nonce')
    ));
}
add_action('wp_enqueue_scripts', 'alsn_chatbot_enqueue_scripts');

/**
 * 숏코드 등록
 */
function alsn_chatbot_shortcode($atts) {
    ob_start();
    include get_template_directory() . '/template-parts/11-subsidy-chatbot.html';
    return ob_get_clean();
}
add_shortcode('alsn_chatbot', 'alsn_chatbot_shortcode');

/**
 * AJAX 핸들러 - 보조금 검색
 */
function alsn_subsidy_search_handler() {
    // Nonce 검증
    if (!wp_verify_nonce($_POST['nonce'] ?? '', 'alsn_chatbot_nonce')) {
        wp_send_json_error(array('message' => '보안 검증 실패'), 403);
    }

    // Rate Limiting (간단한 구현)
    $ip = $_SERVER['REMOTE_ADDR'];
    $rate_key = 'alsn_rate_' . md5($ip);
    $rate_count = get_transient($rate_key) ?: 0;
    
    if ($rate_count > 30) { // 분당 30회 제한
        wp_send_json_error(array('message' => '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.'), 429);
    }
    
    set_transient($rate_key, $rate_count + 1, 60);

    // 입력 데이터 파싱
    $answers = json_decode(stripslashes($_POST['answers'] ?? '{}'), true);
    
    if (empty($answers)) {
        wp_send_json_error(array('message' => '입력 데이터가 없습니다.'), 400);
    }

    // API 키 확인
    if (!defined('ALSN_SUBSIDY_API_KEY') || empty(ALSN_SUBSIDY_API_KEY)) {
        if (ALSN_DEV_MODE) {
            // 개발 모드: 더미 데이터 반환
            wp_send_json_success(alsn_get_dummy_results());
        }
        wp_send_json_error(array('message' => 'API 설정 오류'), 500);
    }

    // 캐시 키 생성
    $cache_key = 'alsn_subsidy_' . md5(serialize($answers));
    $cached_result = get_transient($cache_key);
    
    if ($cached_result !== false) {
        wp_send_json_success($cached_result);
    }

    // API 요청 파라미터 구성
    $params = alsn_build_api_params($answers);
    
    // API 호출
    $result = alsn_call_subsidy_api($params);
    
    if (is_wp_error($result)) {
        wp_send_json_error(array('message' => $result->get_error_message()), 500);
    }

    // 결과 캐싱 (1시간)
    set_transient($cache_key, $result, HOUR_IN_SECONDS);

    wp_send_json_success($result);
}
add_action('wp_ajax_alsn_subsidy_search', 'alsn_subsidy_search_handler');
add_action('wp_ajax_nopriv_alsn_subsidy_search', 'alsn_subsidy_search_handler');

/**
 * API 파라미터 구성
 */
function alsn_build_api_params($answers) {
    $params = array(
        'page'    => 1,
        'perPage' => 20
    );

    // 사용자 유형에 따른 파라미터 구성
    $type = $answers['intro'] ?? 'personal';

    switch ($type) {
        case 'personal':
            // 지역
            if (!empty($answers['region'])) {
                $params['lifeArray'] = $answers['region']['sido'] ?? '';
            }
            
            // 생년월일/성별
            if (!empty($answers['birthGender'])) {
                $params['age'] = date('Y') - intval($answers['birthGender']['year']);
            }
            
            // 개인특성
            if (!empty($answers['personalChar']) && is_array($answers['personalChar'])) {
                $chars = array_filter($answers['personalChar'], function($v) {
                    return $v !== 'JA9999';
                });
                if (!empty($chars)) {
                    $params['trgterIndvdlArray'] = implode(',', $chars);
                }
            }
            
            // 가구특성
            if (!empty($answers['familyChar']) && is_array($answers['familyChar'])) {
                $chars = array_filter($answers['familyChar'], function($v) {
                    return $v !== 'JA9999';
                });
                if (!empty($chars)) {
                    $params['trgterIndvdlArray'] = ($params['trgterIndvdlArray'] ?? '') . ',' . implode(',', $chars);
                }
            }
            break;

        case 'business':
            if (!empty($answers['bizRegion'])) {
                $params['lifeArray'] = $answers['bizRegion']['sido'] ?? '';
            }
            break;

        case 'corp':
            if (!empty($answers['corpRegion'])) {
                $params['lifeArray'] = $answers['corpRegion']['sido'] ?? '';
            }
            break;
    }

    return $params;
}

/**
 * 보조금24 API 호출
 */
function alsn_call_subsidy_api($params) {
    $api_key = ALSN_SUBSIDY_API_KEY;
    $base_url = 'https://api.odcloud.kr/api/gov24/v3/serviceList';
    
    // URL 파라미터 구성
    $query_params = array_merge($params, array(
        'serviceKey' => $api_key
    ));
    
    $url = $base_url . '?' . http_build_query($query_params);

    // API 요청
    $response = wp_remote_get($url, array(
        'timeout' => 15,
        'headers' => array(
            'Accept' => 'application/json'
        )
    ));

    if (is_wp_error($response)) {
        return $response;
    }

    $status_code = wp_remote_retrieve_response_code($response);
    
    if ($status_code !== 200) {
        return new WP_Error('api_error', 'API 요청 실패 (상태 코드: ' . $status_code . ')');
    }

    $body = wp_remote_retrieve_body($response);
    $data = json_decode($body, true);

    if (json_last_error() !== JSON_ERROR_NONE) {
        return new WP_Error('parse_error', 'API 응답 파싱 실패');
    }

    // 결과 정리
    $services = $data['data'] ?? array();
    $totalCount = $data['totalCount'] ?? count($services);

    return array(
        'services'   => array_slice($services, 0, 20), // 최대 20개
        'totalCount' => $totalCount
    );
}

/**
 * 개발용 더미 데이터
 */
function alsn_get_dummy_results() {
    return array(
        'services' => array(
            array(
                'servId'    => 'WLF00001',
                'servNm'    => '청년 주거급여 분리지급',
                'servDgst'  => '부모와 떨어져 거주하는 청년에게 주거급여를 별도로 지급하는 제도입니다.',
                'jurMnofNm' => '국토교통부',
                'jurOrgNm'  => '주거복지정책과',
                'category'  => '주거'
            ),
            array(
                'servId'    => 'WLF00002',
                'servNm'    => '청년 월세 한시 특별지원',
                'servDgst'  => '경제적으로 어려운 청년층의 주거비 부담 경감을 위한 월세 지원 사업입니다.',
                'jurMnofNm' => '국토교통부',
                'jurOrgNm'  => '주거복지정책과',
                'category'  => '주거'
            ),
            array(
                'servId'    => 'WLF00003',
                'servNm'    => '국민취업지원제도',
                'servDgst'  => '취업을 원하는 사람에게 취업지원서비스를 종합적으로 제공하고 저소득 구직자에게는 생계를 위한 최소한의 소득도 지원하는 제도입니다.',
                'jurMnofNm' => '고용노동부',
                'jurOrgNm'  => '고용정책실',
                'category'  => '취업'
            ),
            array(
                'servId'    => 'WLF00004',
                'servNm'    => '청년내일저축계좌',
                'servDgst'  => '일하는 저소득 청년의 자산형성을 지원하는 사업입니다.',
                'jurMnofNm' => '보건복지부',
                'jurOrgNm'  => '자립지원과',
                'category'  => '금융'
            ),
            array(
                'servId'    => 'WLF00005',
                'servNm'    => '청년도약계좌',
                'servDgst'  => '청년의 중장기 자산형성을 지원하기 위한 정책형 금융상품입니다.',
                'jurMnofNm' => '금융위원회',
                'jurOrgNm'  => '서민금융과',
                'category'  => '금융'
            )
        ),
        'totalCount' => 5
    );
}

/**
 * 관리자 설정 페이지 (선택사항)
 */
function alsn_chatbot_admin_menu() {
    add_submenu_page(
        'options-general.php',
        '보조금 챗봇 설정',
        '보조금 챗봇',
        'manage_options',
        'alsn-chatbot-settings',
        'alsn_chatbot_settings_page'
    );
}
add_action('admin_menu', 'alsn_chatbot_admin_menu');

function alsn_chatbot_settings_page() {
    if (!current_user_can('manage_options')) {
        return;
    }
    ?>
    <div class="wrap">
        <h1>보조금 챗봇 설정</h1>
        
        <div class="card" style="max-width: 600px; padding: 20px;">
            <h2>API 설정 상태</h2>
            
            <?php if (defined('ALSN_SUBSIDY_API_KEY') && !empty(ALSN_SUBSIDY_API_KEY)): ?>
                <p style="color: green;">✅ API 키가 설정되어 있습니다.</p>
            <?php else: ?>
                <p style="color: red;">❌ API 키가 설정되지 않았습니다.</p>
                <p><strong>wp-config.php</strong>에 다음 코드를 추가하세요:</p>
                <pre style="background: #f5f5f5; padding: 10px; overflow-x: auto;">define('ALSN_SUBSIDY_API_KEY', '여기에_API_키_입력');</pre>
            <?php endif; ?>
            
            <hr>
            
            <h2>사용 방법</h2>
            <p>페이지에 다음 숏코드를 추가하세요:</p>
            <pre style="background: #f5f5f5; padding: 10px;">[alsn_chatbot]</pre>
            
            <hr>
            
            <h2>보안 체크리스트</h2>
            <ul>
                <li>☐ API 키를 wp-config.php에 상수로 정의했는가?</li>
                <li>☐ 프로덕션 환경에서 ALSN_DEV_MODE가 false인가?</li>
                <li>☐ 이 PHP 파일이 공개 저장소에 업로드되지 않았는가?</li>
                <li>☐ .gitignore에 wp-config.php가 포함되어 있는가?</li>
            </ul>
        </div>
    </div>
    <?php
}
