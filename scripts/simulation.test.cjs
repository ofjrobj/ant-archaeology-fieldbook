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
