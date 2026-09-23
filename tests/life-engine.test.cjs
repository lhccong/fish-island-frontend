const assert = require('node:assert/strict');
const { test } = require('node:test');
require('ts-node').register({
  transpileOnly: true,
  compilerOptions: { module: 'CommonJS', target: 'ES2020' },
});
const { ages, events, talents, characters } = require('../src/pages/Game/Life/engine/data');
const { start, next, summary, end, pull, pick, exclude } = require('../src/pages/Game/Life/engine/core');
const { randomAllocation } = require('../src/pages/Game/Life/allocation');
const CONG_EVENT_ID = 900001;
const CONG_ACHIEVEMENT_ID = 900001;
const { check: canTriggerEvent, trigger: triggerEvent } = require('../src/pages/Game/Life/engine/core/event');
const { trigger: triggerAchievement } = require('../src/pages/Game/Life/engine/core/achievement');
const { propsEffect, createHLProperties } = require('../src/pages/Game/Life/engine/core/state');
const { yearlyEventPools } = require('../src/pages/Game/Life/engine/core/game');

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

test('every celebrity starts with preset properties and talents without a point-budget constraint', () => {
  for (const character of characters.values()) {
    const preset = { charm: character.property.CHR, intelligence: character.property.INT, strength: character.property.STR, money: character.property.MNY, spirit: 5 };
    const saved = profile();
    const result = start(saved, preset, new Set(character.talent));
    for (const [key, value] of Object.entries(preset)) assert.equal(result.state.props.current[key], value, character.name);
    assert.deepEqual([...result.state.talents], character.talent);
    const birth = next(result.state, saved, seeded(character.id));
    assert.equal(birth.age, 0, character.name);
    assert.ok(birth.events.length, character.name);
  }
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
  assert.equal(originalEvents.has(CONG_EVENT_ID), true);
  assert.equal(originalAchievements.has(CONG_ACHIEVEMENT_ID), true);
  assert.equal(events, originalEvents);
  assert.equal(ages, require('../src/pages/Game/Life/engine/data/age').default);
  for (const [age, row] of ages) {
    assert.equal(row.event.flat().some(([id]) => id === CONG_EVENT_ID), age >= 18 && age <= 60);
    const occurrences = row.event.flat().filter(([id]) => id === CONG_EVENT_ID);
    assert.equal(occurrences.length, age >= 18 && age <= 60 ? 1 : 0);
    if (occurrences.length) assert.deepEqual(occurrences[0], [CONG_EVENT_ID, 1]);
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

test('cultivation encounter requires an adult cultivator, costs 50 strength and occurs once', () => {
  const id = 900002;
  const saved = profile();
  const initial = start(saved, { ...allocation, strength: 100 }, []).state;
  const atAge = (age, seen) => ({
    ...initial,
    props: { ...initial.props, current: { ...initial.props.current, age } },
    events: new Set(seen),
  });
  assert.equal(canTriggerEvent(id, atAge(17, [10323]), saved), false);
  assert.equal(canTriggerEvent(id, atAge(18, []), saved), false);
  for (const entry of [10323, 40001, 40003, 40061]) {
    assert.equal(canTriggerEvent(id, atAge(18, [entry]), saved), true);
  }
  assert.equal(canTriggerEvent(id, atAge(500, [10323]), saved), false);
  assert.equal(triggerAchievement('TRAJECTORY', atAge(149, [10323]), saved).triggers.includes(id), false);
  const result = next(atAge(149, [10323]), saved, max => max);
  assert.equal(result.age, 150);
  assert.deepEqual(result.events, [id]);
  assert.equal(result.state.props.current.strength, 50);
  assert.equal(result.state.props.current.intelligence, allocation.intelligence);
  assert.equal(result.state.props.current.spirit, allocation.spirit);
  assert.equal(result.state.life, initial.life);
  assert.equal(canTriggerEvent(id, result.state, saved), false);
  assert.ok(result.achievements.includes(id));
  assert.ok(result.state.achievements.has(id));
  assert.equal(triggerAchievement('TRAJECTORY', result.state, saved).triggers.includes(id), false);
  const achievement = require('../src/pages/Game/Life/engine/data/achievement').default.get(id);
  assert.equal(achievement.name, '螺丝的强制爱');
  const completed = end(summary(result.state, saved).state, saved).profile;
  assert.ok(completed.events.has(id));
  assert.ok(completed.achievements.has(id));
  const again = next(atAge(149, [10323]), completed, max => max);
  assert.ok(again.events.includes(id));
  assert.equal(again.achievements.includes(id), false);
  for (const [age, row] of ages) {
    const occurrences = row.event.flat().filter(([event]) => event === id);
    assert.equal(occurrences.length, age >= 18 && age < 500 ? 1 : 0);
    if (occurrences.length) assert.deepEqual(occurrences[0], [id, 1]);
  }
});

test('generated age pools preserve remake data except for the added local encounters', {
  skip: !process.env.REMAKE_ROOT || !process.env.XLSX_MODULE,
}, () => {
  const { readAges } = require('../scripts/generate-life-ages.cjs');
  const expected = readAges(process.env.REMAKE_ROOT, require(process.env.XLSX_MODULE));
  const withoutIsland = Array.from(ages, ([age, row]) => [age, {
    ...row, event: row.event.map(pool => pool.filter(([id]) => id < 900000)),
  }]);
  assert.deepEqual(withoutIsland, expected);
});

function atAge(age, seen = [], overrides = {}) {
  const state = start(profile(), { ...allocation, ...overrides }, []).state;
  return {
    ...state,
    events: new Set(seen),
    props: { ...state.props, current: { ...state.props.current, age } },
  };
}

test('new random events occupy only their age ranges and branch outcomes cannot be drawn', () => {
  const additions = Array.from(events.values()).filter(event => event.id >= 900010 && event.id < 910000);
  assert.equal(additions.length, 76);
  for (const event of additions) {
    for (const [age, row] of ages) {
      const entries = row.event.flat().filter(([id]) => id === event.id);
      const expected = event.ages && age >= event.ages[0] && age <= event.ages[1] ? 1 : 0;
      assert.equal(entries.length, expected, `Event ${event.id}, age ${age}`);
    }
    for (const [target, weight] of event.randomBranch || []) {
      assert.ok(weight > 0);
      assert.ok(events.has(target), `Unknown branch ${target}`);
      assert.equal(events.get(target).NoRandom, true);
    }
    if (!event.ages) {
      assert.equal(canTriggerEvent(event.id, atAge(30), profile()), false);
      continue;
    }
    assert.equal(canTriggerEvent(event.id, atAge(event.ages[0] - 1), profile()), false);
    assert.equal(canTriggerEvent(event.id, atAge(event.ages[1] + 1), profile()), false);
    assert.equal(canTriggerEvent(event.id, atAge(event.ages[0], [event.id]), profile()), false);
  }
});

test('specific ages, boy event, low point, and mutually exclusive guessing are enforced', () => {
  const cases = [
    [900010, 0, true], [900010, 3, true], [900010, 4, false],
    [900011, 16, true], [900011, 17, false],
    [900013, 10, true], [900013, 11, false],
    [900022, 18, true], [900022, 50, true], [900022, 51, false],
    [900047, 17, false], [900047, 18, true], [900047, 19, false],
  ];
  for (const [id, age, expected] of cases) assert.equal(canTriggerEvent(id, atAge(age), profile()), expected);
  assert.equal(canTriggerEvent(900012, atAge(25, [10001]), profile()), true);
  assert.equal(canTriggerEvent(900012, atAge(25, [10002]), profile()), false);
  assert.equal(canTriggerEvent(900012, atAge(24, [10001]), profile()), false);
  assert.equal(canTriggerEvent(900014, atAge(30), profile()), false);
  assert.equal(canTriggerEvent(900014, atAge(30, [], { money: 2 }), profile()), true);
  assert.equal(canTriggerEvent(900014, atAge(30, [], { spirit: 2 }), profile()), true);
  assert.equal(canTriggerEvent(900032, atAge(30, [900033]), profile()), false);
  assert.equal(canTriggerEvent(900033, atAge(30, [900032]), profile()), false);
  assert.equal(canTriggerEvent(900002, atAge(30, [900039]), profile()), true);
});

test('all specified additive effects change only the intended attributes', () => {
  const effects = new Map([
    [900011, { strength: 1 }],
    [900014, { money: 3, intelligence: -1 }], [900015, { strength: -3 }],
    [900018, { strength: -2, intelligence: -2 }],
    [900020, { charm: 1, intelligence: 1, strength: 1, money: 1, spirit: 1 }],
    [900021, { strength: -1, intelligence: -1, spirit: -5 }],
    [900022, { strength: -1, spirit: -1, money: 1 }],
    [900029, { money: -100, strength: -2, spirit: -10 }],
    [900030, { money: -1, spirit: -1 }],
    [900032, { intelligence: 1 }], [900033, { intelligence: -1 }],
    [900034, { strength: -1, money: 1, spirit: -1 }],
    [900035, { strength: -1, money: -1, spirit: -1 }],
    [900036, { money: -3, spirit: -1 }], [900037, { strength: -4 }],
    [900038, { money: 5 }], [900039, { strength: -1, money: -2 }],
    [900041, { intelligence: 2, spirit: 2 }], [900042, { strength: 3, spirit: 1 }],
    [900043, { intelligence: 2, spirit: 1, strength: -1 }],
    [900044, { intelligence: 2, spirit: -2 }], [900045, { intelligence: 2, spirit: 1, charm: 1 }],
    [900047, { intelligence: -1, spirit: 2 }],
  ]);
  for (const [id, delta] of effects) {
    const state = atAge(30);
    const result = triggerEvent(id, state, profile());
    for (const [key, value] of Object.entries(state.props.current)) {
      assert.equal(result.state.props.current[key], value + (delta[key] || 0), `Event ${id}, ${key}`);
    }
    assert.equal(result.state.life, 1);
  }
});

test('Heyi resolves either random outcome immediately and allows the next year', () => {
  const saved = profile();
  const initial = atAge(30);
  assert.deepEqual(events.get(900019).randomBranch, [[900020, 1], [900021, 1]]);
  for (const roll of [0, 1]) {
    const result = triggerEvent(900019, initial, saved, () => roll);
    assert.equal(result.state.props.current.age, 30);
    assert.deepEqual(result.triggers, [900019, roll === 0 ? 900020 : 900021]);
    assert.equal(result.state.props.current.spirit, roll === 0 ? 5 : -1);
    assert.equal(canTriggerEvent(900019, result.state, saved), false);
    assert.equal(next(result.state, saved, seeded(1)).age, 31);
  }
});

test('Nanjing resolves all random paths in one year with correct costs and no intermediate pause', () => {
  const saved = profile();
  const initial = atAge(30);
  for (const id of [900023, 900024, 900026]) {
    assert.deepEqual(events.get(id).randomBranch.map(([, weight]) => weight), [1, 1]);
  }
  const cases = [
    { rolls: [1], ids: [900023, 900025], money: 4, spirit: 2, strength: 4 },
    { rolls: [0, 1], ids: [900023, 900024, 900027], money: -6, spirit: 4, strength: 4 },
    { rolls: [0, 0, 1], ids: [900023, 900024, 900026, 900028], money: -6, spirit: 2, strength: 4 },
    { rolls: [0, 0, 0], ids: [900023, 900024, 900026, 900029], money: -106, spirit: -6, strength: 2 },
  ];
  for (const expected of cases) {
    let calls = 0;
    const result = triggerEvent(900023, initial, saved, () => {
      assert.ok(calls < expected.rolls.length);
      return expected.rolls[calls++];
    });
    assert.equal(calls, expected.rolls.length);
    assert.deepEqual(result.triggers, expected.ids);
    assert.deepEqual(Array.from(result.state.events), expected.ids);
    assert.equal(result.state.props.current.age, 30);
    assert.equal(result.state.props.current.money, expected.money);
    assert.equal(result.state.props.current.spirit, expected.spirit);
    assert.equal(result.state.props.current.strength, expected.strength);
    assert.equal(canTriggerEvent(900023, result.state, saved), false);
    assert.equal(next(result.state, saved, seeded(1)).age, 31);
  }
});

test('absolute charm reset handles positive, zero and negative values with extrema intact', () => {
  for (const charm of [-5, 0, 12]) {
    const initial = atAge(30, [], { charm });
    const result = triggerEvent(900046, initial, profile()).state;
    assert.equal(result.props.current.charm, 0);
    assert.equal(result.props.highest.charm, Math.max(charm, 0));
    assert.equal(result.props.lowest.charm, Math.min(charm, 0));
    assert.equal(result.props.current.money, initial.props.current.money);
    assert.equal(canTriggerEvent(900046, result, profile()), false);
  }
});

test('new fatal events use the normal death event and respect revival talents', () => {
  for (const [id, age] of [[900010, 2], [900013, 10]]) {
    const state = atAge(age);
    const death = triggerEvent(id, state, profile());
    assert.equal(death.state.life, 0);
    assert.deepEqual(death.triggers, [id, 10000]);
    const revived = triggerEvent(id, { ...state, talents: new Set([1148]) }, profile());
    assert.ok(revived.state.life > 0);
    assert.ok(revived.triggers.includes(20001));
  }
});

test('enlightenment checks exact boundaries and awards attributes and achievement once', () => {
  const saved = profile();
  const eligible = atAge(30, [], { money: 0, intelligence: 101, strength: 9 });
  assert.equal(canTriggerEvent(900031, eligible, saved), true);
  for (const props of [{ money: 1 }, { money: -1 }, { intelligence: 100 }, { strength: 10 }]) {
    assert.equal(canTriggerEvent(900031, atAge(30, [], { money: 0, intelligence: 101, strength: 9, ...props }), saved), false);
  }
  const event = triggerEvent(900031, eligible, saved);
  assert.deepEqual(event.state.props.current, { age: 30, charm: 4, intelligence: 151, strength: 59, money: 1, spirit: 5 });
  const unlocked = triggerAchievement('TRAJECTORY', event.state, saved);
  assert.ok(unlocked.triggers.includes(900031));
  assert.equal(canTriggerEvent(900031, unlocked.state, saved), false);
  assert.equal(triggerAchievement('TRAJECTORY', unlocked.state, saved).triggers.includes(900031), false);
  assert.ok(end(summary(unlocked.state, saved).state, saved).profile.achievements.has(900031));
});

test('Mingtian story unlocks five achievements in order with profile persistence', () => {
  const saved = profile();
  let state = atAge(30);
  for (let id = 900041; id <= 900045; id++) {
    if (id > 900041) assert.equal(canTriggerEvent(id, atAge(30), saved), false);
    assert.equal(canTriggerEvent(id, state, saved), true);
    const result = triggerAchievement('TRAJECTORY', triggerEvent(id, state, saved).state, saved);
    assert.ok(result.triggers.includes(id));
    state = result.state;
    assert.equal(canTriggerEvent(id, state, saved), false);
    assert.equal(triggerAchievement('TRAJECTORY', state, saved).triggers.includes(id), false);
  }
  const completed = end(summary(state, saved).state, saved).profile;
  for (let id = 900041; id <= 900045; id++) {
    assert.ok(completed.achievements.has(id));
    assert.ok(completed.events.has(id));
  }
  const again = triggerEvent(900041, atAge(30), completed);
  assert.equal(triggerAchievement('TRAJECTORY', again.state, completed).triggers.includes(900041), false);
});

test('new submissions enforce exact ages, intelligence gates, and once-only stories', () => {
  for (const [id, age] of [[900103, 14], [900104, 18], [900105, 24], [900108, 26], [900109, 32], [900110, 18], [900137, 81]]) {
    assert.ok(canTriggerEvent(id, atAge(age), profile()));
    assert.equal(canTriggerEvent(id, atAge(age - 1), profile()), false);
    assert.equal(canTriggerEvent(id, atAge(age + 1), profile()), false);
  }
  assert.equal(canTriggerEvent(900112, atAge(24, [], { intelligence: 7 }), profile()), false);
  assert.ok(canTriggerEvent(900112, atAge(24, [], { intelligence: 8 }), profile()));
  for (const age of [17, 24]) assert.equal(canTriggerEvent(900114, atAge(age), profile()), false);
  for (const age of [18, 23]) assert.ok(canTriggerEvent(900114, atAge(age), profile()));
});

test('takeaway bills resolve in order and bankruptcy depends on actual remaining money', () => {
  for (const money of [4, 10, 20]) {
    const initial = atAge(25, [], { money });
    const result = triggerEvent(900100, initial, profile());
    assert.equal(result.state.props.current.money, money - 10);
    assert.deepEqual(result.triggers, money <= 10 ? [900100, 900101, 900102] : [900100, 900101]);
    assert.equal(initial.props.current.money, money);
  }
});

test('work or marriage and Teacher Bo invitations resolve randomly with no manual pause', () => {
  for (const roll of [0, 1]) {
    const work = triggerEvent(900105, atAge(24), profile(), () => roll);
    assert.deepEqual(work.triggers, [900105, 900106 + roll]);
    const bo = triggerEvent(900114, atAge(20), profile(), () => roll);
    assert.deepEqual(bo.triggers, [900114, 900115 + roll]);
    assert.equal(bo.state.props.current.strength, allocation.strength - roll);
    assert.equal(bo.state.props.current.money, allocation.money + roll);
    assert.equal(bo.state.props.current.spirit, allocation.spirit + roll * 2);
    assert.equal(canTriggerEvent(900114, bo.state, profile()), false);
  }
});

test('lucky bag has five equally weighted outcomes with exact money gains', () => {
  assert.deepEqual(events.get(900119).randomBranch, [0, 1, 2, 3, 4].map(index => [900120 + index, 1]));
  for (let roll = 0; roll < 5; roll++) {
    const result = triggerEvent(900119, atAge(25), profile(), () => roll);
    assert.deepEqual(result.triggers, [900119, 900120 + roll]);
    assert.equal(result.state.props.current.money, allocation.money + roll + 1);
  }
});

test('submission effects preserve specified numbers without invented penalties', () => {
  for (const [id, effect] of [
    [900103, { intelligence: -1, spirit: 5 }], [900104, { spirit: 4, strength: -3 }],
    [900108, {}], [900109, {}], [900112, { money: 3, strength: -3, spirit: -1 }],
    [900117, { intelligence: -1, spirit: 2 }], [900118, { spirit: 3, strength: -2 }],
    [900125, { spirit: -1 }], [900126, { money: -2 }],
    [900130, { spirit: 1 }], [900131, { intelligence: -2, spirit: 3 }],
    [900132, { money: -2 }], [900133, { spirit: 1 }], [900134, { strength: -2 }],
    [900135, { spirit: 1 }], [900136, { strength: 1 }], [900138, { spirit: -5, intelligence: 5 }],
  ]) {
    const before = atAge(25);
    const after = triggerEvent(id, before, profile()).state;
    for (const key of Object.keys(allocation)) assert.equal(after.props.current[key], before.props.current[key] + (effect[key] || 0), `${id}: ${key}`);
  }
});

test('HC curse charges positive gains separately, updates extrema, and resets next life', () => {
  const initial = atAge(25);
  const cursed = triggerEvent(900113, initial, profile()).state;
  assert.equal(cursed.props.strengthCostPerGain, 1);
  assert.equal(initial.props.strengthCostPerGain, undefined);
  const result = propsEffect(cursed.props, { charm: 2, intelligence: 1, money: -3, spirit: 4, strength: 2, age: 1 });
  assert.equal(result.current.strength, allocation.strength + 2 - 7);
  assert.equal(result.lowest.strength, -1);
  assert.equal(result.highest.strength, allocation.strength);
  const bag = triggerEvent(900119, cursed, profile(), () => 4);
  assert.equal(bag.state.props.current.strength, allocation.strength - 5);
  const all = triggerEvent(900020, cursed, profile());
  assert.equal(all.state.props.current.strength, allocation.strength + 1 - 4);
  const reset = start(profile(), allocation, []).state;
  assert.equal(reset.props.strengthCostPerGain, undefined);
  assert.equal(propsEffect(createHLProperties(allocation), { intelligence: 5 }).current.strength, allocation.strength);
});

test('two years of lost lifespan advance original aging pools without skipping calendar-age submissions', () => {
  const affected = triggerEvent(900103, atAge(14), profile()).state;
  assert.equal(affected.lifespanLoss, 2);
  assert.equal(affected.props.current.age, 14);
  assert.equal(affected.life, 1);
  const aged = { ...atAge(18), lifespanLoss: 2 };
  const pool = yearlyEventPools(aged).flat();
  assert.deepEqual(pool.filter(([id]) => id < 900000), ages.get(20).event.flat().filter(([id]) => id < 900000));
  assert.deepEqual(pool.filter(([id]) => id >= 900000), ages.get(18).event.flat().filter(([id]) => id >= 900000));
  assert.ok(canTriggerEvent(900104, aged, profile()));
  assert.equal(canTriggerEvent(900104, { ...atAge(16), lifespanLoss: 2 }, profile()), false);
  const old = { ...atAge(498), lifespanLoss: 2 };
  assert.deepEqual(yearlyEventPools(old).flat().filter(([id]) => id < 900000), ages.get(500).event.flat().filter(([id]) => id < 900000));
  assert.equal(start(profile(), allocation, []).state.lifespanLoss, undefined);
});

test('conditional fatalities check post-event thresholds and retain standard resurrection', () => {
  for (const [strength, dies] of [[3, true], [4, false]]) {
    const result = triggerEvent(900110, atAge(18, [], { strength }), profile());
    assert.equal(result.state.life <= 0, dies);
  }
  for (const [spirit, dies] of [[5, true], [6, false]]) {
    const result = triggerEvent(900128, atAge(20, [], { spirit }), profile());
    assert.equal(result.state.props.current.spirit, spirit - 5);
    assert.equal(result.state.life <= 0, dies);
  }
  for (const [id, age] of [[900110, 18], [900128, 20], [900137, 81]]) {
    const state = atAge(age, [], { strength: 3, spirit: 5 });
    const result = triggerEvent(id, state, profile());
    assert.ok(result.triggers.includes(10000));
    const revived = triggerEvent(id, { ...state, talents: new Set([1147]) }, profile());
    assert.ok(revived.triggers.includes(20000));
    assert.ok(revived.state.life > 0);
  }
});

test('Teacher Bo blessing requires prior refusal, intelligence over 50, and awards once', () => {
  for (const [history, intelligence, eligible] of [[[], 51, false], [[900116], 51, false], [[900115], 50, false], [[900115], 51, true]]) {
    assert.equal(canTriggerEvent(900127, atAge(25, history, { intelligence }), profile()), eligible);
  }
  const saved = profile();
  const before = atAge(25, [900114, 900115], { intelligence: 51 });
  const result = triggerEvent(900127, before, saved);
  assert.equal(result.state.props.current.money, allocation.money + 2);
  assert.equal(result.state.props.current.spirit, allocation.spirit + 7);
  const unlocked = triggerAchievement('TRAJECTORY', result.state, saved);
  assert.ok(unlocked.triggers.includes(900127));
  assert.equal(canTriggerEvent(900127, unlocked.state, saved), false);
  assert.equal(triggerAchievement('TRAJECTORY', unlocked.state, saved).triggers.includes(900127), false);
  assert.ok(end(summary(unlocked.state, saved).state, saved).profile.achievements.has(900127));
});
