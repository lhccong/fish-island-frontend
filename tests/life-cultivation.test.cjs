const assert = require('node:assert/strict');
const { test } = require('node:test');
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS', target: 'ES2020' } });
const {
  realms, roots, cultivationTalents, realmLabel, drawCultivationTalents, startCultivation,
  nextCultivation, finishCultivation, lifespan, requiredProgress, breakthroughChance,
} = require('../src/pages/Game/Life/engine/cultivation');
const { events, achievements, ages } = require('../src/pages/Game/Life/engine/data');
const { cultivationEvents, cultivationEventPool, formatCultivationEvent } = require('../src/pages/Game/Life/engine/cultivation/event');
const { nextProfile } = require('../src/pages/Game/Life/engine/core/state');
const profile = () => ({ times: 0, talents: new Set(), events: new Set(), achievements: new Set() });
const allocation = { charm: 4, intelligence: 4, strength: 4, money: 4, spirit: 4 };
const saved = profile();
const begin = (ids = [6, 9, 10], rng = () => 0) => startCultivation(saved, allocation, ids, rng).state;
function seeded(seed) {
  return (max = 1, min = 0) => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return min + Math.floor(seed / 4294967296 * (max - min + 1));
  };
}
function atRealm(realm, overrides = {}) {
  const state = begin();
  return { ...state,
    props: { ...state.props, current: { ...state.props.current, age: realm * 50 } },
    cultivation: { ...state.cultivation, realm, stage: 0, ...overrides },
  };
}

test('realm hierarchy includes thirteen Qi layers, subdivisions and immortal realms', () => {
  assert.deepEqual(realms.map(realm => realm.name), ['凡人', '炼气', '筑基', '结丹', '元婴', '化神', '炼虚', '合体', '大乘', '真仙', '金仙', '太乙', '大罗', '道祖']);
  assert.equal(realms[1].stages, 13);
  for (const realm of realms.slice(2, -1)) assert.equal(realm.stages, 4);
  assert.equal(realmLabel({ realm: 1, stage: 12 }), '炼气 13 层');
  assert.equal(realmLabel({ realm: 8, stage: 3 }), '大乘 · 大圆满');
  assert.equal(realmLabel({ realm: 13, stage: 0 }), '道祖');
  assert.equal(realms[6].lifespan, null);
});

test('cultivation talents draw ten distinct options and validate allocation and selection', () => {
  for (let seed = 1; seed <= 50; seed++) {
    const drawn = drawCultivationTalents(seeded(seed));
    assert.equal(drawn.length, 10);
    assert.equal(new Set(drawn).size, 10);
    assert.ok(drawn.every(id => cultivationTalents.some(talent => talent.id === id)));
  }
  assert.throws(() => startCultivation(saved, allocation, [1, 1, 2]), /talents/);
  assert.throws(() => startCultivation(saved, allocation, [1, 2, 99]), /talents/);
  assert.throws(() => startCultivation(saved, { ...allocation, money: 5 }, [1, 2, 3]), /allocation/);
  assert.throws(() => startCultivation(saved, { ...allocation, money: 4.5, spirit: 3.5 }, [1, 2, 3]), /allocation/);
  const result = startCultivation(saved, allocation, [1, 2, 3], () => 0);
  assert.equal(result.state.props.current.age, 0);
  assert.equal(result.logs[0].age, 0);
  assert.equal(result.state.props.current.intelligence, 6);
  assert.equal(result.state.props.current.strength, 6);
  assert.equal(result.state.props.current.spirit, 6);
  assert.equal(result.state.talents.size, 0);
});

test('birth and six-year initiation reveal a root and unlock the first achievement once', () => {
  let state = begin();
  for (let age = 1; age <= 6; age++) {
    const result = nextCultivation(state, saved, () => 0);
    state = result.state;
    assert.equal(state.props.current.age, age);
    assert.equal(state.cultivation.realm, age === 6 ? 1 : 0);
    assert.equal(result.achievements.includes(910001), age === 6);
  }
  assert.equal(state.cultivation.root, 0);
  assert.equal(state.cultivation.progress, 0);
  assert.equal(nextCultivation(state, saved, () => 0).achievements.includes(910001), false);
  assert.equal(begin([1, 2, 3], max => max).cultivation.root, roots.length - 1);
});

