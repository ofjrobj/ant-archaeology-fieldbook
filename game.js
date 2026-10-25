(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const config = window.ANT_CONFIG;
  const physics = window.AntSimulation;
  const art = window.AntArt;
  $("antPlate").innerHTML = art.icons.antplate || "";
  const canvas = $("terrain");
  const ctx = canvas.getContext("2d");
  const WORLD = { width: 1000, height: 620 };
  const SAVE_KEY = "out-of-line-session-v1";
  const help = $("helpDialog");
  let model = physics.create({ ...WORLD, count: config.count, seed: 18 });
  let selected = "barrier";
  let paused = false;
  let drawing = false;
  let pointerId = null;
  let points = [];
  let pointer = { x: 500, y: 310, visible: false };
  let breeze = null;
  let keyboardDrawing = false;
  let keyboardBreeze = false;
  let lastTime = 0;
  let displayTime = "";
  let previousEscaped = -1;
  let saveTime = 0;
  let toastTimer;
  let ground;
  let winShown = false;
  let restored = false;

  // A separate key preserves the original fieldbook's records during this redesign.
  try {
    const saved = JSON.parse(sessionStorage.getItem(SAVE_KEY));
    if (
      saved &&
      saved.version === 1 &&
      saved.model?.total === config.count &&
      saved.model.width === WORLD.width &&
      saved.model.height === WORLD.height &&
      Array.isArray(saved.model.ants) &&
      saved.model.ants.length === config.count &&
      saved.model.ants.every(
        (ant) => Number.isFinite(ant.x) && Number.isFinite(ant.y),
      ) &&
      Array.isArray(saved.model.objects) &&
      Array.isArray(saved.model.paths)
    ) {
      model = saved.model;
      selected = config.tools.some((tool) => tool.id === saved.selected)
        ? saved.selected
        : selected;
      restored = true;
    }
  } catch {
    /* Storage is optional, including in private browsing. */
  }

  function save() {
    try {
      sessionStorage.setItem(
        SAVE_KEY,
        JSON.stringify({ version: 1, model, selected }),
      );
    } catch {}
  }
  const formatTime = (seconds) =>
    `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(Math.floor(seconds) % 60).padStart(2, "0")}`;
  function toast(message) {
    clearTimeout(toastTimer);
    $("toast").textContent = message;
    $("toast").classList.add("visible");
    toastTimer = setTimeout(() => $("toast").classList.remove("visible"), 2200);
  }
  function cancelGesture() {
    if (pointerId !== null && canvas.hasPointerCapture(pointerId))
      canvas.releasePointerCapture(pointerId);
    pointerId = null;
    drawing = false;
    points = [];
    breeze = null;
    keyboardDrawing = false;
    keyboardBreeze = false;
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
    save();
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
    toast("A clean slate. The ants keep going.");
    save();
  });

  function restart() {
    cancelGesture();
    model = physics.create({ ...WORLD, count: config.count, seed: 18 });
    paused = false;
    winShown = false;
    $("winPanel").hidden = true;
    $("pauseOverlay").hidden = true;
    $("toast").classList.remove("visible");
    $("pauseBtn").textContent = "Ⅱ";
    $("pauseBtn").setAttribute("aria-label", "Pause game");
    $("sessionState").textContent = "IN PLAY";
    previousEscaped = -1;
    displayTime = "";
    selectTool("barrier");
    updateStats();
    save();
  }
  function togglePause(value = !paused) {
    if (model.won) return;
    paused = value;
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
  $("startHelp").addEventListener("click", () => help.close());
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
    return {
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
  const canPlay = () => !paused && !model.won && !help.open;
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
    if (selected === "barrier" || selected === "trail")
      points = [{ x: pointer.x, y: pointer.y }];
    else if (selected === "breeze") breeze = { x: pointer.x, y: pointer.y };
    else placePoint(pointer);
    save();
  });
  canvas.addEventListener("pointermove", (event) => {
    if (!event.isPrimary || (drawing && event.pointerId !== pointerId)) return;
    pointer = { ...worldPoint(event), visible: true };
    if (!drawing || !canPlay()) return;
    if (selected === "barrier" || selected === "trail") addPoint(pointer);
    else if (selected === "breeze") breeze = { x: pointer.x, y: pointer.y };
    else if (selected === "eraser") physics.eraseAt(model, pointer, 38);
  });
  function finishPointer(event) {
    if (event.pointerId !== pointerId) return;
    if (drawing && (selected === "barrier" || selected === "trail")) {
      addPoint(worldPoint(event));
      if (points.length >= 2) physics.applyTool(model, selected, points);
      else
        toast(
          selected === "barrier"
            ? "Drag to draw a wall."
            : "Drag a scent trail toward an edge.",
        );
    }
    cancelGesture();
    pointer.visible = event.pointerType !== "touch";
    save();
  }
  canvas.addEventListener("pointerup", finishPointer);
  canvas.addEventListener("pointercancel", (event) => {
    if (event.pointerId !== pointerId) return;
    cancelGesture();
    save();
  });
  canvas.addEventListener("lostpointercapture", (event) => {
    if (event.pointerId !== pointerId) return;
    drawing = false;
    breeze = null;
    points = [];
    pointerId = null;
  });
  canvas.addEventListener("pointerleave", () => {
    if (!drawing) pointer.visible = false;
  });
  canvas.addEventListener("blur", () => {
    if (!drawing) pointer.visible = false;
    keyboardBreeze = false;
    breeze = null;
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
      pointer = {
        x: Math.max(-30, Math.min(WORLD.width + 30, pointer.x + dx * distance)),
        y: Math.max(
          -30,
          Math.min(WORLD.height + 30, pointer.y + dy * distance),
        ),
        visible: true,
      };
      if (keyboardDrawing) addPoint(pointer);
      if (keyboardBreeze) breeze = { x: pointer.x, y: pointer.y };
    } else if (event.key === "Enter") {
      event.preventDefault();
      pointer.visible = true;
      if (event.repeat) return;
      if (selected === "barrier" || selected === "trail") {
        if (keyboardDrawing) {
          addPoint(pointer);
          physics.applyTool(model, selected, points);
          points = [];
          keyboardDrawing = false;
          save();
        } else {
          points = [{ x: pointer.x, y: pointer.y }];
          keyboardDrawing = true;
          toast("Move with arrow keys. Enter to finish.");
        }
      } else if (selected === "breeze") {
        keyboardBreeze = true;
        breeze = { x: pointer.x, y: pointer.y };
      } else {
        placePoint(pointer);
        save();
      }
    } else if (event.key === "Escape") cancelGesture();
  });
  document.addEventListener("keyup", (event) => {
    if (event.key === "Enter" && keyboardBreeze) {
      keyboardBreeze = false;
      breeze = null;
    }
  });
  window.addEventListener("blur", () => {
    cancelGesture();
    save();
  });
  document.addEventListener("visibilitychange", () => {
    lastTime = 0;
    if (document.hidden) {
      cancelGesture();
      save();
    }
  });
  window.addEventListener("pagehide", save);

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
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
    if (model.escaped !== previousEscaped) {
      $("remaining").textContent = model.total - model.escaped;
      $("escaped").textContent = model.escaped;
      $("escapeProgress").max = model.total;
      $("escapeProgress").value = model.escaped;
      $("escapeProgress").textContent =
        `${model.escaped} of ${model.total} ants escaped`;
      previousEscaped = model.escaped;
    }
    const time = formatTime(model.time);
    if (time !== displayTime) {
      $("timer").textContent = time;
      displayTime = time;
    }
    if (model.won && !winShown) {
      winShown = true;
      $("sessionState").textContent = "CLEARED";
      cancelGesture();
      $("winSummary").textContent =
        `${model.total} ants set free in ${formatTime(model.time)}.`;
      $("winPanel").hidden = false;
      $("pauseOverlay").hidden = true;
      toast("All ants are out. You did it!");
      save();
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
    ctx.drawImage(ground, 0, 0, WORLD.width, WORLD.height);
    for (const path of model.paths) art.drawPath(ctx, path, model.time);
    for (const object of model.objects) art.drawObject(ctx, object, model.time);
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
          0.95,
          ant.angle,
          ant.phase + model.time * 18,
        );
    }
    if (pointer.visible && canPlay()) {
      art.drawCursor(ctx, selected, pointer.x, pointer.y, model.time);
      if (breeze) {
        ctx.save();
        ctx.strokeStyle = "#827b52";
        ctx.globalAlpha = 0.15;
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 3; i++) {
          const r = 25 + ((model.time * 70 + i * 37) % 120);
          ctx.beginPath();
          ctx.arc(breeze.x, breeze.y, r, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
      }
    }
  }
  function frame(time) {
    const dt = lastTime ? Math.min((time - lastTime) / 1000, 0.05) : 0;
    lastTime = time;
    if (canPlay() && !document.hidden) {
      // Small substeps keep fast moving ants from tunneling through a chalk wall.
      const steps = Math.max(1, Math.ceil(dt / (1 / 60)));
      for (let i = 0; i < steps; i++)
        physics.step(model, dt / steps, { breeze });
      saveTime += dt;
      if (saveTime > 2) {
        saveTime = 0;
        save();
      }
    }
    updateStats();
    draw();
    requestAnimationFrame(frame);
  }
  new ResizeObserver(resize).observe(canvas);
  selectTool(selected);
  updateStats();
  resize();
  if (restored && !model.won) toast("Back to your little experiment.");
  requestAnimationFrame(frame);
})();
