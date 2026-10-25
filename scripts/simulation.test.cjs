const test = require("node:test");
const assert = require("node:assert/strict");
const simulation = require("../simulation.js");

function advance(model, seconds, input) {
  for (let frame = 0; frame < Math.ceil(seconds * 60); frame++) {
    simulation.step(model, 1 / 60, input);
  }
  return model;
}

function assertValid(model) {
  assert.equal(model.ants.length, model.total);
  assert.equal(model.ants.filter((ant) => ant.escaped).length, model.escaped);
  assert.ok(model.escaped >= 0 && model.escaped <= model.total);
  for (const ant of model.ants) {
    for (const field of ["x", "y", "vx", "vy", "angle"]) {
      assert.ok(Number.isFinite(ant[field]), `Ant ${field} must stay finite`);
    }
  }
}

function meanDistance(model, point) {
  return (
    model.ants.reduce(
      (sum, ant) => sum + Math.hypot(ant.x - point.x, ant.y - point.y),
      0,
    ) / model.total
  );
}

test("waiting alone does not complete the game", () => {
  const model = simulation.create({ count: 36, seed: 27 });
  advance(model, 90);
  assertValid(model);
  assert.equal(model.escaped, 0);
  assert.equal(model.won, false);
});

test("drawn paths and placed objects can be erased and cleared", () => {
  const model = simulation.create({ seed: 3 });
  assert.equal(
    simulation.applyTool(model, "barrier", [
      { x: 300, y: 100 },
      { x: 300, y: 500 },
    ]),
    true,
  );
  assert.equal(
    simulation.applyTool(model, "trail", [
      { x: 100, y: 150 },
      { x: 900, y: 150 },
    ]),
    true,
  );
  assert.equal(
    simulation.applyTool(model, "pebble", [{ x: 400, y: 300 }]),
    true,
  );
  assert.equal(
    simulation.applyTool(model, "lemon", [{ x: 550, y: 300 }]),
    true,
  );
  assert.equal(
    simulation.applyTool(model, "sugar", [{ x: 700, y: 300 }]),
    true,
  );
  assert.equal(model.objects.length, 3);
  assert.equal(model.paths.length, 2);

  simulation.eraseAt(model, { x: 550, y: 300 }, 40);
  assert.equal(model.objects.length, 2, "Eraser removes the selected object");
  assert.equal(
    model.paths.length,
    2,
    "Nearby independent paths survive erasing an object",
  );
  simulation.clearTools(model);
  assert.equal(model.objects.length, 0);
  assert.equal(model.paths.length, 0);
  advance(model, 1);
  assertValid(model);
});

test("sugar gathers the colony without counting gathered ants as escaped", () => {
  const model = simulation.create({ seed: 1 });
  const center = { x: 500, y: 310 };
  const initialDistance = meanDistance(model, center);
  simulation.applyTool(model, "sugar", [center]);
  advance(model, 35);
  assertValid(model);
  assert.ok(
    meanDistance(model, center) < initialDistance / 4,
    "Ants gather around sugar",
  );
  assert.equal(model.escaped, 0);
  assert.equal(model.won, false);
});

for (const tool of ["lemon", "breeze"]) {
  test(`${tool} moves ants away from its source`, () => {
    const baseline = simulation.create({ seed: 1 });
    const affected = simulation.create({ seed: 1 });
    const center = { x: 500, y: 310 };
    if (tool === "lemon") simulation.applyTool(affected, tool, [center]);
    advance(baseline, 3);
    advance(affected, 3, tool === "breeze" ? { breeze: center } : undefined);
    assertValid(affected);
    assert.ok(
      meanDistance(affected, center) > meanDistance(baseline, center) + 20,
      "The same colony should move noticeably farther from the repelling tool",
    );
  });
}

test("a drawn wall redirects an ant without letting it cross the wall interior", () => {
  const model = simulation.create({ count: 1, seed: 1 });
  simulation.applyTool(model, "barrier", [
    { x: 600, y: 350 },
    { x: 1000, y: 350 },
  ]);
  for (let frame = 0; frame < 30 * 60 && !model.won; frame++) {
    simulation.step(model, 1 / 60);
    const ant = model.ants[0];
    if (ant.x >= 600 && ant.x <= 1000) {
      assert.ok(
        ant.y < 350,
        "The ant stays on its original side of the wall interior",
      );
    }
  }
  assertValid(model);
  assert.equal(
    model.escaped,
    1,
    "The ant can still walk around the obstacle and leave",
  );
});

