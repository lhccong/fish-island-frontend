const assert = require('node:assert/strict');
const { test } = require('node:test');
require('ts-node').register({
  transpileOnly: true,
  compilerOptions: { module: 'CommonJS', target: 'ES2020' },
});
const { ages, events, talents } = require('../src/pages/Game/Life/engine/data');
const { start, next, summary, end, pull, pick, exclude } = require('../src/pages/Game/Life/engine/core');
const { randomAllocation } = require('../src/pages/Game/Life/allocation');
const { CONG_EVENT_ID, CONG_ACHIEVEMENT_ID } = require('../src/pages/Game/Life/engine/data/island');
const { check: canTriggerEvent } = require('../src/pages/Game/Life/engine/core/event');
const { trigger: triggerAchievement } = require('../src/pages/Game/Life/engine/core/achievement');
const baseAges = require('../src/pages/Game/Life/engine/data/age').default;

const profile = () => ({
  times: 0, talents: new Set(), events: new Set(), achievements: new Set(),
});
const allocation = { charm: 4, intelligence: 4, strength: 4, money: 4, spirit: 4 };
const options = { count: 10, rate: { base: new Map([[0, 889], [1, 100], [2, 10], [3, 1]]), additions: {} } };
function seeded(seed) {
  return (max = 1, min = 0) => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return min + Math.floor(seed / 4294967296 * (max - min + 1));
  };
}

test('birth pool preserves ordinary and special events from repeated age rows', () => {
  const ids = ages.get(0).event.flat().map(([id]) => id);
  for (const id of [10001, 10002, 10494, 11503]) assert.ok(ids.includes(id), `Missing ${id}`);
  const result = next(start(profile(), allocation, []).state, profile(), seeded(1));
  assert.equal(result.age, 0);
  assert.ok(result.events.length);
});

test('random allocation spends all points, respects caps and varies across seeds', () => {
  const outcomes = new Set();
  for (let total = 0; total <= 50; total++) {
    for (let seed = 1; seed <= 50; seed++) {
      const result = randomAllocation(total, 10, seeded(seed));
      assert.equal(Object.values(result).reduce((sum, value) => sum + value, 0), total);
      assert.ok(Object.values(result).every(value => Number.isInteger(value) && value >= 0 && value <= 10));
      if (total === 20) outcomes.add(JSON.stringify(result));
    }
  }
  assert.ok(outcomes.size > 1);
  assert.throws(() => randomAllocation(51), RangeError);
});

test('all age pools have valid event references and positive weights', () => {
  assert.equal(ages.size, 501);
  for (const [age, row] of ages) {
    assert.ok(row.event.flat().length, `Empty age ${age}`);
    for (const [id, weight] of row.event.flat()) {
      assert.ok(events.has(id), `Age ${age}: unknown event ${id}`);
      assert.ok(Number.isFinite(weight) && weight > 0);
    }
  }
});

test('island encounter is in the ordinary pool only at ages 18 through 60', () => {
  const originalEvents = require('../src/pages/Game/Life/engine/data/event').default;
  const originalAchievements = require('../src/pages/Game/Life/engine/data/achievement').default;
  assert.equal(originalEvents.has(CONG_EVENT_ID), false);
  assert.equal(originalAchievements.has(CONG_ACHIEVEMENT_ID), false);
  for (const [age, row] of ages) {
    assert.equal(row.event.flat().some(([id]) => id === CONG_EVENT_ID), age >= 18 && age <= 60);
    assert.equal(baseAges.get(age).event.flat().some(([id]) => id === CONG_EVENT_ID), false);
    const filtered = row.event.map(pool => pool.filter(([id]) => id !== CONG_EVENT_ID));
    assert.deepEqual(filtered, baseAges.get(age).event);
  }
});

test('meeting Cong grants attributes and achievement once, then persists on completion', () => {
  const saved = profile();
  let state = start(saved, allocation, []).state;
  assert.equal(canTriggerEvent(CONG_EVENT_ID, state, saved), false);
  assert.equal(triggerAchievement('TRAJECTORY', state, saved).triggers.includes(CONG_ACHIEVEMENT_ID), false);
  state = { ...state, props: { ...state.props, current: { ...state.props.current, age: 17 } } };
  // The new event is the final weighted entry: select the end of the range.
  const encounter = next(state, saved, max => max);
  assert.equal(encounter.age, 18);
  assert.ok(encounter.events.includes(CONG_EVENT_ID));
  assert.equal(encounter.state.props.current.intelligence, allocation.intelligence + 2);
  assert.equal(encounter.state.props.current.spirit, allocation.spirit + 2);
  assert.ok(encounter.achievements.includes(CONG_ACHIEVEMENT_ID));
  assert.equal(canTriggerEvent(CONG_EVENT_ID, encounter.state, saved), false);
  assert.equal(triggerAchievement('TRAJECTORY', encounter.state, saved).triggers.includes(CONG_ACHIEVEMENT_ID), false);
  const completed = end(summary(encounter.state, saved).state, saved).profile;
  assert.ok(completed.events.has(CONG_EVENT_ID));
  assert.ok(completed.achievements.has(CONG_ACHIEVEMENT_ID));
  let secondLife = start(completed, allocation, []).state;
  secondLife = { ...secondLife, props: { ...secondLife.props, current: { ...secondLife.props.current, age: 17 } } };
  const again = next(secondLife, completed, max => max);
  assert.ok(again.events.includes(CONG_EVENT_ID));
  assert.equal(again.achievements.includes(CONG_ACHIEVEMENT_ID), false);
  secondLife = { ...secondLife, props: { ...secondLife.props, current: { ...secondLife.props.current, age: 61 } } };
  assert.equal(canTriggerEvent(CONG_EVENT_ID, secondLife, completed), false);
});

test('200 seeded lives complete birth, yearly progression, summary and persistence', () => {
  let saved = profile();
  for (let seed = 1; seed <= 200; seed++) {
    const rng = seeded(seed);
    const selected = [];
    for (const id of pull(options, saved, rng)) {
      if (!exclude(id, selected) && selected.length < 3) selected.push(id);
    }
    const replacement = pick(selected, rng);
    let state = start(saved, allocation, replacement.talents.talents).state;
    let years = 0;
    while (state.life > 0 && years < 1000) {
      const result = next(state, saved, rng);
      assert.ok(result.events.length, `Seed ${seed}, age ${result.age}`);
      state = result.state;
      years++;
    }
    assert.ok(state.life <= 0, `Seed ${seed} did not end`);
    const result = summary(state, saved);
    assert.ok(Number.isFinite(result.summary));
    saved = end(result.state, saved, [selected[0]]).profile;
    assert.equal(saved.times, seed);
    assert.ok(saved.events.size > 0);
    assert.ok(saved.talents.has(selected[0]));
  }
});

test('generated age pools match the remake workbook transformer', {
  skip: !process.env.REMAKE_ROOT || !process.env.XLSX_MODULE,
}, () => {
  const { readAges } = require('../scripts/generate-life-ages.cjs');
  const expected = readAges(process.env.REMAKE_ROOT, require(process.env.XLSX_MODULE));
  assert.deepEqual(Array.from(baseAges), expected);
});
