/* Original game text inspired by the linked works; these are not quotations from the artist. */
window.ANT_STORY = {
  chapters: [
    {
      numeral: "I",
      title: "이름과 흐름",
      subtitle: "사물에 붙인 이름 아래를 파다",
      thought: "먼저 이름을 배웠다.\n그다음에는 이름 밖의 것을 보았다.",
      fieldnote:
        "같은 흔적도 어느 쪽에서 바라보느냐에 따라 다른 이름을 얻는다.",
      relicIds: ["compass", "cup"],
    },
    {
      numeral: "II",
      title: "쓸모없는 흔적",
      subtitle: "끝나고도 남아 있는 동작을 찾다",
      thought:
        "결과에는 남지 않는 일이 있다.\n그 일을 하며 보낸 시간은 어디에 남을까.",
      fieldnote:
        "펴진 종이에도 접었던 선은 남는다. 아무 일도 없었던 종이와는 다르다.",
      relicIds: ["stitch", "crane"],
    },
    {
      numeral: "III",
      title: "남겨 둘 세계",
      subtitle: "모두 담을 수 없는 곳에 머물다",
      thought: "무언가를 고르는 동안\n다른 무언가는 조용히 지나간다.",
      fieldnote:
        "기록되지 않은 것이 사라진 것은 아니다. 이 도감의 바깥에도 땅은 이어진다.",
      relicIds: ["sieve", "house"],
    },
  ],
  relics: [
    {
      id: "compass",
      type: "compass",
      chapter: 0,
      name: "방향을 잃은 나침반",
      subtitle: "표본 01 · 이름",
      detail:
        "네 방향의 글자가 지워진 판에서 바늘만 움직인다. 개미는 북쪽이라는 말을 모르면서 판을 건넌다.",
      question: "방향의 이름과 지나간 길, 무엇을 기록할까?",
      choices: [
        {
          label: "방향에 이름을 붙인다",
          note: "판에 네 개의 이름을 적었다. 다음에 오는 이는 이 이름으로 길을 물을 수 있다.",
          mode: "keep",
        },
        {
          label: "지나간 길만 그린다",
          note: "방향 칸을 비우고 개미의 경로를 그렸다. 어느 쪽에서 읽을지는 다음에 오는 이에게 남겼다.",
          mode: "leave",
        },
      ],
    },
    {
      id: "cup",
      type: "cup",
      chapter: 0,
      name: "대화가 빠져나간 컵",
      subtitle: "표본 02 · 흐름",
      detail:
        "눌린 종이컵 둘이 서로를 향해 누워 있다. 담겼던 물도 오갔던 말도 없지만, 두 컵 사이의 거리는 남아 있다.",
      question: "말이 사라진 자리를 어떻게 남길까?",
      choices: [
        {
          label: "컵의 모양을 옮겨 그린다",
          note: "찌그러진 테두리를 따라 그렸다. 대화를 나눈 자리의 구체적인 모양이 기록에 남았다.",
          mode: "keep",
        },
        {
          label: "컵 사이를 빈칸으로 둔다",
          note: "두 컵이 놓였던 자리만 표시했다. 그 사이에 오갔을 말은 적지 않았다.",
          mode: "leave",
        },
      ],
    },
    {
      id: "stitch",
      type: "stitch",
      chapter: 1,
      name: "끝나지 않은 십자수",
      subtitle: "표본 03 · 반복",
      detail:
        "작은 십자가들이 천의 한쪽을 채우다가 멈췄다. 그림이 되기 전에도 한 땀을 놓는 시간은 이미 지나갔다.",
      question: "완성되지 않은 반복을 어디에 둘까?",
      choices: [
        {
          label: "놓인 땀의 수를 센다",
          note: "남은 땀을 하나씩 셌다. 무엇을 만들려 했는지는 몰라도 이어진 동작의 수는 기록할 수 있었다.",
          mode: "keep",
        },
        {
          label: "멈춘 자리를 표시한다",
          note: "마지막 실 끝에 작은 점을 찍었다. 그 뒤의 빈 천은 완성하지 않은 채 남겨 두었다.",
          mode: "leave",
        },
      ],
    },
    {
      id: "crane",
      type: "crane",
      chapter: 1,
      name: "다시 펼친 종이학",
      subtitle: "표본 04 · 과정",
      detail:
        "학을 펼치자 날개 대신 여러 겹의 선이 나타났다. 완성된 모습에서 보이지 않던 접힘도 이 종이를 지나왔다.",
      question: "학이 된 모습과 학이 되던 과정, 무엇을 보관할까?",
      choices: [
        {
          label: "접힌 선을 따라 베낀다",
          note: "종이의 선을 모두 옮겼다. 어느 선이 꼭 필요했는지는 아직 구분하지 않았다.",
          mode: "keep",
        },
        {
          label: "선을 따라 학을 다시 접는다",
          note: "종이를 다시 접어 세웠다. 선들 가운데 일부는 날개 안쪽으로 들어갔다.",
          mode: "leave",
        },
      ],
    },
    {
      id: "sieve",
      type: "sieve",
      chapter: 2,
      name: "한 줌의 체",
      subtitle: "표본 05 · 선택",
      detail:
        "체를 흔들 때마다 작은 흙알이 아래로 떨어진다. 손 안이 가벼워지는 동안 바닥에는 또 하나의 더미가 생긴다.",
      question: "체에 남은 것과 체를 지난 것, 어디에 눈을 둘까?",
      choices: [
        {
          label: "체에 남은 조각을 살핀다",
          note: "손에 남은 조각들을 가까이 놓았다. 지금 살필 수 있는 범위가 조금 작아졌다.",
          mode: "keep",
        },
        {
          label: "아래로 떨어진 흙을 살핀다",
          note: "체를 내려놓고 떨어진 흙을 살폈다. 작아서 지나간 것들의 모양이 눈에 들어왔다.",
          mode: "leave",
        },
      ],
    },
    {
      id: "house",
      type: "house",
      chapter: 2,
      name: "주인이 없는 작은 집",
      subtitle: "표본 06 · 경계",
      detail:
        "베개 곁에서 발견한 작은 집의 문은 열려 있다. 개미는 안으로 들어갔다가 벽 바깥의 길로 돌아간다.",
      question: "작은 집의 경계를 어떻게 기록할까?",
      choices: [
        {
          label: "집의 안쪽을 그린다",
          note: "벽과 방의 크기를 재어 그렸다. 그 안에서 머물 수 있는 공간이 도감에 생겼다.",
          mode: "keep",
        },
        {
          label: "집을 드나드는 길을 그린다",
          note: "문에서 이어지는 길을 그렸다. 길의 끝은 도감의 가장자리를 넘어갔다.",
          mode: "leave",
        },
      ],
    },
  ],
  endings: [
    {
      id: "build",
      label: "개미에게 작은 집을 지어 준다",
      title: "집을 지은 사람의 기록",
      text: "베개 옆에 작은 집을 두었다. 개미가 그곳을 집이라 부르는지는 알 수 없다. 내일도 드나드는 길을 지켜볼 자리는 생겼다.",
    },
    {
      id: "barrier",
      label: "베개 둘레에 약을 뿌린다",
      title: "잠시의 경계를 그린 기록",
      text: "오늘 잘 곳의 둘레에 선을 그었다. 선이 얼마나 오래 남을지는 모른다. 우선 오늘 밤의 거리를 마련하고, 내일의 일은 내일 다시 살피기로 했다.",
    },
    {
      id: "honey",
      label: "꿀을 놓아 다른 길로 이끈다",
      title: "달콤한 길을 놓은 기록",
      text: "조금 떨어진 곳에 꿀을 놓았다. 개미의 길을 바꾸려다 끈적한 손끝을 오래 바라보았다. 무엇이 누구를 붙잡고 있는지 잠시 구별하기 어려웠다.",
    },
    {
      id: "expert",
      label: "비용을 들여 전문가를 부른다",
      title: "다른 손을 빌린 기록",
      text: "혼자 하던 일을 다른 이에게 맡겼다. 비용을 치르고 잠시 손을 쉬었다. 내가 맡긴 일과 계속 살펴야 할 일을 천천히 나누어 적었다.",
    },
    {
      id: "move",
      label: "짐을 챙겨 다른 곳으로 간다",
      title: "다음 방으로 옮긴 기록",
      text: "도감을 챙겨 방을 떠났다. 다음 방에도 개미가 있을 수 있다. 아직 보지 못한 바닥을 떠올리며, 도감의 마지막 장을 비워 두었다.",
    },
  ],
};
