# 2.5D Illustration Generation

이 문서는 `imagegen` prompt를 만들거나 썸네일 시안을 선별할 때만 읽습니다.

## 승인된 style reference 5개

아래 자산은 최근 자산 중 2.5D 일러스트레이션 품질과 작은 카드 가독성을 함께 만족하는 기준입니다.

| 역할 | 경로 | 가져올 특성 |
| --- | --- | --- |
| 복합 정보 구조 | `public/thumnail/devlog/tech_study/3b919946ca7680d9a4f3c5389ea08e85.webp` | 굵고 일정한 navy outline, 책의 얕은 원근, 명확한 정보 계층 |
| 자동화 흐름 | `public/thumnail/devlog/tech_study/3b819946ca7680439eecd5fe23528952.webp` | 연결된 오브젝트의 단일 서사, 둥근 입체 면, 절제된 그림자 |
| 지식 연결 | `public/thumnail/devlog/blog/3a619946ca7680288a44ef2065a0c130.webp` | 중심 허브와 주변 노드, 선명한 계층, 넉넉한 여백 |
| 변환 과정 | `public/thumnail/devlog/blog/3ab19946ca768020a285dc6c49b14793.webp` | 전후 상태를 한 장면으로 설명하는 좌→우 흐름 |
| 시스템 보안 | `public/thumnail/projects/3b319946ca768057896fe03574856fa1.webp` | 서버·방패의 안정적인 2.5D 덩어리감과 재질 표현 |

마지막 reference의 흰 배경과 광택을 그대로 복제하지 않습니다. 배경·팔레트·outline은 canonical 규칙이 우선합니다.

## Prompt 구성

```text
Use case: stylized-concept
Asset type: 3:2 blog-card thumbnail illustration
Primary request: <글의 핵심을 한 문장의 시각적 은유로 표현>
Input images: Image 1 is the subject reference; Images 2-6 are style references only
Scene/backdrop: genuinely transparent canvas with only thin pale-blue square grid lines visible, generous edge breathing room
Subject: one coherent visual story made from 2-4 large connected objects
Style/medium: polished hand-drawn 2.5D editorial illustration, bold navy outline, shallow isometric depth
Composition/framing: centered, subject occupies 60-75%, readable at 288x192
Color palette: navy, slate, cobalt blue, pale blue, white only
Materials/textures: matte surfaces, restrained soft shadow, crisp silhouette
Constraints: landscape 3:2; preserve the existing near-white background; make only the pale-blue grid lines 15–20% darker; no dark or gray background fill; no text, letters, numbers, logos, watermark, brand UI, tiny labels
Avoid: flat icon sheet, thin line art, photorealism, glossy full 3D, purple accents, dark full-bleed background, clutter
```

주제 reference의 레이아웃을 그대로 확대 복사하지 말고 글의 인과관계가 드러나는 장면으로 재구성합니다. 하나의 장면 안에 2~4개 오브젝트를 둘 수 있지만, 서로 무관한 아이콘 모음은 실패입니다.

## 후처리와 검수

- 생성 원본을 중앙 기준으로 3:2 crop한 뒤 576×384로 축소합니다.
- `sharp`에서 576×384 sRGB WebP quality 88~92로 저장합니다. 기존 흰 배경은 유지하고 격자선의 명도 대비만 15~20% 높입니다.
- 흰 배경 위에서 격자선이 조금 더 진해졌는지 확인합니다. 피사체 내부의 흰색 면과 구도는 변경하지 않습니다.
- 화면의 배경이 회색·어두운 색으로 변하거나 격자선이 사라진 결과는 reject합니다.
- ImageGen이 alpha 없이 반환하면 한 번만 명시적으로 재시도합니다. 다시 실패하면 불투명 원본에서 바깥 가장자리와 연결된 밝은 저채도 영역만 mask로 추출합니다. 전역 white chroma key는 피사체 내부 흰색 면까지 지우므로 사용하지 않습니다.
- 투명 결과를 밝은 배경과 어두운 배경 양쪽에 합성해 격자선, outline edge, soft shadow halo를 검사합니다.
- 목표 파일 크기는 60 KB 이하입니다. 초과하면 먼저 quality를 84까지 낮추고, 디테일이 무너지면 장면을 단순화해 재생성합니다.
- 288×192 축소 화면에서 주제와 방향성이 2초 안에 식별되지 않으면 재생성합니다.
- 눈에 보이는 텍스트·문자·숫자·브랜드 UI가 하나라도 있으면 reject합니다.
