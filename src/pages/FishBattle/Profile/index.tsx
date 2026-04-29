import React, { useEffect, useState, useMemo } from 'react';
import { Spin, message, Avatar } from 'antd';
import { history as routerHistory, useModel } from '@umijs/max';
import { fishBattleStatsUser, fishBattleStatsHistory } from '@/services/backend/fishBattleController';
import type { FishBattleUserStats, FishBattlePlayerStats } from '../types';
import {
  ArrowLeft, Gamepad2, Trophy, Star, Flame, Calendar,
  ScrollText, Shield, Heart, CheckCircle2, XCircle, Inbox,
  Zap, Award, ChevronRight,
} from 'lucide-react';
import './index.less';

const FishBattleProfile: React.FC = () => {
  const { initialState } = useModel('@@initialState');
  const currentUser = initialState?.currentUser;
  const [userStats, setUserStats] = useState<FishBattleUserStats | null>(null);
  const [history, setHistory] = useState<FishBattlePlayerStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) {
      message.warning('请先登录后再查看个人数据');
      routerHistory.push('/fishBattle/home');
      return;
    }
    const fetchData = async () => {
      try {
        const [statsRes, historyRes] = await Promise.all([
          fishBattleStatsUser(),
          fishBattleStatsHistory({ current: 1, pageSize: 20 }),
        ]);
        if (statsRes?.data) setUserStats(statsRes.data as FishBattleUserStats);
        if (historyRes?.data) {
          const page = historyRes.data as any;
          setHistory(page.records || []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const winRate = useMemo(() => (
    userStats && userStats.totalGames > 0
      ? Math.round((userStats.wins / userStats.totalGames) * 100) : 0
  ), [userStats]);

  const kda = useMemo(() => (
    userStats && userStats.totalDeaths > 0
      ? ((userStats.totalKills + userStats.totalAssists) / userStats.totalDeaths).toFixed(2)
      : (userStats?.totalKills || 0) + (userStats?.totalAssists || 0) > 0 ? 'Perfect' : '0.00'
  ), [userStats]);

  const todayPercent = userStats ? Math.round((userStats.todayGames / userStats.dailyLimit) * 100) : 0;
  const streakDisplay = userStats?.currentStreak ?? 0;
  const streakLabel = streakDisplay > 0 ? `${streakDisplay} 连胜` : streakDisplay < 0 ? `${Math.abs(streakDisplay)} 连败` : '—';

  return (
    <Spin spinning={loading}>
      <div className="fish-battle-profile">
        <div className="profile-main">
          {/* ── Page Header ── */}
          <div className="profile-page-header">
            <button type="button" className="btn-back" onClick={() => routerHistory.push('/fishBattle/lobby')}>
              <ArrowLeft size={16} /> 返回
            </button>
            <h1 className="page-title">个人数据</h1>
            <button type="button" className="btn-leaderboard" onClick={() => routerHistory.push('/fishBattle/leaderboard')}>
              <Trophy size={14} /> 排行榜
            </button>
          </div>

          {/* ── User Card ── */}
          <div className="user-card">
            <Avatar size={56} src={currentUser?.userAvatar} className="user-card-avatar">
              {currentUser?.userName?.charAt(0)}
            </Avatar>
            <div className="user-card-info">
              <h2 className="user-card-name">{currentUser?.userName || '召唤师'}</h2>
              <div className="user-card-tags">
                {(userStats?.mvpCount ?? 0) > 0 && (
                  <span className="tag tag-gold"><Star size={11} /> MVP x{userStats?.mvpCount}</span>
                )}
                {(userStats?.maxStreak ?? 0) >= 3 && (
                  <span className="tag tag-orange"><Flame size={11} /> 最高{userStats?.maxStreak}连胜</span>
                )}
                <span className="tag tag-blue"><Gamepad2 size={11} /> {userStats?.totalGames || 0}场</span>
              </div>
            </div>
            <div className="user-card-winrate">
              <span className="winrate-num">{winRate}%</span>
              <span className="winrate-label">胜率</span>
            </div>
          </div>

          {/* ── Stats Grid ── */}
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-num">{userStats?.wins || 0}</span>
              <span className="stat-desc">胜场</span>
            </div>
            <div className="stat-item">
              <span className="stat-num">{userStats?.losses || 0}</span>
              <span className="stat-desc">负场</span>
            </div>
            <div className="stat-item">
              <span className="stat-num">{kda}</span>
              <span className="stat-desc">KDA</span>
            </div>
            <div className="stat-item">
              <span className={`stat-num ${streakDisplay > 0 ? 'color-green' : streakDisplay < 0 ? 'color-red' : ''}`}>
                {streakLabel}
              </span>
              <span className="stat-desc">当前状态</span>
            </div>
          </div>

          {/* ── Today Progress ── */}
          {userStats && (
            <div className="today-card">
              <div className="today-top">
                <span className="today-label"><Calendar size={14} /> 今日进度</span>
                <span className="today-nums">{userStats.todayGames} / {userStats.dailyLimit}</span>
              </div>
              <div className="today-bar">
                <div className="today-bar-fill" style={{ width: `${Math.min(todayPercent, 100)}%` }} />
              </div>
            </div>
          )}

          {/* ── History Section ── */}
          <div className="section-header">
            <h3><ScrollText size={15} /> 对局历史</h3>
          </div>

          <div className="history-section">
            {history.length > 0 ? (
              <>
                <div className="history-header">
                  <span className="h-hero">英雄</span>
                  <span className="h-team">阵营</span>
                  <span className="h-result">结果</span>
                  <span className="h-kda">KDA</span>
                  <span className="h-dmg">伤害</span>
                  <span className="h-pts">积分</span>
                  <span className="h-mvp">MVP</span>
                  <span className="h-detail" />
                </div>
                {history.map((record) => (
                  <div
                    key={record.id}
                    className={`history-row ${record.isWin ? 'win' : 'lose'}`}
                    onClick={() => routerHistory.push(`/fishBattle/result/${record.gameId}`)}
                  >
                    <span className="h-hero">{record.heroName || record.heroId}</span>
                    <span className={`h-team ${record.team}`}>
                      {record.team === 'blue' ? <><Shield size={13} /> 蓝</> : <><Heart size={13} /> 红</>}
                    </span>
                    <span className={`h-result ${record.isWin ? 'win' : 'lose'}`}>
                      {record.isWin ? <><CheckCircle2 size={13} /> 胜</> : <><XCircle size={13} /> 败</>}
                    </span>
                    <span className="h-kda">{record.kills}/{record.deaths}/{record.assists}</span>
                    <span className="h-dmg"><Zap size={11} /> {record.damageDealt.toLocaleString()}</span>
                    <span className="h-pts">+{record.pointsEarned}</span>
                    <span className="h-mvp">{record.isMvp ? <Award size={13} color="#f59e0b" /> : null}</span>
                    <span className="h-detail"><ChevronRight size={14} color="#ccc" /></span>
                  </div>
                ))}
              </>
            ) : (
              <div className="empty-state">
                <Inbox size={40} />
                <span>暂无对局记录，快去开一局吧！</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Spin>
  );
};

export default FishBattleProfile;
