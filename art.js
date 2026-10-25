/* Original botanical drawings and anatomically articulated ants. */
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
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.scale(scale, scale);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = color.ink;
    ctx.fillStyle = color.ink;
    ctx.lineWidth = 0.7;

    // Alternating tripods: front and rear legs move opposite the middle leg.
    const legRoots = [1.4, -0.2, -1.6];
    const legKnees = [4.0, -0.3, -4.5];
    const legFeet = [6.8, -1.2, -7.8];
    for (let side = -1; side <= 1; side += 2) {
      for (let leg = 0; leg < 3; leg++) {
        const swing = Math.sin(
          phase + (leg === 1 ? Math.PI : 0) + (side === 1 ? Math.PI : 0),
        );
        const kneeX = legKnees[leg] + swing * 0.75;
        const toeX = legFeet[leg] - swing * 1.25;
        const toeY = side * (6.7 - Math.max(0, swing) * 0.65);
        line(ctx, [
          [legRoots[leg], side * 1.0],
          [kneeX, side * 3.7],
          [toeX, toeY],
          [toeX + (leg === 0 ? 0.9 : -0.7), toeY + side * 0.4],
        ]);
        ctx.stroke();
      }
    }

    // A narrow petiole connects the large gaster to the muscular thorax.
    ctx.fillStyle = "#302f24";
    ellipse(ctx, -3.1, 0, 1.1, 0.85);
    ctx.fill();
    ctx.fillStyle = "#20251d";
    ellipse(ctx, -7.0, 0, 4.5, 3.05, 0.02);
    ctx.fill();
    ctx.fillStyle = "#39382a";
    ellipse(ctx, -0.1, 0, 2.4, 1.65);
    ctx.fill();
    ctx.fillStyle = "#24291f";
    ellipse(ctx, 4.6, 0, 2.65, 2.25, -0.04);
    ctx.fill();

    // Restrained reflected light makes the body rounded without heavy shadows.
    ctx.fillStyle = "rgba(154,156,123,0.36)";
    ellipse(ctx, -7.4, -1.15, 2.7, 0.65, -0.13);
    ctx.fill();
    ellipse(ctx, -0.2, -0.62, 1.25, 0.4, -0.08);
    ctx.fill();
    ellipse(ctx, 4.2, -0.85, 1.45, 0.48, -0.15);
    ctx.fill();
    ctx.strokeStyle = "rgba(179,185,149,0.28)";
    ctx.lineWidth = 0.45;
    for (const offset of [-0.85, 1.05]) {
      ctx.beginPath();
      ctx.ellipse(-7 + offset, 0, 2.4, 2.7, 0, -1.03, 1.03);
      ctx.stroke();
    }

    ctx.strokeStyle = color.ink;
    ctx.lineWidth = 0.58;
    for (const side of [-1, 1]) {
      const twitch = Math.sin(phase * 0.42 + side * 0.8) * 0.42;
      line(ctx, [
        [6.0, side * 1.15],
        [8.4, side * (3.1 + twitch)],
        [11.0, side * (2.45 + twitch)],
      ]);
      ctx.stroke();
      line(ctx, [
        [6.7, side * 0.55],
        [7.8, side * 0.75],
        [7.55, side * 0.12],
      ]);
      ctx.stroke();
      ctx.fillStyle = "#10150f";
      ellipse(ctx, 4.25, side * 1.72, 0.57, 0.39, side * 0.2);
      ctx.fill();
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
    ctx.fillStyle = color.paper;
    ctx.fillRect(0, 0, width, height);

    // A clean field keeps tiny ants readable; veins stay around the margins.
    ctx.strokeStyle = "#91a975";
    ctx.fillStyle = "#e1ebce";
    ctx.lineWidth = 0.9;
    ctx.globalAlpha = 0.4;
    leaf(ctx, 12, height - 14, 152, -1.88, true);
    leaf(ctx, width - 12, 14, 139, 1.24, true);
    ctx.globalAlpha = 0.26;
    sprig(ctx, width - 19, height - 15, 66, 0.46);
    ctx.globalAlpha = 1;

    // The faint dotted oval marks the colony's starting trail.
    ctx.strokeStyle = "rgba(91,120,63,0.18)";
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 7]);
    ellipse(ctx, width * 0.5, height * 0.5, width * 0.34, height * 0.25);
    ctx.stroke();
    ctx.setLineDash([]);

    // Four quiet escape points. Any screen edge remains a valid exit.
    [
      [width / 2, 22, -Math.PI / 2],
      [width - 22, height / 2, 0],
      [width / 2, height - 22, Math.PI / 2],
      [22, height / 2, Math.PI],
    ].forEach(([x, y, angle]) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.strokeStyle = "rgba(87,117,58,0.62)";
      ctx.lineWidth = 1.3;
      line(ctx, [
        [-13, 0],
        [8, 0],
      ]);
      ctx.stroke();
      line(ctx, [
        [2, -5],
        [8, 0],
        [2, 5],
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

  function drawObject(ctx, obj, time = 0) {
    ctx.save();
    const r = obj.radius || obj.r || 25;
    if (obj.type === "pebble") pebble(ctx, obj.x, obj.y, r);
    if (obj.type === "lemon") {
      ring(
        ctx,
        obj.x,
        obj.y,
        obj.range || 110,
        "rgba(181,150,80,0.10)",
        "rgba(131,112,68,0.36)",
        time,
      );
      lemon(ctx, obj.x, obj.y, Math.min(r, 28));
    }
    if (obj.type === "sugar") {
      ring(
        ctx,
        obj.x,
        obj.y,
        obj.range || 80,
        "rgba(177,140,97,0.13)",
        "rgba(139,105,70,0.32)",
        -time,
      );
      cube(ctx, obj.x - 7, obj.y + 2, 15, -0.12);
      cube(ctx, obj.x + 8, obj.y - 4, 15, 0.08);
      cube(ctx, obj.x + 1, obj.y + 12, 12, -0.15);
      ctx.fillStyle = "#9b8966";
      [
        [-17, 10],
        [14, 13],
        [20, 5],
        [-11, -9],
      ].forEach(([x, y]) => {
        ctx.save();
        ctx.translate(obj.x + x, obj.y + y);
        ctx.rotate(x);
        ctx.fillRect(-1, -1, 1.8, 1.8);
        ctx.restore();
      });
    }
    ctx.restore();
  }

  function drawPath(ctx, path, time = 0) {
    const points = path.points || path;
    if (!points || points.length === 0) return;
    const type = path.type || "barrier";
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    if (type === "barrier") {
      ctx.lineWidth = path.width || 12;
      ctx.strokeStyle = color.clay;
      line(ctx, points);
      if (points.length === 1) {
        const p = point(points[0]);
        ctx.lineTo(p.x + 0.01, p.y);
      }
      ctx.stroke();
      ctx.strokeStyle = "rgba(245,248,234,0.50)";
      ctx.lineWidth = 0.8;
      ctx.setLineDash([3, 4, 12, 3]);
      for (const shift of [-2.4, 2.4]) {
        ctx.save();
        ctx.translate(shift * 0.45, shift);
        line(ctx, points);
        ctx.stroke();
        ctx.restore();
      }
    } else {
      ctx.strokeStyle = "rgba(105,124,67,0.16)";
      ctx.lineWidth = 13;
      line(ctx, points);
      ctx.stroke();
      ctx.strokeStyle = color.blue;
      ctx.lineWidth = 2.5;
      ctx.setLineDash([1, 8]);
      ctx.lineDashOffset = -time * 5;
      line(ctx, points);
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
        ctx.lineWidth = 1.8;
        line(ctx, [
          [-8, -5],
          [0, 0],
          [-8, 5],
        ]);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function drawCursor(ctx, tool, x, y, time = 0) {
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.strokeStyle = color.ink;
    ctx.lineWidth = 1;
    if (tool === "pebble") pebble(ctx, x, y, 25);
    else if (tool === "lemon") lemon(ctx, x, y, 23);
    else if (tool === "sugar") cube(ctx, x, y, 17, -0.08);
    else if (tool === "breeze") {
      ring(
        ctx,
        x,
        y,
        74,
        "rgba(105,124,67,0.07)",
        "rgba(112,102,63,0.44)",
        time,
      );
      ctx.strokeStyle = color.blue;
      ctx.lineWidth = 1.5;
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
      ctx.strokeStyle =
        tool === "trail"
          ? color.blue
          : tool === "barrier"
            ? color.clay
            : color.ink;
      if (tool === "eraser") ctx.setLineDash([3, 4]);
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
    drawAnt,
    drawGround,
    drawObject,
    drawPath,
    drawCursor,
    icons,
  };
})();