test("a pebble blocks its footprint and changes the colony route", () => {
  const baseline = simulation.create({ seed: 1 });
  const affected = simulation.create({ seed: 1 });
  const point = { x: 840, y: 310 };
  simulation.applyTool(affected, "pebble", [point]);
  const pebble = affected.objects[0];
  for (let frame = 0; frame < 3 * 60; frame++) {
    simulation.step(affected, 1 / 60);
    for (const ant of affected.ants) {
      assert.ok(
        Math.hypot(ant.x - point.x, ant.y - point.y) >= pebble.radius,
        "Ants cannot occupy the pebble footprint",
      );
    }
  }
  advance(baseline, 3);
  const changedDistance =
    affected.ants.reduce((sum, ant, index) => {
      const original = baseline.ants[index];
      return sum + Math.hypot(ant.x - original.x, ant.y - original.y);
    }, 0) / affected.total;
  assert.ok(changedDistance > 10, "The obstacle noticeably changes the route");
  assertValid(affected);
});

test("drawing an outward trail lets every ant exit through gameplay", () => {
  const model = simulation.create({ seed: 1 });
  simulation.applyTool(model, "trail", [
    { x: 500, y: 155 },
    { x: 720, y: 120 },
    { x: 1040, y: 120 },
  ]);
  advance(model, 45);
  assertValid(model);
  assert.equal(model.escaped, model.total);
  assert.equal(model.won, true);
});

test("gather, erase, then blow is a second playable way to free the entire colony", () => {
  for (const seed of [1, 3, 8]) {
    const model = simulation.create({ seed });
    const center = { x: 500, y: 310 };
    simulation.applyTool(model, "sugar", [center]);
    advance(model, 35);
    simulation.eraseAt(model, center, 40);
    advance(model, 20, { breeze: center });
    assertValid(model);
    assert.equal(model.escaped, model.total, `All ants exit for seed ${seed}`);
    assert.equal(model.won, true);
    const finishTime = model.time;
    advance(model, 2);
    assert.equal(model.time, finishTime, "A completed round stays completed");
  }
});

test("reset starts a clean, deterministic and playable simulation", () => {
  const options = { count: 36, seed: 19 };
  const baseline = simulation.create(options);
  const changed = simulation.create(options);
  simulation.applyTool(changed, "sugar", [{ x: 500, y: 310 }]);
  advance(changed, 5, { breeze: { x: 500, y: 310 } });

  const reset = simulation.create(options);
  assert.equal(reset.escaped, 0);
  assert.equal(reset.won, false);
  assert.equal(reset.time, 0);
  assert.equal(reset.objects.length, 0);
  assert.equal(reset.paths.length, 0);
  assert.deepEqual(reset.ants, baseline.ants);
  advance(reset, 2);
  assertValid(reset);
  assert.ok(reset.time > 0);
});

test("a JSON session restore continues identically and remains winnable", () => {
  const original = simulation.create({ seed: 8 });
  const center = { x: 500, y: 310 };
  simulation.applyTool(original, "sugar", [center]);
  simulation.applyTool(original, "barrier", [
    { x: 900, y: 20 },
    { x: 900, y: 100 },
  ]);
  advance(original, 9);

  // Mirrors sessionStorage: no methods, closures, or prototypes survive JSON.
  const restored = JSON.parse(JSON.stringify(original));
  advance(original, 26);
  advance(restored, 26);
  assert.deepEqual(
    restored,
    original,
    "A restored model produces the same ongoing simulation",
  );
  simulation.clearTools(restored);
  advance(restored, 20, { breeze: center });
  assertValid(restored);
  assert.equal(restored.escaped, restored.total);
  assert.equal(restored.won, true);
});