test('training, breakthrough and lifespan talents have distinct effects', () => {
  const normal = atRealm(2);
  const boosted = { ...normal, cultivation: { ...normal.cultivation, talents: [6, 12, 16] } };
  const steady = (max, min) => min || max;
  assert.ok(nextCultivation(boosted, saved, steady).state.cultivation.progress > nextCultivation(normal, saved, steady).state.cultivation.progress);
  assert.equal(lifespan(begin([10, 13, 1])), 150);
  assert.equal(lifespan(atRealm(6)), null);
  const learned = { ...normal, cultivation: { ...normal.cultivation, talents: [9, 15, 1] } };
  assert.ok(breakthroughChance(learned) > breakthroughChance(normal));
});

test('every realm and substage breakthrough advances exactly one stage', () => {
  for (let realm = 1; realm < 13; realm++) {
    for (let stage = 0; stage < realms[realm].stages; stage++) {
      const state = atRealm(realm, { stage });
      state.cultivation.progress = requiredProgress(state.cultivation);
      // Give finite-lifespan tests time to perform the breakthrough.
      state.props.current.age = 10;
      const result = nextCultivation(state, saved, () => 0);
      const major = stage === realms[realm].stages - 1;
      assert.equal(result.state.cultivation.realm, realm + Number(major));
      assert.equal(result.state.cultivation.stage, major ? 0 : stage + 1);
      assert.equal(result.state.cultivation.progress, 0);
      if (major) {
        assert.ok(result.state.events.has(910001 + realm));
        assert.ok(result.achievements.includes(910001 + realm));
      }
      if (realm === 8 && major) {
        assert.ok(result.logs.some(log => log.text.includes('飞升仙界')));
        assert.equal(result.state.cultivation.nextTribulation, result.state.props.current.age + 10000);
      }
    }
  }
});

test('breakthrough failure loses some progress without incorrectly promoting the realm', () => {
  const state = atRealm(2, { stage: 3 });
  state.cultivation.progress = requiredProgress(state.cultivation);
  state.props.current.age = 20;
  const result = nextCultivation(state, saved, max => max);
  assert.equal(result.state.cultivation.realm, 2);
  assert.equal(result.state.cultivation.stage, 3);
  assert.equal(result.state.cultivation.failures, 1);
  assert.equal(result.state.cultivation.progress, requiredProgress(state.cultivation) * 0.65);
  assert.ok(breakthroughChance(result.state) > breakthroughChance(state));
  assert.equal(result.state.events.has(910003), false);
});

test('finite lifespans end at the limit, immortals pass age 500, and time never skips a tribulation', () => {
  const mortal = atRealm(3);
  mortal.props.current.age = lifespan(mortal) - 1;
  const expired = nextCultivation(mortal, saved, () => 0);
  assert.equal(expired.state.props.current.age, lifespan(mortal));
  assert.equal(expired.state.cultivation.ending, 'lifespan');
  assert.equal(expired.state.life, 0);
  const immortal = atRealm(6, { nextTribulation: 3000 });
  immortal.props.current.age = 2955;
  const survived = nextCultivation(immortal, saved, () => 0);
  assert.equal(survived.state.props.current.age, 3000);
  assert.equal(survived.state.cultivation.nextTribulation, 6000);
  assert.equal(survived.state.cultivation.tribulations, 1);
  assert.ok(survived.achievements.includes(910020));
  const died = nextCultivation(immortal, saved, max => max);
  assert.equal(died.state.cultivation.ending, 'tribulation');
  assert.equal(died.state.life, 0);
});

