import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, Shuffle, SkipForward } from 'lucide-react';
import { randomAllocation } from './allocation';
import { achievements, characters, events, talents } from './engine/data';
import { end as endGame, next as nextYear, pick as replaceTalents, pull as pullTalents, start as startGame, summary as summarize } from './engine/core';
import type { GameState, ProfileState, Properties } from './engine/core/state';
import { judge, judgeGradeByValue } from './engine/config';
import { properties, judgeNames } from './display';
import styles from './index.module.less';

type Step = 'home' | 'mode' | 'pick' | 'character' | 'alloc' | 'play' | 'summary' | 'achievements';
type Mode = 'classic' | 'celebrity';
type PlaybackMode = 'manual' | 'auto' | 'double';
const playbackModes: { value: PlaybackMode; label: string }[] = [
  { value: 'manual', label: '手动' },
  { value: 'auto', label: '自动' },
  { value: 'double', label: '自动两倍速' },
];
type Log = { age: number; events: number[]; talents: number[]; achievements: number[]; props: Properties };

const CONFIG = { points: 20, spirit: 5, pull: 10, min: 3, max: 3, allocate: 10 };
const propertyKeys: Array<keyof Omit<Properties, 'age'>> = ['charm', 'intelligence', 'strength', 'money', 'spirit'];
const freshProfile = (): ProfileState => ({ times: 0, talents: new Set(), events: new Set(), achievements: new Set() });

const readProfile = (): ProfileState => {
  try {
    const saved = JSON.parse(localStorage.getItem('life-remake-profile') || 'null');
    if (!saved) return freshProfile();
    return { ...saved, talents: new Set(saved.talents || []), events: new Set(saved.events || []), achievements: new Set(saved.achievements || []) };
  } catch {
    return freshProfile();
  }
};

const saveProfile = (profile: ProfileState) => localStorage.setItem('life-remake-profile', JSON.stringify({
  ...profile,
  talents: Array.from(profile.talents),
  events: Array.from(profile.events),
  achievements: Array.from(profile.achievements),
}));

const gradeClass = (value: number) => styles[`grade-${Math.max(0, Math.min(3, value))}`];
const formatEvent = (value: string, age: number) => value.replace(/\{([^}]+)\}/g, (match, key) => key === 'CurrentYear' ? String(new Date().getFullYear() + age) : match);

const TalentCard = ({ id, selected, onClick }: { id: number; selected?: boolean; onClick?: () => void }) => {
  const talent = talents.get(id);
  if (!talent) return null;
  return <button type="button" aria-pressed={onClick ? !!selected : undefined} className={`${styles.talent} ${gradeClass(talent.grade)} ${selected ? styles.selected : ''}`} onClick={onClick}>
    {selected && <Check size={18} className={styles.selectionMark} aria-hidden="true" />}
    <strong>{talent.name}</strong><span>{talent.description}</span>
  </button>;
};

const PropertyList = ({ values, includeAge = false, living = false }: { values: Properties; includeAge?: boolean; living?: boolean }) => (
  <div className={styles.propertyGrid}>
    {([...propertyKeys, ...(includeAge ? ['age' as const] : [])]).map(key => (
      <div key={key} className={`${styles.property} ${gradeClass(judgeGradeByValue(key, values[key]))}`}>
        <span>{key === 'age' && living ? '年龄' : properties[key]}</span><b>{values[key]}</b>
        <small>{key === 'age' && living ? (values.age === 0 ? '出生' : '岁') : judgeNames[key][judge(key, values[key])]}</small>
      </div>
    ))}
  </div>
);

const Home = ({ profile, onStart, onAchievements }: { profile: ProfileState; onStart: () => void; onAchievements: () => void }) => (
  <section className={styles.home}>
    <div className={styles.kicker}>摸鱼岛 · 本地人生模拟器</div>
    <h1>人生重开模拟器</h1><p>这垃圾人生一秒也不想待了</p>
    <button type="button" className={styles.primary} onClick={onStart}>立即重开</button>
    <div className={styles.homeStats}><span>已重开 <b>{profile.times}</b> 次</span><span>已解锁成就 <b>{profile.achievements.size}</b></span><button type="button" className={styles.textButton} onClick={onAchievements}>查看成就</button></div>
  </section>
);

