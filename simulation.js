/*
 * Out of Line — deterministic, DOM-free ant simulation.
 * Browser: window.AntSimulation. Node: require('./simulation.js').
 * Units are field pixels and seconds. Call create() for a fresh round.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.AntSimulation = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const TAU = Math.PI * 2;
  const ANT_RADIUS = 4;
  const MAX_ANTS = 300;
  const MAX_POPULATION = 2000;
  const MAX_OBJECTS = 28;
  const MAX_PATHS = 20;
  const clamp = (n, low, high) => Math.max(low, Math.min(high, n));
  const length = (x, y) => Math.hypot(x, y);

  function randomGenerator(seed) {
    let value = Number(seed) >>> 0;
    return function () {
      value += 0x6d2b79f5;
      let t = value;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Each ant keeps its own narrow lane, with a little slow side-to-side motion.
  // Derive it from existing session data so older saved colonies need no migration.
  function trailOffset(ant, time, phase) {
    return (
      (ant.personality / Math.PI - 1) * 11 +
      Math.sin(phase * 3 + ant.personality) * 2.5 +
      Math.sin(time * 0.55 + ant.personality * 2) * 2.5
    );
  }

  function create(options = {}) {
    const width = Math.max(200, Number(options.width) || 1000);
    const height = Math.max(160, Number(options.height) || 620);
    const populationMode = options.populationMode === true;
    const count = clamp(
      Math.floor(
        Number(options.count) || (populationMode ? MAX_POPULATION : 36),
      ),
      1,
      populationMode ? MAX_POPULATION : MAX_ANTS,
    );
    const initialCount = populationMode
      ? clamp(Math.floor(Number(options.initialCount) || 200), 1, count)
      : count;
    const seed = Number(options.seed === undefined ? 1 : options.seed) >>> 0;
    const random = randomGenerator(seed);
    const model = {
      width,
      height,
      seed,
      populationMode,
      total: count,
      active: initialCount,
      reserve: count - initialCount,
      escaped: 0,
      time: 0,
      won: false,
      lost: populationMode && initialCount === count,
      arrivalRate: populationMode
        ? Math.max(0, Number(options.arrivalRate ?? 30) || 0)
        : 0,
      returnDelay: Math.max(0.025, Number(options.returnDelay) || 60),
      arrivalAccumulator: 0,
      nextWaitingIndex: initialCount,
      ants: [],
      objects: [],
      paths: [],
      cup: null,
      nextId: 1,
      orbit: {
        x: width / 2,
        y: height / 2,
        rx: width * 0.34,
        ry: height * 0.25,
      },
    };
    for (let id = 0; id < count; id++) {
      const phase = populationMode
        ? (id * Math.PI * (3 - Math.sqrt(5))) % TAU
        : (id / count) * TAU;
      const speed = 42 + random() * 7;
      const personality = random() * TAU;
      const offset = trailOffset({ personality }, 0, phase);
      const angle = Math.atan2(
        model.orbit.ry * Math.cos(phase),
        -model.orbit.rx * Math.sin(phase),
      );
      model.ants.push({
        id,
        x: model.orbit.x + Math.cos(phase) * (model.orbit.rx + offset),
        y: model.orbit.y + Math.sin(phase) * (model.orbit.ry + offset),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        angle,
        phase,
        speed,
        travelAngle: angle,
        personality,
        status: id < initialCount ? "active" : "waiting",
        escaped: id >= initialCount,
        returnAt: null,
        released: false,
      });
    }
    return model;
  }

  // Add to the current round without resetting its progress or tools. The cap
  // counts every ant spawned this round, including those already safely outside.
  // A numeric return lets the UI report partial additions at the population cap.
  function addAnts(model, amount) {
    if (
      model.won ||
      model.lost ||
      model.populationMode ||
      !Number.isFinite(amount) ||
      amount < 1
    )
      return 0;
    const added = Math.min(Math.floor(amount), MAX_ANTS - model.total);
    if (added <= 0) return 0;
    // Older saved rounds predate model.seed. Their first ant provides a stable
    // fallback, so saving/reloading still produces exactly the same additions.
    const seed = Number.isFinite(model.seed)
      ? model.seed
      : Math.floor((model.ants[0]?.personality || 0) * 100000000);
    let id =
      model.ants.reduce((highest, ant) => Math.max(highest, ant.id), -1) + 1;
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));
    for (let index = 0; index < added; index++, id++) {
      const random = randomGenerator(seed ^ Math.imul(id + 1, 0x9e3779b1));
      const phase = (id * goldenAngle + model.time * 0.1) % TAU;
      const speed = 42 + random() * 7;
      const personality = random() * TAU;
      const offset = trailOffset({ personality }, model.time, phase);
      const angle = Math.atan2(
        model.orbit.ry * Math.cos(phase),
        -model.orbit.rx * Math.sin(phase),
      );
      // The golden-angle sequence spreads any batch around the existing loop;
      // old ants keep their exact positions and the player keeps their work.
      model.ants.push({
        id,
        x: model.orbit.x + Math.cos(phase) * (model.orbit.rx + offset),
        y: model.orbit.y + Math.sin(phase) * (model.orbit.ry + offset),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        angle,
        phase,
        speed,
        travelAngle: angle,
        personality,
        status: "active",
        escaped: false,
        returnAt: null,
        released: false,
      });
    }
    model.total += added;
    model.active = model.total - model.escaped;
    return added;
  }

  function cleanPoint(model, point) {
    if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y))
      return null;
    return {
      x: clamp(point.x, -40, model.width + 40),
      y: clamp(point.y, -40, model.height + 40),
    };
  }

  // Lines keep their direction: ants follow a scent trail toward its LAST point.
  // The last point may lie just beyond the board, making an explicit exit route.
  function applyTool(model, type, points) {
    if (model.won || model.lost || !Array.isArray(points) || !points.length)
      return false;
    if (type === "barrier" || type === "trail") {
      const clean = [];
      for (const point of points) {
        const p = cleanPoint(model, point);
        if (!p) continue;
        const last = clean[clean.length - 1];
        if (!last || length(p.x - last.x, p.y - last.y) >= 6) clean.push(p);
      }
      const lastInput = cleanPoint(model, points[points.length - 1]);
      const last = clean[clean.length - 1];
      if (
        lastInput &&
        last &&
        length(lastInput.x - last.x, lastInput.y - last.y) > 0.5
      )
        clean.push(lastInput);
      if (clean.length < 2) return false;
      // Keep long mouse strokes bounded without cutting off their endpoint.
      const stride = Math.max(1, Math.ceil(clean.length / 240));
      const reduced = clean.filter((_, index) => index % stride === 0);
      if (reduced[reduced.length - 1] !== clean[clean.length - 1])
        reduced.push(clean[clean.length - 1]);
      if (model.paths.length >= MAX_PATHS) model.paths.shift();
      model.paths.push({
        id: model.nextId++,
        type,
        points: reduced,
        radius: type === "barrier" ? 6 : 4,
      });
      return true;
    }
    if (!["pebble", "lemon", "sugar", "honey"].includes(type)) return false;
    const point = cleanPoint(model, points[points.length - 1]);
    if (!point) return false;
    if (model.objects.length >= MAX_OBJECTS) model.objects.shift();
    model.objects.push({
      id: model.nextId++,
      type,
      x: point.x,
      y: point.y,
      radius:
        type === "pebble"
          ? 27
          : type === "lemon"
            ? 25
            : type === "honey"
              ? 16
              : 12,
    });
    return true;
  }

  function closestSegment(point, a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const squared = dx * dx + dy * dy;
    const t = squared
      ? clamp(((point.x - a.x) * dx + (point.y - a.y) * dy) / squared, 0, 1)
      : 0;
    const x = a.x + dx * t;
    const y = a.y + dy * t;
    return {
      x,
      y,
      t,
      distance: length(point.x - x, point.y - y),
      dx,
      dy,
      segmentLength: Math.sqrt(squared),
    };
  }

  // Geometry caches are deliberately outside the saved model and rebuild after reload.
  const pathGeometry = new WeakMap();
  function geometryFor(path) {
    let geometry = pathGeometry.get(path);
    if (geometry) return geometry;
    const segments = [];
    const bounds = {
      minX: Infinity,
      minY: Infinity,
      maxX: -Infinity,
      maxY: -Infinity,
    };
    for (let index = 0; index < path.points.length - 1; index++) {
      const a = path.points[index];
      const b = path.points[index + 1];
      const segment = {
        a,
        b,
        index,
        minX: Math.min(a.x, b.x),
        maxX: Math.max(a.x, b.x),
        minY: Math.min(a.y, b.y),
        maxY: Math.max(a.y, b.y),
      };
      segments.push(segment);
      bounds.minX = Math.min(bounds.minX, segment.minX);
      bounds.maxX = Math.max(bounds.maxX, segment.maxX);
      bounds.minY = Math.min(bounds.minY, segment.minY);
      bounds.maxY = Math.max(bounds.maxY, segment.maxY);
    }
    geometry = { bounds, segments };
    pathGeometry.set(path, geometry);
    return geometry;
  }

  function boxDistanceSquared(point, box) {
    const dx = Math.max(box.minX - point.x, 0, point.x - box.maxX);
    const dy = Math.max(box.minY - point.y, 0, point.y - box.maxY);
    return dx * dx + dy * dy;
  }

  function nearestOnPath(point, path, maxDistance = Infinity) {
    const geometry = geometryFor(path);
    let bestSquared = maxDistance * maxDistance;
    let nearest = null;
    if (boxDistanceSquared(point, geometry.bounds) >= bestSquared) return null;
    for (const segment of geometry.segments) {
      if (boxDistanceSquared(point, segment) >= bestSquared) continue;
      const current = closestSegment(point, segment.a, segment.b);
      const squared = current.distance * current.distance;
      if (squared < bestSquared) {
        bestSquared = squared;
        nearest = { ...current, index: segment.index };
      }
    }
    return nearest;
  }

  function pointAhead(path, nearest, distance) {
    let remaining = distance;
    let x = nearest.x;
    let y = nearest.y;
    for (let i = nearest.index + 1; i < path.points.length; i++) {
      const target = path.points[i];
      const segmentLength = length(target.x - x, target.y - y);
      if (segmentLength >= remaining && segmentLength > 0) {
        return {
          x: x + ((target.x - x) / segmentLength) * remaining,
          y: y + ((target.y - y) / segmentLength) * remaining,
        };
      }
      remaining -= segmentLength;
      x = target.x;
      y = target.y;
    }
    // Continue past the endpoint, rather than forming a stationary knot there.
    const end = path.points[path.points.length - 1];
    const before = path.points[path.points.length - 2];
    const n = length(end.x - before.x, end.y - before.y) || 1;
    return {
      x: end.x + ((end.x - before.x) / n) * remaining,
      y: end.y + ((end.y - before.y) / n) * remaining,
    };
  }

  function eraseAt(model, point, radius = 40) {
    if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y))
      return false;
    const before = model.objects.length + model.paths.length;
    const reach = Math.max(1, Number(radius) || 40);
    model.objects = model.objects.filter(
      (object) =>
        length(point.x - object.x, point.y - object.y) > reach + object.radius,
    );
    model.paths = model.paths.filter(
      (path) => !nearestOnPath(point, path, reach + path.radius),
    );
    return before !== model.objects.length + model.paths.length;
  }

  function clearTools(model) {
    releaseCup(model, { cancel: true });
    model.objects.length = 0;
    model.paths.length = 0;
  }

  // A cup covers the ants present when it is placed. Carrying it never scoops
  // up additional ants along the route, and the held ants remain in the count.
  function captureCup(model, point, radius = 70) {
    if (model.won || model.lost || model.cup) return 0;
    const p = cleanPoint(model, point);
    if (!p) return 0;
    const reach = clamp(Number(radius) || 70, 10, 200);
    const cup = { x: p.x, y: p.y, radius: reach, ids: [], offsets: [] };
    for (const ant of model.ants) {
      if (ant.escaped || ant.held || length(ant.x - p.x, ant.y - p.y) > reach)
        continue;
      ant.held = true;
      cup.ids.push(ant.id);
      cup.offsets.push({
        id: ant.id,
        dx: ant.x - p.x,
        dy: ant.y - p.y,
        originX: ant.x,
        originY: ant.y,
      });
    }
    model.cup = cup;
    return cup.ids.length;
  }

  function moveCup(model, point) {
    if (!model.cup || model.won || model.lost) return false;
    const p = cleanPoint(model, point);
    if (!p) return false;
    model.cup.x = p.x;
    model.cup.y = p.y;
    const byId = new Map(model.ants.map((ant) => [ant.id, ant]));
    for (const offset of model.cup.offsets) {
      const ant = byId.get(offset.id);
      if (!ant || ant.escaped) continue;
      ant.x = p.x + offset.dx;
      ant.y = p.y + offset.dy;
    }
    return true;
  }

  function edgeAt(model, point) {
    return point.x < 0
      ? "left"
      : point.x > model.width
        ? "right"
        : point.y < 0
          ? "top"
          : point.y > model.height
            ? "bottom"
            : null;
  }

  function markOutside(model, ant, edge = edgeAt(model, ant)) {
    if (ant.escaped) return;
    ant.held = false;
    ant.escaped = true;
    ant.status = "outside";
    ant.exitEdge = edge;
    ant.exitX = ant.x;
    ant.exitY = ant.y;
    ant.returnAt = model.populationMode ? model.time + model.returnDelay : null;
    model.escaped++;
    model.active = model.total - (model.reserve || 0) - model.escaped;
  }

  // Return the number carried outside. Cancellation restores the pickup points;
  // an ordinary on-board release leaves the ants at their new safe positions.
  function releaseCup(model, { cancel = false } = {}) {
    const cup = model.cup;
    if (!cup) return 0;
    const cancelled = cancel || model.won || model.lost;
    const exitEdge = cancelled ? null : edgeAt(model, cup);
    const byId = new Map(model.ants.map((ant) => [ant.id, ant]));
    let sentOutside = 0;
    for (const offset of cup.offsets) {
      const ant = byId.get(offset.id);
      if (!ant) continue;
      ant.held = false;
      if (ant.escaped) continue;
      if (exitEdge) {
        ant.x = clamp(ant.x, 4, model.width - 4);
        ant.y = clamp(ant.y, 4, model.height - 4);
        if (exitEdge === "left") ant.x = -4;
        else if (exitEdge === "right") ant.x = model.width + 4;
        else if (exitEdge === "top") ant.y = -4;
        else ant.y = model.height + 4;
        markOutside(model, ant, exitEdge);
        sentOutside++;
      } else {
        ant.x = clamp(cancelled ? offset.originX : ant.x, 4, model.width - 4);
        ant.y = clamp(cancelled ? offset.originY : ant.y, 4, model.height - 4);
      }
    }
    model.cup = null;
    if (!model.lost && model.reserve === 0 && model.escaped === model.total)
      model.won = true;
    return sentOutside;
  }

  // Keep simulation units square when a responsive canvas changes shape.
  // Fresh path objects deliberately invalidate the cached collision geometry.
  function resizeWorld(model, width, height) {
    if (
      !Number.isFinite(width) ||
      !Number.isFinite(height) ||
      width < 200 ||
      height < 160
    )
      return model;
    releaseCup(model, { cancel: true });
    const sx = width / model.width;
    const sy = height / model.height;
    if (sx === 1 && sy === 1) return model;
    for (const ant of model.ants) {
      ant.x *= sx;
      ant.y *= sy;
      if (Number.isFinite(ant.exitX)) ant.exitX *= sx;
      if (Number.isFinite(ant.exitY)) ant.exitY *= sy;
      const speed = length(ant.vx, ant.vy);
      ant.angle = Math.atan2(ant.vy * sy, ant.vx * sx);
      ant.vx = Math.cos(ant.angle) * speed;
      ant.vy = Math.sin(ant.angle) * speed;
      ant.travelAngle = Math.atan2(
        Math.sin(ant.travelAngle) * sy,
        Math.cos(ant.travelAngle) * sx,
      );
    }
    for (const object of model.objects) {
      object.x *= sx;
      object.y *= sy;
    }
    model.paths = model.paths.map((path) => ({
      ...path,
      points: path.points.map((point) => ({
        x: point.x * sx,
        y: point.y * sy,
      })),
    }));
    model.orbit = {
      x: model.orbit.x * sx,
      y: model.orbit.y * sy,
      rx: model.orbit.rx * sx,
      ry: model.orbit.ry * sy,
    };
    model.width = width;
    model.height = height;
    return model;
  }

  function orbitVelocity(model, ant) {
    const orbit = model.orbit;
    const phase = Math.atan2(
      (ant.y - orbit.y) / orbit.ry,
      (ant.x - orbit.x) / orbit.rx,
    );
    ant.phase = phase;
    const offset = trailOffset(ant, model.time, phase);
    const tx = -Math.sin(phase) * orbit.rx;
    const ty = Math.cos(phase) * orbit.ry;
    const n = length(tx, ty) || 1;
    return {
      x:
        (tx / n) * ant.speed +
        (orbit.x + Math.cos(phase) * (orbit.rx + offset) - ant.x) * 3.2,
      y:
        (ty / n) * ant.speed +
        (orbit.y + Math.sin(phase) * (orbit.ry + offset) - ant.y) * 3.2,
    };
  }

  function steer(model, ant, input, neighborGrid) {
    let desired;
    if (ant.released) {
      const angle =
        ant.travelAngle + Math.sin(model.time * 0.8 + ant.personality) * 0.055;
      desired = {
        x: Math.cos(angle) * (ant.speed + 13),
        y: Math.sin(angle) * (ant.speed + 13),
      };
    } else {
      desired = orbitVelocity(model, ant);
    }
    let affected = false;
    let sugar = null;
    let sugarDistance = Infinity;
    for (const object of model.objects) {
      if (object.type !== "sugar" && object.type !== "honey") continue;
      const d = length(ant.x - object.x, ant.y - object.y);
      if (d < (object.type === "honey" ? 470 : 390) && d < sugarDistance) {
        sugar = object;
        sugarDistance = d;
      }
    }
    if (sugar) {
      const n = sugarDistance || 1;
      const dx = (sugar.x - ant.x) / n;
      const dy = (sugar.y - ant.y) / n;
      const honey = sugar.type === "honey";
      const speed = clamp(
        (sugarDistance - (honey ? 11 : 17)) * (honey ? 4 : 3),
        -25,
        ant.speed + (honey ? 30 : 20),
      );
      // Sugar makes a small moving gathering, rather than overlapping all ants.
      const swirl = sugarDistance < 65 ? (honey ? 7 : 13) : 0;
      desired = { x: dx * speed - dy * swirl, y: dy * speed + dx * swirl };
      affected = true;
    }

    let trail = null;
    let trailNearest = null;
    for (const path of model.paths) {
      if (path.type !== "trail") continue;
      const nearest = nearestOnPath(ant, path, 118);
      if (
        nearest &&
        (!trailNearest || nearest.distance <= trailNearest.distance)
      ) {
        trail = path;
        trailNearest = nearest;
      }
    }
    if (trail) {
      const target = pointAhead(trail, trailNearest, 48);
      const dx = target.x - ant.x;
      const dy = target.y - ant.y;
      const n = length(dx, dy) || 1;
      desired = {
        x: (dx / n) * (ant.speed + 22),
        y: (dy / n) * (ant.speed + 22),
      };
      affected = true;
    }

    for (const object of model.objects) {
      const dx = ant.x - object.x;
      const dy = ant.y - object.y;
      const distance = length(dx, dy);
      const fallback = ant.personality + ant.id * 0.7;
      const nx = distance > 0.1 ? dx / distance : Math.cos(fallback);
      const ny = distance > 0.1 ? dy / distance : Math.sin(fallback);
      if (object.type === "lemon" && distance < 190) {
        const force = 185 * Math.pow(1 - distance / 190, 0.65);
        desired.x += nx * force;
        desired.y += ny * force;
        affected = true;
      }
      if (object.type === "pebble" && distance < object.radius + 34) {
        const force = ((object.radius + 34 - distance) / 34) * 75;
        desired.x += nx * force;
        desired.y += ny * force;
        affected = true;
      }
    }

    const breeze = input && input.breeze;
    if (breeze && Number.isFinite(breeze.x) && Number.isFinite(breeze.y)) {
      const dx = ant.x - breeze.x;
      const dy = ant.y - breeze.y;
      const distance = length(dx, dy);
      if (distance < 235) {
        let nx = distance > 1 ? dx / distance : Math.cos(ant.personality);
        let ny = distance > 1 ? dy / distance : Math.sin(ant.personality);
        const directional = length(
          Number(breeze.dx) || 0,
          Number(breeze.dy) || 0,
        );
        if (directional > 0.01) {
          nx = nx * 0.3 + (breeze.dx / directional) * 0.9;
          ny = ny * 0.3 + (breeze.dy / directional) * 0.9;
        }
        const force = 230 * Math.pow(1 - distance / 235, 0.45);
        desired.x += nx * force;
        desired.y += ny * force;
        affected = true;
      }
    }

    // The soft brush redirects only the small patch being swept. A stationary
    // brush has no force; the caller supplies the current drag displacement.
    const brush = input && input.brush;
    if (
      brush &&
      Number.isFinite(brush.x) &&
      Number.isFinite(brush.y) &&
      Number.isFinite(brush.dx) &&
      Number.isFinite(brush.dy)
    ) {
      const movement = length(brush.dx, brush.dy);
      const distance = length(ant.x - brush.x, ant.y - brush.y);
      if (movement > 0.01 && distance < 80) {
        const force = 210 * (1 - distance / 80) * Math.min(1, movement / 4);
        desired.x += (brush.dx / movement) * force;
        desired.y += (brush.dy / movement) * force;
        affected = true;
      }
    }

    // Small separation keeps gathered ants legible without driving an idle colony out.
    const cellX = Math.floor(ant.x / 26);
    const cellY = Math.floor(ant.y / 26);
    for (let cx = cellX - 1; cx <= cellX + 1; cx++) {
      for (let cy = cellY - 1; cy <= cellY + 1; cy++) {
        const neighbors = neighborGrid.get(cx * 4096 + cy);
        if (!neighbors) continue;
        for (const other of neighbors) {
          if (other === ant || other.escaped || other.held) continue;
          const dx = ant.x - other.x;
          const dy = ant.y - other.y;
          const squared = dx * dx + dy * dy;
          if (squared > 0.0001 && squared < 169) {
            const d = Math.sqrt(squared);
            const force = (13 - d) * 2.4;
            desired.x += (dx / d) * force;
            desired.y += (dy / d) * force;
          }
        }
      }
    }
    if (affected) ant.released = true;
    const magnitude = length(desired.x, desired.y);
    if (magnitude > 115) {
      desired.x *= 115 / magnitude;
      desired.y *= 115 / magnitude;
    }
    return { ...desired, affected };
  }

  // A substep moves at most 2.9 px. Capsule collision radii are at least 10 px,
  // so fast ants cannot tunnel through a thin freehand wall between frames.
  function resolveCollisions(model, ant, previous) {
    let collided = false;
    for (let pass = 0; pass < 3; pass++) {
      let passCollided = false;
      for (const object of model.objects) {
        if (object.type !== "pebble") continue;
        const dx = ant.x - object.x;
        const dy = ant.y - object.y;
        const d = length(dx, dy);
        const radius = object.radius + ANT_RADIUS;
        if (d >= radius) continue;
        const n = d || 1;
        const nx = d > 0.01 ? dx / n : Math.cos(ant.personality);
        const ny = d > 0.01 ? dy / n : Math.sin(ant.personality);
        ant.x = object.x + nx * (radius + 0.1);
        ant.y = object.y + ny * (radius + 0.1);
        deflect(ant, nx, ny);
        collided = true;
        passCollided = true;
      }
      for (const path of model.paths) {
        if (path.type !== "barrier") continue;
        const geometry = geometryFor(path);
        const radius = ANT_RADIUS + path.radius;
        if (boxDistanceSquared(ant, geometry.bounds) >= radius * radius)
          continue;
        for (const segment of geometry.segments) {
          if (boxDistanceSquared(ant, segment) >= radius * radius) continue;
          const { a, b } = segment;
          const closest = closestSegment(ant, a, b);
          if (closest.distance >= radius) continue;
          // Use the pre-move side if a wall was drawn directly over an ant.
          const oldClosest = closestSegment(previous, a, b);
          let nx = previous.x - oldClosest.x;
          let ny = previous.y - oldClosest.y;
          let n = length(nx, ny);
          if (n < 0.01) {
            nx = -closest.dy;
            ny = closest.dx;
            n = length(nx, ny) || 1;
            if (ant.id % 2) {
              nx = -nx;
              ny = -ny;
            }
          }
          nx /= n;
          ny /= n;
          ant.x = closest.x + nx * (radius + 0.15);
          ant.y = closest.y + ny * (radius + 0.15);
          deflect(ant, nx, ny);
          collided = true;
          passCollided = true;
        }
      }
      if (!passCollided) break;
    }
    if (collided) {
      ant.released = true;
      ant.travelAngle = Math.atan2(ant.vy, ant.vx);
    }
  }

  function deflect(ant, nx, ny) {
    const inward = ant.vx * nx + ant.vy * ny;
    if (inward < 0) {
      ant.vx -= nx * inward;
      ant.vy -= ny * inward;
    }
    // A head-on collision chooses a side, then walks around the obstacle.
    if (length(ant.vx, ant.vy) < 23) {
      const sign = ant.id % 2 ? 1 : -1;
      ant.vx = -ny * sign * (ant.speed + 6) + nx * 10;
      ant.vy = nx * sign * (ant.speed + 6) + ny * 10;
    }
  }

  function activateWaitingAnt(model, ant) {
    const along = 0.1 + ((ant.id * 0.618033988749895) % 1) * 0.8;
    const edge = ant.id % 4;
    ant.x = edge === 0 ? 3 : edge === 1 ? model.width - 3 : model.width * along;
    ant.y =
      edge === 2 ? 3 : edge === 3 ? model.height - 3 : model.height * along;
    const angle = Math.atan2(model.orbit.y - ant.y, model.orbit.x - ant.x);
    ant.vx = Math.cos(angle) * ant.speed;
    ant.vy = Math.sin(angle) * ant.speed;
    ant.angle = angle;
    ant.travelAngle = angle;
    ant.phase = Math.atan2(
      (ant.y - model.orbit.y) / model.orbit.ry,
      (ant.x - model.orbit.x) / model.orbit.rx,
    );
    ant.status = "active";
    ant.escaped = false;
    ant.released = false;
    ant.returnAt = null;
    model.reserve--;
    model.active++;
  }

  function returnAnt(model, ant) {
    const inset = 3;
    ant.x = clamp(ant.exitX, inset, model.width - inset);
    ant.y = clamp(ant.exitY, inset, model.height - inset);
    if (ant.exitEdge === "left") ant.x = inset;
    else if (ant.exitEdge === "right") ant.x = model.width - inset;
    else if (ant.exitEdge === "top") ant.y = inset;
    else ant.y = model.height - inset;
    const angle = Math.atan2(model.orbit.y - ant.y, model.orbit.x - ant.x);
    ant.vx = Math.cos(angle) * ant.speed;
    ant.vy = Math.sin(angle) * ant.speed;
    ant.angle = angle;
    ant.travelAngle = angle;
    ant.status = "active";
    ant.escaped = false;
    ant.released = false;
    ant.returnAt = null;
    model.escaped--;
    model.active++;
  }

  // Every clock uses simulation time: pausing or closing a tab cannot advance
  // arrivals or an individual ant's sixty-second outside interval.
  function advancePopulation(model, dt) {
    for (const ant of model.ants) {
      if (ant.status === "outside" && ant.returnAt <= model.time + 1e-9)
        returnAnt(model, ant);
    }
    if (model.reserve > 0 && model.arrivalRate > 0) {
      model.arrivalAccumulator += dt * model.arrivalRate;
      const arriving = Math.min(
        model.reserve,
        Math.floor(model.arrivalAccumulator + 1e-9),
      );
      model.arrivalAccumulator -= arriving;
      for (let i = 0; i < arriving; i++) {
        const ant = model.ants[model.nextWaitingIndex++];
        activateWaitingAnt(model, ant);
      }
    }
    model.lost = model.reserve === 0 && model.active === model.total;
  }

  function buildNeighborGrid(ants) {
    const grid = new Map();
    for (const ant of ants) {
      if (ant.escaped || ant.held) continue;
      const key = Math.floor(ant.x / 26) * 4096 + Math.floor(ant.y / 26);
      const cell = grid.get(key);
      if (cell) cell.push(ant);
      else grid.set(key, [ant]);
    }
    return grid;
  }

  function step(model, dt, input = {}) {
    if (model.won || model.lost || !Number.isFinite(dt) || dt <= 0)
      return model;
    if (!model.populationMode) {
      model.reserve = 0;
      model.active = model.total - model.escaped;
    }
    // Discard excess tab-suspension time, while allowing normal 250 ms slow frames.
    const duration = Math.min(dt, 0.25);
    const steps = Math.ceil(duration / 0.025);
    const substep = duration / steps;
    for (let iteration = 0; iteration < steps; iteration++) {
      model.time += substep;
      if (model.populationMode) {
        advancePopulation(model, substep);
        if (model.lost) {
          releaseCup(model, { cancel: true });
          break;
        }
      }
      const neighborGrid = buildNeighborGrid(model.ants);
      for (const ant of model.ants) {
        if (ant.escaped || ant.held) continue;
        const desired = steer(model, ant, input, neighborGrid);
        const response = 1 - Math.exp(-substep * 8);
        ant.vx += (desired.x - ant.vx) * response;
        ant.vy += (desired.y - ant.vy) * response;
        const previous = { x: ant.x, y: ant.y };
        ant.x += ant.vx * substep;
        ant.y += ant.vy * substep;
        resolveCollisions(model, ant, previous);
        if (length(ant.vx, ant.vy) > 0.5) {
          ant.angle = Math.atan2(ant.vy, ant.vx);
          if (desired.affected) ant.travelAngle = ant.angle;
        }
        if (
          ant.x < 0 ||
          ant.x > model.width ||
          ant.y < 0 ||
          ant.y > model.height
        ) {
          markOutside(model, ant);
        }
      }
      if (model.reserve === 0 && model.escaped === model.total) {
        model.won = true;
        break;
      }
    }
    return model;
  }

  return {
    create,
    addAnts,
    step,
    applyTool,
    eraseAt,
    clearTools,
    captureCup,
    moveCup,
    releaseCup,
    resizeWorld,
  };
});