test('failed ascension is terminal and Dao completion is not treated as another training year', () => {
  const state = atRealm(8, { stage: 3, progress: 99999 });
  let rolls = 0;
  const failed = nextCultivation(state, saved, () => [65, 60, 0, 99][rolls++]);
  assert.equal(failed.state.cultivation.ending, 'tribulation');
  assert.equal(failed.state.cultivation.realm, 8);
  const dao = atRealm(12, { stage: 3, progress: 999999 });
  const result = nextCultivation(dao, saved, () => 0);
  assert.equal(result.state.cultivation.ending, 'dao');
  assert.equal(result.state.cultivation.realm, 13);
  assert.equal(result.state.life, 0);
  assert.ok(result.achievements.includes(910013));
  const again = nextCultivation(result.state, saved);
  assert.equal(again.state, result.state);
  assert.deepEqual(again.logs, []);
});

test('all cultivation log events and achievements exist and stay out of classic age pools', () => {
  for (const id of [...Array.from({ length: 14 }, (_, index) => 910000 + index), 910020, ...Array.from({ length: 7 }, (_, index) => 910030 + index)]) {
    assert.ok(cultivationEvents.has(id));
    assert.equal(events.has(id), false);
  }
  for (let id = 910001; id <= 910013; id++) assert.ok(achievements.has(id));
  for (const row of ages.values()) assert.ok(row.event.flat().every(([id]) => id < 910000));
});

test('completed cultivation persists achievements and records without replacing classic talent inheritance', () => {
  const previous = { ...profile(), locked: [1001], highest: { age: 88, ...allocation } };
  const result = nextCultivation(atRealm(12, { stage: 3, progress: 999999 }), previous, () => 0);
  const finished = finishCultivation(result.state, previous);
  assert.equal(finished.times, 1);
  assert.deepEqual(finished.locked, [1001]);
  assert.deepEqual(finished.highest, previous.highest);
  assert.ok(finished.achievements.has(910013));
  assert.ok(Array.from(finished.achievements).every(id => cultivationEvents.has(id)));
  assert.ok(finished.cultivation.events.includes(910013));
  assert.equal(finished.events.has(910013), false);
  assert.equal(finished.cultivation.times, 1);
  assert.equal(finished.cultivation.bestRealm, 13);
  const classicProfile = nextProfile(finished, begin(), finished.locked);
  assert.deepEqual(classicProfile.cultivation, finished.cultivation);
  const replay = nextCultivation(atRealm(12, { stage: 3, progress: 999999 }), finished, () => 0);
  assert.equal(replay.achievements.includes(910013), false);
  assert.throws(() => finishCultivation(begin(), profile()), /not ended/);
});

test('independent event pools enforce world, luck and once-only requirements', () => {
  assert.ok(cultivationEvents.size >= 40);
  for (let realm = 1; realm <= 12; realm++) {
    const pool = cultivationEventPool(realm, 4, new Set());
    assert.ok(pool.length > 0);
    for (const [id, weight] of pool) {
      const event = cultivationEvents.get(id);
      assert.ok(realm >= event.minRealm && realm <= event.maxRealm);
      assert.ok(weight > 0);
      assert.equal(events.has(id), false);
    }
  }
  assert.ok(cultivationEventPool(1, 4, new Set()).some(([id]) => id === 910038));
  assert.ok(!cultivationEventPool(1, 4, new Set([910038])).some(([id]) => id === 910038));
  assert.ok(!cultivationEventPool(2, 5, new Set()).some(([id]) => id === 910036));
  assert.ok(cultivationEventPool(2, 6, new Set()).some(([id]) => id === 910036));
  for (const id of cultivationEvents.keys()) {
    assert.ok(!formatCultivationEvent(id, { realm: '结丹', root: '天灵根', lifespan: 500, years: 5 }).includes('{'));
  }
  assert.throws(() => formatCultivationEvent(910037), /Missing/);
  assert.throws(() => formatCultivationEvent(1), /Unknown/);
});