test("adding ants preserves the current round and survives a session restore", () => {
  const model = simulation.create({ count: 120, seed: 18 });
  simulation.applyTool(model, "sugar", [{ x: 500, y: 310 }]);
  advance(model, 5);
  const before = JSON.parse(JSON.stringify(model));
  const restored = JSON.parse(JSON.stringify(model));

  assert.equal(simulation.addAnts(model, 30), 30);
  assert.equal(simulation.addAnts(restored, 30), 30);
  assert.equal(model.total, 150);
  assert.equal(model.time, before.time);
  assert.equal(model.escaped, before.escaped);
  assert.deepEqual(model.ants.slice(0, 120), before.ants);
  assert.deepEqual(model.objects, before.objects);
  assert.deepEqual(model.paths, before.paths);
  assert.deepEqual(restored, model, "Restored rounds spawn the same new ants");
  assert.equal(new Set(model.ants.map((ant) => ant.id)).size, model.total);
  const added = model.ants.slice(120);
  assert.ok(added.some((ant) => ant.x < 300));
  assert.ok(added.some((ant) => ant.x > 700));
  assert.ok(added.every((ant) => !ant.escaped && !ant.released));
  advance(model, 2);
  assertValid(model);

  // Existing deployed sessions have no stored seed yet.
  delete before.seed;
  const legacyRestored = JSON.parse(JSON.stringify(before));
  simulation.addAnts(before, 30);
  simulation.addAnts(legacyRestored, 30);
  assert.deepEqual(legacyRestored, before);
});

test("population additions respect the round cap and completed games", () => {
  const model = simulation.create({ count: 120, seed: 18 });
  assert.equal(simulation.addAnts(model, -2), 0);
  assert.equal(simulation.addAnts(model, NaN), 0);
  assert.equal(simulation.addAnts(model, Infinity), 0);
  assert.equal(simulation.addAnts(model, 1000), 180);
  assert.equal(model.total, 300);
  assert.equal(simulation.addAnts(model, 30), 0);
  advance(model, 10);
  assertValid(model);
  assert.equal(
    model.escaped,
    0,
    "A larger idle colony still needs intervention",
  );

  const finished = simulation.create({ count: 1, seed: 18 });
  simulation.applyTool(finished, "trail", [
    { x: 840, y: 310 },
    { x: 1040, y: 310 },
  ]);
  advance(finished, 10);
  assert.equal(finished.won, true);
  assert.equal(simulation.addAnts(finished, 30), 0);
  assert.equal(finished.total, 1);
});

test("ants added during an escape remain part of the all-out win condition", () => {
  const model = simulation.create({ count: 120, seed: 18 });
  simulation.applyTool(model, "trail", [
    { x: 500, y: 155 },
    { x: 720, y: 120 },
    { x: 1040, y: 120 },
  ]);
  advance(model, 20);
  assert.ok(model.escaped > 0 && model.escaped < model.total);
  const escapedBefore = model.escaped;
  assert.equal(simulation.addAnts(model, 60), 60);
  assert.equal(model.total, 180);
  assert.equal(model.escaped, escapedBefore);
  assert.equal(model.won, false);
  advance(model, 50);
  assertValid(model);
  assert.equal(model.escaped, 180);
  assert.equal(model.won, true);
});

function assertPopulation(model) {
  assert.equal(model.ants.length, model.total);
  assert.equal(
    model.ants.filter((ant) => ant.status === "active").length,
    model.active,
  );
  assert.equal(
    model.ants.filter((ant) => ant.status === "waiting").length,
    model.reserve,
  );
  assert.equal(
    model.ants.filter((ant) => ant.status === "outside").length,
    model.escaped,
  );
  assert.equal(model.active + model.reserve + model.escaped, model.total);
  assert.ok(
    model.ants.every((ant) => ant.escaped === (ant.status !== "active")),
  );
}

test("the finite 2000-ant pool arrives gradually and loses only when every ant is inside", () => {
  const model = simulation.create({
    count: 2000,
    initialCount: 200,
    arrivalRate: 30,
    returnDelay: 60,
    populationMode: true,
    seed: 18,
  });
  assertPopulation(model);
  assert.equal(model.active, 200);
  assert.equal(model.reserve, 1800);
  assert.equal(model.escaped, 0, "Waiting ants do not count as escaped");
  assert.equal(model.lost, false);
  advance(model, 30);
  assert.equal(model.active, 1100);
  assert.equal(model.reserve, 900);
  assert.equal(model.lost, false);
  advance(model, 30);
  assertPopulation(model);
  assert.equal(model.active, 2000);
  assert.equal(model.reserve, 0);
  assert.equal(model.escaped, 0);
  assert.equal(model.lost, true);
  assert.equal(model.won, false);
  const finishedTime = model.time;
  advance(model, 2);
  assert.equal(model.time, finishedTime, "Loss freezes the round");
});

