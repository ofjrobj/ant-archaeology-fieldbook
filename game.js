(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const config = window.ANT_CONFIG;
  const physics = window.AntSimulation;
  const art = window.AntArt;
  let artReady = !art.ready;
  $("antPlate").innerHTML = art.icons.antplate || "";
  const canvas = $("terrain");
  const ctx = canvas.getContext("2d");
  const WORLD = { width: 1000, height: 620 };
  const createModel = () =>
    physics.create({
      ...WORLD,
      count: config.count,
      initialCount: config.initialCount,
      arrivalRate: config.arrivalRate,
      returnDelay: config.returnDelay,
      populationMode: true,
      seed: 18,
    });
  const help = $("helpDialog");
  let model = createModel();
  let selected = "cup";
  let started = false;
  let paused = false;
  let drawing = false;
  let pointerId = null;
  let points = [];
  let pointer = { x: 500, y: 310, visible: false };
  let brush = null;
  let brushUntil = 0;
  let keyboardDrawing = false;
  let keyboardBrush = false;
  let lastTime = 0;
  let displayTime = "";
  let previousPopulation = "";
  let toastTimer;
  let ground;
  let winShown = false;

  // Every visit opens an empty leaf; a round begins only by choice.
  const formatTime = (seconds) =>
    `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(Math.floor(seconds) % 60).padStart(2, "0")}`;
  function toast(message) {
    clearTimeout(toastTimer);
    $("toast").textContent = message;
    $("toast").classList.add("visible");
    toastTimer = setTimeout(() => $("toast").classList.remove("visible"), 2200);
  }
  function cancelGesture() {
    const capturedPointer = pointerId;
    pointerId = null;
    if (capturedPointer !== null && canvas.hasPointerCapture(capturedPointer))
      canvas.releasePointerCapture(capturedPointer);
    physics.releaseCup(model, { cancel: true });
    document.querySelector(".page").classList.remove("is-carrying");
    drawing = false;
    points = [];
    brush = null;
    keyboardDrawing = false;
    keyboardBrush = false;
  }
  function selectTool(id) {
    cancelGesture();
    selected = id;
    document.querySelectorAll("[data-tool]").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.tool === id));
    });
    $("eraseBtn").setAttribute("aria-pressed", String(id === "eraser"));
    const tool = config.tools.find((item) => item.id === id);
    $("toolHint").innerHTML =
      '<span class="hint-dot" aria-hidden="true"></span>';
    $("toolHint").append(
      document.createTextNode(
        tool?.hint || "Click or drag over a tool to erase it.",
      ),
    );
  }
  $("tools").innerHTML = config.tools
    .map(
      (tool) => `
    <button class="tool-button" data-tool="${tool.id}" aria-pressed="false" aria-label="${tool.name}: ${tool.action}" title="${tool.hint} (${tool.key})">
      <span class="tool-key" aria-hidden="true">${tool.key}</span>
      <span class="tool-icon" aria-hidden="true">${art.icons[tool.id]}</span>
      <span class="tool-name">${tool.name}</span><span class="tool-action">${tool.action}</span>
    </button>`,
    )
    .join("");
  document.querySelectorAll("[data-tool]").forEach((button) => {
    button.addEventListener("click", () => selectTool(button.dataset.tool));
  });
  $("eraserIcon").innerHTML = art.icons.eraser;
  $("eraseBtn").addEventListener("click", () => selectTool("eraser"));
  $("clearBtn").addEventListener("click", () => {
    cancelGesture();
    physics.clearTools(model);
    toast("Tools cleared.");
  });

  function restart() {
    cancelGesture();
    model = createModel();
    started = false;
    paused = false;
    lastTime = 0;
    pointer.visible = false;
    document.querySelector(".page").classList.remove("is-still");
    winShown = false;
    $("winPanel").hidden = true;
    $("pauseOverlay").hidden = true;
    $("startGate").hidden = false;
    $("pauseBtn").hidden = true;
    $("toast").classList.remove("visible");
    $("pauseBtn").textContent = "Ⅱ";
    $("pauseBtn").setAttribute("aria-label", "Pause game");
    $("sessionState").textContent = "READY";
    previousPopulation = "";
    displayTime = "";
    selectTool("cup");
    updateStats();
  }
  function startGame() {
    if (started || !artReady) return;
    started = true;
    lastTime = 0;
    $("startGate").hidden = true;
    $("pauseBtn").hidden = false;
    $("sessionState").textContent = "IN PLAY";
    canvas.focus({ preventScroll: true });
  }
  $("beginBtn").addEventListener("click", startGame);
  function togglePause(value = !paused) {
    if (!started || model.won || model.lost) return;
    paused = value;
    document.querySelector(".page").classList.toggle("is-still", paused);
    cancelGesture();
    $("pauseOverlay").hidden = !paused;
    $("sessionState").textContent = paused ? "PAUSED" : "IN PLAY";
    $("pauseBtn").textContent = paused ? "▷" : "Ⅱ";
    $("pauseBtn").setAttribute(
      "aria-label",
      paused ? "Resume game" : "Pause game",
    );
  }
  $("pauseBtn").addEventListener("click", () => togglePause());
  $("resumeBtn").addEventListener("click", () => togglePause(false));
  $("resetBtn").addEventListener("click", restart);
  $("againBtn").addEventListener("click", restart);
  const fullscreenButton = $("fullscreenBtn");
  if (!document.fullscreenEnabled) fullscreenButton.hidden = true;
  fullscreenButton.addEventListener("click", async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.querySelector(".page").requestFullscreen();
    } catch {
      toast("Fullscreen is unavailable in this browser.");
    }
  });
  document.addEventListener("fullscreenchange", () => {
    const active = Boolean(document.fullscreenElement);
    fullscreenButton.setAttribute(
      "aria-label",
      active ? "Exit fullscreen" : "Enter fullscreen",
    );
    fullscreenButton.querySelector(".button-label").textContent = active
      ? "Exit fullscreen"
      : "Fullscreen";
  });
  $("helpBtn").addEventListener("click", () => {
    cancelGesture();
    help.showModal();
  });
  $("closeHelp").addEventListener("click", () => help.close());
  $("startHelp").addEventListener("click", () => {
    help.close();
    if (!started) startGame();
  });
  help.addEventListener("click", (event) => {
    if (event.target === help) {
      const r = help.getBoundingClientRect();
      if (
        event.clientX < r.left ||
        event.clientX > r.right ||
        event.clientY < r.top ||
        event.clientY > r.bottom
      )
        help.close();
    }
  });

  function worldPoint(event) {
    const rect = canvas.getBoundingClientRect();
    const point = {
      x: Math.max(
        -38,
        Math.min(
          WORLD.width + 38,
          ((event.clientX - rect.left) / rect.width) * WORLD.width,
        ),
      ),
      y: Math.max(
        -38,
        Math.min(
          WORLD.height + 38,
          ((event.clientY - rect.top) / rect.height) * WORLD.height,
        ),
      ),
    };
    // The thin edge target stays reachable on touch screens and inside a browser panel.
    if (selected === "cup" && model.cup) {
      if (event.clientX <= rect.left + 8) point.x = -1;
      else if (event.clientX >= rect.right - 8) point.x = WORLD.width + 1;
      if (event.clientY <= rect.top + 8) point.y = -1;
      else if (event.clientY >= rect.bottom - 8) point.y = WORLD.height + 1;
    }
    return point;
  }
  function addPoint(point) {
    const last = points[points.length - 1];
    if (!last || Math.hypot(last.x - point.x, last.y - point.y) > 5)
      points.push({ x: point.x, y: point.y });
  }
  function placePoint(point) {
    if (selected === "eraser") physics.eraseAt(model, point, 38);
    else physics.applyTool(model, selected, [point]);
  }
  function coverAnts(point) {
    const count = physics.captureCup(model, point);
    document.querySelector(".page").classList.toggle("is-carrying", count > 0);
  }
  function putCupDown() {
    const count = physics.releaseCup(model);
    document.querySelector(".page").classList.remove("is-carrying");
    if (count) toast(`${count.toLocaleString("en")} outside.`);
  }
  function sweep(from, to) {
    const dx = to.x - from.x,
      dy = to.y - from.y;
    if (Math.hypot(dx, dy) < 0.5) return;
    brush = { x: to.x, y: to.y, dx, dy };
    brushUntil = model.time + 0.1;
  }
  const canPlay = () =>
    started && artReady && !paused && !model.won && !model.lost && !help.open;
  canvas.addEventListener("pointerdown", (event) => {
    if (
      !canPlay() ||
      drawing ||
      !event.isPrimary ||
      (event.button !== 0 && event.pointerType !== "touch")
    )
      return;
    event.preventDefault();
    cancelGesture();
    canvas.focus({ preventScroll: true });
    pointerId = event.pointerId;
    canvas.setPointerCapture(pointerId);
    pointer = { ...worldPoint(event), visible: true };
    drawing = true;
    if (selected === "barrier") points = [{ x: pointer.x, y: pointer.y }];
    else if (selected === "cup") coverAnts(pointer);
    else if (selected === "brush") brush = null;
    else placePoint(pointer);
  });
  canvas.addEventListener("pointermove", (event) => {
    if (!event.isPrimary || (drawing && event.pointerId !== pointerId)) return;
    const previous = pointer;
    pointer = { ...worldPoint(event), visible: true };
    if (!drawing || !canPlay()) return;
    if (selected === "barrier") addPoint(pointer);
    else if (selected === "cup") physics.moveCup(model, pointer);
    else if (selected === "brush") sweep(previous, pointer);
    else if (selected === "eraser") physics.eraseAt(model, pointer, 38);
  });
  function finishPointer(event) {
    if (event.pointerId !== pointerId) return;
    if (drawing && selected === "cup") {
      pointer = { ...worldPoint(event), visible: true };
      physics.moveCup(model, pointer);
      putCupDown();
    } else if (drawing && selected === "barrier") {
      addPoint(worldPoint(event));
      if (points.length >= 2) physics.applyTool(model, selected, points);
      else toast("Drag to lay a twig.");
    }
    cancelGesture();
    pointer.visible = event.pointerType !== "touch";
  }
  canvas.addEventListener("pointerup", finishPointer);
  canvas.addEventListener("pointercancel", (event) => {
    if (event.pointerId !== pointerId) return;
    cancelGesture();
  });
  canvas.addEventListener("lostpointercapture", (event) => {
    if (event.pointerId !== pointerId) return;
    cancelGesture();
  });
  canvas.addEventListener("pointerleave", () => {
    if (!drawing) pointer.visible = false;
  });
  canvas.addEventListener("blur", () => {
    if (!drawing) {
      pointer.visible = false;
      cancelGesture();
    }
    keyboardBrush = false;
    brush = null;
  });

  // Keyboard placement mirrors the pointer tools without an alternate game mode.
  document.addEventListener("keydown", (event) => {
    if (help.open || /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName))
      return;
    const keyTool = config.tools.find((tool) => tool.key === event.key);
    if (keyTool) {
      selectTool(keyTool.id);
      return;
    }
    if (event.key.toLowerCase() === "e") {
      selectTool("eraser");
      return;
    }
    if (
      event.code === "Space" &&
      !event.repeat &&
      (event.target === canvas ||
        event.target === document.body ||
        event.target === document.documentElement)
    ) {
      event.preventDefault();
      togglePause();
      return;
    }
    if (event.target !== canvas || !canPlay()) return;
    const directions = {
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
    };
    if (directions[event.key]) {
      event.preventDefault();
      const [dx, dy] = directions[event.key];
      const distance = event.shiftKey ? 45 : 18;
      const previous = pointer;
      pointer = {
        x: Math.max(-30, Math.min(WORLD.width + 30, pointer.x + dx * distance)),
        y: Math.max(
          -30,
          Math.min(WORLD.height + 30, pointer.y + dy * distance),
        ),
        visible: true,
      };
      if (keyboardDrawing) addPoint(pointer);
      if (model.cup) physics.moveCup(model, pointer);
      if (keyboardBrush) sweep(previous, pointer);
    } else if (event.key === "Enter") {
      event.preventDefault();
      pointer.visible = true;
      if (event.repeat) return;
      if (selected === "barrier") {
        if (keyboardDrawing) {
          addPoint(pointer);
          physics.applyTool(model, selected, points);
          points = [];
          keyboardDrawing = false;
        } else {
          points = [{ x: pointer.x, y: pointer.y }];
          keyboardDrawing = true;
          toast("Move with arrow keys. Enter to finish.");
        }
      } else if (selected === "cup") {
        if (model.cup) putCupDown();
        else coverAnts(pointer);
      } else if (selected === "brush") {
        keyboardBrush = true;
      } else {
        placePoint(pointer);
      }
    } else if (event.key === "Escape") cancelGesture();
  });
  document.addEventListener("keyup", (event) => {
    if (event.key === "Enter" && keyboardBrush) {
      keyboardBrush = false;
      brush = null;
    }
  });
  window.addEventListener("blur", () => {
    cancelGesture();
  });
  document.addEventListener("visibilitychange", () => {
    lastTime = 0;
    if (document.hidden) {
      cancelGesture();
    }
  });

  function resize() {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const height = Math.max(160, (WORLD.width * rect.height) / rect.width);
    if (Math.abs(model.height - height) > 0.1) {
      cancelGesture();
      pointer.y *= height / model.height;
      physics.resizeWorld(model, WORLD.width, height);
      ground = null;
    }
    WORLD.height = height;
    const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(rect.width * ratio);
    canvas.height = Math.round(rect.height * ratio);
    if (!ground) {
      ground = document.createElement("canvas");
      ground.width = WORLD.width * 2;
      ground.height = WORLD.height * 2;
      const groundCtx = ground.getContext("2d");
      groundCtx.scale(2, 2);
      art.drawGround(groundCtx, WORLD.width, WORLD.height);
    }
    draw();
  }
  function updateStats() {
    const active = model.active ?? model.total - model.escaped;
    const reserve = model.reserve ?? 0;
    const population = `${active}:${model.escaped}:${reserve}`;
    if (population !== previousPopulation) {
      $("remaining").textContent = active.toLocaleString("en");
      $("escaped").textContent = model.escaped.toLocaleString("en");
      $("approaching").textContent = reserve.toLocaleString("en");
      $("escapeProgress").max = model.total;
      $("escapeProgress").value = model.escaped;
      $("escapeProgress").textContent =
        `${model.escaped} of ${model.total} ants outside`;
      const stress = Math.max(0, Math.min(1, (active - 500) / 1500));
      document
        .querySelector(".page")
        .style.setProperty("--leaf-stress", stress.toFixed(3));
      previousPopulation = population;
    }
    const time = formatTime(model.time);
    if (time !== displayTime) {
      $("timer").textContent = time;
      let nextReturn = Infinity;
      for (const ant of model.ants) {
        if (ant.status === "outside")
          nextReturn = Math.min(nextReturn, ant.returnAt);
      }
      $("returnNote").textContent = Number.isFinite(nextReturn)
        ? `return ${formatTime(Math.max(0, Math.ceil(nextReturn - model.time)))}`
        : "return in 1 min";
      displayTime = time;
    }
    if ((model.won || model.lost) && !winShown) {
      winShown = true;
      $("sessionState").textContent = model.won ? "ALL FREE" : "LEAF FULL";
      document.querySelector(".page").classList.add("is-still");
      cancelGesture();
      $("winTitle").textContent = model.won
        ? "A moment of freedom."
        : "The leaf is full.";
      $("winPanel").querySelector(".eyebrow").textContent = model.won
        ? "ALL 2,000 OUTSIDE"
        : "2,000 ON THE LEAF";
      $("winSummary").textContent = model.won
        ? `Every ant outside at once. ${formatTime(model.time)}.`
        : "Every ant is here. Try another way.";
      $("winPanel").hidden = false;
      $("pauseOverlay").hidden = true;
    }
  }
  function draw() {
    if (!ground) return;
    ctx.setTransform(
      canvas.width / WORLD.width,
      0,
      0,
      canvas.height / WORLD.height,
      0,
      0,
    );
    ctx.clearRect(0, 0, WORLD.width, WORLD.height);
    for (const path of model.paths) art.drawPath(ctx, path, model.time);
    for (const object of model.objects) art.drawObject(ctx, object, model.time);
    if (model.cup) art.drawCup(ctx, model.cup, model.time, "bottom");
    if (points.length > 1) {
      ctx.save();
      ctx.globalAlpha = 0.65;
      art.drawPath(ctx, { type: selected, points }, model.time);
      ctx.restore();
    }
    for (const ant of model.ants) {
      if (!ant.escaped)
        art.drawAnt(
          ctx,
          ant.x,
          ant.y,
          0.65,
          ant.angle,
          ant.phase + model.time * 18,
          (model.active ?? 0) > 700 ? 0 : 1,
        );
    }
    if (model.cup) art.drawCup(ctx, model.cup, model.time, "top");
    if (pointer.visible && canPlay() && !model.cup) {
      art.drawCursor(
        ctx,
        selected,
        pointer.x,
        pointer.y,
        model.time,
        selected === "brush" && (drawing || keyboardBrush),
      );
    }
  }
  function frame(time) {
    const dt = lastTime ? Math.min((time - lastTime) / 1000, 0.1) : 0;
    lastTime = time;
    if (canPlay() && !document.hidden) {
      // Small substeps keep fast moving ants from tunneling through a twig.
      const steps = Math.max(1, Math.ceil(dt / (1 / 60)));
      for (let i = 0; i < steps; i++)
        physics.step(model, dt / steps, {
          brush: model.time < brushUntil ? brush : null,
        });
    }
    updateStats();
    draw();
    requestAnimationFrame(frame);
  }
  new ResizeObserver(resize).observe(canvas);
  selectTool(selected);
  updateStats();
  resize();
  Promise.resolve(art.ready).then(() => {
    for (const button of document.querySelectorAll("[data-tool]")) {
      button.querySelector(".tool-icon").innerHTML =
        art.icons[button.dataset.tool];
    }
    artReady = true;
    ground = null;
    lastTime = 0;
    $("assetLoading").hidden = true;
    $("beginBtn").disabled = false;
    $("field").setAttribute("aria-busy", "false");
    resize();
  });
  requestAnimationFrame(frame);
})();