test('expanded library matches classic scale with distinct, realm-specific authored outcomes', () => {
  assert.equal(cultivationEvents.size, 1798);
  assert.ok(cultivationEvents.size >= 1759);
  assert.equal(new Set([...cultivationEvents.values()].map(event => event.event)).size, cultivationEvents.size);
  const scenes = new Map();
  const labels = { intelligence: '悟性', money: '家资', strength: '根骨', spirit: '心性', charm: '机缘' };
  for (const event of cultivationEvents.values()) {
    assert.equal(events.has(event.id), false);
    if (!event.scene) continue;
    const results = scenes.get(event.scene) || [];
    results.push(event);
    scenes.set(event.scene, results);
    assert.equal(event.minRealm, event.maxRealm);
    assert.ok(event.weight > 0 && Number.isFinite(event.weight));
    assert.equal(event.once, true);
    assert.ok(!cultivationEventPool(event.minRealm, 10, new Set([event.id])).some(([id]) => id === event.id));
    for (const [property, delta] of Object.entries(event.effect || {})) {
      assert.ok(labels[property]);
      assert.ok(Number.isFinite(delta));
      assert.ok(event.event.includes(`${labels[property]} ${delta > 0 ? '+' : ''}${delta}`));
    }
    if (event.trainingFactor !== undefined) assert.ok(event.trainingFactor > 0 && Number.isFinite(event.trainingFactor));
  }
  assert.equal(scenes.size, 285);
  for (const [id, results] of scenes) {
    assert.deepEqual(results.map(event => event.id), Array.from({ length: 6 }, (_, index) => id + index));
  }
  for (let realm = 1; realm <= 12; realm++) {
    const added = [...cultivationEvents.values()].filter(event => event.scene && event.minRealm === realm);
    assert.equal(added.length, realm <= 9 ? 144 : 138);
    assert.ok(new Set(added.map(event => event.category)).size >= 8);
  }
});

test('new encounters apply effects, log and persist independently of classic collection', () => {
  const state = atRealm(1);
  state.props.current.age = 7;
  const pool = cultivationEventPool(1, state.props.current.charm, state.events);
  const index = pool.findIndex(([id]) => id === 920000);
  assert.ok(index >= 0);
  const roll = pool.slice(0, index).reduce((sum, [, weight]) => sum + weight, 0) + 1;
  let calls = 0;
  const result = nextCultivation(state, saved, () => calls++ === 0 ? 65 : roll);
  assert.ok(result.state.events.has(920000));
  assert.ok(result.logs.some(log => log.text === cultivationEvents.get(920000).event));
  assert.equal(result.state.props.current.intelligence, state.props.current.intelligence + 1);
  const finished = finishCultivation({
    ...result.state, life: 0,
    cultivation: { ...result.state.cultivation, ending: 'lifespan' },
  }, saved);
  assert.ok(finished.cultivation.events.includes(920000));
  assert.equal(finished.events.has(920000), false);
});

test('submitted cultivation stories respect adult age bounds, effects and once-only collection', () => {
  for (const age of [16, 17, 18, 28, 29]) {
    assert.equal(cultivationEventPool(1, 4, new Set(), age).some(([id]) => id === 950001), age >= 18 && age <= 28);
  }
  for (const [id, effect] of [[950001, { spirit: 1, strength: 1 }], [950002, { spirit: -2 }], [950003, { charm: 5, intelligence: 5, strength: 5 }]]) {
    const state = atRealm(1);
    state.props.current.age = 20;
    const pool = cultivationEventPool(1, state.props.current.charm, state.events, 21);
    const index = pool.findIndex(([candidate]) => candidate === id);
    assert.ok(index >= 0);
    const roll = pool.slice(0, index).reduce((sum, [, weight]) => sum + weight, 0);
    let calls = 0;
    const result = nextCultivation(state, saved, () => calls++ === 0 ? 65 : roll);
    assert.ok(result.logs.some(log => log.eventId === id));
    for (const key of Object.keys(allocation)) assert.equal(result.state.props.current[key], state.props.current[key] + (effect[key] || 0));
    assert.equal(cultivationEventPool(1, 4, result.state.events, 22).some(([candidate]) => candidate === id), false);
    assert.equal(events.has(id), false);
  }
});

