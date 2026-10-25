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
    const count = clamp(Math.floor(Number(options.count) || 36), 1, 160);
    const random = randomGenerator(
      options.seed === undefined ? 1 : options.seed,
    );
    const model = {
      width,
      height,
      total: count,
      escaped: 0,
      time: 0,
      won: false,
      ants: [],
      objects: [],
      paths: [],
      nextId: 1,
      orbit: {
        x: width / 2,
        y: height / 2,
        rx: width * 0.34,
        ry: height * 0.25,
      },
    };
    for (let id = 0; id < count; id++) {
      const phase = (id / count) * TAU;
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
        escaped: false,
        released: false,
      });
    }
    return model;
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
    if (model.won || !Array.isArray(points) || !points.length) return false;
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
    if (!["pebble", "lemon", "sugar"].includes(type)) return false;
    const point = cleanPoint(model, points[points.length - 1]);
    if (!point) return false;
    if (model.objects.length >= MAX_OBJECTS) model.objects.shift();
    model.objects.push({
      id: model.nextId++,
      type,
      x: point.x,
      y: point.y,
      radius: type === "pebble" ? 27 : type === "lemon" ? 25 : 12,
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

  function nearestOnPath(point, path) {
    let nearest = null;
    for (let index = 0; index < path.points.length - 1; index++) {
      const current = closestSegment(
        point,
        path.points[index],
        path.points[index + 1],
      );
      if (!nearest || current.distance < nearest.distance)
        nearest = { ...current, index };
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
      (path) => nearestOnPath(point, path).distance > reach + path.radius,
    );
    return before !== model.objects.length + model.paths.length;
  }

  function clearTools(model) {
    model.objects.length = 0;
    model.paths.length = 0;
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

  function steer(model, ant, input) {
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
      if (object.type !== "sugar") continue;
      const d = length(ant.x - object.x, ant.y - object.y);
      if (d < 390 && d < sugarDistance) {
        sugar = object;
        sugarDistance = d;
      }
    }
    if (sugar) {
      const n = sugarDistance || 1;
      const dx = (sugar.x - ant.x) / n;
      const dy = (sugar.y - ant.y) / n;
      const speed = clamp((sugarDistance - 17) * 3, -25, ant.speed + 20);
      // Sugar makes a small moving gathering, rather than overlapping all ants.
      const swirl = sugarDistance < 65 ? 13 : 0;
      desired = { x: dx * speed - dy * swirl, y: dy * speed + dx * swirl };
      affected = true;
    }

    let trail = null;
    let trailNearest = null;
    for (const path of model.paths) {
      if (path.type !== "trail") continue;
      const nearest = nearestOnPath(ant, path);
      if (
        nearest.distance < 118 &&
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

    // Small separation keeps gathered ants legible without driving an idle colony out.
    for (const other of model.ants) {
      if (other === ant || other.escaped) continue;
      const dx = ant.x - other.x;
      const dy = ant.y - other.y;
      const d = length(dx, dy);
      if (d > 0.01 && d < 13) {
        const force = (13 - d) * 2.4;
        desired.x += (dx / d) * force;
        desired.y += (dy / d) * force;
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
      }
      for (const path of model.paths) {
        if (path.type !== "barrier") continue;
        for (let i = 0; i < path.points.length - 1; i++) {
          const a = path.points[i];
          const b = path.points[i + 1];
          const closest = closestSegment(ant, a, b);
          const radius = ANT_RADIUS + path.radius;
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
        }
      }
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

  function step(model, dt, input = {}) {
    if (model.won || !Number.isFinite(dt) || dt <= 0) return model;
    // Discard excess tab-suspension time, while allowing normal 250 ms slow frames.
    const duration = Math.min(dt, 0.25);
    const steps = Math.ceil(duration / 0.025);
    const substep = duration / steps;
    for (let iteration = 0; iteration < steps; iteration++) {
      model.time += substep;
      for (const ant of model.ants) {
        if (ant.escaped) continue;
        const desired = steer(model, ant, input);
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
          ant.escaped = true;
          model.escaped++;
        }
      }
      if (model.escaped === model.total) {
        model.won = true;
        break;
      }
    }
    return model;
  }

  return { create, step, applyTool, eraseAt, clearTools };
});
