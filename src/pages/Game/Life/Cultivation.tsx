import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Mountain, Shuffle, SkipForward, Sparkles, Swords, Trophy, Zap } from 'lucide-react';
import { randomAllocation } from './allocation';
import { achievements } from './engine/data';
import type { Allocation, ProfileState } from './engine/core/state';
import {
  breakthroughChance, cultivationProperties, cultivationTalents, drawCultivationTalents,
  endingNames, finishCultivation, lifespan, nextCultivation, realmLabel, realms,
  requiredProgress, roots, startCultivation,
} from './engine/cultivation';
import type { CultivationGame, CultivationLog, CultivationResult } from './engine/cultivation';
import { cultivationEvents } from './engine/cultivation/event';
import styles from './index.module.less';

const emptyAllocation = (): Allocation => ({ charm: 0, intelligence: 0, strength: 0, money: 0, spirit: 0 });
const propertyKeys = Object.keys(cultivationProperties) as (keyof Allocation)[];
type Speed = 'manual' | 'auto' | 'double';

function RealmStatus({ game }: { game: CultivationGame }) {
  const c = game.cultivation;
  const realm = realms[c.realm];
  const limit = lifespan(game);
  return <div className={styles.realmStatus}>
    <div className={styles.realmTitle}>
      <div className={styles.realmEmblem}><Swords size={28} strokeWidth={1.5} aria-hidden="true" /></div>
      <div><span>{realm.world} · {c.realm === 0 ? '山村' : '青岚宗'}</span><h2>{realmLabel(c)}</h2></div>
      <span className={styles.rootLabel}>{c.realm === 0 ? '灵根未测' : roots[c.root].name}</span>
    </div>
    <div className={styles.cultivationMetrics}>
      <div><span>年龄</span><b>{game.props.current.age.toLocaleString()}<small> 岁</small></b></div>
      <div><span>寿元上限</span><b>{limit === null ? '无自然上限' : `${limit.toLocaleString()} 岁`}</b></div>
      <div><span>已渡天劫</span><b>{c.tribulations}<small> 次</small></b></div>
      <div><span>下次天劫</span><b>{c.ending ? '此世已结' : c.nextTribulation === null ? '尚未降临' : `${c.nextTribulation.toLocaleString()} 岁`}</b></div>
    </div>
    {!c.ending && <div className={styles.cultivationProgress}>
      <div><span>{c.realm === 0 ? '成长' : '修为'} <b>{Math.floor(c.progress).toLocaleString()} / {requiredProgress(c).toLocaleString()}</b></span><span>{c.realm === 0 ? '6 岁测灵根' : `大境界突破率 ${breakthroughChance(game)}%`}</span></div>
      <progress max={requiredProgress(c)} value={c.progress} aria-label={c.realm === 0 ? '成长进度' : '修为进度'} />
    </div>}
  </div>;
}