test('fatal encounters exist in every realm and terminate before training or breakthrough', () => {
  const fatal = [...cultivationEvents.values()].filter(event => event.fatal);
  assert.equal(fatal.length, 36);
  for (let realm = 1; realm <= 12; realm++) {
    const state = atRealm(realm, { progress: 999999 });
    state.props.current.age = 10;
    const pool = cultivationEventPool(realm, state.props.current.charm, state.events, 10 + realms[realm].years);
    const lethal = pool.filter(([id]) => cultivationEvents.get(id).fatal);
    assert.equal(lethal.length, 3);
    const risk = lethal.reduce((sum, [, weight]) => sum + weight, 0) / pool.reduce((sum, [, weight]) => sum + weight, 0);
    assert.ok(lethal.every(([, weight]) => weight === 2));
    assert.ok(risk > 0.008 && risk < 0.012, `Unexpected encounter risk for realm ${realm}: ${risk}`);
    for (const [id] of lethal) {
      const index = pool.findIndex(([candidate]) => candidate === id);
      const roll = pool.slice(0, index).reduce((sum, [, weight]) => sum + weight, 0);
      let calls = 0;
      const result = nextCultivation(state, saved, () => calls++ === 0 ? 65 : roll);
      assert.equal(calls, 2);
      assert.equal(result.state.life, 0);
      assert.equal(result.state.cultivation.ending, 'encounter');
      assert.equal(result.state.cultivation.realm, realm);
      assert.equal(result.state.cultivation.progress, state.cultivation.progress);
      assert.deepEqual(result.logs.map(log => log.eventId), [id]);
      assert.equal(result.logs[0].text, cultivationEvents.get(id).event);
      assert.deepEqual(result.achievements, []);
      const again = nextCultivation(result.state, saved);
      assert.equal(again.state, result.state);
      assert.deepEqual(again.logs, []);
      const finished = finishCultivation(result.state, saved);
      assert.equal(finished.times, 1);
      assert.ok(finished.cultivation.events.includes(id));
      assert.equal(finished.events.has(id), false);
    }
  }
});

test('200 seeded cultivations terminate with valid progression, and favorable cultivation can reach Dao', t => {
  const endings = new Set();
  let encounterDeaths = 0;
  let earlyDeaths = 0;
  for (let seed = 1; seed <= 200; seed++) {
    const rng = seeded(seed);
    let state = startCultivation(saved, allocation, drawCultivationTalents(rng).slice(0, 3), rng).state;
    let turns = 0;
    while (!state.cultivation.ending && turns < 1801) {
      const result = nextCultivation(state, saved, rng);
      assert.ok(result.logs.length > 0);
      assert.ok(result.state.props.current.age >= state.props.current.age);
      assert.ok(result.state.cultivation.progress >= 0);
      assert.ok(Number.isFinite(result.state.props.current.age));
      assert.ok(result.state.cultivation.realm >= state.cultivation.realm);
      assert.ok(result.achievements.every(id => cultivationEvents.has(id)));
      state = result.state;
      turns++;
    }
    assert.ok(state.cultivation.ending, `Unfinished seed ${seed}`);
    endings.add(state.cultivation.ending);
    if (state.cultivation.ending === 'encounter') encounterDeaths++;
    if (state.cultivation.realm <= 5) earlyDeaths++;
  }
  assert.ok(endings.has('encounter'));
  assert.ok(encounterDeaths >= 170, `Encounter deaths: ${encounterDeaths}/200`);
  assert.ok(earlyDeaths >= 160, `Human-world endings: ${earlyDeaths}/200`);
  t.diagnostic(`200 seeded runs: ${encounterDeaths} encounter deaths, ${earlyDeaths} ended before reaching the spirit world`);
  let state = startCultivation(saved, { charm: 0, intelligence: 10, strength: 10, money: 0, spirit: 0 }, [6, 12, 16], max => max).state;
  while (!state.cultivation.ending) state = nextCultivation(state, saved, (max, min) => min || 0).state;
  assert.equal(state.cultivation.ending, 'dao');
  assert.ok(state.props.current.age > 500);
});
