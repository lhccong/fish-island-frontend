import React, { useEffect, useState } from 'react';
import { Spin, message } from 'antd';
import { history, useParams, useModel } from '@umijs/max';
import { fishBattleGameDetail, fishBattleGameLike } from '@/services/backend/fishBattleController';
import type { FishBattleGameDetail } from '../types';
import {
  Trophy, Target, Star, ThumbsUp, RefreshCw, BarChart3, Home,
} from 'lucide-react';
import './index.less';

const FishBattleResult: React.FC = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const { initialState } = useModel('@@initialState');
  const currentUser = initialState?.currentUser;
  const [detail, setDetail] = useState<FishBattleGameDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'damage' | 'taken'>('overview');

  useEffect(() => {
    if (!currentUser) {
      message.warning('请先登录');
      history.push('/fishBattle/home');
      return;
    }
  }, [currentUser]);

  useEffect(() => {
    const fetchDetail = async () => {
      if (!gameId) return;
      try {
        const res = await fishBattleGameDetail(Number(gameId));
        if (res?.data) setDetail(res.data as FishBattleGameDetail);
      } catch (e) {
        message.error('获取对局详情失败');
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [gameId]);

  const handleLike = async (targetUserId: number) => {
    try {
      const res = await fishBattleGameLike({ gameId: Number(gameId), targetUserId });
      if (res?.data) {
        message.success('点赞成功！');
        // 刷新本地 likes 计数
        setDetail((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            playerStats: prev.playerStats.map((p) =>
              p.userId === targetUserId ? { ...p, likes: (p.likes || 0) + 1 } : p
            ),
          };
        });
      } else {
        message.warning('你已经点赞过该玩家了');
      }
    } catch (e) {
      message.warning('你已经点赞过该玩家了');
    }
  };

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}分${s.toString().padStart(2, '0')}秒`;
  };

  const game = detail?.game;
  const isBlueWin = game?.winningTeam === 'blue';
  const mvpPlayer = detail?.playerStats?.find((p) => p.isMvp);
  const myStats = detail?.playerStats?.find((p) => p.userId === currentUser?.id);
  const blueStats = detail?.playerStats?.filter((p) => p.team === 'blue') || [];
  const redStats = detail?.playerStats?.filter((p) => p.team === 'red') || [];
  const allStats = [...blueStats, ...redStats];
  const maxDamage = Math.max(...allStats.map((p) => p.damageDealt || 0), 1);
  const maxTaken = Math.max(...allStats.map((p) => p.damageTaken || 0), 1);

  return (
    <Spin spinning={loading}>
      <div className="fish-battle-result">
        {/* Confetti for victory (CSS animated) */}
        <div className="confetti-bg">
          {Array.from({ length: 30 }).map((_, i) => (
            <span key={i} className="confetti-piece" style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 3}s`,
              background: ['#ff6b35', '#ffd93d', '#4ade80', '#60a5fa', '#c084fc', '#ff8fab'][i % 6],
            }} />
          ))}
        </div>

        <div className="result-content">
          {/* Victory Banner */}
          <div className={`result-banner ${isBlueWin ? 'win-blue' : 'win-red'}`}>
            <div className="banner-icon"><Trophy size={48} /></div>
            <h1 className="banner-title">{isBlueWin ? '蓝队胜利！' : '红队胜利！'}</h1>
            <div className="banner-score">
              <span className="score-blue">{game?.blueKills || 0}</span>
              <span className="score-sep">vs</span>
              <span className="score-red">{game?.redKills || 0}</span>
            </div>
            <div className="banner-meta">
              <span>对局时长：{game ? formatDuration(game.durationSeconds) : '--'}</span>
              <span>击杀总计：{(game?.blueKills || 0) + (game?.redKills || 0)}</span>
            </div>
          </div>

          {/* Points Card */}
          <div className="points-card">
            <div className="points-icon"><Target size={28} /></div>
            <div className="points-info">
              <span className="points-label">获得积分</span>
              <span className="points-value">+{myStats?.pointsEarned || 0}</span>
            </div>
            <div className="points-breakdown">
              <span className="points-item">基础积分 +20</span>
              {myStats?.isWin === 1 && <span className="points-item win-bonus">胜利加成 +5</span>}
              {myStats?.isMvp === 1 && <span className="points-item mvp-bonus">MVP加成 +5</span>}
            </div>
          </div>

          {/* MVP Card */}
          {mvpPlayer && (
            <div className="mvp-card">
              <div className="mvp-badge"><Star size={16} /> MVP</div>
              <div className="mvp-avatar">{mvpPlayer.heroName || mvpPlayer.heroId}</div>
              <div className="mvp-info">
                <span className="mvp-name">{mvpPlayer.playerName || ('玩家' + mvpPlayer.userId)}</span>
                <span className="mvp-kda">{mvpPlayer.kills}/{mvpPlayer.deaths}/{mvpPlayer.assists}</span>
              </div>
              <div className="mvp-stats">
                <span className="mvp-stat">伤害 {mvpPlayer.damageDealt.toLocaleString()}</span>
                <span className="mvp-stat">承伤 {mvpPlayer.damageTaken.toLocaleString()}</span>
              </div>
              <button type="button" className="btn-like-mvp" onClick={() => handleLike(mvpPlayer.userId)}>
                <ThumbsUp size={14} /> 点赞 {mvpPlayer.likes}
              </button>
            </div>
          )}

          {/* Stats Table */}
          <div className="stats-section">
            <div className="stats-tabs">
              <button type="button" className={`stats-tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>总览</button>
              <button type="button" className={`stats-tab ${activeTab === 'damage' ? 'active' : ''}`} onClick={() => setActiveTab('damage')}>伤害统计</button>
              <button type="button" className={`stats-tab ${activeTab === 'taken' ? 'active' : ''}`} onClick={() => setActiveTab('taken')}>承伤统计</button>
            </div>

            <div className="stats-table">
              <div className="stats-table-header">
                <span className="col-hero">英雄</span>
                <span className="col-kda">KDA</span>
                {activeTab === 'overview' && <>
                  <span className="col-damage">伤害输出</span>
                  <span className="col-taken">承受伤害</span>
                  <span className="col-heal">治疗</span>
                </>}
                {activeTab === 'damage' && <span className="col-bar">伤害输出</span>}
                {activeTab === 'taken' && <span className="col-bar">承受伤害</span>}
                <span className="col-like">点赞</span>
              </div>

              {allStats.map((player) => (
                <div key={player.id} className={`stats-table-row ${player.team} ${player.isMvp ? 'mvp-row' : ''}`}>
                  <span className="col-hero">
                    <span className="row-emoji">{player.heroName || player.heroId}</span>
                    <span className="row-player-name">{player.playerName || ('玩家' + player.userId)}</span>
                    <span className={`row-team-dot ${player.team}`} />
                    {player.isMvp && <span className="row-mvp">MVP</span>}
                  </span>
                  <span className="col-kda">{player.kills}/{player.deaths}/{player.assists}</span>
                  {activeTab === 'overview' && <>
                    <span className="col-damage">{player.damageDealt.toLocaleString()}</span>
                    <span className="col-taken">{player.damageTaken.toLocaleString()}</span>
                    <span className="col-heal">{player.healing.toLocaleString()}</span>
                  </>}
                  {activeTab === 'damage' && (
                    <span className="col-bar">
                      <div className="bar-track">
                        <div className="bar-fill damage" style={{ width: `${(player.damageDealt / maxDamage) * 100}%` }} />
                      </div>
                      <span className="bar-value">{player.damageDealt.toLocaleString()}</span>
                    </span>
                  )}
                  {activeTab === 'taken' && (
                    <span className="col-bar">
                      <div className="bar-track">
                        <div className="bar-fill taken" style={{ width: `${(player.damageTaken / maxTaken) * 100}%` }} />
                      </div>
                      <span className="bar-value">{player.damageTaken.toLocaleString()}</span>
                    </span>
                  )}
                  <span className="col-like">
                    <button type="button" className="btn-like" onClick={() => handleLike(player.userId)}><ThumbsUp size={12} /> {player.likes}</button>
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="result-actions">
            <button type="button" className="btn-play-again" onClick={() => history.push('/fishBattle/lobby')}><RefreshCw size={16} /> 再来一局</button>
            <button type="button" className="btn-view-data" onClick={() => history.push('/fishBattle/profile')}><BarChart3 size={16} /> 查看数据</button>
            <button type="button" className="btn-go-home" onClick={() => history.push('/fishBattle/home')}><Home size={16} /> 返回首页</button>
          </div>
        </div>
      </div>
    </Spin>
  );
};

export default FishBattleResult;