export default function Life() {
  const [profile, setProfile] = useState<ProfileState>(readProfile);
  const [step, setStep] = useState<Step>('home');
  const [mode, setMode] = useState<Mode>('classic');
  const [pulled, setPulled] = useState<number[]>([]);
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [charactersPulled, setCharactersPulled] = useState<number[]>([]);
  const [characterId, setCharacterId] = useState<number>();
  const [allocation, setAllocation] = useState<Record<string, number>>({ charm: 0, intelligence: 0, strength: 0, money: 0, spirit: 0 });
  const [replaced, setReplaced] = useState<{ talents: Set<number>; chains: Map<number, number[]> }>({ talents: new Set(), chains: new Map() });
  const [game, setGame] = useState<GameState>();
  const [logs, setLogs] = useState<Log[]>([]);
  const [summary, setSummary] = useState(0);
  const [playbackMode, setPlaybackMode] = useState<PlaybackMode>('manual');
  const gameRef = useRef<GameState>();
  const [playError, setPlayError] = useState('');
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => saveProfile(profile), [profile]);
  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [logs]);
  const pickedPointBonus = useMemo(() => Array.from(replaced.talents).reduce((sum, id) => sum + (talents.get(id)?.points || 0), 0), [replaced]);
  const remaining = CONFIG.points + pickedPointBonus - Object.values(allocation).reduce((sum, value) => sum + value, 0);

  const resetRound = () => {
    setPulled([]); setPicked(new Set()); setCharactersPulled([]); setCharacterId(undefined);
    setAllocation({ charm: 0, intelligence: 0, strength: 0, money: 0, spirit: 0 });
    setReplaced({ talents: new Set(), chains: new Map() }); setGame(undefined); gameRef.current = undefined; setLogs([]); setPlaybackMode('manual'); setPlayError('');
  };
  const begin = () => { resetRound(); setStep(profile.times >= 10 ? 'mode' : 'pick'); };
  const chooseMode = (nextMode: Mode) => { resetRound(); setMode(nextMode); setStep(nextMode === 'classic' ? 'pick' : 'character'); };
  const pull = () => {
    if (mode === 'classic') setPulled(pullTalents({ count: CONFIG.pull, rate: { base: new Map([[0, 889], [1, 100], [2, 10], [3, 1]]), additions: {} } }, profile));
    else setCharactersPulled(Array.from(characters.keys()).sort(() => Math.random() - 0.5).slice(0, 3));
  };
  const submitTalents = () => {
    if (picked.size !== CONFIG.min) return;
    setReplaced(replaceTalents(picked).talents); setStep('alloc');
  };
  const submitCharacter = () => {
    if (!characterId) return;
    const character = characters.get(characterId)!;
    setAllocation({ charm: character.property.CHR, intelligence: character.property.INT, strength: character.property.STR, money: character.property.MNY, spirit: CONFIG.spirit });
    setReplaced({ talents: new Set(character.talent), chains: new Map() }); setStep('alloc');
  };
  const start = () => {
    if (remaining !== 0) return;
    const result = startGame(profile, { charm: allocation.charm, intelligence: allocation.intelligence, strength: allocation.strength, money: allocation.money, spirit: allocation.spirit }, replaced.talents);
    setPlaybackMode('manual');
    setPlayError('');
    try {
      const birth = nextYear(result.state, profile);
      gameRef.current = birth.state;
      setGame(birth.state);
      setLogs([{ ...birth, achievements: [...result.achievements, ...birth.achievements], props: birth.state.props.current }]);
    } catch (error) {
      gameRef.current = result.state;
      setGame(result.state);
      setPlayError('出生事件生成失败，请重新开始。');
      console.error('Life simulation failed', error);
    }
    setStep('play');
  };
  const next = useCallback(() => {
    const current = gameRef.current;
    if (!current || current.life <= 0 || playError) return;
    try {
      const result = nextYear(current, profile);
      gameRef.current = result.state;
      setGame(result.state); setLogs(prev => [...prev, { ...result, props: result.state.props.current }]);
      if (result.end) setPlaybackMode('manual');
    } catch (error) {
      setPlaybackMode('manual');
      setPlayError('人生推进失败，已暂停。请重新开始。');
      console.error('Life simulation failed', error);
    }
  }, [profile, playError]);
  useEffect(() => {
    if (playbackMode === 'manual' || !game || game.life <= 0 || step !== 'play' || playError) return;
    const timer = window.setTimeout(next, playbackMode === 'double' ? 275 : 550);
    return () => window.clearTimeout(timer);
  }, [playbackMode, game, step, playError, next]);
  const goSummary = () => {
    if (!game || game.life > 0) return;
    const result = summarize(game, profile);
    setGame(result.state); setSummary(result.summary); setStep('summary');
  };
  const finish = (locked?: number[]) => {
    if (!game) return;
    const result = endGame(game, profile, mode === 'classic' ? locked : profile.locked);
    setProfile(result.profile); resetRound(); setStep('home');
  };

  if (step === 'home') return <div className={styles.container}><Home profile={profile} onStart={begin} onAchievements={() => setStep('achievements')} /></div>;
  if (step === 'mode') return <div className={styles.container}><section className={styles.panel}><h2>选择重开模式</h2><div className={styles.modeGrid}>
    <button type="button" onClick={() => chooseMode('classic')}><strong>经典模式</strong><span>十连抽天赋，自由分配属性</span></button>
    <button type="button" onClick={() => chooseMode('celebrity')}><strong>名人模式</strong><span>前世古代名人，重开到了现代</span></button>
  </div></section></div>;
  if (step === 'pick') return <div className={styles.container}><section className={styles.panel}>
    <div className={styles.sectionHeading}><span>经典模式</span><b>选择 3 个天赋</b></div>
    {!pulled.length ? <button type="button" className={styles.primary} onClick={pull}>十连抽!</button> : <><div className={styles.talentGrid}>{pulled.map(id => <TalentCard key={id} id={id} selected={picked.has(id)} onClick={() => setPicked(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else if (next.size < CONFIG.max) next.add(id); return next; })} />)}</div>
      <button type="button" className={picked.size === CONFIG.min ? styles.primary : styles.disabled} onClick={submitTalents}>下一步 ({picked.size}/{CONFIG.max})</button></>}
  </section></div>;
  if (step === 'character') return <div className={styles.container}><section className={styles.panel}>
    <div className={styles.sectionHeading}><span>名人模式</span><b>选择你的前世</b></div>
    {!charactersPulled.length ? <button type="button" className={styles.primary} onClick={pull}>抽取名人</button> : <><div className={styles.characterGrid}>{charactersPulled.map(id => { const character = characters.get(id)!; return <button type="button" key={id} className={`${styles.character} ${characterId === id ? styles.selected : ''}`} onClick={() => setCharacterId(id)}><strong>{character.name}</strong><PropertyList values={{ age: 0, charm: character.property.CHR, intelligence: character.property.INT, strength: character.property.STR, money: character.property.MNY, spirit: CONFIG.spirit }} /><span>{character.talent.map(t => talents.get(t)?.name).join(' · ')}</span></button>; })}</div><button type="button" className={characterId ? styles.primary : styles.disabled} onClick={submitCharacter}>开始新人生</button></>}
  </section></div>;
  if (step === 'alloc') return <div className={styles.container}><section className={styles.panel}>
    <div className={styles.sectionHeading}><span>属性分配</span><b className={remaining === 0 ? styles.good : styles.bad}>剩余 {remaining} 点</b></div>
    <div className={styles.talentGrid}>{Array.from(replaced.talents).map(id => <TalentCard key={id} id={id} />)}</div>
    <div className={styles.allocateGrid}>{propertyKeys.map(key => <label key={key}><span>{properties[key]}</span><input type="number" min={0} max={CONFIG.allocate} value={allocation[key]} onChange={event => setAllocation(prev => ({ ...prev, [key]: Math.max(0, Math.min(CONFIG.allocate, Number(event.target.value) || 0)) }))} /></label>)}</div>
    <div className={styles.actions}>
      <button type="button" className={styles.randomButton} onClick={() => setAllocation(randomAllocation(CONFIG.points + pickedPointBonus, CONFIG.allocate))}>
        <Shuffle size={16} aria-hidden="true" />随机分配
      </button>
      <button type="button" disabled={remaining !== 0} className={remaining === 0 ? styles.primary : styles.disabled} onClick={start}>开始新人生</button>
    </div>
  </section></div>;
  if (step === 'play') return <div className={styles.container}><section className={styles.playPanel}>
    <PropertyList values={game!.props.current} includeAge living={game!.life > 0} />
    {playError && <div role="alert">{playError}<button type="button" className={styles.textButton} onClick={begin}>重新开始</button></div>}
    <div className={styles.logs} ref={logRef} onClick={playbackMode === 'manual' ? next : undefined}>{logs.map((log, index) => <article key={index}><b>{log.age}岁</b><div>{log.talents.map(id => <p key={`t${id}`} className={styles.talentLog}>[天赋] {talents.get(id)?.name}：{talents.get(id)?.description}</p>)}{log.events.map(id => <p key={`e${id}`} className={gradeClass(events.get(id)?.grade || 0)}>{formatEvent(events.get(id)?.event || '', log.age)}</p>)}{log.achievements.map(id => <p key={`a${id}`} className={styles.achievementLog}>[成就] {achievements.get(id)?.name}：{achievements.get(id)?.description}</p>)}</div></article>)}</div>
    <div className={styles.playControls}>
      {game!.life > 0 ? <>
        <fieldset className={styles.playbackModes} disabled={!!playError} aria-label="人生推进模式">
          {playbackModes.map(option => <label key={option.value}>
            <input type="radio" name="life-playback" value={option.value} checked={playbackMode === option.value} onChange={() => setPlaybackMode(option.value)} />
            <span>{option.label}</span>
          </label>)}
        </fieldset>
        <button type="button" className={styles.primary} disabled={playbackMode !== 'manual' || !!playError} onClick={next}>
          <SkipForward size={16} aria-hidden="true" />下一年
        </button>
      </> : <button type="button" className={styles.primary} onClick={goSummary}>人生总结</button>}
    </div>
  </section></div>;
  if (step === 'summary') return <div className={styles.container}><section className={styles.panel}>
    <div className={styles.sectionHeading}><span>人生总结</span><b>总评 {summary}</b></div>
    <PropertyList values={game!.props.highest} includeAge /><p className={styles.muted}>{mode === 'classic' ? '选择一个天赋，让它陪你走过下一世。' : '名人天赋不可锁定。'}</p>
    <div className={styles.talentGrid}>{Array.from(replaced.talents).map(id => <TalentCard key={id} id={id} selected={profile.locked?.includes(id)} onClick={() => mode === 'classic' && setProfile(prev => ({ ...prev, locked: prev.locked?.includes(id) ? prev.locked.filter(item => item !== id) : [id] }))} />)}</div>
    <button type="button" className={styles.primary} onClick={() => finish(profile.locked)}>再次重开</button>
  </section></div>;
  return <div className={styles.container}><section className={styles.panel}>
    <div className={styles.sectionHeading}><span>成就与统计</span><button type="button" className={styles.textButton} onClick={() => setStep('home')}>返回首页</button></div>
    <div className={styles.stats}><b>重开 {profile.times} 次</b><b>天赋收集 {profile.talents.size}/{talents.size}</b><b>事件收集 {profile.events.size}/{events.size}</b><b>成就收集 {profile.achievements.size}/{achievements.size}</b></div>
    <div className={styles.achievementList}>{Array.from(achievements.values()).map(item => <div key={item.id} className={`${styles.achievement} ${profile.achievements.has(item.id) ? gradeClass(item.grade) : styles.hidden}`}><strong>{item.hide && !profile.achievements.has(item.id) ? '???' : item.name}</strong><span>{item.hide && !profile.achievements.has(item.id) ? '???' : item.description}</span></div>)}</div>
  </section></div>;
}
