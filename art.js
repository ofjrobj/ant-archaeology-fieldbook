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
  const ready = Promise.all(
    [
      ["ground", "assets/leaf-surface.png"],
      ["tools", "assets/tool-sprites.png"],
    ].map(
      ([key, url]) =>
        new Promise((resolve) => {
          const image = new Image();
          image.onload = () => {
            images[key] = image;
            resolve(true);
          };
          image.onerror = () => resolve(false);
          image.src = url;
        }),
    ),
  ).then(([leaf, sprites]) => ({ leaf, sprites }));
  let antBody;
  const chalkPatterns = new WeakMap();
  const spriteCells = {
    barrier: [0, 0],
    pebble: [1, 0],
    lemon: [0, 1],
    sugar: [1, 1],
  };

  function drawSprite(ctx, type, x, y, size, angle = 0) {
    const image = images.tools;
    if (!image || !spriteCells[type]) return false;
    const [column, row] = spriteCells[type];
    const cellWidth = image.naturalWidth / 2;
    const cellHeight = image.naturalHeight / 2;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.drawImage(
      image,
      column * cellWidth,
      row * cellHeight,
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

  function drawAnt(ctx, x, y, scale = 1, angle = 0, phase = 0) {
    if (!antBody) antBody = makeAntBody();
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.scale(scale, scale);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Six jointed legs use an alternating tripod gait; the body is cached.
    const roots = [1.4, -0.2, -1.6];
    const knees = [4.0, -0.3, -4.5];
    const feet = [6.8, -1.2, -7.8];
    const legs = [];
    for (const side of [-1, 1]) {
      for (let leg = 0; leg < 3; leg++) {
        const swing = Math.sin(
          phase + (leg === 1 ? Math.PI : 0) + (side === 1 ? Math.PI : 0),
        );
        const toeX = feet[leg] - swing * 1.3;
        const toeY = side * (6.6 - Math.max(0, swing) * 0.8);
        legs.push({
          rootX: roots[leg],
          side,
          kneeX: knees[leg] + swing * 0.8,
          kneeY: side * (3.5 + Math.max(0, swing) * 0.3),
          toeX,
          toeY,
          tipX: toeX + (leg === 0 ? 0.8 : -0.7),
        });
      }
    }
    ctx.strokeStyle = "rgba(15,22,8,.25)";
    ctx.lineWidth = 1.15;
    ctx.beginPath();
    for (const leg of legs) {
      ctx.moveTo(leg.rootX + 0.7, leg.side + 1.2);
      ctx.lineTo(leg.kneeX + 0.7, leg.kneeY + 1.2);
      ctx.lineTo(leg.toeX + 0.7, leg.toeY + 1.2);
    }
    ctx.stroke();
    ctx.strokeStyle = "#332c1c";
    ctx.lineWidth = 0.91;
    ctx.beginPath();
    for (const leg of legs) {
      ctx.moveTo(leg.rootX, leg.side);
      ctx.lineTo(leg.kneeX, leg.kneeY);
    }
    ctx.stroke();
    ctx.strokeStyle = "#1e2716";
    ctx.lineWidth = 0.57;
    ctx.beginPath();
    for (const leg of legs) {
      ctx.moveTo(leg.kneeX, leg.kneeY);
      ctx.lineTo(leg.toeX, leg.toeY);
      ctx.lineTo(leg.tipX, leg.toeY + leg.side * 0.45);
    }
    ctx.stroke();
    ctx.drawImage(antBody, -16, -12, 32, 24);
    ctx.strokeStyle = "#202719";
    ctx.lineWidth = 0.52;
    for (const side of [-1, 1]) {
      const twitch = Math.sin(phase * 0.42 + side * 0.8) * 0.48;
      line(ctx, [
        [6.1, side * 1.1],
        [8.4, side * (3.1 + twitch)],
        [11.1, side * (2.45 + twitch)],
      ]);
      ctx.stroke();
      ctx.lineWidth = 0.6;
      line(ctx, [
        [6.6, side * 0.55],
        [7.9, side * 0.65],
        [7.55, side * 0.1],
      ]);
      ctx.stroke();
    }
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
    ctx.save();
    if (images.ground) {
      const image = images.ground;
      const cover = Math.max(
        width / image.naturalWidth,
        height / image.naturalHeight,
      );
      const sourceW = width / cover;
      const sourceH = height / cover;
      ctx.drawImage(
        image,
        (image.naturalWidth - sourceW) / 2,
        (image.naturalHeight - sourceH) / 2,
        sourceW,
        sourceH,
        0,
        0,
        width,
        height,
      );
    } else {
      const green = ctx.createLinearGradient(0, 0, width, height);
      green.addColorStop(0, "#c1cf76");
      green.addColorStop(0.4, "#a4b965");
      green.addColorStop(1, "#668941");
      ctx.fillStyle = green;
      ctx.fillRect(0, 0, width, height);
      ctx.strokeStyle = "rgba(227,231,165,.2)";
      ctx.lineWidth = 6;
      line(ctx, [
        [0, height],
        [width, 0],
      ]);
      ctx.stroke();
      ctx.lineWidth = 1.3;
      for (let i = 1; i < 14; i++) {
        const x = (width * i) / 14;
        const y = height * (1 - i / 14);
        line(ctx, [
          [x, y],
          [x - width * 0.12, 0],
        ]);
        ctx.stroke();
        line(ctx, [
          [x, y],
          [x + width * 0.2, height],
        ]);
        ctx.stroke();
      }
    }
    const light = ctx.createLinearGradient(0, 0, width, height);
    light.addColorStop(0, "rgba(251,244,191,.07)");
    light.addColorStop(0.48, "rgba(251,244,191,0)");
    light.addColorStop(1, "rgba(21,46,14,.08)");
    ctx.fillStyle = light;
    ctx.fillRect(0, 0, width, height);

    // The field itself stays free of UI; small edge notches hint at escape.
    [
      [width / 2, 18, -Math.PI / 2],
      [width - 18, height / 2, 0],
      [width / 2, height - 18, Math.PI / 2],
      [18, height / 2, Math.PI],
    ].forEach(([x, y, angle]) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.strokeStyle = "rgba(246,248,207,.62)";
      ctx.lineWidth = 1.4;
      line(ctx, [
        [-4, -4],
        [0, 0],
        [-4, 4],
      ]);
      ctx.stroke();
      ctx.restore();
    });
    ctx.restore();
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
      brush.fillStyle = i % 3 ? "rgba(255,214,163,.35)" : "rgba(63,29,13,.28)";
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
      trace();
      ctx.lineWidth = width + 7;
      ctx.strokeStyle = "rgba(174,92,51,.12)";
      ctx.stroke();
      ctx.lineWidth = width + 2;
      ctx.strokeStyle = "rgba(129,61,34,.38)";
      ctx.stroke();
      ctx.lineWidth = width - 1;
      ctx.strokeStyle = "#b6754d";
      ctx.stroke();
      ctx.strokeStyle = chalkPattern(ctx);
      ctx.stroke();
      ctx.lineWidth = 0.65;
      ctx.strokeStyle = "rgba(251,211,162,.42)";
      ctx.setLineDash([1, 3, 5, 2]);
      for (const shift of [-2.4, 1.8]) {
        ctx.save();
        ctx.translate(shift * 0.4, shift);
        trace();
        ctx.stroke();
        ctx.restore();
      }
    } else {
      trace();
      ctx.lineWidth = 10;
      ctx.strokeStyle = "rgba(211,237,207,.08)";
      ctx.stroke();
      ctx.lineWidth = 3.4;
      ctx.strokeStyle = "rgba(32,64,31,.2)";
      ctx.setLineDash([0.3, 9]);
      ctx.lineDashOffset = -time * 9;
      ctx.stroke();
      ctx.strokeStyle = "#ecedb8";
      ctx.lineWidth = 1.8;
      ctx.stroke();
      ctx.setLineDash([]);
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
        ctx.lineWidth = 1.2;
        line(ctx, [
          [-7, -3.5],
          [0, 0],
          [-7, 3.5],
        ]);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function drawCursor(ctx, tool, x, y, time = 0) {
    ctx.save();
    ctx.globalAlpha = 0.72;
    ctx.strokeStyle = "#f7f1cf";
    ctx.lineWidth = 1;
    if (tool === "pebble") {
      contactShadow(ctx, x + 2, y + 16, 34, 0.4);
      if (!drawSprite(ctx, tool, x, y, 77, -0.12)) pebble(ctx, x, y, 25);
    } else if (tool === "lemon") {
      if (!drawSprite(ctx, tool, x, y, 81, -0.14)) lemon(ctx, x, y, 23);
    } else if (tool === "sugar") {
      if (!drawSprite(ctx, tool, x, y, 67, 0.08)) cube(ctx, x, y, 17, -0.08);
    } else if (tool === "breeze") {
      ring(
        ctx,
        x,
        y,
        74,
        "rgba(193,233,219,.035)",
        "rgba(221,247,223,.3)",
        time,
      );
      ctx.strokeStyle = "#d0eada";
      ctx.lineWidth = 1.1;
      for (let i = 0; i < 3; i++) {
        const yy = y + (i - 1) * 12;
        ctx.beginPath();
        ctx.moveTo(x - 24, yy);
        ctx.bezierCurveTo(x - 9, yy + 5, x + 8, yy - 5, x + 20, yy);
        ctx.bezierCurveTo(x + 32, yy + 4, x + 30, yy - 11, x + 22, yy - 9);
        ctx.stroke();
      }
    } else {
      const radius = tool === "eraser" ? 28 : tool === "trail" ? 5 : 7;
      ctx.strokeStyle = tool === "barrier" ? "#f1bb83" : "#edf1c6";
      if (tool === "eraser") ctx.setLineDash([3, 5]);
      ellipse(ctx, x, y, radius, radius);
      ctx.stroke();
      if (tool === "eraser") {
        line(ctx, [
          [x - 4, y],
          [x + 4, y],
        ]);
        ctx.stroke();
      }
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

  const spriteIcon = (column, row) =>
    `<svg viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><image href="assets/tool-sprites.png" width="1024" height="1024" x="${-column * 512}" y="${-row * 512}"/></svg>`;
  Object.entries(spriteCells).forEach(([key, cell]) => {
    icons[key] = spriteIcon(...cell);
  });
  icons.trail = svg(
    '<path d="M6 31c-1-11 8-6 13-12S22 9 33 7" stroke="#e6d7a0" stroke-width="2.2" stroke-dasharray=".6 5"/><path d="m26 6 7 1-2 6" stroke="#f5e9ba" stroke-width="1.1"/><circle cx="8" cy="29" r="3" fill="#e6d7a0" opacity=".14"/><circle cx="21" cy="17" r="4" fill="#e6d7a0" opacity=".12"/>',
  );
  icons.breeze = svg(
    '<path d="M5 13h19c10 0 9-9 3-8M8 21h23c7 0 6-8 1-7M5 29h16c10 0 9 9 3 8" stroke="#c5dfd5" stroke-width="1.5"/><path d="M8 17h8M12 25h11" stroke="#c5dfd5" stroke-width=".8" opacity=".4"/>',
  );

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
    drawPath,
    drawCursor,
    icons,
  };
})();
