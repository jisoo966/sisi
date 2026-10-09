# SiSi — 다리와 연못 낮 테마 v1

기존 Journey에 맞춘 개별 에셋입니다. 새 그림은 이미지 생성 도구로 제작했고, 내보내기 단계에서 캔버스·배치·크기를 정리했습니다.

## 교체 파일

| 원본 | 새 파일 | 크기 |
|---|---|---|
| journey-walking-path.webp | journey-walking-path-bridge | 2048×768 |
| journey-walking-ground.webp | journey-walking-ground-pond | 2048×768 |
| journey-midground-vegetation.webp | journey-midground-pond | 2048×768 |
| meadow-strip-afternoon.webp | meadow-strip-pond | 2172×242 |

PNG는 png/ 폴더, 가벼운 WebP는 webp/ 폴더에 있습니다. 원본을 덮어쓰기보다 테마별 경로를 연결하는 편이 좋습니다. sky·cloud·fox는 기존 에셋을 사용합니다.

## 추가 파일

- pond-foreground: 2048×768. 연못 맨 아래 가장자리. 기존 ground와 같은 배치로 추가하고 물고기 위에 그립니다. 선택적으로 사용하세요.
- fish-coral / fish-ivory: 각각 256×128 투명 PNG. 오른쪽을 향하는 단일 정지 이미지입니다. 물고기들을 복제해 좌우로 이동시키면 됩니다. 기본 표시 너비는 약 28–48 CSS px를 추천합니다. 왼쪽 방향은 수평 반전하세요.

## 배치

1. 기존 하늘·구름
2. 중경 식물
3. 연못 지면
4. 초원 띠 대신 연못 뒤쪽 가장자리
5. 다리
6. 기존 여우
7. 연못 안 물고기
8. 선택적인 낮은 전경 식물

다리는 원본 경로 캔버스의 y≈422 걷기 기준선에 발이 놓이도록 정리했습니다. 연못은 원본 ground와 같은 2048×768이며 윗부분은 투명, y=500부터 물입니다. 새 물고기와 전경은 코드에서 별도 레이어 연결이 필요합니다. 물고기는 아직 프레임 애니메이션이 아니며 실제 움직임은 앱에서 구현해야 합니다.

preview-phone.jpg는 현재 앱에서 읽은 레이어 크기·좌표에 기존 여우를 얹은 정지 조합입니다. preview-horizontal.jpg는 테마 전체를 보는 가로 조합이며 교체용 에셋이 아닙니다. 기존 앱 코드는 변경하지 않았습니다.

동일한 캔버스 크기와 레이어 배치를 유지했습니다. 연속 스크롤 경계와 실제 기기별 최종 모습은 테마를 연결한 뒤 확인하세요. 현재 세트는 낮 색상입니다.
