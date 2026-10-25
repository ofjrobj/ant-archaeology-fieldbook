/* Hand-drawn field specimens. One path source for canvas and SVG. */
(function () {
  "use strict";
  const P = (d, width = 0.65, fill = "none", opacity = 1) => ({
    d,
    width,
    fill,
    opacity,
  });
  const specimens = {};

  // I. A battered directional tablet; the compass has no preferred north.
  specimens.compass = [
    P("M23 12 74 16 85 29 80 79 67 88 19 81 12 65 16 26Z", 0.95, "paper"),
    P("M23 12 27 18 72 22 79 31 75 75 65 82 24 75 19 63 22 29Z", 0.45),
    P(
      "M19 81 24 75M80 79 75 75M85 29 79 31M74 16 72 22M12 65 19 63M16 26 22 29",
      0.6,
    ),
    P(
      "M19 28 22 21 26 21M26 78 38 79 43 81M77 37 76 52M20 53 20 62 24 67",
      0.35,
    ),
    P("M66 30C83 45 71 69 52 71 33 72 24 56 31 40 37 26 54 23 66 30Z", 0.65),
    P("M64 33C78 45 69 66 52 68 36 70 27 55 34 42 39 30 53 27 64 33Z", 0.35),
    P("M52 33 56 46 68 51 55 55 50 68 47 55 34 50 47 47Z", 0.65),
    P(
      "M52 33 51 51 56 46ZM51 51 68 51 55 55ZM51 51 50 68 47 55ZM51 51 34 50 47 47Z",
      0.35,
      "ink",
      0.68,
    ),
    P("M38 36 44 42M65 38 60 43M66 62 60 58M36 63 42 58", 0.45),
    P(
      "M51 24 51 28M73 49 77 49M50 73 50 77M25 49 29 49M32 30 35 33M70 31 67 34M70 69 67 66M30 69 33 66",
      0.55,
    ),
    P(
      "M27 17 25 20M31 17 29 20M35 18 33 21M39 18 37 21M43 18 41 21M47 19 45 21M51 19 49 22M55 20 53 22M59 20 57 23M63 21 61 23M67 21 65 23",
      0.3,
      "none",
      0.65,
    ),
    P(
      "M78 36 82 33M78 41 82 38M77 46 81 43M77 51 81 48M77 56 80 53M76 61 80 58M76 66 79 63M75 71 79 68M74 76 78 73M70 81 74 78M67 84 71 81M61 84 64 82M55 84 58 82M49 83 52 81M43 82 46 80M37 81 40 79M31 80 34 78",
      0.35,
    ),
    P(
      "M24 38 26 34 24 31M72 59 70 63 72 65M36 73 39 72M60 24 63 25M29 61 27 58M58 76 60 75 62 76",
      0.35,
    ),
    P(
      "M25 70h.1M28 72h.1M68 75h.1M71 73h.1M24 42h.1M72 27h.1M30 27h.1M64 77h.1M20 68h.1M76 27h.1",
      1.1,
    ),
  ];

  // II. A paper vessel and the thread that once connected it to another voice.
  specimens.cup = [
    P("M18 24C25 18 54 18 65 24L58 69C53 76 34 77 28 70Z", 0.9, "paper"),
    P(
      "M18 24C25 32 55 33 65 24M20 27C28 34 53 36 63 28M19 25C28 20 55 21 64 25",
      0.55,
    ),
    P("M28 69C37 74 52 73 58 68M29 72C38 78 52 77 57 72", 0.5),
    P(
      "M22 31 30 67M25 34 32 68M28 35 34 69M32 36 37 70M59 34 54 68M62 30 56 66",
      0.28,
      "none",
      0.7,
    ),
    P("M37 40 40 57 43 61M48 36 47 48M49 54 48 66M31 52 34 56", 0.32),
    P("M40 74C39 71 44 70 45 73S43 76 41 75", 0.8, "paper"),
    P("M42 74C42 89 73 91 81 78 89 64 71 60 73 52 75 47 82 52 84 46", 0.65),
    P("M43 75C44 86 73 89 79 78 87 64 70 61 72 52 74 46 82 50 83 46", 0.24),
    P(
      "M20 24C30 27 53 28 62 24M25 23 27 24M29 22 32 24M34 22 37 24M40 22 43 24M46 22 49 24M52 23 55 25",
      0.3,
    ),
    P(
      "M29 73 30 70M33 75 34 72M37 76 38 73M47 75 48 73M51 75 52 72M55 73 56 70",
      0.35,
    ),
    P(
      "M33 45h.1M36 50h.1M44 37h.1M50 51h.1M53 55h.1M48 61h.1M35 61h.1M40 65h.1",
      0.65,
    ),
    P("M67 15C73 10 91 10 98 15L91 43C88 48 77 49 73 44Z", 0.8, "paper"),
    P(
      "M67 15C74 21 92 21 98 15M69 18C75 23 91 23 96 18M68 15C76 13 91 13 97 16",
      0.45,
    ),
    P("M73 43C78 47 86 47 91 42M74 46C78 49 86 49 90 45", 0.45),
    P(
      "M71 22 75 41M74 24 77 43M77 24 79 44M94 23 89 42M92 26 88 42",
      0.26,
      "none",
      0.75,
    ),
    P("M81 26 82 34 84 37M87 25 86 31M87 35 85 42", 0.28),
    P(
      "M72 15 74 16M77 14 79 16M82 14 84 16M87 14 89 16M92 15 94 17M75 45 76 43M79 47 80 45M87 46 88 44",
      0.28,
    ),
    P("M82 47C81 44 86 43 86 46 87 49 83 49 82 47Z", 0.55, "paper"),
    P("M84 48 84 45M79 29h.1M83 40h.1M88 33h.1M76 36h.1", 0.55),
  ];

  // III. A fragment held together by the marks of a repair.
  specimens.stitch = [
    P(
      "M18 35 30 31 32 26 42 29 48 24 56 30 68 27 71 32 83 31 80 42 84 49 80 57 84 67 75 68 73 77 62 74 56 79 46 74 36 78 33 72 22 73 24 62 18 55 22 44Z",
      0.7,
      "paper",
    ),
    P(
      "M21 37 31 35M35 31 44 34M49 29 56 34M62 33 76 34M78 40 76 47M80 52 76 59M78 65 70 65M68 72 60 70M55 74 47 70M41 73 34 68M28 69 28 61M23 54 27 47",
      0.3,
    ),
    P(
      "M21 42C37 40 59 44 80 42M21 47C37 45 59 49 81 47M22 52C37 50 59 54 81 52M22 57C37 55 59 59 80 57M25 62C39 60 61 64 81 62M25 67C40 65 59 69 76 67",
      0.23,
      "none",
      0.55,
    ),
    P(
      "M30 34 33 71M36 31 39 73M42 31 45 73M48 29 51 74M54 31 57 74M60 32 63 72M66 31 69 72M72 34 75 66",
      0.22,
      "none",
      0.55,
    ),
    P("M52 29C45 39 58 43 49 52S56 63 48 74", 0.85),
    P(
      "M48 31 55 34M46 38 54 40M49 44 57 45M47 50 55 52M45 57 53 59M49 64 56 66M46 70 53 73",
      1.25,
    ),
    P(
      "M47 31C46 29 49 28 49 31M56 34C56 36 54 36 54 34M45 38C44 36 48 35 47 38M55 40C56 42 53 42 53 40M48 44C47 42 50 42 50 44M58 45C59 47 56 48 56 45M46 50C45 48 48 48 48 50M56 52C57 54 54 55 54 52M44 57C43 55 46 54 46 57M54 59C55 62 51 62 52 59M48 64C47 62 50 61 50 64M57 66C58 68 55 69 55 66M45 70C44 68 47 67 47 70M54 73C55 75 52 76 52 73",
      0.35,
    ),
    P("M28 59 73 16C76 13 79 13 78 17L30 60Z", 0.55, "paper"),
    P("M32 57 73 18M73 17C76 14 78 15 75 18 73 20 72 19 73 17Z", 0.35),
    P(
      "M76 17C87 20 83 8 68 10 54 12 55 23 62 24 69 25 70 15 80 18 90 21 89 36 82 39",
      0.5,
    ),
    P(
      "M20 35 17 32M28 31 27 28M36 28 35 24M44 28 45 25M58 29 60 26M69 28 69 24M81 34 86 33M82 50 87 51M83 66 87 68M73 76 74 80M59 77 59 82M37 77 36 82M22 71 18 74M22 61 18 63M20 46 16 44",
      0.4,
    ),
  ];

  // IV. The folds remain legible, even after the wish is forgotten.
  specimens.crane = [
    P(
      "M10 45 40 51 49 20 57 49 73 36 80 16 89 21 82 25 78 49 64 63 57 77 49 66 32 60Z",
      0.85,
      "paper",
    ),
    P(
      "M10 45 49 66 40 51 57 49 49 20M49 66 57 49 64 63 78 49 73 36M57 49 73 36 78 49 82 25M80 16 82 25 89 21M49 66 57 77 64 63",
      0.6,
    ),
    P(
      "M14 47 37 56 46 63M42 50 49 25 54 48M58 52 63 60 75 48M75 36 79 25M53 66 57 73 61 64",
      0.3,
    ),
    P("M49 66 57 49 55 62 57 77Z", 0.4, "ink", 0.12),
    P(
      "M41 52 46 62M43 51 47 59M46 51 49 56M49 51 51 53M58 52 59 58M60 51 62 59M62 49 64 58M64 48 66 56M66 46 68 54M68 45 70 52M70 43 72 50M72 41 74 48M74 40 76 46",
      0.3,
    ),
    P(
      "M51 66 54 64M53 69 55 67M54 72 56 70M57 74 60 68M80 20 84 22M79 24 81 25M78 28 80 29M77 32 80 33M77 36 79 37M76 40 78 41M76 44 77 45",
      0.3,
    ),
    P(
      "M29 55 31 54M33 57 35 56M37 59 39 58M50 35 51 38M50 39 51 41M58 60 59 62",
      0.3,
    ),
    P("M80 21h.1", 0.75),
  ];

  // V. An ordinary tool for deciding what is allowed to remain.
  specimens.sieve = [
    P("M62 49 89 22C93 18 98 23 94 27L70 57Z", 0.7, "paper"),
    P("M67 49 91 25M68 52 91 28M91 23C91 21 94 22 93 24S90 25 91 23", 0.4),
    P(
      "M16 43C20 28 55 24 71 38 88 53 69 72 44 75 19 77 7 61 16 43Z",
      0.9,
      "paper",
    ),
    P(
      "M17 47C17 62 34 71 51 67 63 65 75 57 75 45L71 60C64 77 31 85 17 65L13 52",
      0.65,
    ),
    P("M18 43C27 32 53 30 67 40 80 49 65 64 46 67 24 70 10 56 18 43Z", 0.55),
    P("M21 44C30 35 51 34 64 42 75 50 61 61 45 64 26 67 15 55 21 44Z", 0.45),
    P(
      "M21 47 44 64M23 42 50 62M28 39 56 60M35 37 62 57M43 37 67 53M51 38 69 49M59 40 68 46M19 52 35 64M20 57 28 63",
      0.32,
    ),
    P(
      "M22 44 20 54M28 40 24 60M35 38 29 63M42 37 36 64M49 38 43 64M55 40 50 62M61 42 57 59M67 46 64 56",
      0.32,
    ),
    P(
      "M17 57 19 64M21 61 23 69M25 65 28 73M30 67 33 75M35 69 38 76M40 69 43 76M45 69 48 75M50 68 53 74M55 67 58 72M60 65 63 70M65 62 68 66M70 58 72 61",
      0.35,
    ),
    P(
      "M23 44 28 43 30 46 26 49 23 47ZM36 50 40 47 44 50 42 54 38 54ZM51 44 55 42 58 45 56 48 52 47ZM46 58 49 55 52 57 51 61 47 61Z",
      0.55,
      "paper",
    ),
    P("M26 44 28 46 25 47M39 49 41 51 39 53M53 44 55 46M48 57 50 59", 0.3),
    P(
      "M27 85 31 82 34 85 32 88 28 88ZM46 88 49 86 52 88 50 91ZM68 80 71 78 74 80 72 84 69 83Z",
      0.5,
      "paper",
    ),
    P(
      "M29 84 31 86M48 88 50 89M70 80 72 82M38 81h.1M58 83h.1M63 88h.1M40 91h.1",
      0.5,
    ),
  ];

  // VI. An entrance reconstructed from stones that outlasted its inhabitants.
  specimens.house = [
    P(
      "M12 80 17 55 25 42 32 34 45 28 59 29 72 35 80 48 86 64 88 81 67 82 65 59 60 49 51 45 43 49 36 59 34 81Z",
      0.8,
      "paper",
    ),
    P(
      "M18 77 22 57 29 45 37 37 46 32 58 33 68 39 76 51 81 65 83 77M34 81 36 59 43 49 51 45 60 49 65 59 67 82",
      0.55,
    ),
    P(
      "M17 55 36 59M25 42 43 49M32 34 45 47M45 28 48 45M59 29 55 46M72 35 60 49M80 48 65 59M86 64 66 67M14 66 35 69",
      0.75,
    ),
    P(
      "M15 69 31 71 30 78 18 77ZM19 56 32 61 31 66 17 63ZM27 44 38 50 34 56 23 52ZM35 37 41 47 44 45 40 34ZM48 32 49 42 53 43 56 33ZM60 35 58 44 61 46 67 40ZM70 42 63 50 66 55 75 50ZM78 55 68 61 69 64 81 62ZM70 70 82 68 84 77 71 78Z",
      0.25,
    ),
    P("M37 78 39 61 45 51 51 48 58 52 62 61 64 79Z", 0.4, "ink", 0.09),
    P(
      "M39 77 41 62 46 54M43 79 45 65 49 56M48 79 49 64 52 53M53 79 53 64 54 54M58 79 57 63 57 57M62 78 60 66M38 74 62 62M39 69 60 58M41 63 57 53M38 79 64 66M46 79 64 71M55 79 64 75",
      0.3,
      "none",
      0.6,
    ),
    P(
      "M17 76 21 71M22 78 26 73M27 78 30 74M18 61 23 58M23 64 28 61M26 50 29 47M30 52 33 49M36 41 38 39M49 39 52 36M50 42 54 38M60 42 63 39M65 51 70 47M69 54 73 50M71 62 76 58M76 64 79 61M72 75 77 71M77 77 81 73",
      0.4,
    ),
    P("M8 83C29 80 70 80 93 84M17 86 30 85M70 87 85 87M42 85 51 85", 0.4),
    P(
      "M24 84 26 82 29 84M72 84 75 82 77 85M19 52h.1M32 44h.1M42 34h.1M57 32h.1M71 43h.1M82 59h.1M78 73h.1M29 74h.1",
      0.7,
    ),
  ];

  const cache = new Map();
  function pathFor(d) {
    if (!cache.has(d)) cache.set(d, new Path2D(d));
    return cache.get(d);
  }
  function drawRelic(ctx, type, x, y, size, ink = "#202020") {
    const paths = specimens[type] || specimens.compass;
    ctx.save();
    ctx.translate(x - size / 2, y - size / 2);
    ctx.scale(size / 100, size / 100);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const alpha = ctx.globalAlpha;
    for (const p of paths) {
      const path = pathFor(p.d);
      ctx.globalAlpha = alpha * p.opacity;
      if (p.fill !== "none") {
        ctx.fillStyle = p.fill === "paper" ? "#f5f5f5" : ink;
        ctx.fill(path);
      }
      ctx.strokeStyle = ink;
      ctx.lineWidth = p.width;
      ctx.stroke(path);
    }
    ctx.restore();
  }
  function svgRelic(type) {
    const paths = specimens[type] || specimens.compass;
    return (
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      paths
        .map(
          (p) =>
            '<path d="' +
            p.d +
            '" stroke-width="' +
            p.width +
            '" fill="' +
            (p.fill === "paper"
              ? "#f5f5f5"
              : p.fill === "ink"
                ? "currentColor"
                : "none") +
            '" opacity="' +
            p.opacity +
            '"/>',
        )
        .join("") +
      "</svg>"
    );
  }
  function drawAnt(ctx, x, y, scale = 1, angle = 0, phase = 0) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.scale(scale, scale);
    ctx.strokeStyle = "#222";
    ctx.fillStyle = "#222";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    // Each alternating tripod lifts and reaches independently.
    for (let side = -1; side <= 1; side += 2) {
      for (let i = 0; i < 3; i++) {
        const step = Math.sin(phase + i * Math.PI + (side > 0 ? Math.PI : 0));
        const roots = [4, 0.5, -2];
        const kneeX = [6, -1, -5][i] + step * 0.8;
        const footX = [9, -0.5, -10][i] + step * 1.7;
        const kneeY = side * (3.6 + i * 0.45);
        const footY = side * (7.2 + (i === 1 ? 1.5 : 0) - step * 0.7);
        ctx.lineWidth = 0.55;
        ctx.beginPath();
        ctx.moveTo(roots[i], side * 1.2);
        ctx.lineTo(kneeX, kneeY);
        ctx.lineTo(footX, footY);
        ctx.lineTo(footX + 0.8, footY + side * 0.8);
        ctx.stroke();
        ctx.lineWidth = 0.85;
        ctx.beginPath();
        ctx.moveTo(roots[i], side * 1.2);
        ctx.lineTo(kneeX * 0.7 + roots[i] * 0.3, kneeY * 0.75);
        ctx.stroke();
      }
    }
    // Petiole, thorax, head, and a finely striated gaster.
    ctx.beginPath();
    ctx.ellipse(-7.5, 0, 5.1, 3.65, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(-1.3, 0, 1.9, 1.25, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(2.2, 0, 3.1, 2.1, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(6.7, 0, 2.8, 2.55, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#d8d8d8";
    ctx.lineWidth = 0.32;
    for (let n = 0; n < 5; n++) {
      const k = -10.5 + n * 1.65;
      ctx.beginPath();
      ctx.moveTo(k, -2.65 + Math.abs(k + 7.5) * 0.15);
      ctx.quadraticCurveTo(k + 1.7, 0, k, 2.65 - Math.abs(k + 7.5) * 0.15);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(0.4, -0.8);
    ctx.quadraticCurveTo(2, -1.8, 3.6, -0.9);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(6.1, -1.7);
    ctx.quadraticCurveTo(7.3, -2, 7.9, -1);
    ctx.stroke();
    ctx.strokeStyle = "#222";
    ctx.lineWidth = 0.5;
    for (const side of [-1, 1]) {
      const flick = Math.sin(phase * 0.6 + side) * 0.55;
      ctx.beginPath();
      ctx.moveTo(8.3, side * 1.5);
      ctx.lineTo(11.5, side * (3.6 + flick));
      ctx.lineTo(15, side * (3.9 + flick));
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(9.1, side * 0.65);
      ctx.lineTo(10.4, side * 1.15);
      ctx.lineTo(10.7, side * 0.3);
      ctx.stroke();
    }
    ctx.restore();
  }
  window.AntArt = { drawRelic, drawAnt, svgRelic };
})();
