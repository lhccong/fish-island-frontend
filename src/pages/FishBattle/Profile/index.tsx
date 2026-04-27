import React, { useEffect, useState } from 'react';
import { Spin, message } from 'antd';
import { history as routerHistory, useModel } from '@umijs/max';
import { fishBattleStatsUser, fishBattleStatsHistory, fishBattleStatsLeaderboard } from '@/services/backend/fishBattleController';
import type { FishBattleUserStats, FishBattlePlayerStats } from '../types';
import {
  BarChart3, ArrowLeft, Gamepad2, Trophy, Target, Swords,
  Star, Flame, Calendar, ScrollText, Shield, Heart,
  CheckCircle2, XCircle, Medal, Inbox,
} from 'lucide-react';
import './index.less';

const FishBattleProfile: React.FC = () => {
  const { initialState } = useModel('@@initialState');
  const currentUser = initialState?.currentUser;
  const [userStats, setUserStats] = useState<FishBattleUserStats | null>(null);
  const [history, setHistory] = useState<FishBattlePlayerStats[]>([]);
  const [leaderboard, setLeaderboard] = useState<FishBattleUserStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'history' | 'leaderboard'>('history');

  useEffect(() => {
    if (!currentUser) {
      message.warning('请先登录后再查看个人数据');
      routerHistory.push('/fishBattle/home');
      return;
    }
    const fetchData = async () => {
      try {
        const [statsRes, historyRes, leaderRes] = await Promise.all([
          fishBattleStatsUser(),
          fishBattleStatsHistory({ current: 1, pageSize: 20 }),
          fishBattleStatsLeaderboard({ limit: 10 }),
        ]);
        if (statsRes?.data) setUserStats(statsRes.data as FishBattleUserStats);
        if (historyRes?.data) {
          const page = historyRes.data as any;
          setHistory(page.records || []);
        }
        if (leaderRes?.data) setLeaderboard(leaderRes.data as FishBattleUserStats[]);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const winRate = userStats && userStats.totalGames > 0
    ? Math.round((userStats.wins / userStats.totalGames) * 100)
    : 0;

  const kda = userStats && userStats.totalDeaths > 0
    ? ((userStats.totalKills + userStats.totalAssists) / userStats.totalDeaths).toFixed(2)
    : (userStats?.totalKills || 0) + (userStats?.totalAssists || 0) > 0 ? 'Perfect' : '0.00';

  const todayPercent = userStats ? Math.round((userStats.todayGames / userStats.dailyLimit) * 100) : 0;

  const rankIcons = [
    <Medal size={18} color="#fbbf24" />,
    <Medal size={18} color="#94a3b8" />,
    <Medal size={18} color="#d97706" />,
  ];

  return (
    <Spin spinning={loading}>
      <div className="fish-battle-profile">
        <div className="profile-main">
          {/* Header */}
          <div className="profile-header">
            <h2 className="profile-title"><BarChart3 size={22} className="title-icon" /> 个人数据</h2>
            <button className="btn-back-lobby" onClick={() => routerHistory.push('/fishBattle/lobby')}>
              <ArrowLeft size={14} /> 返回大厅
            </button>
          </div>

          {/* Stats Grid */}
          <div className="stats-grid">
            <div className="stat-card">
              <span className="stat-icon"><Gamepad2 size={22} /></span>
              <span className="stat-value">{userStats?.totalGames || 0}</span>
              <span className="stat-label">总场次</span>
            </div>
            <div className="stat-card">
              <span className="stat-icon"><Trophy size={22} /></span>
              <span className="stat-value win">{userStats?.wins || 0}</span>
              <span className="stat-label">胜场</span>
            </div>
            <div className="stat-card">
              <span className="stat-icon"><Target size={22} /></span>
              <span className="stat-value">{winRate}%</span>
              <span className="stat-label">胜率</span>
            </div>
            <div className="stat-card">
              <span className="stat-icon"><Swords size={22} /></span>
              <span className="stat-value">{kda}</span>
              <span className="stat-label">KDA</span>
            </div>
            <div className="stat-card">
              <span className="stat-icon"><Star size={22} /></span>
              <span className="stat-value mvp">{userStats?.mvpCount || 0}</span>
              <span className="stat-label">MVP</span>
            </div>
            <div className="stat-card">
              <span className="stat-icon"><Flame size={22} /></span>
              <span className="stat-value streak">{userStats?.maxStreak || 0}</span>
              <span className="stat-label">最大连胜</span>
            </div>
          </div>

          {/* Today Progress */}
          {userStats && (
            <div className="today-card">
              <div className="today-header">
                <span className="today-title"><Calendar size={16} /> 今日对局进度</span>
                <span className="today-count">{userStats.todayGames}/{userStats.dailyLimit}</span>
              </div>
              <div className="today-bar-track">
                <div className="today-bar-fill" style={{ width: `${Math.min(todayPercent, 100)}%` }} />
              </div>
              <span className="today-hint">每日最多 {userStats.dailyLimit} 局，已完成 {userStats.todayGames} 局</span>
            </div>
          )}

          {/* Tabs */}
          <div className="profile-tabs">
            <button className={`profile-tab ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>
              <ScrollText size={16} /> 对局历史
            </button>
            <button className={`profile-tab ${activeTab === 'leaderboard' ? 'active' : ''}`} onClick={() => setActiveTab('leaderboard')}>
              <Trophy size={16} /> 排行榜
            </button>
          </div>

          {/* History */}
          {activeTab === 'history' && (
            <div className="history-section">
              {history.length > 0 ? (
                <div className="history-list">
                  {history.map((record) => (
                    <div key={record.id} className={`history-row ${record.isWin ? 'win' : 'lose'}`}>
                      <span className="history-hero">{record.heroId}</span>
                      <span className={`history-team ${record.team}`}>
                        {record.team === 'blue' ? <><Shield size={14} className="icon-blue" /> 蓝队</> : <><Heart size={14} className="icon-red" /> 红队</>}
                      </span>
                      <span className={`history-result ${record.isWin ? 'win' : 'lose'}`}>
                        {record.isWin ? <><CheckCircle2 size={14} /> 胜利</> : <><XCircle size={14} /> 失败</>}
                      </span>
                      <span className="history-kda">{record.kills}/{record.deaths}/{record.assists}</span>
                      <span className="history-damage">{record.damageDealt.toLocaleString()}</span>
                      <span className="history-points">+{record.pointsEarned}</span>
                      <span className="history-mvp">{record.isMvp ? <Star size={14} color="#f59e0b" /> : ''}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <span className="empty-icon"><Inbox size={40} /></span>
                  <span className="empty-text">暂无对局记录</span>
                </div>
              )}
            </div>
          )}

          {/* Leaderboard */}
          {activeTab === 'leaderboard' && (
            <div className="leaderboard-section">
              {leaderboard.length > 0 ? (
                <div className="leaderboard-list">
                  <div className="leaderboard-header-row">
                    <span className="lb-col-rank">排名</span>
                    <span className="lb-col-user">用户</span>
                    <span className="lb-col-wins">胜场</span>
                    <span className="lb-col-total">总场</span>
                    <span className="lb-col-rate">胜率</span>
                    <span className="lb-col-mvp">MVP</span>
                    <span className="lb-col-streak">连胜</span>
                  </div>
                  {leaderboard.map((user, i) => (
                    <div key={user.id} className={`leaderboard-row ${i < 3 ? 'top-three' : ''}`}>
                      <span className="lb-col-rank">
                        {i < 3 ? rankIcons[i] : i + 1}
                      </span>
                      <span className="lb-col-user">玩家{user.userId}</span>
                      <span className="lb-col-wins">{user.wins}</span>
                      <span className="lb-col-total">{user.totalGames}</span>
                      <span className="lb-col-rate">
                        {user.totalGames > 0 ? `${Math.round((user.wins / user.totalGames) * 100)}%` : '0%'}
                      </span>
                      <span className="lb-col-mvp">{user.mvpCount}</span>
                      <span className="lb-col-streak">{user.maxStreak}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <span className="empty-icon"><Trophy size={40} /></span>
                  <span className="empty-text">暂无排行数据</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Spin>
  );
};

export default FishBattleProfile;