test("each outside ant returns after 60 simulation seconds, including after restore", () => {
  const model = simulation.create({
    count: 6,
    initialCount: 2,
    arrivalRate: 0,
    returnDelay: 60,
    populationMode: true,
    seed: 18,
  });
  simulation.applyTool(model, "trail", [
    { x: 160, y: 310 },
    { x: 1040, y: 310 },
  ]);
  while (model.escaped === 0 && model.time < 30) simulation.step(model, 1 / 60);
  const outside = model.ants.find((ant) => ant.status === "outside");
  assert.ok(outside);
  assert.ok(Math.abs(outside.returnAt - model.time - 60) < 1e-8);
  simulation.clearTools(model);
  const checkpoint = JSON.parse(JSON.stringify(model));
  simulation.step(model, 0);
  assert.deepEqual(
    model,
    checkpoint,
    "Paused time cannot cause arrivals or returns",
  );
  const restored = JSON.parse(JSON.stringify(model));
  while (model.time < outside.returnAt - 0.05) {
    simulation.step(model, 1 / 60);
    simulation.step(restored, 1 / 60);
  }
  assert.equal(
    outside.status,
    "outside",
    "The ant stays out for the full delay",
  );
  const beforeReturn = model.escaped;
  for (let frame = 0; frame < 5; frame++) {
    simulation.step(model, 1 / 60);
    simulation.step(restored, 1 / 60);
  }
  assert.equal(outside.status, "active");
  assert.equal(outside.returnAt, null);
  assert.equal(model.escaped, beforeReturn - 1);
  assert.ok(outside.x >= 0 && outside.x <= model.width);
  assert.ok(outside.y >= 0 && outside.y <= model.height);
  assertPopulation(model);
  assert.deepEqual(restored, model);
});

test("all 2000 ants can be sent outside through actual gathering and breeze gameplay", () => {
  const model = simulation.create({
    count: 2000,
    initialCount: 200,
    arrivalRate: 30,
    returnDelay: 60,
    populationMode: true,
    seed: 18,
  });
  simulation.applyTool(model, "sugar", [{ x: 500, y: 310 }]);
  advance(model, 50);
  assertPopulation(model);
  assert.equal(model.active, 1700);
  assert.equal(model.reserve, 300);
  assert.equal(model.escaped, 0);
  assert.equal(model.lost, false);
  simulation.clearTools(model);
  advance(model, 40, { breeze: { x: 500, y: 310 } });
  assertPopulation(model);
  assert.equal(model.reserve, 0);
  assert.equal(model.active, 0);
  assert.equal(model.escaped, 2000);
  assert.equal(model.won, true);
  assert.equal(model.lost, false);
  const finishTime = model.time;
  advance(model, 65);
  assert.equal(
    model.time,
    finishTime,
    "A won round does not start returning ants",
  );
});

test("a cup carries only the ants covered at pickup and releases them safely", () => {
  const model = simulation.create({ count: 36, seed: 18 });
  const pickup = { x: model.ants[0].x, y: model.ants[0].y };
  const captured = simulation.captureCup(model, pickup, 70);
  assert.ok(captured > 0 && captured < model.total);
  const ids = [...model.cup.ids];
  const other = model.ants.find((ant) => !ids.includes(ant.id));
  simulation.moveCup(model, { x: other.x, y: other.y });
  assert.deepEqual(
    model.cup.ids,
    ids,
    "Moving a cup does not vacuum up more ants",
  );
  assert.equal(other.held, undefined);
  const heldPositions = model.ants
    .filter((ant) => ant.held)
    .map((ant) => ({ x: ant.x, y: ant.y }));
  advance(model, 1);
  assert.deepEqual(
    model.ants.filter((ant) => ant.held).map((ant) => ({ x: ant.x, y: ant.y })),
    heldPositions,
  );
  assert.equal(
    model.escaped,
    0,
    "Covered ants are still part of the on-screen colony",
  );
  assert.equal(simulation.releaseCup(model), 0);
  assert.equal(model.cup, null);
  assert.ok(model.ants.every((ant) => !ant.held));
  assert.ok(
    model.ants.every(
      (ant) =>
        ant.x >= 0 &&
        ant.x <= model.width &&
        ant.y >= 0 &&
        ant.y <= model.height,
    ),
  );
  assertValid(model);
});