export default function Cultivation({ profile, onExit, onFinish }: {
  profile: ProfileState;
  onExit: () => void;
  onFinish: (profile: ProfileState) => void;
}) {
  const [step, setStep] = useState<'pick' | 'alloc' | 'play' | 'summary'>('pick');
  const [drawn, setDrawn] = useState<number[]>([]);
  const [picked, setPicked] = useState<number[]>([]);
  const [allocation, setAllocation] = useState<Allocation>(emptyAllocation);
  const [game, setGame] = useState<CultivationGame>();
  const [logs, setLogs] = useState<CultivationLog[]>([]);
  const [speed, setSpeed] = useState<Speed>('manual');
  const [error, setError] = useState('');
  const gameRef = useRef<CultivationGame>();
  const savedRef = useRef(false);
  const logRef = useRef<HTMLDivElement>(null);
  const remaining = 20 - Object.values(allocation).reduce((sum, value) => sum + value, 0);
  const unlocked = game ? Array.from(game.achievements).filter(id => cultivationEvents.has(id)) : [];

  const appendResult = useCallback((result: CultivationResult, fresh = false) => {
    gameRef.current = result.state;
    setGame(result.state);
    const nextLogs: CultivationLog[] = [
      ...result.logs,
      ...result.achievements.map(id => ({
        age: result.state.props.current.age,
        text: `[成就] ${achievements.get(id)?.name}：${achievements.get(id)?.description}`,
        kind: 'good' as const,
      })),
    ];
    setLogs(previous => fresh ? nextLogs : [...previous, ...nextLogs]);
    if (result.state.cultivation.ending) setSpeed('manual');
  }, []);

  const advance = useCallback(() => {
    const current = gameRef.current;
    if (!current || current.cultivation.ending || error) return;
    try {
      appendResult(nextCultivation(current, profile));
    } catch (cause) {
      console.error('Cultivation progression failed', cause);
      setSpeed('manual');
      setError('修行推进失败，已暂停。');
    }
  }, [appendResult, error, profile]);
  useEffect(() => {
    if (speed === 'manual' || step !== 'play' || !game || game.cultivation.ending || error) return;
    const timer = window.setTimeout(advance, speed === 'double' ? 275 : 550);
    return () => window.clearTimeout(timer);
  }, [advance, error, game, speed, step]);
  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [logs]);

  const start = () => {
    if (remaining !== 0 || picked.length !== 3) return;
    try {
      appendResult(startCultivation(profile, allocation, picked), true);
      setError('');
      setStep('play');
    } catch (cause) {
      console.error('Cultivation start failed', cause);
      setError('修仙开局失败，请检查属性分配。');
    }
  };
  const finish = () => {
    if (!game?.cultivation.ending || savedRef.current) return;
    savedRef.current = true;
    onFinish(finishCultivation(game, profile));
  };
  const talentCard = (id: number, selectable: boolean) => {
    const talent = cultivationTalents.find(item => item.id === id)!;
    const content = <><strong>{talent.name}</strong><span>{talent.description}</span></>;
    return selectable ? <button type="button" key={id} aria-pressed={picked.includes(id)}
      className={`${styles.talent} ${styles[`grade-${talent.grade}`]} ${picked.includes(id) ? styles.selected : ''}`}
      onClick={() => setPicked(previous => previous.includes(id) ? previous.filter(value => value !== id) : previous.length < 3 ? [...previous, id] : previous)}>
      {picked.includes(id) && <Check size={18} className={styles.selectionMark} aria-hidden="true" />}{content}
    </button> : <div key={id} className={`${styles.talent} ${styles.cultivationTalentReadOnly} ${styles[`grade-${talent.grade}`]}`}>{content}</div>;
  };

  return <div className={styles.container}><section className={styles.cultivationPanel}>
    <header className={styles.pickHeader}>
      <div><span className={styles.pickEyebrow}>修仙模式</span><h2>{step === 'pick' ? '仙途天赋' : step === 'alloc' ? '先天属性' : step === 'summary' ? '此世仙途' : '修行纪事'}</h2></div>
      {step === 'pick' || step === 'alloc' ? <button type="button" className={styles.backButton} onClick={step === 'alloc' ? () => setStep('pick') : onExit}><ArrowLeft size={16} aria-hidden="true" />{step === 'alloc' ? '返回天赋' : '切换模式'}</button> : <span className={styles.cultivationWorld}><Mountain size={16} aria-hidden="true" />{realms[game!.cultivation.realm].world}</span>}
    </header>
    {error && <div role="alert" className={styles.cultivationError}>{error}<button type="button" className={styles.textButton} onClick={onExit}>返回模式选择</button></div>}

    {step === 'pick' && <>
      {!drawn.length ? <div className={styles.drawStage}>
        <div className={styles.cardDeck} aria-hidden="true">{Array.from({ length: 10 }, (_, index) => <div key={index} className={styles.cardBack}><Swords size={22} strokeWidth={1.5} /></div>)}</div>
        <h3>一介凡人，也可问道长生</h3>
        <button type="button" className={`${styles.primary} ${styles.drawButton}`} onClick={() => setDrawn(drawCultivationTalents())}><Sparkles size={18} aria-hidden="true" />十连抽<ArrowRight size={18} aria-hidden="true" /></button>
      </div> : <>
        <div className={styles.pickStatus}><h3>选择你的仙缘</h3><span aria-live="polite">已选 <b>{picked.length}</b> / 3</span></div>
        <div className={`${styles.talentGrid} ${styles.pickGrid}`}>{drawn.map(id => talentCard(id, true))}</div>
        <footer className={styles.pickFooter}>
          <div className={styles.pickedSlots}>{[0, 1, 2].map(index => <span key={index} className={picked[index] ? styles.filledSlot : ''}>{picked[index] ? cultivationTalents.find(item => item.id === picked[index])?.name : `仙缘 ${index + 1}`}</span>)}</div>
          <button type="button" disabled={picked.length !== 3} className={picked.length === 3 ? styles.primary : styles.disabled} onClick={() => setStep('alloc')}>分配属性<ArrowRight size={16} aria-hidden="true" /></button>
        </footer>
      </>}
      <div className={styles.realmRoad}><h3>长生道途</h3><ol>{realms.slice(1).map((realm, index) => <li key={realm.name}><span>{index + 1}</span>{realm.name}</li>)}</ol></div>
    </>}

    {step === 'alloc' && <div className={styles.cultivationAllocation}>
      <div className={styles.pickStatus}><h3>先天禀赋</h3><span aria-live="polite">剩余 <b>{remaining}</b> / 20 点</span></div>
      <div className={styles.talentGrid}>{picked.map(id => talentCard(id, false))}</div>
      <div className={styles.allocateGrid}>{propertyKeys.map(key => <label key={key}><span>{cultivationProperties[key]}</span><input type="number" min={0} max={10} value={allocation[key]} onChange={event => setAllocation(previous => ({ ...previous, [key]: Math.min(10, Math.max(0, Math.trunc(Number(event.target.value) || 0))) }))} /></label>)}</div>
      <div className={styles.actions}>
        <button type="button" className={styles.randomButton} onClick={() => setAllocation(randomAllocation(20, 10))}><Shuffle size={16} aria-hidden="true" />随机分配</button>
        <button type="button" disabled={remaining !== 0} className={remaining === 0 ? styles.primary : styles.disabled} onClick={start}>踏入仙途</button>
      </div>
    </div>}

    {step === 'play' && game && <>
      <RealmStatus game={game} />
      <div className={styles.cultivationAttributes}>{propertyKeys.map(key => <div key={key}><span>{cultivationProperties[key]}</span><b>{game.props.current[key]}</b></div>)}</div>
      <div className={`${styles.logs} ${styles.cultivationLogs}`} ref={logRef} aria-label="修行日志">
        {logs.map((log, index) => <article key={index}><b>{log.age.toLocaleString()}岁</b><p className={log.kind === 'realm' ? styles.cultivationRealmLog : log.kind === 'danger' ? styles.achievementLog : log.kind === 'good' ? styles.talentLog : undefined}>{log.text}</p></article>)}
      </div>
      <div className={styles.playControls}>
        {!game.cultivation.ending ? <>
          <fieldset className={styles.playbackModes} aria-label="修行推进模式" disabled={!!error}>
            {([{ value: 'manual', label: '手动' }, { value: 'auto', label: '自动' }, { value: 'double', label: '自动两倍速' }] as const).map(option => <label key={option.value}><input type="radio" name="cultivation-speed" value={option.value} checked={speed === option.value} onChange={() => setSpeed(option.value)} /><span>{option.label}</span></label>)}
          </fieldset>
          <button type="button" className={styles.primary} disabled={speed !== 'manual' || !!error} onClick={advance}><SkipForward size={16} aria-hidden="true" />{game.cultivation.realm === 0 ? '下一年' : `修行 ${realms[game.cultivation.realm].years.toLocaleString()} 年`}</button>
        </> : <button type="button" className={styles.primary} onClick={() => setStep('summary')}><Trophy size={16} aria-hidden="true" />此世总结</button>}
      </div>
    </>}

    {step === 'summary' && game && <>
      <div className={styles.cultivationEnding}><Trophy size={36} strokeWidth={1.5} aria-hidden="true" /><div><span>此世结局</span><h2>{endingNames[game.cultivation.ending!]}</h2></div></div>
      <RealmStatus game={game} />
      <div className={styles.realmRoad}><h3>问道足迹</h3><ol>{realms.slice(1).map((realm, index) => <li key={realm.name} className={index + 1 <= game.cultivation.realm ? styles.realmReached : ''}>{index + 1 <= game.cultivation.realm ? <Check size={14} aria-hidden="true" /> : <span>{index + 1}</span>}{realm.name}</li>)}</ol></div>
      <p className={styles.muted}>修仙事件收集 {new Set([...(profile.cultivation?.events || []), ...game.events]).size} / {cultivationEvents.size}</p>
      <h3 className={styles.cultivationSectionTitle}>此世成就 · {unlocked.length}</h3>
      <div className={styles.cultivationBadges}>{unlocked.length ? unlocked.map(id => <span key={id}><Zap size={14} aria-hidden="true" />{achievements.get(id)?.name}</span>) : <span>暂无新成就</span>}</div>
      <button type="button" className={styles.primary} onClick={finish}>再入轮回<ArrowRight size={16} aria-hidden="true" /></button>
    </>}
  </section></div>;
}
