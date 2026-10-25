# 개미 발굴 도감

개미의 길을 그리고 유물을 채집하거나 남겨 두는 흑백 철학 게임입니다. 세 지층, 여섯 유물, 다섯 결말로 구성되어 있습니다.

- [게임 실행](https://ofjrobj.github.io/ant-archaeology-fieldbook/)
- [브라우저에서 코드 수정](https://github.dev/ofjrobj/ant-archaeology-fieldbook)
- [저장소](https://github.com/ofjrobj/ant-archaeology-fieldbook)

## 보면서 수정하기

Node.js 22 이상에서 아래 명령을 실행합니다. 패키지를 설치할 필요는 없습니다.

```sh
npm run dev
```

브라우저에서 터미널에 표시된 `http://127.0.0.1:4173`을 엽니다. 파일을 저장하면 페이지가 자동으로 새로고침됩니다. 진행 상황은 같은 브라우저에 유지됩니다.

| 수정할 내용                           | 파일         |
| ------------------------------------- | ------------ |
| 제목, 페이지 구조, 메뉴               | `index.html` |
| 글꼴, 여백, 흑백 색상, 모바일 배치    | `style.css`  |
| 지층 설명, 유물 문장, 선택지, 결말    | `story.js`   |
| 개미와 유물의 선화                    | `art.js`     |
| 이동 속도, 발굴 위치, 운반, 게임 규칙 | `game.js`    |

게임을 처음부터 보려면 **발굴 기록 → 새 도감 시작하기**를 누릅니다. 필요한 기존 기록은 그전에 내려받을 수 있습니다.

## 확인 및 빌드

```sh
npm run check
npm run build
```

`dist/`에는 배포용 파일과, 인터넷 없이 브라우저에서 열 수 있는 `standalone.html`이 생성됩니다. `dist/`는 생성 파일이므로 원본 파일을 수정해 주세요.

## GitHub에서 바로 수정하기

저장소 화면에서 `.` 키를 누르면 웹 코드 편집기가 열립니다. 원본 파일을 수정하고 `main` 브랜치에 커밋하면 GitHub Pages가 같은 주소로 자동 배포합니다. 공개 페이지 반영에는 잠시 시간이 걸릴 수 있습니다.

이 프로젝트는 별도 컴파일이 필요 없는 HTML/CSS/JavaScript 게임입니다. GitHub Pages의 배포 원본은 **`main` 브랜치의 `/(root)`**이며, `.nojekyll`로 파일을 그대로 배포합니다. 로컬의 `npm run build`는 별도 배포 파일과 단일 HTML을 만들 때 사용합니다.

```sh
git add index.html style.css story.js art.js game.js
git commit -m "Update the game"
git push
```

## 게임의 바탕

J Yoon의 [How to Win a Fight Against Ants](https://undecember27.wpcomstaging.com/web-based-work/ants/)를 바탕으로 만든 플레이 가능한 해석입니다. 유물과 문장은 원문을 바탕으로 새로 구성했습니다. 별도 서버, 계정, 외부 폰트, 외부 이미지가 필요하지 않습니다. 플레이 기록은 브라우저의 로컬 저장소에만 저장됩니다.
