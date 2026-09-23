import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, LockKeyhole, Medal, RotateCcw, Search, Shuffle, SkipForward, Sparkles, Swords, Trophy, BookOpen, UserRound } from 'lucide-react';
import Cultivation from './Cultivation';
import { realms } from './engine/cultivation';
import { randomAllocation } from './allocation';
import { achievements, characters, events, talents } from './engine/data';
import { end as endGame, next as nextYear, pick as replaceTalents, pull as pullTalents, start as startGame, summary as summarize } from './engine/core';
import type { Allocation, GameState, ProfileState, Properties } from './engine/core/state';
import { judge, judgeGradeByValue } from './engine/config';
import { properties, judgeNames } from './display';
import styles from './index.module.less';

type Step = 'home' | 'mode' | 'pick' | 'character' | 'alloc' | 'play' | 'summary' | 'achievements' | 'cultivation';
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
  const [achievementFilter, setAchievementFilter] = useState('all');
  const [achievementQuery, setAchievementQuery] = useState('');
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
  const begin = () => { resetRound(); setStep('mode'); };
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
    launchLife(
      { charm: character.property.CHR, intelligence: character.property.INT, strength: character.property.STR, money: character.property.MNY, spirit: CONFIG.spirit },
      new Set(character.talent),
    );
  };
  const launchLife = (initialAllocation: Allocation, initialTalents: Set<number>) => {
    const result = startGame(profile, initialAllocation, initialTalents);
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
  const start = () => {
    if (remaining !== 0) return;
    launchLife({ charm: allocation.charm, intelligence: allocation.intelligence, strength: allocation.strength, money: allocation.money, spirit: allocation.spirit }, replaced.talents);
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
  if (step === 'cultivation') return <Cultivation profile={profile} onExit={() => setStep('mode')} onFinish={updated => { setProfile(updated); setStep('home'); }} />;
  if (step === 'mode') return <div className={styles.container}><section className={styles.pickPanel}>
    <header className={styles.pickHeader}><div><span className={styles.pickEyebrow}>人生重开模拟器</span><h2>选择重开模式</h2></div><button type="button" className={styles.backButton} onClick={() => setStep('home')}><ArrowLeft size={16} aria-hidden="true" />返回首页</button></header>
    <div className={`${styles.modeGrid} ${styles.lifeModes}`}>
    <button type="button" onClick={() => chooseMode('classic')}><RotateCcw size={28} strokeWidth={1.5} aria-hidden="true" /><strong>经典模式</strong><span>凡俗一生，百味人生</span><ArrowRight size={18} aria-hidden="true" /></button>
    <button type="button" className={styles.cultivationMode} onClick={() => { resetRound(); setStep('cultivation'); }}><Swords size={28} strokeWidth={1.5} aria-hidden="true" /><strong>修仙模式</strong><span>人界 · 灵界 · 仙界</span><small>{profile.cultivation ? `历经 ${profile.cultivation.times} 世 · 最高 ${realms[profile.cultivation.bestRealm]?.name || '凡人'}` : '炼气十三层 · 问道长生'}</small><ArrowRight size={18} aria-hidden="true" /></button>
    <button type="button" disabled={profile.times < 10} onClick={() => chooseMode('celebrity')}><UserRound size={28} strokeWidth={1.5} aria-hidden="true" /><strong>名人模式</strong><span>{profile.times < 10 ? `重开 10 次解锁 · ${profile.times}/10` : '前世古人，今生新途'}</span>{profile.times < 10 ? <LockKeyhole size={18} aria-hidden="true" /> : <ArrowRight size={18} aria-hidden="true" />}</button>
  </div></section></div>;
  if (step === 'pick') return <div className={styles.container}><section className={styles.pickPanel}>
    <header className={styles.pickHeader}>
      <div><span className={styles.pickEyebrow}>经典模式</span><h2>天赋抽取</h2></div>
      <button type="button" className={styles.backButton} onClick={begin}><ArrowLeft size={16} aria-hidden="true" />切换模式</button>
      <ol className={styles.progressSteps} aria-label="人生重开流程">
        <li aria-current="step"><b>1</b>天赋</li><li><b>2</b>属性</li><li><b>3</b>人生</li>
      </ol>
    </header>
    {!pulled.length ? <div className={styles.drawStage}>
      <div className={styles.cardDeck} aria-hidden="true">
        {Array.from({ length: CONFIG.pull }, (_, index) => <div key={index} className={styles.cardBack}><Sparkles size={22} strokeWidth={1.5} /></div>)}
      </div>
      <h3>你的天赋，尚未揭晓</h3>
      <button type="button" className={`${styles.primary} ${styles.drawButton}`} onClick={pull}>
        <Sparkles size={18} aria-hidden="true" />十连抽<ArrowRight size={18} aria-hidden="true" />
      </button>
    </div> : <>
      <div className={styles.pickStatus}><h3>选择你的天赋</h3><span aria-live="polite">已选 <b>{picked.size}</b> / {CONFIG.max}</span></div>
      <div className={`${styles.talentGrid} ${styles.pickGrid}`}>{pulled.map(id => <TalentCard key={id} id={id} selected={picked.has(id)} onClick={() => setPicked(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else if (next.size < CONFIG.max) next.add(id); return next; })} />)}</div>
      <footer className={styles.pickFooter}>
        <div className={styles.pickedSlots} aria-label="已选天赋">{Array.from({ length: CONFIG.max }, (_, index) => {
          const id = Array.from(picked)[index];
          return <span key={index} className={id !== undefined ? styles.filledSlot : ''}>
            {id !== undefined ? <><Check size={14} aria-hidden="true" />{talents.get(id)?.name}</> : `天赋 ${index + 1}`}
          </span>;
        })}</div>
        <button type="button" disabled={picked.size !== CONFIG.min} className={picked.size === CONFIG.min ? styles.primary : styles.disabled} onClick={submitTalents}>分配属性<ArrowRight size={16} aria-hidden="true" /></button>
      </footer>
    </>}
  </section></div>;
  if (step === 'character') return <div className={styles.container}><section className={styles.pickPanel}>
    <header className={styles.pickHeader}>
      <div><span className={styles.pickEyebrow}>名人模式</span><h2>选择你的前世</h2></div>
      <button type="button" className={styles.backButton} onClick={begin}><ArrowLeft size={16} aria-hidden="true" />返回模式</button>
    </header>
    {!charactersPulled.length ? <div className={styles.drawStage}>
      <div className={styles.characterDeck} aria-hidden="true">{[0, 1, 2].map(index => <div key={index} className={styles.cardBack}><UserRound size={36} strokeWidth={1.2} /></div>)}</div>
      <button type="button" className={`${styles.primary} ${styles.drawButton}`} onClick={pull}><Shuffle size={18} aria-hidden="true" />抽取名人<ArrowRight size={18} aria-hidden="true" /></button>
    </div> : <>
      <div className={styles.pickStatus}><h3>前世人选</h3><span>已选 <b>{characterId ? 1 : 0}</b> / 1</span></div>
      <fieldset className={styles.celebrityGrid}>
        <legend className={styles.visuallyHidden}>选择一位名人</legend>
        {charactersPulled.map((id, index) => {
          const character = characters.get(id)!;
          const values = { charm: character.property.CHR, intelligence: character.property.INT, strength: character.property.STR, money: character.property.MNY, spirit: CONFIG.spirit };
          return <label key={id} className={styles.celebrityOption}>
            <input type="radio" name="life-character" value={id} checked={characterId === id} onChange={() => setCharacterId(id)} aria-label={character.name} />
            <div className={styles.celebrityCard}>
              <div className={styles.celebrityIdentity}>
                <span className={styles.celebrityEmblem} aria-hidden="true"><UserRound size={26} strokeWidth={1.5} /></span>
                <div><span>前世 · 0{index + 1}</span><h3>{character.name}</h3></div>
                <span className={styles.celebrityCheck} aria-hidden="true">{characterId === id && <Check size={15} />}</span>
              </div>
              <div className={styles.celebrityProperties}>{propertyKeys.map(key => <div key={key}>
                <span>{properties[key]}</span><b>{values[key]}</b>
                <span className={styles.celebrityMeter} aria-hidden="true"><i style={{ width: `${Math.max(0, Math.min(100, values[key] * 10))}%` }} /></span>
              </div>)}</div>
              <div className={styles.celebrityTalentHeading}><Sparkles size={14} aria-hidden="true" /><span>天赋</span><small>{character.talent.length} 项</small></div>
              <ul className={styles.celebrityTalents}>{character.talent.map(talentId => {
                const talent = talents.get(talentId);
                return talent ? <li key={talentId}><span className={`${styles.celebrityGrade} ${gradeClass(talent.grade)}`} aria-hidden="true" /><div><strong>{talent.name}</strong><p>{talent.description}</p></div></li> : null;
              })}</ul>
            </div>
          </label>;
        })}
      </fieldset>
      <footer className={`${styles.pickFooter} ${styles.celebrityFooter}`}>
        <span aria-live="polite">{characterId ? <>此世前身 <b>{characters.get(characterId)?.name}</b></> : '尚未选择'}</span>
        <button type="button" disabled={!characterId} className={characterId ? styles.primary : styles.disabled} onClick={submitCharacter}>开始新人生<ArrowRight size={16} aria-hidden="true" /></button>
      </footer>
    </>}
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
  const unlockedCount = Array.from(achievements.keys()).filter(id => profile.achievements.has(id)).length;
  const progress = Math.round(unlockedCount / achievements.size * 100);
  const visibleAchievements = Array.from(achievements.values()).filter(item => {
    const unlocked = profile.achievements.has(item.id);
    if (achievementFilter === 'unlocked' && !unlocked || achievementFilter === 'locked' && unlocked) return false;
    const searchable = item.hide && !unlocked ? '隐藏成就 尚未揭晓' : `${item.name} ${item.description}`;
    return searchable.includes(achievementQuery.trim());
  }).sort((a, b) => Number(profile.achievements.has(b.id)) - Number(profile.achievements.has(a.id)));
  return <div className={styles.container}><section className={styles.achievementsPanel}>
    <header className={styles.pickHeader}>
      <div><span className={styles.pickEyebrow}>人生图鉴</span><h2>成就与统计</h2></div>
      <button type="button" className={styles.backButton} onClick={() => setStep('home')}><ArrowLeft size={16} aria-hidden="true" />返回首页</button>
    </header>
    <div className={styles.collectionStats}>
      {[
        { label: '重开次数', value: profile.times, total: null, icon: RotateCcw },
        { label: '天赋收集', value: profile.talents.size, total: talents.size, icon: Sparkles },
        { label: '事件收集', value: profile.events.size, total: events.size, icon: BookOpen },
        { label: '成就解锁', value: unlockedCount, total: achievements.size, icon: Trophy },
      ].map(({ label, value, total, icon: Icon }) => <div key={label} className={styles.collectionStat}>
        <span><Icon size={17} aria-hidden="true" />{label}</span><div><b>{value}</b><small>{total === null ? '次' : `/ ${total}`}</small></div>
      </div>)}
    </div>
    <div className={styles.collectionProgress}>
      <div><span>成就收集进度</span><b>{progress}%</b></div>
      <progress aria-label="成就收集进度" max={achievements.size} value={unlockedCount} />
    </div>
    <div className={styles.achievementToolbar}>
      <fieldset className={styles.achievementFilters} aria-label="成就状态">
        {[
          { value: 'all', label: '全部', count: achievements.size },
          { value: 'unlocked', label: '已解锁', count: unlockedCount },
          { value: 'locked', label: '未解锁', count: achievements.size - unlockedCount },
        ].map(option => <label key={option.value}><input type="radio" name="achievement-filter" value={option.value} checked={achievementFilter === option.value} onChange={() => setAchievementFilter(option.value)} /><span>{option.label}<b>{option.count}</b></span></label>)}
      </fieldset>
      <label className={styles.achievementSearch}><Search size={16} aria-hidden="true" /><input type="search" aria-label="搜索成就" placeholder="搜索成就" value={achievementQuery} onChange={event => setAchievementQuery(event.target.value)} /></label>
    </div>
    <div className={styles.achievementResults} aria-live="polite">共 {visibleAchievements.length} 项成就</div>
    <div className={styles.achievementGrid}>{visibleAchievements.map(item => {
      const unlocked = profile.achievements.has(item.id);
      const hidden = item.hide && !unlocked;
      const Icon = unlocked ? Trophy : hidden ? LockKeyhole : Medal;
      return <article key={item.id} className={`${styles.achievementCard} ${unlocked ? styles.achievementUnlocked : ''} ${hidden ? '' : gradeClass(item.grade)}`}>
        <div className={styles.achievementIcon}><Icon size={23} strokeWidth={1.6} aria-hidden="true" /></div>
        <div className={styles.achievementBody}>
          <h3>{hidden ? '隐藏成就' : item.name}</h3>
          <p>{hidden ? '尚未揭晓' : item.description}</p>
          <div className={styles.achievementMeta}><span>{hidden ? '未知' : ['普通', '稀有', '史诗', '传说'][item.grade]}</span><span>{unlocked ? <Check size={12} aria-hidden="true" /> : <LockKeyhole size={11} aria-hidden="true" />}{unlocked ? '已解锁' : '未解锁'}</span></div>
        </div>
      </article>;
    })}</div>
    {!visibleAchievements.length && <div className={styles.achievementEmpty}><Search size={28} aria-hidden="true" /><h3>暂无匹配成就</h3><button type="button" className={styles.textButton} onClick={() => { setAchievementQuery(''); setAchievementFilter('all'); }}>查看全部成就</button></div>}
  </section></div>;
}
