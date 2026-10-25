(() => {
  "use strict";
  const $ = (id) => document.getElementById(id),
    story = window.ANT_STORY,
    art = window.AntArt;
  const canvas = $("terrain"),
    ctx = canvas.getContext("2d"),
    modal = $("modal");
  const WORLD = { w: 1000, h: 560 },
    CAMP = { x: 500, y: 468 };
  const POSITIONS = [
    [
      { x: 295, y: 218 },
      { x: 712, y: 324 },
    ],
    [
      { x: 250, y: 318 },
      { x: 674, y: 206 },
    ],
    [
      { x: 336, y: 220 },
      { x: 743, y: 312 },
    ],
  ];
  const SAVE_KEY = "ant-archaeology-fieldbook-v1";
  let state,
    route = [],
    trails = [],
    particles = [],
    paused = false,
    frameTime = 0,
    arrivalId = null,
    drawing = false,
    lastPoint = null,
    currentView = "",
    previousFocus;
  let fieldWidth = 0,
    fieldHeight = 0,
    background,
    ambientTime = 0;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const keys = new Set();
  const fresh = () => ({
    version: 1,
    chapter: 0,
    ant: { x: 500, y: 365, angle: -Math.PI / 2, phase: 0 },
    records: [],
    pending: null,
    distance: 0,
    ending: null,
  });
  const escape = (s) =>
    String(s).replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(SAVE_KEY));
      if (
        saved?.version === 1 &&
        Number.isInteger(saved.chapter) &&
        saved.chapter >= 0 &&
        saved.chapter < 3 &&
        Array.isArray(saved.records) &&
        saved.records.every(
          (r) =>
            story.relics.some((a) => a.id === r.id) &&
            [0, 1].includes(r.choice),
        ) &&
        new Set(saved.records.map((r) => r.id)).size === saved.records.length &&
        (!saved.pending ||
          story.relics.some((a) => a.id === saved.pending.id)) &&
        (!saved.ending || story.endings.some((e) => e.id === saved.ending))
      ) {
        state = { ...fresh(), ...saved, ant: { ...fresh().ant, ...saved.ant } };
        if (!Number.isFinite(state.ant.x) || !Number.isFinite(state.ant.y))
          state.ant = fresh().ant;
        return;
      }
    } catch {}
    state = fresh();
  }
  function save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    } catch {}
  }
  const recordFor = (id) => state.records.find((r) => r.id === id);
  const relicFor = (id) => story.relics.find((r) => r.id === id);
  const chapterRecords = () =>
    state.records.filter((r) => relicFor(r.id).chapter === state.chapter);
  const chapterRelics = () =>
    story.chapters[state.chapter].relicIds.map(relicFor);
  function locationFor(id) {
    const i = story.chapters[state.chapter].relicIds.indexOf(id);
    return POSITIONS[state.chapter][i];
  }
  function hint(text) {
    $("liveHint").textContent = text;
  }
  function note(index, title, text, type) {
    $("noteIndex").textContent = index;
    $("noteTitle").textContent = title;
    $("noteText").textContent = text;
    if (type) $("portrait").innerHTML = art.svgRelic(type);
    else drawPortrait();
  }
  function drawPortrait() {
    const c = document.createElement("canvas");
    c.width = 320;
    c.height = 224;
    const p = c.getContext("2d");
    p.scale(2, 2);
    p.strokeStyle = "#aaa";
    p.lineWidth = 0.5;
    p.beginPath();
    p.ellipse(80, 58, 48, 43, 0, 0, Math.PI * 2);
    p.stroke();
    p.setLineDash([2, 4]);
    p.beginPath();
    p.moveTo(20, 58);
    p.lineTo(140, 58);
    p.moveTo(80, 5);
    p.lineTo(80, 108);
    p.stroke();
    p.setLineDash([]);
    art.drawAnt(p, 80, 58, 2.8, -Math.PI / 2, 0);
    p.fillStyle = "#777";
    p.font = "7px monospace";
    p.fillText("FIG. 00", 7, 104);
    p.fillText("FORMICIDAE", 102, 104);
    $("portrait").replaceChildren(c);
  }
  function render() {
    const chapter = story.chapters[state.chapter],
      count = chapterRecords().length;
    document.querySelector(".map-caption span").textContent =
      `발굴 구역 ${"ABC"[state.chapter]}`;
    $("chapterLabel").textContent = `제 ${chapter.numeral} 지층`;
    $("chapterTitle").textContent = chapter.title;
    $("chapterPage").textContent = `0${state.chapter + 1} / 03`;
    $("fieldRef").textContent =
      `FIELD ${"ABC"[state.chapter]} — 0${state.chapter + 1}`;
    $("thought").textContent = chapter.thought;
    $("layerCount").textContent = `0${count} / 02`;
    $("progressFill").style.width = `${count * 50}%`;
    $("journalCount").textContent = String(state.records.length).padStart(
      2,
      "0",
    );
    $("siteMarkers").innerHTML = chapterRelics()
      .map((relic, i) => {
        const p = POSITIONS[state.chapter][i],
          r = recordFor(relic.id),
          pending = state.pending?.id === relic.id;
        return `<button class="site-marker ${r ? "visited" : ""}" style="left:${p.x / 10}%;top:${p.y / 5.6}%" data-site="${relic.id}" aria-label="${r ? "기록 다시 보기: " + escape(relic.name) : "발굴 지점 " + (state.chapter * 2 + i + 1) + "로 이동"}" ${pending ? "disabled" : ""}><span class="cross" aria-hidden="true">${r ? (r.mode === "leave" ? "◌" : "·") : "×"}</span><small>${r ? (r.mode === "leave" ? "남긴 자리" : "빈자리") : "0" + (state.chapter * 2 + i + 1)}</small></button>`;
      })
      .join("");
    $("siteMarkers")
      .querySelectorAll("button")
      .forEach(
        (b) =>
          (b.onclick = () => {
            const r = recordFor(b.dataset.site);
            if (r) showRecord(r.id);
            else goTo(locationFor(b.dataset.site));
          }),
      );
    $("specimenGrid").innerHTML = story.relics
      .map((a, i) => {
        const r = recordFor(a.id);
        return `<button class="specimen-card ${r ? (r.mode === "leave" ? "left-behind" : "found") : "unfound"}" data-relic="${a.id}" aria-label="${r ? "기록 보기: " + escape(a.name) : "미발굴 표본 " + (i + 1)}"><span class="serial">0${i + 1}</span><span class="specimen-status">${r ? (r.mode === "keep" ? "채집" : "현장 보존") : ""}</span>${r ? art.svgRelic(a.type) : '<span class="unknown" aria-hidden="true">＋</span>'}<span class="specimen-name">${r ? escape(a.name) : "아직 발견되지 않음"}</span></button>`;
      })
      .join("");
    $("specimenGrid")
      .querySelectorAll("button")
      .forEach(
        (b) =>
          (b.onclick = () => {
            if (recordFor(b.dataset.relic)) showRecord(b.dataset.relic);
            else {
              const a = relicFor(b.dataset.relic);
              showModal(
                "unfound",
                `<p class="modal-eyebrow">UNEXCAVATED · 표본 0${story.relics.indexOf(a) + 1}</p><h2 id="modalTitle">아직 땅 아래에 있습니다.</h2><p class="modal-body">제 ${story.chapters[a.chapter].numeral} 지층에서 발견할 수 있는 흔적입니다. 현장의 × 표시로 개미의 길을 이어 주세요.</p><button class="full-button" data-close>현장으로 돌아가기</button>`,
              );
            }
          }),
      );
    $("campBtn").classList.toggle("calling", !!state.pending);
    $("nextBtn").hidden = count < 2;
    $("nextBtn").innerHTML =
      state.chapter < 2
        ? "다음 지층으로 내려가기 <span>↓</span>"
        : state.ending
          ? "마지막 기록 다시 읽기 <span>↗</span>"
          : "지표로 돌아가기 <span>↑</span>";
    if (state.ending) {
      document.body.classList.add("night");
      $("footerMessage").textContent = "승리 대신, 하나의 기록이 남았다.";
    } else document.body.classList.remove("night");
  }
  function updateNote() {
    const count = chapterRecords().length;
    if (state.pending) {
      const a = relicFor(state.pending.id);
      note(
        "운반 중 / 기록은 아직 끝나지 않았다",
        a.name,
        "기록대까지 길을 이어 주세요. 옮기기로 한 것의 무게만큼, 돌아가는 길이 느려집니다.",
        a.type,
      );
      hint(
        "유물을 들고 있습니다. 아래의 기록대를 누르거나 그곳까지 선을 그어 주세요.",
      );
    } else if (count === 2) {
      note(
        "이 지층의 발굴을 마치며",
        state.chapter < 2 ? "조금 더 깊은 곳으로" : "이제, 처음의 질문으로",
        story.chapters[state.chapter].fieldnote,
        chapterRelics()[1].type,
      );
      hint(
        state.chapter < 2
          ? "두 개의 기록이 남았습니다. 다음 지층으로 내려갈 수 있습니다."
          : "여섯 개의 흔적을 만났습니다. 지표로 돌아가 마지막 선택을 남겨 주세요.",
      );
    } else {
      const last = chapterRecords().at(-1);
      if (last) {
        const a = relicFor(last.id);
        note(
          last.mode === "keep" ? "도감에 옮긴 것" : "땅에 남긴 것",
          a.name,
          a.choices[last.choice].note,
          a.type,
        );
        hint(
          "다른 × 표시로 길을 이어 주세요. 이미 남긴 기록은 도판에서 다시 읽을 수 있습니다.",
        );
      } else {
        note(
          "지층에 들어서며",
          "아직 읽히지 않은 땅",
          "두 개의 흔적이 묻혀 있습니다. 작은 ×를 따라가 보세요. 서두를 필요는 없습니다.",
        );
        hint("× 표시를 누르거나, 선을 그어 개미에게 길을 알려 주세요.");
      }
    }
  }
  function goTo(point) {
    if (modal.open || state.ending) return;
    paused = false;
    updatePause();
    arrivalId = null;
    $("arrival").hidden = true;
    route = [{ x: point.x, y: point.y }];
  }
  function showModal(view, html) {
    previousFocus = document.activeElement;
    currentView = view;
    $("modalContent").innerHTML = html;
    if (!modal.open) modal.showModal();
    $("modalContent")
      .querySelectorAll("[data-close]")
      .forEach((b) => (b.onclick = closeModal));
    modal.scrollTop = 0;
  }
  function closeModal() {
    modal.close();
    currentView = "";
    if (previousFocus?.isConnected)
      previousFocus.focus({ preventScroll: true });
  }
  modal.addEventListener("cancel", () => {
    currentView = "";
  });
  $("closeModal").onclick = closeModal;
  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      const r = modal.getBoundingClientRect();
      if (
        e.clientX < r.left ||
        e.clientX > r.right ||
        e.clientY < r.top ||
        e.clientY > r.bottom
      )
        closeModal();
    }
  });
  function discover(id) {
    if (recordFor(id) || state.pending) return;
    const a = relicFor(id);
    showModal(
      "discovery",
      `<p class="modal-eyebrow">EXCAVATION RECORD · 0${story.relics.indexOf(a) + 1}</p><div class="modal-illustration">${art.svgRelic(a.type)}</div><h2 id="modalTitle">${escape(a.name)}</h2><p class="modal-subtitle">${escape(a.subtitle)}</p><p class="modal-body">${escape(a.detail)}</p><p class="modal-question">${escape(a.question)}</p><div class="choices">${a.choices.map((c, i) => `<button class="choice" data-choice="${i}"><span>${escape(c.label)}</span><small>${c.mode === "keep" ? "채집 →" : "현장에 남기기 ↗"}</small></button>`).join("")}</div><p class="modal-note">어느 쪽도 정답은 아닙니다. 선택은 이 도감에 남습니다.</p>`,
    );
    $("modalContent")
      .querySelectorAll("[data-choice]")
      .forEach((b) => (b.onclick = () => choose(id, Number(b.dataset.choice))));
  }
  function choose(id, choice) {
    const a = relicFor(id),
      c = a.choices[choice];
    route = [];
    arrivalId = null;
    $("arrival").hidden = true;
    const r = { id, choice, mode: c.mode };
    if (c.mode === "keep") state.pending = r;
    else {
      state.records.push(r);
      addDust(locationFor(id));
    }
    closeModal();
    save();
    render();
    updateNote();
  }
  function deposit() {
    if (!state.pending) return;
    const p = state.pending;
    state.records.push(p);
    state.pending = null;
    route = [];
    save();
    render();
    updateNote();
    addDust(CAMP);
  }
  function showRecord(id) {
    const a = relicFor(id),
      r = recordFor(id);
    if (!r) return;
    showModal(
      "record",
      `<p class="modal-eyebrow">FIELD RECORD · ${r.mode === "keep" ? "COLLECTED" : "LEFT IN PLACE"}</p><div class="modal-illustration">${art.svgRelic(a.type)}</div><h2 id="modalTitle">${escape(a.name)}</h2><p class="modal-subtitle">${escape(a.subtitle)} / ${r.mode === "keep" ? "도감에 옮김" : "발견한 자리에 보존"}</p><p class="modal-body">${escape(a.detail)}</p><h3>${escape(a.choices[r.choice].label)}</h3><p class="modal-body">${escape(a.choices[r.choice].note)}</p><button class="full-button" data-close>현장으로 돌아가기</button>`,
    );
  }
  function showJournal() {
    showModal(
      "journal",
      `<p class="modal-eyebrow">THE FIELD JOURNAL · ${String(state.records.length).padStart(2, "0")} / 06</p><h2 id="modalTitle">당신이 남긴 기록</h2><p class="modal-body">가져온 사물과 남겨 둔 자리가 같은 도감에 놓입니다.</p>${
        state.records.length
          ? state.records
              .map((r) => {
                const a = relicFor(r.id);
                return `<button class="journal-row" data-record="${a.id}">${art.svgRelic(a.type)}<div><h3>${escape(a.name)}</h3><p>${r.mode === "keep" ? "채집" : "현장 보존"} · ${escape(a.choices[r.choice].label)}</p></div></button>`;
              })
              .join("")
          : '<p class="modal-note">아직 빈 도감입니다. 현장의 ×로 첫 길을 그어 보세요.</p>'
      }<div class="modal-actions">${state.ending ? '<button class="secondary-button" id="readEnding">마지막 장 읽기</button>' : ""}<button class="secondary-button" id="exportJournal">기록 내려받기</button><button class="secondary-button" id="restart">새 도감 시작하기</button></div>`,
    );
    $("modalContent")
      .querySelectorAll("[data-record]")
      .forEach((b) => (b.onclick = () => showRecord(b.dataset.record)));
    $("restart").onclick = confirmRestart;
    $("exportJournal").onclick = downloadJournal;
    if ($("readEnding"))
      $("readEnding").onclick = () => showEnding(state.ending);
  }
  function showHelp() {
    showModal(
      "help",
      `<p class="modal-eyebrow">HOW TO OBSERVE</p><h2 id="modalTitle">작은 길을 만드는 법</h2><ol class="help-steps"><li>현장의 <strong>×를 누르거나 선을 그으면</strong> 개미가 따라갑니다.</li><li>흔적에 도착하면 <strong>흙을 들추기</strong>를 누르세요.</li><li>사물을 채집할지, 발견한 자리에 남길지 선택합니다.</li><li>채집했다면 아래 <strong>기록대</strong>까지 옮겨 주세요.</li><li>두 개의 기록을 남기면 다음 지층이 열립니다.</li></ol><p class="modal-body">시간제한도, 틀린 선택도 없습니다. 세 지층을 지나 마지막 질문에 답하면 도감이 완성됩니다.</p><p class="modal-note">키보드: 현장을 선택한 뒤 방향키 / WASD로 이동 · Enter로 발굴 · Space로 멈추기. 모든 지점은 Tab과 Enter로도 선택할 수 있습니다.<br>진행은 이 브라우저에 자동 저장됩니다.</p><button class="full-button" data-close>발굴 현장으로</button>`,
    );
  }
  function showAbout() {
    showModal(
      "about",
      `<p class="modal-eyebrow">ABOUT THIS FIELD NOTE</p><h2 id="modalTitle">무엇과 싸우고 있었을까.</h2><p class="modal-body">이 게임은 「How to Win a Fight Against Ants」를 읽고 만든 플레이 가능한 해석입니다. 이름과 본질, 대화의 흐름, 반복의 가치, 결과 뒤에 감춰진 과정, 그리고 주의를 어디에 둘 것인가를 세 개의 지층에 묻었습니다.</p><p class="modal-body">직접 그은 길도, 짐을 들고 돌아온 길도 기록의 일부입니다. 모든 것을 가져오거나 모두 남겨도 여섯 개의 발견으로 도감을 완성할 수 있습니다.</p><div class="source-block"><span>BASED ON THE WORK BY J YOON · 2026</span><a class="text-link" href="https://undecember27.wpcomstaging.com/web-based-work/ants/" target="_blank" rel="noopener noreferrer">How to Win a Fight Against Ants ↗</a></div><p class="modal-note">게임 속 유물과 문장은 원문을 바탕으로 새로 구성한 창작 해석입니다. 첨부된 「개미 발굴 도감」의 선 그리기와 발굴 방식을 확장했습니다.</p><button class="full-button" data-close>다시 흙 위로</button>`,
    );
  }
  function finalQuestion() {
    showModal(
      "final-question",
      `<p class="modal-eyebrow">THE SURFACE · 마지막 질문</p><h2 id="modalTitle">아침, 베개 위의 개미들.</h2><p class="modal-body">땅 아래의 기록을 마치고 돌아왔습니다.<br>베개 위에는 다시 개미들이 줄지어 갑니다.</p><p class="modal-question">이제 당신은 무엇을 할까요?</p><div class="choices">${story.endings.map((e, i) => `<button class="choice" data-ending="${e.id}"><span>${escape(e.label)}</span><small>0${i + 1} ↗</small></button>`).join("")}</div><p class="modal-note">이 선택은 점수가 아니라, 당신의 도감 마지막 장이 됩니다.</p>`,
    );
    $("modalContent")
      .querySelectorAll("[data-ending]")
      .forEach(
        (b) =>
          (b.onclick = () => {
            state.ending = b.dataset.ending;
            route = [];
            keys.clear();
            save();
            render();
            note(
              "발굴 종료 / 다음 관찰을 위하여",
              "아직 남아 있는 개미",
              story.endings.find((e) => e.id === state.ending).text,
              "house",
            );
            hint("도감이 완성되었습니다. 기록을 읽거나 내려받을 수 있습니다.");
            showEnding(state.ending);
          }),
      );
  }
  function showEnding(id) {
    const e = story.endings.find((e) => e.id === id),
      kept = state.records.filter((r) => r.mode === "keep").length;
    showModal(
      "ending",
      `<p class="modal-eyebrow">END OF FIELDWORK · 시작되는 기록</p><h2 id="modalTitle">${escape(e.title)}</h2><p class="modal-body">${escape(e.text)}</p><div class="ending-quotation">개미는 여전히 걷는다.<br>달라진 것은, 당신이 읽는 방식.</div><div class="ending-stats"><span>도감에 옮긴 것<br><strong>${kept}개의 사물</strong></span><span>땅에 남겨 둔 것<br><strong>${6 - kept}개의 자리</strong></span><span>지나온 지층<br><strong>3개의 시간</strong></span></div><p class="modal-note">어떤 선택도 승리의 점수로 바꾸지 않았습니다.<br>이 기록 바깥에서, 개미의 길은 계속됩니다.</p><div class="modal-actions"><button class="secondary-button" id="endingExport">기록 내려받기</button><button class="secondary-button" id="endingJournal">도감 펼치기</button><button class="secondary-button" id="endingRestart">다시 발굴하기</button></div>`,
    );
    $("endingExport").onclick = downloadJournal;
    $("endingJournal").onclick = showJournal;
    $("endingRestart").onclick = confirmRestart;
  }
  function confirmRestart() {
    showModal(
      "restart",
      `<p class="modal-eyebrow">A NEW FIELD NOTE</p><h2 id="modalTitle">새로운 기록을 시작할까요?</h2><p class="modal-body">이 브라우저에 저장된 현재 도감이 새 도감으로 바뀝니다. 남겨 두고 싶다면 기록을 먼저 내려받으세요.</p><div class="modal-actions"><button class="secondary-button" id="beforeRestartExport">현재 기록 내려받기</button><button class="secondary-button" data-close>현재 도감으로 돌아가기</button><button class="secondary-button" id="reallyRestart">새 도감 시작</button></div>`,
    );
    $("beforeRestartExport").onclick = downloadJournal;
    $("reallyRestart").onclick = () => {
      state = fresh();
      route = [];
      trails = [];
      arrivalId = null;
      particles = [];
      paused = false;
      keys.clear();
      $("arrival").hidden = true;
      closeModal();
      save();
      buildBackground();
      render();
      updateNote();
      updatePause();
      $("footerMessage").textContent = "승리 조건: 아직 정해지지 않음.";
    };
  }
  function downloadJournal() {
    const kept = state.records.filter((r) => r.mode === "keep").length;
    let text = `개미 발굴 도감\n남겨진 것들의 고고학\n\n기록 ${state.records.length}/6 · 채집 ${kept} · 현장 보존 ${state.records.length - kept}\n\n`;
    for (const r of state.records) {
      const a = relicFor(r.id);
      text += `${a.subtitle} — ${a.name}\n${a.detail}\n선택: ${a.choices[r.choice].label}\n${a.choices[r.choice].note}\n\n`;
    }
    if (state.ending) {
      const e = story.endings.find((e) => e.id === state.ending);
      text += `마지막 장: ${e.title}\n${e.text}\n\n`;
    }
    text +=
      "원작: J Yoon, How to Win a Fight Against Ants (2026)\nhttps://undecember27.wpcomstaging.com/web-based-work/ants/\n게임 속 문장은 원작을 바탕으로 한 창작 해석입니다.\n";
    const blob = new Blob(["\uFEFF" + text], {
        type: "text/plain;charset=utf-8",
      }),
      url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = "개미-발굴-기록.txt";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  $("journalBtn").onclick = showJournal;
  $("helpBtn").onclick = showHelp;
  $("aboutBtn").onclick = showAbout;
  $("campBtn").onclick = () => goTo(CAMP);
  $("excavateBtn").onclick = () => {
    if (arrivalId) discover(arrivalId);
  };
  $("nextBtn").onclick = () => {
    if (chapterRecords().length !== 2) return;
    if (state.chapter === 2) {
      if (state.ending) showEnding(state.ending);
      else finalQuestion();
      return;
    }
    state.chapter++;
    state.ant = { x: 500, y: 365, angle: -Math.PI / 2, phase: 0 };
    route = [];
    trails = [];
    arrivalId = null;
    $("arrival").hidden = true;
    save();
    buildBackground();
    render();
    updateNote();
  };
  function updatePause() {
    $("pauseBtn").textContent = paused ? "▷" : "Ⅱ";
    $("pauseBtn").setAttribute(
      "aria-label",
      paused ? "개미 움직임 재개" : "개미 움직임 일시정지",
    );
  }
  $("pauseBtn").onclick = () => {
    paused = !paused;
    updatePause();
    hint(
      paused
        ? "잠시 멈추었습니다. 다시 움직이려면 재개 버튼이나 목적지를 누르세요."
        : state.pending
          ? "기록대로 유물을 옮겨 주세요."
          : "× 표시를 누르거나 선을 그어 개미에게 길을 알려 주세요.",
    );
  };
  function point(e) {
    const r = canvas.getBoundingClientRect();
    return {
      x: Math.max(15, Math.min(985, ((e.clientX - r.left) / r.width) * 1000)),
      y: Math.max(15, Math.min(540, ((e.clientY - r.top) / r.height) * 560)),
    };
  }
  canvas.addEventListener("pointerdown", (e) => {
    if (state.ending || e.button > 0) return;
    canvas.setPointerCapture(e.pointerId);
    canvas.focus({ preventScroll: true });
    drawing = true;
    lastPoint = point(e);
    goTo(lastPoint);
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!drawing) return;
    const p = point(e);
    if (Math.hypot(p.x - lastPoint.x, p.y - lastPoint.y) > 7) {
      route.push(p);
      if (route.length > 600) route.shift();
      lastPoint = p;
    }
  });
  canvas.addEventListener("pointerup", () => {
    drawing = false;
    lastPoint = null;
    save();
  });
  canvas.addEventListener("pointercancel", () => {
    drawing = false;
    lastPoint = null;
  });
  canvas.addEventListener("keydown", (e) => {
    if (modal.open || state.ending) return;
    const key = e.key.toLowerCase();
    if (
      [
        "arrowup",
        "arrowdown",
        "arrowleft",
        "arrowright",
        "w",
        "a",
        "s",
        "d",
      ].includes(key)
    ) {
      e.preventDefault();
      keys.add(key);
      route = [];
      paused = false;
      updatePause();
    } else if (key === "enter" && arrivalId) {
      e.preventDefault();
      discover(arrivalId);
    } else if (key === " ") {
      e.preventDefault();
      $("pauseBtn").click();
    }
  });
  canvas.addEventListener("blur", () => keys.clear());
  window.addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));
  window.addEventListener("blur", () => {
    keys.clear();
    save();
  });
  document.addEventListener("visibilitychange", () => {
    keys.clear();
    if (document.hidden) save();
  });
  window.addEventListener("pagehide", save);
  function random(seed) {
    return () => {
      seed |= 0;
      seed = (seed + 0x6d2b79f5) | 0;
      let n = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      n = (n + Math.imul(n ^ (n >>> 7), 61 | n)) ^ n;
      return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
    };
  }
  function buildBackground() {
    background = document.createElement("canvas");
    background.width = 1600;
    background.height = 896;
    const g = background.getContext("2d");
    g.scale(1.6, 1.6);
    const rand = random(173 + state.chapter * 409),
      shift = state.chapter * 37;
    g.fillStyle = "#efefef";
    g.fillRect(0, 0, 1000, 560);
    // Survey grid, terrain contour lines, and loose geological stippling.
    g.lineWidth = 0.5;
    g.strokeStyle = "#d9d9d9";
    for (let x = 50; x < 1000; x += 100) {
      g.beginPath();
      g.moveTo(x, 0);
      g.lineTo(x, 560);
      g.stroke();
    }
    for (let y = 30; y < 560; y += 100) {
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(1000, y);
      g.stroke();
    }
    g.strokeStyle = "#c2c2c2";
    g.lineWidth = 0.65;
    for (let band = 0; band < 23; band++) {
      g.beginPath();
      for (let x = -20; x <= 1020; x += 8) {
        let y =
          band * 17 -
          50 +
          Math.sin((x + shift) / 135 + band * 0.047) * 33 +
          Math.sin(x / 65 + band * 0.09) * 9 +
          Math.pow((x - 540) / 550, 2) * 26;
        if (x === -20) g.moveTo(x, y);
        else g.lineTo(x, y);
      }
      g.stroke();
    }
    for (let band = 0; band < 13; band++) {
      g.beginPath();
      for (let x = -10; x <= 1020; x += 9) {
        const y =
          422 +
          band * 18 +
          Math.sin((x + shift) / 147 + band * 0.08) * 21 +
          Math.cos(x / 75 + band * 0.1) * 6;
        g.lineTo(x, y);
      }
      g.stroke();
    }
    for (let i = 0; i < 2100; i++) {
      const x = rand() * 1000,
        y = rand() * 560;
      g.fillStyle = `rgba(50,50,50,${0.05 + rand() * 0.13})`;
      g.fillRect(x, y, rand() < 0.91 ? 0.65 : 1.5, 0.7);
    }
    // Eroded, hatched stones rather than flat UI decorations.
    function stone(x, y, s) {
      g.save();
      g.translate(x, y);
      g.rotate(rand() * 2);
      const p = new Path2D();
      p.moveTo(-s * 0.65, -s * 0.4);
      p.lineTo(-s * 0.1, -s * 0.72);
      p.lineTo(s * 0.6, -s * 0.32);
      p.lineTo(s * 0.72, s * 0.16);
      p.lineTo(s * 0.2, s * 0.6);
      p.lineTo(-s * 0.7, s * 0.38);
      p.closePath();
      g.fillStyle = "#ebebeb";
      g.fill(p);
      g.strokeStyle = "#898989";
      g.lineWidth = 0.6;
      g.stroke(p);
      g.save();
      g.clip(p);
      g.strokeStyle = "#a7a7a7";
      for (let h = -s; h < s; h += 3) {
        g.beginPath();
        g.moveTo(h, -s);
        g.lineTo(h + s * 0.5, s);
        g.stroke();
      }
      g.restore();
      g.restore();
    }
    [
      [133, 299, 22],
      [172, 320, 12],
      [852, 195, 30],
      [876, 224, 11],
      [393, 127, 15],
      [590, 391, 16],
      [82, 438, 11],
      [901, 407, 20],
    ].forEach(([x, y, s]) => stone(x + shift * 0.2, y, s));
    // An excavated architectural trace in the lower left.
    g.save();
    g.translate(178, 421);
    g.rotate(-0.2);
    g.strokeStyle = "#aaa";
    g.lineWidth = 0.7;
    g.strokeRect(-49, -24, 77, 44);
    g.strokeRect(-44, -19, 67, 34);
    g.clearRect(-6, -26, 18, 12);
    for (let i = 0; i < 6; i++) {
      g.beginPath();
      g.moveTo(-49 + i * 14, -24);
      g.lineTo(-49 + i * 14, -19);
      g.stroke();
    }
    g.restore();
    // Fine root system at the edge of the plan.
    g.strokeStyle = "#909090";
    g.lineWidth = 0.8;
    g.beginPath();
    g.moveTo(930, 0);
    g.bezierCurveTo(923, 49, 958, 60, 929, 112);
    g.bezierCurveTo(912, 151, 945, 166, 920, 206);
    g.moveTo(940, 66);
    g.bezierCurveTo(893, 75, 921, 115, 892, 136);
    g.moveTo(929, 109);
    g.lineTo(952, 129);
    g.lineTo(957, 157);
    g.moveTo(924, 176);
    g.lineTo(902, 189);
    g.stroke();
    POSITIONS[state.chapter].forEach((p, i) => {
      g.save();
      g.translate(p.x, p.y);
      g.rotate(i ? -0.15 : 0.1);
      g.strokeStyle = "#959595";
      g.setLineDash([2, 5]);
      g.lineWidth = 0.7;
      g.strokeRect(-67, -52, 134, 104);
      g.setLineDash([]);
      g.strokeStyle = "#adadad";
      for (let a = 0; a < 55; a++) {
        const x = (rand() - 0.5) * 150,
          y = (rand() - 0.5) * 125;
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + 2, y + rand() * 3);
        g.stroke();
      }
      g.restore();
    });
    g.font = "9px monospace";
    g.fillStyle = "#939393";
    g.fillText("A", 51, 20);
    g.fillText("B", 451, 20);
    g.fillText("C", 851, 20);
    g.save();
    g.translate(12, 280);
    g.rotate(-Math.PI / 2);
    g.fillText(
      `STRATUM ${story.chapters[state.chapter].numeral} / SECTION 0${state.chapter + 1}`,
      0,
      0,
    );
    g.restore();
  }
  function resize() {
    const r = canvas.getBoundingClientRect(),
      dpr = Math.min(window.devicePixelRatio || 1, 2);
    fieldWidth = r.width;
    fieldHeight = r.height;
    canvas.width = Math.round(r.width * dpr);
    canvas.height = Math.round(r.height * dpr);
    ctx.setTransform(canvas.width / 1000, 0, 0, canvas.height / 560, 0, 0);
  }
  function addDust(p) {
    for (let i = 0; i < 20; i++)
      particles.push({
        x: p.x,
        y: p.y,
        vx: (Math.random() - 0.5) * 27,
        vy: (Math.random() - 0.5) * 27,
        life: 1,
      });
  }
  function move(dt) {
    const ant = state.ant;
    let p = route[0];
    const dx =
        (keys.has("arrowright") || keys.has("d") ? 1 : 0) -
        (keys.has("arrowleft") || keys.has("a") ? 1 : 0),
      dy =
        (keys.has("arrowdown") || keys.has("s") ? 1 : 0) -
        (keys.has("arrowup") || keys.has("w") ? 1 : 0);
    if (dx || dy) p = { x: ant.x + dx * 30, y: ant.y + dy * 30 };
    let moving = false;
    if (p) {
      const distance = Math.hypot(p.x - ant.x, p.y - ant.y),
        step = (state.pending ? 100 : 155) * dt;
      if (distance < step) {
        ant.x = p.x;
        ant.y = p.y;
        if (!(dx || dy)) route.shift();
      } else {
        const old = { x: ant.x, y: ant.y };
        const angle = Math.atan2(p.y - ant.y, p.x - ant.x);
        let diff = Math.atan2(
          Math.sin(angle - ant.angle),
          Math.cos(angle - ant.angle),
        );
        ant.angle += diff * Math.min(1, dt * 16);
        ant.x += Math.cos(angle) * step;
        ant.y += Math.sin(angle) * step;
        ant.x = Math.max(15, Math.min(985, ant.x));
        ant.y = Math.max(15, Math.min(540, ant.y));
        ant.phase += dt * 12;
        state.distance += step;
        moving = true;
        const last = trails.at(-1);
        if (!last || Math.hypot(last.x - ant.x, last.y - ant.y) > 7) {
          trails.push(old);
          if (trails.length > 1300) trails.shift();
        }
      }
    }
    if (state.pending) {
      if (Math.hypot(ant.x - CAMP.x, ant.y - CAMP.y) < 23) deposit();
    } else if (!state.ending) {
      let found = null;
      for (const a of chapterRelics()) {
        if (recordFor(a.id)) continue;
        const p = locationFor(a.id);
        if (Math.hypot(ant.x - p.x, ant.y - p.y) < 30) {
          found = a.id;
          break;
        }
      }
      if (found !== arrivalId) {
        arrivalId = found;
        $("arrival").hidden = !found;
        if (found) {
          route = [];
          hint(
            "흔적에 도착했습니다. ‘흙을 들추기’를 눌러 발견한 것을 살펴보세요.",
          );
        }
      }
    }
    return moving;
  }
  function draw(dt, moving) {
    if (!reducedMotion.matches) ambientTime += dt * 1000;
    ctx.clearRect(0, 0, 1000, 560);
    ctx.drawImage(background, 0, 0, 1000, 560);
    if (trails.length) {
      ctx.strokeStyle = "#737373";
      ctx.lineWidth = 0.8;
      ctx.setLineDash([1, 6]);
      ctx.beginPath();
      trails.forEach((p, i) =>
        i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y),
      );
      ctx.stroke();
      ctx.setLineDash([]);
    }
    for (const r of chapterRecords()) {
      if (r.mode === "leave") {
        const p = locationFor(r.id);
        ctx.save();
        ctx.globalAlpha = 0.7;
        art.drawRelic(ctx, r.id, p.x, p.y - 3, 66);
        ctx.restore();
      }
    }
    if (route.length) {
      ctx.strokeStyle = "#363636";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 5]);
      ctx.beginPath();
      ctx.moveTo(state.ant.x, state.ant.y);
      route.forEach((p) => ctx.lineTo(p.x, p.y));
      ctx.stroke();
      ctx.setLineDash([]);
      const p = route.at(-1);
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.stroke();
    }
    particles.forEach((p) => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt * 0.65;
      ctx.fillStyle = `rgba(40,40,40,${Math.max(0, p.life * 0.5)})`;
      ctx.fillRect(p.x, p.y, 1.3, 1.3);
    });
    particles = particles.filter((p) => p.life > 0);
    // Distant workers share the ground; the player remains the large specimen.
    for (let i = 0; i < 3; i++) {
      let x = 70 + ((ambientTime / 130 + i * 83) % 860),
        y = 110 + Math.sin(x / 90 + i) * 12;
      ctx.save();
      ctx.globalAlpha = 0.4;
      art.drawAnt(ctx, x, y, 0.31, 0, ambientTime / 180);
      ctx.restore();
    }
    const ant = state.ant;
    art.drawAnt(ctx, ant.x, ant.y, 1.4, ant.angle, ant.phase);
    if (state.pending) {
      art.drawRelic(
        ctx,
        state.pending.id,
        ant.x + Math.cos(ant.angle) * 18,
        ant.y + Math.sin(ant.angle) * 18,
        24,
      );
    }
    if (!state.records.length && !state.pending && !trails.length) {
      ctx.font = '11px "AppleMyungjo",serif';
      ctx.fillStyle = "#666";
      ctx.textAlign = "center";
      ctx.fillText("당신과 함께 걷는 개미", ant.x, ant.y + 32);
      ctx.textAlign = "left";
    }
  }
  function frame(time) {
    const dt = Math.min((time - frameTime) / 1000 || 0, 0.04);
    frameTime = time;
    const active = !paused && !modal.open && !document.hidden && !state.ending;
    let moving = false;
    if (active) moving = move(dt);
    draw(active ? dt : 0, moving);
    requestAnimationFrame(frame);
  }
  load();
  buildBackground();
  render();
  updateNote();
  resize();
  new ResizeObserver(resize).observe($("field"));
  requestAnimationFrame(frame);
  if (state.ending) {
    note(
      "발굴 종료 / 다음 관찰을 위하여",
      "아직 남아 있는 개미",
      story.endings.find((e) => e.id === state.ending).text,
      "house",
    );
    hint(
      "도감이 완성되었습니다. 발굴 기록에서 마지막 장을 다시 읽을 수 있습니다.",
    );
  }
})();