test("cup cancellation restores pickup positions even after an off-screen drag", () => {
  const model = simulation.create({ count: 36, seed: 18 });
  simulation.captureCup(model, { x: model.ants[0].x, y: model.ants[0].y });
  const origins = model.cup.offsets.map((offset) => ({
    id: offset.id,
    x: offset.originX,
    y: offset.originY,
  }));
  const restored = JSON.parse(JSON.stringify(model));
  simulation.moveCup(restored, { x: -35, y: 200 });
  assert.equal(simulation.releaseCup(restored, { cancel: true }), 0);
  assert.equal(restored.escaped, 0);
  assert.equal(restored.cup, null);
  for (const origin of origins) {
    const ant = restored.ants.find((item) => item.id === origin.id);
    assert.equal(ant.x, origin.x);
    assert.equal(ant.y, origin.y);
    assert.equal(ant.held, false);
  }
});

test("cup-carried ants count as outside and return through the same edge after a minute", () => {
  const model = simulation.create({
    count: 3,
    initialCount: 1,
    arrivalRate: 0,
    populationMode: true,
    seed: 18,
  });
  const ant = model.ants[0];
  assert.equal(simulation.captureCup(model, { x: ant.x, y: ant.y }), 1);
  simulation.moveCup(model, { x: 1035, y: 300 });
  assert.equal(simulation.releaseCup(model), 1);
  assert.equal(model.escaped, 1);
  assert.equal(model.active, 0);
  assert.equal(ant.exitEdge, "right");
  assert.equal(ant.returnAt, 60);
  assert.equal(ant.held, false);
  advance(model, 59.8);
  assert.equal(ant.status, "outside");
  advance(model, 0.3);
  assert.equal(ant.status, "active");
  assert.equal(model.escaped, 0);
  assert.equal(model.active, 1);
  assert.ok(ant.x > model.width - 30 && ant.x < model.width);
  assertPopulation(model);
});

test("carrying the final ants outside triggers the same all-out win condition", () => {
  const model = simulation.create({
    count: 2,
    initialCount: 1,
    arrivalRate: 0.1,
    populationMode: true,
    seed: 18,
  });
  simulation.captureCup(model, { x: model.ants[0].x, y: model.ants[0].y });
  simulation.moveCup(model, { x: -30, y: 300 });
  simulation.releaseCup(model);
  assert.equal(
    model.won,
    false,
    "An ant still waiting to enter prevents a win",
  );
  advance(model, 10);
  const last = model.ants.find((ant) => ant.status === "active");
  assert.ok(last);
  simulation.captureCup(model, { x: last.x, y: last.y });
  simulation.moveCup(model, { x: model.width + 30, y: 300 });
  assert.equal(simulation.releaseCup(model), 1);
  assert.equal(model.won, true);
  assert.equal(model.escaped, 2);
  assert.equal(model.active, 0);
  assert.equal(model.cup, null);
  assertPopulation(model);
});

test("honey attracts ants from farther away than sugar", () => {
  const honey = simulation.create({ count: 1, seed: 18 });
  const sugar = simulation.create({ count: 1, seed: 18 });
  simulation.applyTool(honey, "honey", [{ x: 400, y: 310 }]);
  simulation.applyTool(sugar, "sugar", [{ x: 400, y: 310 }]);
  advance(honey, 2);
  advance(sugar, 2);
  assert.ok(honey.ants[0].x < sugar.ants[0].x - 35);
  assert.equal(honey.ants[0].released, true);
});

test("a brush pushes locally in its drag direction and does nothing while stationary", () => {
  const baseline = simulation.create({ count: 2, seed: 18 });
  const stationary = simulation.create({ count: 2, seed: 18 });
  const brushed = simulation.create({ count: 2, seed: 18 });
  const point = { x: baseline.ants[0].x, y: baseline.ants[0].y };
  advance(baseline, 0.5);
  advance(stationary, 0.5, { brush: { ...point, dx: 0, dy: 0 } });
  advance(brushed, 0.5, { brush: { ...point, dx: -10, dy: 0 } });
  assert.deepEqual(stationary, baseline);
  assert.ok(brushed.ants[0].x < baseline.ants[0].x - 20);
  assert.deepEqual(
    brushed.ants[1],
    baseline.ants[1],
    "A distant ant is not affected by a local brush stroke",
  );
});

