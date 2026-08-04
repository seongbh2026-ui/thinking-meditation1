# 📄 PRD (Product Requirements Document)
## Thinking Meditation (집중력과 관조의 3D 생각 명상)

---

## 1. 프로젝트 개요 (Overview)
- **제품명**: Thinking Meditation (생각 명상)
- **핵심 컨셉**: 3D 인터랙티브 그래픽과 소리/알파벳/숫자 카운팅을 결합하여 명상 중 수시로 떠오르는 잡념을 관조하고 집중력을 극대화하는 마인드풀니스 웹 애플리케이션.
- **주요 타겟**: 스트레스 완화, 집중력 강화, 고난도 집중 훈련(알파벳 인지 기억)이 필요한 현대인.

---

## 2. 주요 목표 및 배경 (Goals & Background)
1. **생각 관조 훈련**: 명상 도중 스쳐 지나가는 숫자와 알파벳 음성을 청각 및 시각으로 받아들이고, 세션 완료 후 출현한 알파벳을 회상함으로써 깨어있는 의식(Awareness)을 유지.
2. **시각적 몰입감 강화**: 만다라, 지구, 연꽃, 선인장, 튜브 등 감각적인 3D 그래픽 애니메이션으로 세련된 명상 분위기 조성.
3. **모바일 사용성 최적화**: 모바일 웹 환경에서 명상 중 화면이 꺼지거나 중단되지 않도록 **화면 꺼짐 방지(Wake Lock)** 기능 탑재 및 **수직 밸런스 Viewport** 디자인 적용.
4. **소셜 공유 지원**: 카카오톡, 라인 등 SNS 공유 시 시각적 완성도가 높은 OG(Open Graph) 썸네일 및 메타데이터 자동 제공.

---

## 3. 핵심 기능 요구사항 명세 (Functional Requirements)

### 3.1. 첫 화면 및 설정 (Settings UI)
- **이름 입력**: 사용자 이름을 입력 받아 맞춤형 명상 경험 제공.
- **명상 시간 설정**: Minimum 2분 ~ Maximum 60분 (슬라이더 조작).
- **카운팅 간격 선택**: 5초 ~ 15초 (슬라이더 조작 및 5초, 7초, 10초, 12초, 15초 퀵 선택 버튼 제공).
- **음성 유형 선택**:
  - 남성 음성 (`InJoon` 3D HD 오디오)
  - 여성 음성 (`SunHi` 3D HD 오디오)
  - 무음 (`Mute`)
- **3D 배경 선택**: 만다라, 지구, 연꽃, 선인장, 튜브, 없음 (총 6가지 옵션).
- **수직 밸런스 레이아웃**: 모바일 및 데스크톱 한 화면(Viewport) 내에 스크롤 없이 가득 차는 파스텔 무지개 회전 만다라 카드 디자인.

### 3.2. 3D 시각화 및 오버레이 (3D Visuals & Overlay UI)
- **3D 메시 애니메이션**: Three.js 기반의 부드러운 회전 및 펄스 조명 효과.
- **숫자 오버레이**:
  - 반투명 시각 처리 (`text-white/35`)로 3D 배경 감상을 방해하지 않음.
  - Smooth Pop-Fade 애니메이션 (`@keyframes popFade`)으로 숫자가 바뀔 때 화면 덜컹거림 완전 제거.
- **알파벳 오버레이**:
  - 명상 집중 인지용 선명한 텍스트 (`text-white/95`) 및 빛나는 글로우 드롭 섀도우.

### 3.3. 정밀 오디오 엔진 (Audio Engine)
- **음성 음량 증폭 (Web Audio API Gain Node)**:
  - 숫자가 출력될 때 음성이 작게 들리지 않도록 Web Audio API `AudioContext` 및 `GainNode`를 활용하여 **숫자 음량을 2.5배(Gain 2.5) 자동 증폭**.
- **Fallback 시스템**:
  - 오디오 파일 재생 실패 시 브라우저 내장 `SpeechSynthesisUtterance` (TTS)로 즉시 전환.

### 3.4. 모바일 화면 꺼짐 방지 (Mobile Wake Lock)
- **Screen Wake Lock API**: 명상 시작 시 브라우저 screen wake lock을 자동 요청하여 디바이스 화면 꺼짐 방지.
- **iOS / 구형 브라우저 Fallback**: 백그라운드 무음 1px 비디오 루프(`silentVideoEl`)를 재생하여 브라우저 슬립 모드 진입 방지.
- **자동 재활성화**: 앱 탭 이탈 후 복귀(`visibilitychange` 이벤트) 시 Wake Lock 자동 재요청.

### 3.5. 세션 종료 후 퀴즈 (Quiz Module)
- 명상 도중 무작위로 출현했던 알파벳 문자들을 맞추는 회상 퀴즈 제공.
- 정답 여부 및 맞춤 축하 메시지 출력.

---

## 4. 비기능 요구사항 (Non-Functional Requirements)
- **성능 (Performance)**: Three.js 렌더링 시 60fps 유지, 가벼운 폴리곤 및 리소스 최적화.
- **호환성 (Compatibility)**: Chrome, Safari, KakaoTalk In-App Browser, Edge, Firefox 최신 버전 지원.
- **접근성 (Accessibility)**: 고대비 텍스트, 터치 영역 44px 이상 확보, 반응형 스케일링.
- **배포 지원 (Deployment & Sharing)**: `og_thumbnail.svg` (1200x630), `thumbnail.svg` (800x800) 파비콘 및 OpenGraph 태그 완비.

---

## 5. 시스템 사양 요약
| 구분 | 기술 스택 / 사양 |
| :--- | :--- |
| **Frontend** | React 18, TypeScript, Tailwind CSS, Lucide React |
| **3D Engine** | Three.js |
| **Audio Engine** | Web Audio API, HTML5 Audio, SpeechSynthesis API |
| **State & Event** | Custom Store (Publish/Subscribe), EventBus |
| **Build & Tooling** | Vite, ESBuild |
