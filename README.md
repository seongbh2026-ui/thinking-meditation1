# 🧘 Thinking Meditation (집중력과 관조의 3D 생각 명상)

> **3D 인터랙티브 그래픽과 알파벳/숫자 오디오 카운팅으로 집중력과 생각을 관조하는 마인드풀니스 Web Application**

---

## 📸 프로젝트 소개

**Thinking Meditation**은 명상 중 떠오르는 잡념을 관조하고 깨어있는 의식을 유지할 수 있도록 돕는 3D 생각 명상 애플리케이션입니다.

- 3D 공간 연출(만다라, 지구, 연꽃, 선인장, 튜브) 속에서 정해진 간격마다 등장하는 숫자와 알파벳 음성을 들으며 마음을 정돈합니다.
- 명상이 완료되면 도중 출현했던 알파벳을 회상하는 인지 퀴즈를 진행하여 집중력을 점검할 수 있습니다.

---

## ✨ 핵심 주요 기능

1. **맞춤형 명상 설정 (Settings UI)**
   - **명상 시간**: 최소 2분부터 최대 60분까지 유연하게 설정
   - **카운팅 간격**: 5초부터 15초까지 슬라이더 및 퀵 버튼(5/7/10/12/15초) 제공
   - **음성 선택**: 남성(InJoon), 여성(SunHi), 무음 지원
   - **3D 공간 연출**: 만다라, 지구, 연꽃, 선인장, 튜브, 없음 등 6가지 옵션

2. **화면 덜컹거림 없는 오버레이 (Overlay Display)**
   - 숫자는 **반투명 디스플레이(`text-white/35`)**로 적용되어 3D 배경 몰입감을 방지하지 않음
   - CSS Pop-Fade 애니메이션으로 카운트 변경 시 화면 유동/덜컹거림 완벽 제거

3. **Web Audio 2.5배 음량 증폭 (Audio Engine)**
   - 숫자음이 작게 들리지 않도록 Web Audio API `GainNode`를 도입하여 **2.5배 선명하게 음량 증폭**
   - 오디오 자원 미지원 시 딜레이 없는 TTS Fallback 탑재

4. **모바일 화면 꺼짐 방지 (Mobile Wake Lock)**
   - Navigator Screen WakeLock API 및 1px 무음 비디오 루프 Fallback 통합
   - 모바일 기기에서 명상 도중 화면이 꺼지거나 프로그램이 멈추지 않음

5. **카카오톡 & SNS 공유 소셜 썸네일 지원**
   - OpenGraph 1200x630 규격의 `og_thumbnail.svg` 및 파비콘 메타 태그 완비

---

## 🛠️ 기술 스택 (Tech Stack)

- **Frontend Framework**: React 18, TypeScript, Tailwind CSS
- **3D Graphics**: Three.js
- **Audio Engine**: Web Audio API (GainNode 2.5x), SpeechSynthesis API
- **State & Architecture**: Custom EventBus & Store
- **Build Tool**: Vite

---

## 📁 소스 문서 참조

- 📄 [제품 요구사항 정의서 (PRD.md)](./PRD.md)
- 🏗️ [시스템 아키텍처 및 프로그램 구조도 (ARCHITECTURE.md)](./ARCHITECTURE.md)

---

## 🚀 실행 가이드

```bash
# 패키지 설치
npm install

# 개발 서버 실행
npm run dev

# 프로덕션 빌드
npm run build
```