test("resizing preserves the round, releases a cup, and rebuilds path geometry", () => {
  const model = simulation.create({
    count: 8,
    initialCount: 3,
    arrivalRate: 0,
    populationMode: true,
    seed: 18,
  });
  simulation.captureCup(model, { x: model.ants[0].x, y: model.ants[0].y }, 20);
  simulation.moveCup(model, { x: 1035, y: 300 });
  simulation.releaseCup(model);
  simulation.applyTool(model, "barrier", [
    { x: 800, y: 20 },
    { x: 800, y: 600 },
  ]);
  simulation.applyTool(model, "honey", [{ x: 300, y: 200 }]);
  advance(model, 0.2);
  const oldPath = model.paths[0];
  const active = model.ants.find((ant) => ant.status === "active");
  simulation.captureCup(model, { x: active.x, y: active.y }, 20);
  const before = JSON.parse(JSON.stringify(model));
  simulation.moveCup(model, { x: -30, y: 300 });
  simulation.resizeWorld(model, 2000, 1860);
  assert.equal(model.cup, null);
  assert.ok(model.ants.every((ant) => !ant.held));
  assert.equal(model.time, before.time);
  assert.equal(model.active, before.active);
  assert.equal(model.reserve, before.reserve);
  assert.equal(model.escaped, before.escaped);
  assert.equal(model.ants[0].returnAt, before.ants[0].returnAt);
  assert.equal(model.ants[0].exitX, before.ants[0].exitX * 2);
  assert.equal(model.ants[0].exitY, before.ants[0].exitY * 3);
  assert.equal(model.objects[0].x, 600);
  assert.equal(model.objects[0].y, 600);
  assert.equal(model.objects[0].radius, before.objects[0].radius);
  assert.notEqual(model.paths[0], oldPath);
  assert.deepEqual(model.paths[0].points, [
    { x: 1600, y: 60 },
    { x: 1600, y: 1800 },
  ]);
  assert.ok(
    Math.abs(
      Math.hypot(active.vx, active.vy) -
        Math.hypot(before.ants[active.id].vx, before.ants[active.id].vy),
    ) < 1e-8,
  );
  assert.equal(simulation.eraseAt(model, { x: 1600, y: 900 }, 5), true);
  assert.equal(
    model.paths.length,
    0,
    "The remapped wall can be erased at its new location",
  );
  assertPopulation(model);
});

test("all 2000 ants can be freed using only visible honey and cup tools", () => {
  const model = simulation.create({
    count: 2000,
    initialCount: 200,
    arrivalRate: 30,
    returnDelay: 60,
    populationMode: true,
    seed: 18,
  });
  const gatheringPoint = { x: 500, y: 310 };
  simulation.applyTool(model, "honey", [gatheringPoint]);
  advance(model, 50);
  assert.equal(model.escaped, 0);
  assert.equal(model.active, 1700);
  let carriedOutside = 0;
  let trips = 0;
  let firstReturnAt = Infinity;
  while (!model.won && !model.lost && model.time < 100) {
    const captured = simulation.captureCup(model, gatheringPoint, 70);
    if (captured > 0) {
      simulation.moveCup(model, { x: model.width + 40, y: 310 });
      advance(model, 0.25); // Arrivals and uncaptured ants keep moving during a carry.
      const released = simulation.releaseCup(model);
      assert.equal(released, captured);
      carriedOutside += released;
      trips++;
      for (const ant of model.ants) {
        if (ant.status === "outside")
          firstReturnAt = Math.min(firstReturnAt, ant.returnAt);
      }
    } else {
      simulation.releaseCup(model);
    }
    assertPopulation(model);
    assert.ok(model.ants.every((ant) => !ant.held));
    advance(model, 0.75);
  }
  assert.ok(trips > 1, "The complete colony is carried out in several cup trips");
  assert.equal(carriedOutside, 2000);
  assert.equal(model.escaped, 2000);
  assert.equal(model.active, 0);
  assert.equal(model.reserve, 0);
  assert.equal(model.won, true);
  assert.equal(model.lost, false);
  assert.ok(model.time < firstReturnAt, "Every ant is freed before the first return");
  assert.equal(model.paths.length, 0);
  assert.ok(model.objects.every((object) => object.type === "honey"));
});
