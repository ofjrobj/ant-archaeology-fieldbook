/* Painted botanical surfaces, natural objects, and articulated ants. */
(() => {
  "use strict";

  const color = {
    paper: "#f5f8ea",
    ink: "#252b21",
    clay: "#9f482e",
    sage: "#8d9a61",
    blue: "#697c43",
    honey: "#b59650",
    rose: "#d7bb99",
  };
  const TAU = Math.PI * 2;
  const images = {};
  const toolAssets = {
    observation: "assets/observation-tools.png",
    current: "assets/tools-3d.png",
    legacy: "assets/tool-sprites.png",
  };
  const loadImage = (key, url) =>
    new Promise((resolve) => {
      const image = new Image();
      image.onload = () => {
        images[key] = image;
        resolve(true);
      };
      image.onerror = () => resolve(false);
      image.src = url;
    });
  const ready = Promise.all([
    loadImage("ground", "assets/leaf-surface.png"),
    loadImage("observation", toolAssets.observation).then(
      (loaded) =>
        loaded ||
        loadImage("tools", toolAssets.current).then(
          (fallback) => fallback || loadImage("legacyTools", toolAssets.legacy),
        ),
    ),
  ]).then(([leaf, sprites]) => ({ leaf, sprites }));
  let antBody;
  const chalkPatterns = new WeakMap();
  let scentDrop;
  const pathDrops = new WeakMap();
  const cupStarts = new WeakMap();
  const observationCells = {
    barrier: [0, 0],
    pebble: [1, 0],
    sugar: [2, 0],
    honey: [0, 1],
    cup: [1, 1],
    brush: [2, 1],
  };
  const spriteCells = {
    barrier: [0, 0],
    pebble: [1, 0],
    lemon: [2, 0],
    sugar: [0, 1],
    trail: [1, 1],
    breeze: [2, 1],
  };
  const legacyCells = {
    barrier: [0, 0],
    pebble: [1, 0],
    lemon: [0, 1],
    sugar: [1, 1],
  };

  function spriteFor(type) {
    if (images.observation && observationCells[type])
      return {
        image: images.observation,
        cell: observationCells[type],
        columns: 3,
      };
    // Chalk from the older set should never stand in for the new wooden twig.
    if (
      type === "barrier" ||
      type === "honey" ||
      type === "cup" ||
      type === "brush"
    )
      return null;
    if (images.tools && spriteCells[type])
      return { image: images.tools, cell: spriteCells[type], columns: 3 };
    if (images.legacyTools && legacyCells[type])
      return { image: images.legacyTools, cell: legacyCells[type], columns: 2 };
    return null;
  }

  function drawSprite(ctx, type, x, y, size, angle = 0) {
    const sprite = spriteFor(type);
    if (!sprite) return false;
    const { image, cell, columns } = sprite;
    const cellWidth = image.naturalWidth / columns;
    const cellHeight = image.naturalHeight / 2;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.drawImage(
      image,
      cell[0] * cellWidth,
      cell[1] * cellHeight,
      cellWidth,
      cellHeight,
      -size / 2,
      -size / 2,
      size,
      size,
    );
    ctx.restore();
    return true;
  }

  function makeScentDrop() {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 48;
    const ctx = canvas.getContext("2d");
    ctx.scale(3, 3);
    ctx.translate(8, 8);
    const shadow = ctx.createRadialGradient(0.8, 1.7, 0.2, 0.8, 1.7, 4.4);
    shadow.addColorStop(0, "rgba(39,30,9,.45)");
    shadow.addColorStop(1, "rgba(39,30,9,0)");
    ctx.fillStyle = shadow;
    ellipse(ctx, 0.8, 1.7, 4.6, 3.3);
    ctx.fill();
    const amber = ctx.createRadialGradient(-1, -1.2, 0.1, 0, 0, 3.5);
    amber.addColorStop(0, "#fff3b4");
    amber.addColorStop(0.24, "#edc65c");
    amber.addColorStop(0.65, "#ba7e29");
    amber.addColorStop(1, "#6e4617");
    ctx.fillStyle = amber;
    ellipse(ctx, 0, 0, 3, 2.5, -0.2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,225,.9)";
    ellipse(ctx, -0.9, -1.1, 0.9, 0.42, -0.3);
    ctx.fill();
    return canvas;
  }

  function dropletsFor(path, points) {
    const cached = pathDrops.get(path);
    const last = point(points[points.length - 1]);
    if (
      cached &&
      cached.length === points.length &&
      cached.lastX === last.x &&
      cached.lastY === last.y
    )
      return cached.drops;
    let total = 0;
    for (let i = 1; i < points.length; i++) {
      const a = point(points[i - 1]),
        b = point(points[i]);
      total += Math.hypot(b.x - a.x, b.y - a.y);
    }
    const spacing = Math.max(22, total / 64);
    let untilNext = spacing * 0.5;
    const drops = [];
    for (let i = 1; i < points.length; i++) {
      const a = point(points[i - 1]),
        b = point(points[i]);
      const dx = b.x - a.x,
        dy = b.y - a.y;
      const length = Math.hypot(dx, dy);
      while (untilNext <= length && length > 0) {
        const t = untilNext / length;
        drops.push({
          x: a.x + dx * t,
          y: a.y + dy * t,
          size: 0.86 + (drops.length % 4) * 0.08,
        });
        untilNext += spacing;
      }
      untilNext -= length;
    }
    pathDrops.set(path, {
      length: points.length,
      lastX: last.x,
      lastY: last.y,
      drops,
    });
    return drops;
  }

  function contactShadow(ctx, x, y, radius, opacity = 0.3) {
    const shade = ctx.createRadialGradient(x, y, radius * 0.1, x, y, radius);
    shade.addColorStop(0, `rgba(13,24,8,${opacity})`);
    shade.addColorStop(0.6, `rgba(13,24,8,${opacity * 0.5})`);
    shade.addColorStop(1, "rgba(13,24,8,0)");
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, 0.57);
    ctx.translate(-x, -y);
    ctx.fillStyle = shade;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    ctx.restore();
  }

  function makeAntBody() {
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 96;
    const ctx = canvas.getContext("2d");
    ctx.scale(4, 4);
    ctx.translate(16, 12);
    ctx.shadowColor = "rgba(6,18,4,.5)";
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 2.5;
    ctx.shadowOffsetY = 4;
    ctx.fillStyle = "#172013";
    ellipse(ctx, -6.8, 0, 4.6, 3.1);
    ctx.fill();
    ellipse(ctx, -0.1, 0, 2.6, 1.7);
    ctx.fill();
    ellipse(ctx, 4.6, 0, 2.65, 2.15);
    ctx.fill();
    ctx.shadowColor = "transparent";
    const shell = (x, y, rx, ry, light, mid, dark) => {
      const gradient = ctx.createRadialGradient(
        x - rx * 0.35,
        y - ry * 0.56,
        0.05,
        x,
        y,
        rx * 1.08,
      );
      gradient.addColorStop(0, light);
      gradient.addColorStop(0.3, mid);
      gradient.addColorStop(0.8, dark);
      gradient.addColorStop(1, "#090f09");
      ctx.fillStyle = gradient;
      ellipse(ctx, x, y, rx, ry);
      ctx.fill();
    };
    shell(-3, 0, 1.15, 0.82, "#655c37", "#322a1c", "#14190f");
    shell(-6.9, 0, 4.5, 3.05, "#83764e", "#403b25", "#141a10");
    shell(-0.1, 0, 2.5, 1.6, "#947045", "#573e25", "#261d12");
    shell(4.55, 0, 2.65, 2.2, "#88714e", "#403623", "#171b10");
    ctx.lineWidth = 0.28;
    ctx.strokeStyle = "rgba(169,155,102,.65)";
    for (const offset of [-1.05, 0.8]) {
      ctx.beginPath();
      ctx.ellipse(-6.8 + offset, 0, 2.45, 2.78, 0, -1.25, 1.25);
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(238,229,185,.58)";
    ctx.lineWidth = 0.32;
    ctx.beginPath();
    ctx.ellipse(-6.8, -0.2, 3.7, 2.4, 0, 3.65, 4.95);
    ctx.stroke();
    ellipse(ctx, -0.8, -0.65, 1, 0.2);
    ctx.fillStyle = "rgba(230,208,152,.48)";
    ctx.fill();
    for (const side of [-1, 1]) {
      shell(4.65, side * 1.6, 0.65, 0.48, "#646c50", "#171d11", "#070c07");
    }
    return canvas;
  }
  const point = (p) => (Array.isArray(p) ? { x: p[0], y: p[1] } : p);

  function line(ctx, points) {
    ctx.beginPath();
    points.forEach((p, i) => {
      const q = point(p);
      if (i === 0) ctx.moveTo(q.x, q.y);
      else ctx.lineTo(q.x, q.y);
    });
  }

  function ellipse(ctx, x, y, rx, ry, angle = 0) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, angle, 0, TAU);
  }

  // Shared scratch coordinates avoid per-ant allocations as the colony grows.
  // Canvas drawing is synchronous, so one six-leg buffer serves every ant.
  const legRoots = [1.4, -0.2, -1.6];
  const legKnees = [4, -0.3, -4.5];
  const legFeet = [6.8, -1.2, -7.8];
  const legGeometry = new Float32Array(6 * 7);

  function drawAnt(ctx, x, y, scale = 1, angle = 0, phase = 0, detail = 1) {
    if (!antBody) antBody = makeAntBody();
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.scale(scale, scale);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Both detail levels retain six jointed legs and the alternating tripod gait.
    const stride = Math.sin(phase);
    let offset = 0;
    for (let side = -1; side <= 1; side += 2) {
      for (let leg = 0; leg < 3; leg++) {
        const swing = stride * (leg === 1 ? -1 : 1) * -side;
        const toeX = legFeet[leg] - swing * 1.3;
        legGeometry[offset] = legRoots[leg];
        legGeometry[offset + 1] = side;
        legGeometry[offset + 2] = legKnees[leg] + swing * 0.8;
        legGeometry[offset + 3] = side * (3.5 + Math.max(0, swing) * 0.3);
        legGeometry[offset + 4] = toeX;
        legGeometry[offset + 5] = side * (6.6 - Math.max(0, swing) * 0.8);
        legGeometry[offset + 6] = toeX + (leg === 0 ? 0.8 : -0.7);
        offset += 7;
      }
    }
    if (detail > 0) {
      ctx.strokeStyle = "rgba(15,22,8,.25)";
      ctx.lineWidth = 1.15;
      ctx.beginPath();
      for (let i = 0; i < 42; i += 7) {
        ctx.moveTo(legGeometry[i] + 0.7, legGeometry[i + 1] + 1.2);
        ctx.lineTo(legGeometry[i + 2] + 0.7, legGeometry[i + 3] + 1.2);
        ctx.lineTo(legGeometry[i + 4] + 0.7, legGeometry[i + 5] + 1.2);
      }
      ctx.stroke();
      ctx.strokeStyle = "#332c1c";
      ctx.lineWidth = 0.91;
      ctx.beginPath();
      for (let i = 0; i < 42; i += 7) {
        ctx.moveTo(legGeometry[i], legGeometry[i + 1]);
        ctx.lineTo(legGeometry[i + 2], legGeometry[i + 3]);
      }
      ctx.stroke();
      ctx.strokeStyle = "#1e2716";
      ctx.lineWidth = 0.57;
      ctx.beginPath();
      for (let i = 0; i < 42; i += 7) {
        ctx.moveTo(legGeometry[i + 2], legGeometry[i + 3]);
        ctx.lineTo(legGeometry[i + 4], legGeometry[i + 5]);
        ctx.lineTo(
          legGeometry[i + 6],
          legGeometry[i + 5] + legGeometry[i + 1] * 0.45,
        );
      }
      ctx.stroke();
    } else {
      // One batched stroke retains the leg silhouette at dense populations.
      ctx.strokeStyle = "#252d19";
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      for (let i = 0; i < 42; i += 7) {
        ctx.moveTo(legGeometry[i], legGeometry[i + 1]);
        ctx.lineTo(legGeometry[i + 2], legGeometry[i + 3]);
        ctx.lineTo(legGeometry[i + 4], legGeometry[i + 5]);
        ctx.lineTo(
          legGeometry[i + 6],
          legGeometry[i + 5] + legGeometry[i + 1] * 0.45,
        );
      }
      ctx.stroke();
    }
    ctx.drawImage(antBody, -16, -12, 32, 24);
    ctx.strokeStyle = "#202719";
    ctx.lineWidth = 0.55;
    ctx.beginPath();
    for (let side = -1; side <= 1; side += 2) {
      const twitch = Math.sin(phase * 0.42 + side * 0.8) * 0.48;
      ctx.moveTo(6.1, side * 1.1);
      ctx.lineTo(8.4, side * (3.1 + twitch));
      ctx.lineTo(11.1, side * (2.45 + twitch));
      if (detail > 0) {
        ctx.moveTo(6.6, side * 0.55);
        ctx.lineTo(7.9, side * 0.65);
        ctx.lineTo(7.55, side * 0.1);
      }
    }
    ctx.stroke();
    ctx.restore();
  }

  function leaf(ctx, x, y, length, angle, filled = false) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(
      length * 0.25,
      -length * 0.34,
      length * 0.84,
      -length * 0.24,
      length,
      0,
    );
    ctx.bezierCurveTo(
      length * 0.63,
      length * 0.26,
      length * 0.23,
      length * 0.29,
      0,
      0,
    );
    if (filled) ctx.fill();
    ctx.stroke();
    line(ctx, [
      [0, 0],
      [length * 0.86, -0.8],
    ]);
    ctx.stroke();
    ctx.lineWidth *= 0.7;
    for (let i = 1; i < 8; i++) {
      const xx = length * (0.08 + i * 0.095);
      line(ctx, [
        [xx, 0],
        [xx + length * 0.08, -length * 0.15 * Math.sin(i * 0.36)],
      ]);
      ctx.stroke();
      line(ctx, [
        [xx, 0],
        [xx + length * 0.06, length * 0.16 * Math.sin(i * 0.36)],
      ]);
      ctx.stroke();
    }
    ctx.restore();
  }

  function sprig(ctx, x, y, length, angle) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.strokeStyle = "#7c925b";
    ctx.fillStyle = "rgba(130,158,94,0.16)";
    ctx.lineWidth = 0.85;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(length * 0.12, -length * 0.5, -length * 0.07, -length);
    ctx.stroke();
    for (let i = 0; i < 5; i++) {
      const h = -length * (0.19 + i * 0.14);
      const leafLength = length * (0.3 - i * 0.025);
      leaf(ctx, length * 0.022, h, leafLength, -0.43 - i * 0.06, i % 2 === 0);
      leaf(
        ctx,
        length * 0.022,
        h - 4,
        leafLength * 0.81,
        Math.PI + 0.47,
        i % 2 === 1,
      );
    }
    ctx.restore();
  }

  function drawGround(ctx, width, height) {
    // The living leaf is a full-page CSS background. Keep the game surface
    // transparent so ants, tools, and trails sit directly on that same leaf.
    ctx.clearRect(0, 0, width, height);
  }

  function ring(ctx, x, y, radius, fill, stroke, time = 0) {
    ctx.save();
    ctx.fillStyle = fill;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 0.9;
    ellipse(ctx, x, y, radius, radius);
    ctx.fill();
    ctx.setLineDash([2, 7]);
    ctx.lineDashOffset = -time * 2;
    ctx.stroke();
    ctx.restore();
  }

  function pebble(ctx, x, y, radius) {
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = "#5d6844";
    ctx.fillStyle = "#acb38b";
    ctx.lineWidth = 1.3;
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(-radius * 0.88, radius * 0.32);
    ctx.bezierCurveTo(
      -radius * 1.13,
      -radius * 0.16,
      -radius * 0.44,
      -radius * 0.96,
      radius * 0.05,
      -radius * 0.87,
    );
    ctx.bezierCurveTo(
      radius * 0.57,
      -radius * 0.91,
      radius * 0.96,
      -radius * 0.33,
      radius * 0.94,
      radius * 0.17,
    );
    ctx.bezierCurveTo(
      radius * 0.96,
      radius * 0.61,
      radius * 0.31,
      radius * 0.92,
      -radius * 0.13,
      radius * 0.81,
    );
    ctx.bezierCurveTo(
      -radius * 0.61,
      radius * 0.88,
      -radius * 0.87,
      radius * 0.59,
      -radius * 0.88,
      radius * 0.32,
    );
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = "rgba(245,248,234,0.75)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-radius * 0.59, -radius * 0.25);
    ctx.quadraticCurveTo(
      -radius * 0.23,
      -radius * 0.74,
      radius * 0.3,
      -radius * 0.56,
    );
    ctx.stroke();
    ctx.strokeStyle = "rgba(40,38,31,0.42)";
    ctx.lineWidth = 0.65;
    for (let i = 0; i < 8; i++) {
      line(ctx, [
        [radius * (-0.5 + i * 0.16), radius * (0.6 - Math.abs(i - 4) * 0.04)],
        [radius * (-0.3 + i * 0.14), radius * (0.19 - Math.abs(i - 4) * 0.025)],
      ]);
      ctx.stroke();
    }
    for (let i = 0; i < 4; i++) {
      line(ctx, [
        [-radius * 0.48, radius * (0.25 + i * 0.1)],
        [radius * 0.48, radius * (0.05 + i * 0.1)],
      ]);
      ctx.stroke();
    }
    ctx.restore();
  }

  function lemon(ctx, x, y, radius) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-0.17);
    ellipse(ctx, 0, 0, radius, radius * 0.91);
    ctx.fillStyle = color.honey;
    ctx.strokeStyle = "#837044";
    ctx.lineWidth = 1;
    ctx.fill();
    ctx.stroke();
    ellipse(ctx, 0, 0, radius * 0.81, radius * 0.74);
    ctx.fillStyle = "#d7c793";
    ctx.fill();
    for (let i = 0; i < 7; i++) {
      const start = (i * TAU) / 7 + 0.08;
      const end = ((i + 1) * TAU) / 7 - 0.08;
      ctx.beginPath();
      ctx.moveTo(Math.cos(start) * 3.5, Math.sin(start) * 3.2);
      ctx.ellipse(0, 0, radius * 0.71, radius * 0.65, 0, start, end);
      ctx.closePath();
      ctx.fillStyle = i % 2 ? "#b6a064" : "#c4ad70";
      ctx.fill();
      ctx.strokeStyle = "rgba(83,70,37,0.45)";
      ctx.lineWidth = 0.55;
      for (let j = 0; j < 4; j++) {
        const a = start + (end - start) * (0.2 + j * 0.19);
        const inner = radius * (j % 2 ? 0.35 : 0.23);
        line(ctx, [
          [Math.cos(a) * inner, Math.sin(a) * inner * 0.91],
          [Math.cos(a) * radius * 0.63, Math.sin(a) * radius * 0.57],
        ]);
        ctx.stroke();
      }
    }
    ellipse(ctx, 0, 0, 2.4, 2.1);
    ctx.fillStyle = color.paper;
    ctx.fill();
    ctx.restore();
  }

  function cube(ctx, x, y, size, angle = 0) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.strokeStyle = "#77694e";
    ctx.lineWidth = 0.8;
    ctx.lineJoin = "round";
    const r = size / 2;
    line(ctx, [
      [-r, -r * 0.45],
      [0, -r],
      [r, -r * 0.45],
      [r, r * 0.66],
      [0, r * 1.14],
      [-r, r * 0.66],
      [-r, -r * 0.45],
    ]);
    ctx.fillStyle = "#f0e7cf";
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#c7b899";
    line(ctx, [
      [0, r * 0.1],
      [r, -r * 0.45],
      [r, r * 0.66],
      [0, r * 1.14],
    ]);
    ctx.closePath();
    ctx.fill();
    line(ctx, [
      [-r, -r * 0.45],
      [0, r * 0.1],
      [r, -r * 0.45],
    ]);
    ctx.stroke();
    line(ctx, [
      [0, r * 0.1],
      [0, r * 1.14],
    ]);
    ctx.stroke();
    ctx.strokeStyle = "rgba(85,75,49,0.6)";
    ctx.lineWidth = 0.45;
    for (let i = 1; i < 6; i++) {
      const xx = (r * i) / 6;
      line(ctx, [
        [xx, r * 0.12 - xx * 0.55],
        [xx, r * 1.1 - xx * 0.48],
      ]);
      ctx.stroke();
    }
    for (let i = 0; i < 3; i++) {
      line(ctx, [
        [0, r * (0.42 + i * 0.21)],
        [r, r * (0.1 + i * 0.21)],
      ]);
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(85,75,49,0.5)";
    [
      [-3, -2],
      [-1, -4],
      [2, -3],
      [-4, 1],
    ].forEach(([xx, yy]) => ctx.fillRect(xx, yy, 0.7, 0.7));
    ctx.restore();
  }

  function scentAura(ctx, x, y, radius, rgb, time) {
    const gradient = ctx.createRadialGradient(x, y, 12, x, y, radius);
    gradient.addColorStop(0, `rgba(${rgb},.14)`);
    gradient.addColorStop(0.55, `rgba(${rgb},.045)`);
    gradient.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = gradient;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    // A few drifting pollen flecks replace a hard mechanical radius circle.
    for (let i = 0; i < 11; i++) {
      const angle = i * 2.39996 + time * 0.035;
      const distance = radius * (0.25 + ((i * 0.19 + time * 0.025) % 0.64));
      const alpha = 0.2 + Math.sin(time * 0.8 + i) * 0.12;
      ctx.fillStyle = `rgba(${rgb},${alpha})`;
      ellipse(
        ctx,
        x + Math.cos(angle) * distance,
        y + Math.sin(angle) * distance,
        0.8,
        0.55,
        angle,
      );
      ctx.fill();
    }
  }

  function drawObject(ctx, obj, time = 0) {
    ctx.save();
    const r = obj.radius || obj.r || 25;
    if (obj.type === "pebble") {
      contactShadow(ctx, obj.x + 3, obj.y + r * 0.62, r * 1.35, 0.45);
      if (!drawSprite(ctx, "pebble", obj.x, obj.y, r * 2.85, -0.12))
        pebble(ctx, obj.x, obj.y, r);
    }
    if (obj.type === "lemon") {
      scentAura(ctx, obj.x, obj.y, obj.range || 110, "250,222,123", time);
      contactShadow(ctx, obj.x + 2, obj.y + r * 0.62, r * 1.22, 0.3);
      if (
        !drawSprite(ctx, "lemon", obj.x, obj.y, Math.min(r, 28) * 3.25, -0.14)
      )
        lemon(ctx, obj.x, obj.y, Math.min(r, 28));
    }
    if (obj.type === "honey") {
      scentAura(ctx, obj.x, obj.y, obj.range || 100, "249,212,124", time);
      contactShadow(ctx, obj.x + 2, obj.y + 12, 28, 0.27);
      if (!drawSprite(ctx, "honey", obj.x, obj.y, 76, -0.09)) {
        if (!scentDrop) scentDrop = makeScentDrop();
        ctx.drawImage(scentDrop, obj.x - 34, obj.y - 34, 68, 68);
      }
    }
    if (obj.type === "sugar") {
      scentAura(ctx, obj.x, obj.y, obj.range || 80, "249,237,190", -time);
      contactShadow(ctx, obj.x + 2, obj.y + 14, 29, 0.33);
      if (!drawSprite(ctx, "sugar", obj.x, obj.y, 67, 0.08)) {
        cube(ctx, obj.x - 7, obj.y + 2, 15, -0.12);
        cube(ctx, obj.x + 8, obj.y - 4, 15, 0.08);
        cube(ctx, obj.x + 1, obj.y + 12, 12, -0.15);
      }
      ctx.fillStyle = "rgba(246,242,218,.75)";
      [
        [-21, 13],
        [18, 15],
        [25, 4],
        [-16, -12],
      ].forEach(([x, y]) => {
        ctx.save();
        ctx.translate(obj.x + x, obj.y + y);
        ctx.rotate(x);
        ctx.fillRect(-0.8, -0.8, 1.5, 1.5);
        ctx.restore();
      });
    }
    ctx.restore();
  }

  function chalkPattern(ctx) {
    if (chalkPatterns.has(ctx)) return chalkPatterns.get(ctx);
    const tile = document.createElement("canvas");
    tile.width = tile.height = 64;
    const brush = tile.getContext("2d");
    let seed = 481;
    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    for (let i = 0; i < 620; i++) {
      const x = random() * 64;
      const y = random() * 64;
      brush.fillStyle = i % 3 ? "rgba(207,177,122,.3)" : "rgba(34,23,14,.4)";
      brush.fillRect(x, y, 0.45 + random() * 1.2, 0.4 + random() * 0.7);
    }
    const pattern = ctx.createPattern(tile, "repeat");
    chalkPatterns.set(ctx, pattern);
    return pattern;
  }

  function drawPath(ctx, path, time = 0) {
    const points = path.points || path;
    if (!points || points.length === 0) return;
    const type = path.type || "barrier";
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const trace = () => {
      line(ctx, points);
      if (points.length === 1) {
        const p = point(points[0]);
        ctx.lineTo(p.x + 0.01, p.y);
      }
    };
    if (type === "barrier") {
      const width = path.width || 12;
      ctx.save();
      ctx.translate(2.3, 3.3);
      trace();
      ctx.lineWidth = width + 5;
      ctx.strokeStyle = "rgba(36,35,13,.16)";
      ctx.stroke();
      ctx.lineWidth = width + 1.5;
      ctx.strokeStyle = "rgba(48,30,16,.35)";
      ctx.stroke();
      ctx.restore();
      trace();
      ctx.lineWidth = width + 1;
      ctx.strokeStyle = "#3e2d1e";
      ctx.stroke();
      ctx.save();
      ctx.translate(-0.7, -1.1);
      trace();
      ctx.lineWidth = width - 1;
      ctx.strokeStyle = "#745135";
      ctx.stroke();
      ctx.lineWidth = width * 0.58;
      ctx.strokeStyle = "#98764d";
      ctx.stroke();
      ctx.lineWidth = width - 1;
      ctx.strokeStyle = chalkPattern(ctx);
      ctx.stroke();
      ctx.translate(-0.5, -1.3);
      trace();
      ctx.lineWidth = 1.1;
      ctx.strokeStyle = "rgba(199,168,115,.7)";
      ctx.setLineDash([7, 2, 11, 4]);
      ctx.stroke();
      ctx.restore();
      // Short broken branch stubs and knots make connected strokes read as wood.
      ctx.setLineDash([]);
      ctx.lineWidth = 3.3;
      ctx.strokeStyle = "#65472c";
      ctx.beginPath();
      for (let i = 3; i < points.length - 1; i += 7) {
        const a = point(points[i - 1]);
        const b = point(points[i]);
        const dx = b.x - a.x,
          dy = b.y - a.y;
        const n = Math.hypot(dx, dy) || 1;
        const side = i % 2 ? -1 : 1;
        ctx.moveTo(b.x, b.y);
        ctx.lineTo(
          b.x + (dx / n) * 4 - (dy / n) * side * 8,
          b.y + (dy / n) * 4 + (dx / n) * side * 8,
        );
      }
      ctx.stroke();
      ctx.fillStyle = "#c1a06b";
      for (let i = 3; i < points.length - 1; i += 7) {
        const a = point(points[i - 1]);
        const b = point(points[i]);
        const dx = b.x - a.x,
          dy = b.y - a.y;
        const n = Math.hypot(dx, dy) || 1;
        const side = i % 2 ? -1 : 1;
        ellipse(
          ctx,
          b.x + (dx / n) * 4 - (dy / n) * side * 8,
          b.y + (dy / n) * 4 + (dx / n) * side * 8,
          1.5,
          1,
        );
        ctx.fill();
      }
    } else {
      trace();
      ctx.lineWidth = 5;
      ctx.strokeStyle = "rgba(239,205,109,.07)";
      ctx.stroke();
      ctx.lineWidth = 0.8;
      ctx.strokeStyle = "rgba(253,239,181,.55)";
      ctx.setLineDash([0.4, 5]);
      ctx.lineDashOffset = -time * 8;
      ctx.stroke();
      ctx.setLineDash([]);
      if (!scentDrop) scentDrop = makeScentDrop();
      const drops = dropletsFor(path, points);
      for (let i = 0; i < drops.length; i++) {
        const drop = drops[i];
        const size = 16 * drop.size;
        ctx.drawImage(
          scentDrop,
          drop.x - size / 2,
          drop.y - size / 2,
          size,
          size,
        );
      }
      const start = point(points[0]);
      contactShadow(ctx, start.x + 1, start.y + 8, 18, 0.3);
      drawSprite(ctx, "trail", start.x, start.y - 5, 48, -0.13);
      if (points.length > 1) {
        const end = point(points[points.length - 1]);
        let before = point(points[points.length - 2]);
        for (let i = points.length - 2; i >= 0; i--) {
          before = point(points[i]);
          if (Math.hypot(end.x - before.x, end.y - before.y) > 8) break;
        }
        const angle = Math.atan2(end.y - before.y, end.x - before.x);
        ctx.translate(end.x, end.y);
        ctx.rotate(angle);
        ctx.strokeStyle = "rgba(255,235,166,.8)";
        ctx.lineWidth = 1.1;
        line(ctx, [
          [-6, -3],
          [0, 0],
          [-6, 3],
        ]);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function drawCup(ctx, cup, time = 0, layer = "top") {
    if (!cup) return;
    const r = cup.radius || 70;
    if (!cupStarts.has(cup)) cupStarts.set(cup, time);
    const progress = Number.isFinite(cup.cardProgress)
      ? Math.max(0, Math.min(1, cup.cardProgress))
      : Math.max(0, Math.min(1, (time - cupStarts.get(cup)) / 0.55));
    const slide = 1 - Math.pow(1 - progress, 3);
    ctx.save();
    ctx.translate(cup.x, cup.y);
    if (layer === "bottom") {
      contactShadow(ctx, 5, 13, r * 1.24, 0.27);
      ctx.save();
      ctx.rotate(-0.065);
      const cardX = (1 - slide) * r * 2.45;
      ctx.shadowColor = "rgba(24,36,16,.25)";
      ctx.shadowBlur = 6;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 4;
      ctx.fillStyle = "#eee9d7";
      ctx.beginPath();
      ctx.roundRect(cardX - r * 1.14, -r * 1.1, r * 2.3, r * 2.21, 4);
      ctx.fill();
      ctx.shadowColor = "transparent";
      ctx.strokeStyle = "rgba(125,119,91,.3)";
      ctx.lineWidth = 0.8;
      ctx.stroke();
      // Small paper fibres and the card's thin edge stay below the ants.
      ctx.strokeStyle = "rgba(141,134,108,.17)";
      ctx.lineWidth = 0.5;
      for (let i = 0; i < 9; i++) {
        const xx = cardX + ((i * 23) % 130) - 64;
        const yy = ((i * 37) % 126) - 63;
        ctx.beginPath();
        ctx.moveTo(xx, yy);
        ctx.lineTo(xx + 5 + (i % 4), yy - 1);
        ctx.stroke();
      }
      ctx.restore();
    } else if (images.observation) {
      // Use the same true-alpha glass as the tool. Its clear centre leaves the
      // captured ants visible; the wider base sits just inside the card edges.
      drawSprite(ctx, "cup", -r * 0.035, -r * 0.09, r * 3.05, 0);
    } else {
      // A clear, tapered fallback keeps contained ants visible if artwork fails.
      const glass = ctx.createLinearGradient(-r, 0, r, 0);
      glass.addColorStop(0, "rgba(210,239,231,.14)");
      glass.addColorStop(0.18, "rgba(255,255,244,.035)");
      glass.addColorStop(0.55, "rgba(230,248,235,.015)");
      glass.addColorStop(0.87, "rgba(211,237,230,.045)");
      glass.addColorStop(1, "rgba(220,244,233,.18)");
      ctx.fillStyle = glass;
      ellipse(ctx, 0, 0, r, r);
      ctx.fill();
      ctx.strokeStyle = "rgba(44,78,65,.38)";
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.strokeStyle = "rgba(243,253,243,.85)";
      ctx.lineWidth = 1.7;
      ellipse(ctx, -0.8, -1.2, r - 1.5, r - 1.5);
      ctx.stroke();
      ctx.strokeStyle = "rgba(143,178,166,.5)";
      ctx.lineWidth = 0.9;
      ellipse(ctx, 0.3, 0.5, r - 4, r - 4);
      ctx.stroke();
      const topY = -r * 0.23;
      ctx.strokeStyle = "rgba(74,106,93,.32)";
      ctx.lineWidth = 1.6;
      ellipse(ctx, 0, topY, r * 0.73, r * 0.65);
      ctx.stroke();
      ctx.strokeStyle = "rgba(252,255,246,.72)";
      ctx.lineWidth = 1.2;
      ellipse(ctx, -0.8, topY - 0.8, r * 0.7, r * 0.62);
      ctx.stroke();
      ctx.strokeStyle = "rgba(255,255,245,.66)";
      ctx.lineCap = "round";
      ctx.lineWidth = r * 0.043;
      ctx.beginPath();
      ctx.ellipse(-1, -1, r - 7, r - 7, 0, 3.45, 4.06);
      ctx.stroke();
      ctx.lineWidth = r * 0.022;
      ctx.beginPath();
      ctx.ellipse(1, 1, r - 8, r - 8, 0, 0.28, 0.86);
      ctx.stroke();
      ctx.strokeStyle = "rgba(214,241,231,.42)";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(-r * 0.73, topY);
      ctx.quadraticCurveTo(-r * 0.93, r * 0.2, -r * 0.83, r * 0.5);
      ctx.moveTo(r * 0.73, topY);
      ctx.quadraticCurveTo(r * 0.94, r * 0.2, r * 0.83, r * 0.5);
      ctx.stroke();
    }
    ctx.restore();
  }

  function brushFallback(ctx, x, y, angle) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    const wood = ctx.createLinearGradient(0, -46, 5, 13);
    wood.addColorStop(0, "#d1a26a");
    wood.addColorStop(0.5, "#a97a45");
    wood.addColorStop(1, "#725335");
    ctx.strokeStyle = wood;
    ctx.lineWidth = 8;
    ctx.lineCap = "round";
    line(ctx, [
      [0, -47],
      [0, -9],
    ]);
    ctx.stroke();
    ctx.fillStyle = "#b8bcb1";
    ctx.fillRect(-5, -12, 10, 13);
    ctx.lineWidth = 1;
    for (let i = 0; i < 12; i++) {
      ctx.strokeStyle = i % 3 ? "#d8bf89" : "#8e7854";
      ctx.beginPath();
      ctx.moveTo((i - 5.5) * 0.7, 0);
      ctx.quadraticCurveTo((i - 5.5) * 1.3, 11, (i - 5.5) * 1.7, 24 + (i % 4));
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawCursor(ctx, tool, x, y, time = 0, active = false) {
    ctx.save();
    ctx.globalAlpha = active ? 0.98 : 0.82;
    ctx.strokeStyle = "#f7f1cf";
    ctx.lineWidth = 1;
    if (tool === "pebble") {
      contactShadow(ctx, x + 2, y + 16, 34, 0.4);
      if (!drawSprite(ctx, tool, x, y, 77, -0.12)) pebble(ctx, x, y, 25);
    } else if (tool === "lemon") {
      contactShadow(ctx, x + 2, y + 13, 29, 0.3);
      if (!drawSprite(ctx, tool, x, y, 81, -0.14)) lemon(ctx, x, y, 23);
    } else if (tool === "sugar") {
      contactShadow(ctx, x + 2, y + 12, 24, 0.3);
      if (!drawSprite(ctx, tool, x, y, 67, 0.08)) cube(ctx, x, y, 17, -0.08);
    } else if (tool === "honey") {
      contactShadow(ctx, x + 2, y + 12, 26, 0.25);
      if (!drawSprite(ctx, tool, x, y, 76, -0.09)) {
        if (!scentDrop) scentDrop = makeScentDrop();
        ctx.drawImage(scentDrop, x - 34, y - 34, 68, 68);
      }
    } else if (tool === "cup") {
      if (!active) {
        ctx.globalAlpha = 0.48;
        ctx.strokeStyle = "#e6f2db";
        ctx.lineWidth = 1.2;
        ctx.setLineDash([5, 7]);
        ellipse(ctx, x, y, 70, 70);
        ctx.stroke();
        ctx.setLineDash([]);
        drawSprite(ctx, "cup", x + 45, y - 46, 46, 0);
      }
    } else if (tool === "brush") {
      const sweep = active ? Math.sin(time * 18) * 0.055 : 0;
      contactShadow(ctx, x + 16, y - 9, 31, 0.21);
      if (!drawSprite(ctx, "brush", x + 22, y - 27, 102, -0.05 + sweep))
        brushFallback(ctx, x + 12, y - 18, 0.72 + sweep);
      if (active) {
        ctx.strokeStyle = "rgba(245,235,199,.28)";
        ctx.lineWidth = 0.8;
        for (let i = 0; i < 3; i++) {
          const shift = (time * 22 + i * 5) % 17;
          line(ctx, [
            [x - 12 - shift, y + 5 + i * 4],
            [x - 3 - shift, y + 8 + i * 4],
          ]);
          ctx.stroke();
        }
      }
    } else if (tool === "breeze") {
      ring(
        ctx,
        x,
        y,
        74,
        "rgba(193,233,219,.025)",
        "rgba(221,247,223,.23)",
        time,
      );
      const flutter =
        Math.sin(time * (active ? 22 : 3)) * (active ? 0.23 : 0.035);
      contactShadow(ctx, x + 4, y + 19, 29, active ? 0.3 : 0.22);
      const hasFan = drawSprite(ctx, tool, x, y + 3, 76, -0.25 + flutter);
      ctx.strokeStyle = "rgba(216,240,219,.8)";
      ctx.lineWidth = active ? 1.25 : 0.85;
      for (let i = 0; i < 3; i++) {
        const drift = active ? (time * 30 + i * 11) % 30 : 0;
        const xx = x + (hasFan ? 17 : -10) + drift;
        const yy = y - 17 + i * 13;
        ctx.beginPath();
        ctx.moveTo(xx, yy);
        ctx.bezierCurveTo(xx + 11, yy + 3, xx + 23, yy - 4, xx + 34, yy);
        ctx.bezierCurveTo(xx + 42, yy + 2, xx + 40, yy - 7, xx + 34, yy - 6);
        ctx.stroke();
      }
    } else if (tool === "barrier") {
      contactShadow(ctx, x + 13, y + 3, 22, 0.25);
      if (!drawSprite(ctx, tool, x + 12, y - 11, 57, -0.35)) {
        ctx.strokeStyle = "#735334";
        ctx.lineWidth = 8;
        ctx.lineCap = "round";
        line(ctx, [
          [x, y + 2],
          [x + 24, y - 27],
        ]);
        ctx.stroke();
        ctx.lineWidth = 3;
        line(ctx, [
          [x + 12, y - 12],
          [x + 5, y - 23],
        ]);
        ctx.stroke();
      }
      ctx.fillStyle = "rgba(246,218,172,.8)";
      ellipse(ctx, x, y, 2, 2);
      ctx.fill();
    } else if (tool === "trail") {
      contactShadow(ctx, x + 9, y + 5, 19, 0.25);
      if (!drawSprite(ctx, tool, x + 8, y - 11, 55, -0.25)) {
        ctx.strokeStyle = "#edf1c6";
        ellipse(ctx, x, y, 5, 5);
        ctx.stroke();
      }
    } else {
      ctx.strokeStyle = "#edf1c6";
      ctx.setLineDash([3, 5]);
      ellipse(ctx, x, y, 28, 28);
      ctx.stroke();
      line(ctx, [
        [x - 4, y],
        [x + 4, y],
      ]);
      ctx.stroke();
    }
    ctx.restore();
  }

  const svg = (body) =>
    `<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><g stroke-linecap="round" stroke-linejoin="round">${body}</g></svg>`;
  const icons = {
    barrier: svg(
      '<path d="M8 30c6-8 5-16 12-17s8 3 12-4" stroke="#9f482e" stroke-width="7"/><path d="M7 29c7-8 6-15 13-15s9 2 12-3M10 31c5-7 6-16 11-15" stroke="#f5f8ea" stroke-width=".7" opacity=".6"/>',
    ),
    pebble: svg(
      '<path d="M8 25C5 20 10 9 19 8s15 6 15 13-9 12-15 11-9-3-11-7Z" fill="#acb38b" stroke="#5d6844" stroke-width="1.4"/><path d="M12 18c2-5 7-7 12-5" stroke="#f5f8ea"/><path d="m23 28 3-5m1 4 3-5" stroke="#5d6844" opacity=".5"/><path d="m10 23 4-5m-1 8 5-7m-2 10 6-8m-2 9 5-7m-14 2 13 3m-12-6 15 3" stroke="#5d6844" stroke-width=".6"/>',
    ),
    lemon: svg(
      '<ellipse cx="20" cy="20" rx="14" ry="13" fill="#b59650" stroke="#837044"/><ellipse cx="20" cy="20" rx="11" ry="10" fill="#d7c793"/><path d="m20 11 1 7 7-4-6 5 8 2-8 1 4 7-6-6-5 6 3-7-8-1 8-2-5-5 6 4Z" fill="#b59650"/><circle cx="20" cy="20" r="2" fill="#f5f8ea"/><path d="m22 13 1 4m1-3 1 2m3 2-4 1m4 4-4-1m-2 5-1-4m-4 4 1-4m-5-1 4-1m-4-4 4 2m-1-6 2 4" stroke="#837044" stroke-width=".55"/>',
    ),
    sugar: svg(
      '<circle cx="20" cy="22" r="16" fill="#d7bb99" opacity=".65"/><path d="m7 15 8-4 8 4v10l-8 4-8-4Zm15-4 6-3 7 4v9l-7 4-6-4Z" fill="#f0e7cf" stroke="#77694e"/><path d="m15 19 8-4v10l-8 4Zm13-3 7-4v9l-7 4Z" fill="#c7b899"/><path d="m7 15 8 4 8-4m-8 4v10m7-18 6 5 7-4m-7 4v9" stroke="#77694e"/><path d="m13 27 7-3 7 4v8l-7 3-7-4Z" fill="#f0e7cf" stroke="#77694e"/><path d="m13 27 7 4 7-3m-7 3v8" stroke="#77694e"/><path d="m17 19 1 8m1-9 1 8m1-9 1 8m8-8 1 7m1-8 1 7m-10 7v7m2-8v7m-8-11 6-1m-6-2 6-1" stroke="#77694e" stroke-width=".5"/>',
    ),
    trail: svg(
      '<path d="M7 30C5 14 22 31 23 18s7-9 10-10" stroke="#697c43" stroke-width="2.5" stroke-dasharray="1 5"/><path d="m26 7 7 1-1 7" stroke="#697c43" stroke-width="1.6"/>',
    ),
    breeze: svg(
      '<path d="M5 13h19c10 0 9-9 3-8M8 21h23c7 0 6-8 1-7M5 29h16c10 0 9 9 3 8" stroke="#697c43" stroke-width="1.8"/><path d="M8 17h8M12 25h11" stroke="#697c43" opacity=".35"/>',
    ),
    eraser: svg(
      '<path d="m9 29-3-5a3 3 0 0 1 0-4L22 6a3 3 0 0 1 4 0l8 8a3 3 0 0 1 0 4L22 30H10Z" fill="#f5f8ea" stroke="#252b21" stroke-width="1.3"/><path d="m13 14 13 13 8-9a3 3 0 0 0 0-4l-8-8a3 3 0 0 0-4 0Z" fill="#d7bb99"/><path d="m13 14 13 13M8 34h24" stroke="#252b21" stroke-width="1.3"/>',
    ),
  };

  icons.barrier = svg(
    '<path d="m7 33 13-14L32 7M19 21l-4-12" stroke="#765536" stroke-width="6"/><path d="m8 31 11-12L30 8" stroke="#b3925f" stroke-width="1.4"/>',
  );
  icons.honey = svg(
    '<path d="M7 29c2-9 8-18 18-20l8 6c-1 11-13 18-26 14Z" fill="#627d39"/><ellipse cx="21" cy="22" rx="10" ry="7" fill="#bc7b23" stroke="#e7ba4a"/><ellipse cx="18" cy="19" rx="4" ry="1.7" fill="#fff0b5"/>',
  );
  icons.cup = svg(
    '<path d="M11 9h18l5 23c-5 5-23 5-28 0Z" fill="#e4f1e8" fill-opacity=".12" stroke="#b2c6b9" stroke-width="1.7"/><ellipse cx="20" cy="9" rx="9" ry="4" stroke="#e7eee2"/><ellipse cx="20" cy="32" rx="14" ry="5" stroke="#d7e4d7"/>',
  );
  icons.brush = svg(
    '<path d="m29 5-11 18" stroke="#b68a53" stroke-width="7"/><path d="m15 20 7 4" stroke="#bcc3b7" stroke-width="7"/><path d="m15 22-8 11 10 2 7-10Z" fill="#d3bd87"/><path d="m16 24-5 9m8-7-4 9m7-9-4 8" stroke="#8e7854" stroke-width=".8"/>',
  );
  const vectorIcons = { ...icons };
  const spriteIcon = (column, row, pack = "observation") =>
    `<svg viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><image href="${toolAssets[pack]}" width="${pack === "legacy" ? 1024 : 1536}" height="1024" x="${-column * 512}" y="${-row * 512}"/></svg>`;
  Object.entries(observationCells).forEach(([key, cell]) => {
    icons[key] = spriteIcon(...cell);
  });
  ready.then(() => {
    if (images.observation) return;
    for (const key of Object.keys(observationCells)) {
      if (key === "pebble" || key === "sugar") {
        icons[key] = images.tools
          ? spriteIcon(...spriteCells[key], "current")
          : images.legacyTools
            ? spriteIcon(...legacyCells[key], "legacy")
            : vectorIcons[key];
      } else icons[key] = vectorIcons[key];
    }
  });

  // An original engraved specimen for the title-page vignette. The hatchwork
  // follows the body contours, as it would in a copperplate field illustration.
  const abdomenHatch = Array.from({ length: 20 }, (_, i) => {
    const x = 36 + i * 3;
    return `<path d="M${x} 63 Q${x - 13} 85 ${x + 3} 109"/>`;
  }).join("");
  const bodyHatch = Array.from({ length: 16 }, (_, i) => {
    const y = 47 + i * 3;
    return `<path d="M105 ${y} Q137 ${y + 12} 172 ${y - 7}"/>`;
  }).join("");
  const bodyCrosshatch = Array.from({ length: 10 }, (_, i) => {
    const x = 113 + i * 5;
    return `<path d="M${x} 44 Q${x - 10} 70 ${x + 8} 91"/>`;
  }).join("");
  const legSpines = [
    [88, 44, -3, -3],
    [84, 42, -2, -4],
    [80, 40, -2, -4],
    [75, 38, -2, -4],
    [102, 118, -4, 0],
    [101, 122, -4, 0],
    [99, 126, -4, 1],
    [151, 113, 3, -3],
    [156, 115, 3, -3],
    [161, 117, 3, -3],
    [153, 88, 1, -4],
    [159, 88, 1, -4],
    [165, 87, 0, -4],
    [127, 37, 3, -2],
    [126, 32, 3, -2],
    [126, 27, 3, -2],
    [69, 114, -3, -2],
    [66, 117, -3, -2],
    [63, 121, -3, -2],
  ]
    .map(([x, y, dx, dy]) => `<path d="M${x} ${y}l${dx} ${dy}"/>`)
    .join("");

  icons.antplate = `<svg viewBox="0 0 220 160" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <defs>
      <clipPath id="ant-plate-abdomen"><path d="M37 80C40 64 57 59 75 64C87 67 94 75 94 85C93 97 79 109 60 107C42 106 33 94 37 80Z"/></clipPath>
      <clipPath id="ant-plate-body"><path d="M106 78C108 66 119 63 130 68C136 69 139 70 141 67C138 60 143 48 153 47C165 44 174 52 173 62C173 71 165 79 155 78L144 76C135 86 121 91 111 85Z"/></clipPath>
    </defs>
    <g stroke="#252b21" stroke-linecap="round" stroke-linejoin="round">
      <g stroke-width=".55" opacity=".60">
        <path d="M17 124h36M22 127h20M184 108h20M190 111h12"/>
        <path d="M20 51h23l11 9M182 36h19M179 38l-12 10" stroke-dasharray="1 2.5"/>
      </g>
      <g fill="#252b21" stroke-width=".8">
        <path d="m115 72-23-24-25-12-22-12 21 15 24 12 22 25Z"/>
        <path d="m127 70-4-28 3-23 4-7-6 6-4 25 3 28Z"/>
        <path d="m135 74 23 16 25-2 16 8-15-11-25 2-21-17Z"/>
        <path d="m130 80 16 29 30 13 17 14-15-16-28-14-16-29Z"/>
        <path d="m118 83-9 23-9 27-15 9 17-7 10-28 11-22Z"/>
        <path d="m110 83-28 19-19 20-20 8 22-6 19-19 28-18Z"/>
      </g>
      <g stroke-width=".45" opacity=".8">${legSpines}</g>
      <g stroke="#f5f8ea" stroke-width=".5">
        <path d="m114 73-23-24-23-12M125 69l-3-26 4-24M137 74l22 15 24-2M132 81l16 26 29 14M120 84l-10 23-9 26M111 85l-28 19-19 19"/>
      </g>
      <path d="M88 82C95 77 99 77 101 81C104 75 108 76 110 81L112 85C105 84 103 85 101 85C96 88 92 87 88 87Z" fill="#252b21" stroke-width="1.1"/>
      <path d="M96 79q-2-7 2-8 3 0 3 8M104 78q0-6 3-5 2 0 2 5" fill="#252b21" stroke-width=".6"/>
      <path d="M37 80C40 64 57 59 75 64C87 67 94 75 94 85C93 97 79 109 60 107C42 106 33 94 37 80Z" fill="#252b21" stroke-width="1.2"/>
      <g clip-path="url(#ant-plate-abdomen)" stroke="#f5f8ea" stroke-width=".65" opacity=".85">${abdomenHatch}
        <path d="M36 73Q57 60 85 74M35 78Q59 64 90 80M34 83Q61 68 93 85M35 88Q61 73 92 89M38 93Q63 80 89 95M44 99Q65 86 85 101" stroke-width=".42"/>
      </g>
      <path d="M39 78C46 64 65 63 79 70" stroke="#f5f8ea" stroke-width="1.2"/>
      <path d="M106 78C108 66 119 63 130 68C136 69 139 70 141 67C138 60 143 48 153 47C165 44 174 52 173 62C173 71 165 79 155 78L144 76C135 86 121 91 111 85Z" fill="#f5f8ea" stroke-width="1.3"/>
      <g clip-path="url(#ant-plate-body)" stroke-width=".65">${bodyHatch}${bodyCrosshatch}
        <path d="M106 82q13 9 29-3M107 80q13 9 29-3M107 78q13 9 29-3M142 70q19 7 30-10M143 72q18 7 29-9M144 74q16 7 28-9"/>
      </g>
      <path d="M110 74q7-9 16-4M144 56q8-9 18-5" stroke="#f5f8ea" stroke-width="1.1"/>
      <path d="M134 72q5 2 8 1M137 78q-6 4-7 6" stroke-width="1"/>
      <ellipse cx="160" cy="56" rx="3.4" ry="4.2" transform="rotate(24 160 56)" fill="#252b21"/>
      <path d="m159 53 1 1" stroke="#f5f8ea" stroke-width=".8"/>
      <path d="M169 54 182 38 204 27M170 58 190 48 207 49" stroke-width="1.4"/>
      <path d="M171 53 182 36 204 25M171 57 190 46 207 47" stroke-width=".4"/>
      <path d="m204 27 3-3m0 25 3-1" stroke-width="2.1"/>
      <path d="m172 65 8-2 3 5-8 4 4-5-6 1M170 72l5 3 5-2-5 5-6-3" fill="#252b21" stroke-width=".7"/>
      <path d="m41 70-2-3m7 0-2-4m8 1-1-4m7 3v-4m7 5 1-4m8 6 1-3m10 9 3-2M42 101l-2 3m10 1-1 4m9-2v4m10-4 1 4m8-7 2 3" stroke-width=".5"/>
    </g>
    <g fill="#6e6347" font-family="Georgia,serif" font-style="italic" font-size="7">
      <text x="17" y="47">a.</text><text x="200" y="35">b.</text>
      <text x="99" y="153" font-style="normal" letter-spacing="1.5">FIG. I</text>
    </g>
  </svg>`;

  window.AntArt = {
    ready,
    drawAnt,
    drawGround,
    drawObject,
    drawCup,
    drawPath,
    drawCursor,
    icons,
  };
})();
