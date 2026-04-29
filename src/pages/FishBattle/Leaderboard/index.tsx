import React, { useEffect, useState } from 'react';
import { Spin, message, Avatar, Modal } from 'antd';
import { history as routerHistory, useModel } from '@umijs/max';
import { fishBattleStatsLeaderboard, fishBattleStatsUserById } from '@/services/backend/fishBattleController';
import type { FishBattleUserStats } from '../types';
import { ArrowLeft, Trophy, Crown, Medal, Gamepad2, Swords, Star, Flame } from 'lucide-react';
import './index.less';

const FishBattleLeaderboard: React.FC = () => {
  const { initialState } = useModel('@@initialState');
  const currentUser = initialState?.currentUser;
  const [leaderboard, setLeaderboard] = useState<FishBattleUserStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalUser, setModalUser] = useState<FishBattleUserStats | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

  useEffect(() => {
    if (!currentUser) {
      message.warning('请先登录');
      routerHistory.push('/fishBattle/home');
      return;
    }
    const fetchData = async () => {
      try {
        const res = await fishBattleStatsLeaderboard({ limit: 50 });
        if (res?.data) setLeaderboard(res.data as FishBattleUserStats[]);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleRowClick = async (userId: number) => {
    setModalVisible(true);
    setModalLoading(true);
    try {
      const res = await fishBattleStatsUserById(userId);
      if (res?.data) setModalUser(res.data as FishBattleUserStats);
    } catch {
      message.error('获取玩家数据失败');
    } finally {
      setModalLoading(false);
    }
  };

  const rankIcons = [
    <Crown key="g" size={20} color="#fbbf24" />,
    <Medal key="s" size={20} color="#94a3b8" />,
    <Medal key="b" size={20} color="#d97706" />,
  ];

  const modalWinRate = modalUser && modalUser.totalGames > 0
    ? Math.round((modalUser.wins / modalUser.totalGames) * 100) : 0;
  const modalKda = modalUser && modalUser.totalDeaths > 0
    ? ((modalUser.totalKills + modalUser.totalAssists) / modalUser.totalDeaths).toFixed(2)
    : (modalUser?.totalKills || 0) + (modalUser?.totalAssists || 0) > 0 ? 'Perfect' : '0.00';

  return (
    <Spin spinning={loading}>
      <div className="fish-battle-leaderboard">
        <div className="lb-page-header">
          <button type="button" className="lb-btn-back" onClick={() => routerHistory.push('/fishBattle/lobby')}>
            <ArrowLeft size={16} />
          </button>
          <h1 className="lb-page-title"><Trophy size={22} /> 排行榜</h1>
        </div>

        <div className="lb-container">
          {leaderboard.length > 0 ? (
            <div className="lb-table">
              <div className="lb-table-header">
                <span className="lb-col-rank">排名</span>
                <span className="lb-col-user">玩家</span>
                <span className="lb-col-wins">胜场</span>
                <span className="lb-col-total">总场</span>
                <span className="lb-col-rate">胜率</span>
                <span className="lb-col-mvp">MVP</span>
                <span className="lb-col-streak">最高连胜</span>
              </div>
              {leaderboard.map((user, i) => (
                <div
                  key={user.id}
                  className={`lb-table-row ${i < 3 ? 'top-three' : ''}`}
                  onClick={() => handleRowClick(user.userId)}
                >
                  <span className="lb-col-rank">
                    {i < 3 ? rankIcons[i] : i + 1}
                  </span>
                  <span className="lb-col-user">
                    <Avatar size={28} src={user.userAvatar}>{user.userName?.charAt(0) || '?'}</Avatar>
                    <span className="lb-user-name">{user.userName || `玩家${user.userId}`}</span>
                  </span>
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
            <div className="lb-empty">
              <Trophy size={48} color="#d4d0dc" />
              <span>暂无排行数据</span>
            </div>
          )}
        </div>
      </div>

      <Modal
        open={modalVisible}
        title={null}
        footer={null}
        onCancel={() => { setModalVisible(false); setModalUser(null); }}
        width={420}
        className="player-detail-modal"
      >
        <Spin spinning={modalLoading}>
          {modalUser && (
            <div className="pd-content">
              <div className="pd-header">
                <Avatar size={48} src={modalUser.userAvatar}>{modalUser.userName?.charAt(0)}</Avatar>
                <div className="pd-info">
                  <h3 className="pd-name">{modalUser.userName || `玩家${modalUser.userId}`}</h3>
                  <div className="pd-tags">
                    {(modalUser.mvpCount ?? 0) > 0 && <span className="tag tag-gold"><Star size={11} /> MVP x{modalUser.mvpCount}</span>}
                    {(modalUser.maxStreak ?? 0) >= 3 && <span className="tag tag-orange"><Flame size={11} /> 最高{modalUser.maxStreak}连胜</span>}
                  </div>
                </div>
                <span className="pd-winrate">{modalWinRate}%</span>
              </div>
              <div className="pd-grid">
                <div className="pd-stat"><Gamepad2 size={16} /><span className="pd-val">{modalUser.totalGames}</span><span className="pd-label">总场次</span></div>
                <div className="pd-stat"><Trophy size={16} /><span className="pd-val">{modalUser.wins}</span><span className="pd-label">胜场</span></div>
                <div className="pd-stat"><Swords size={16} /><span className="pd-val">{modalKda}</span><span className="pd-label">KDA</span></div>
                <div className="pd-stat"><Star size={16} /><span className="pd-val">{modalUser.mvpCount}</span><span className="pd-label">MVP</span></div>
              </div>
            </div>
          )}
        </Spin>
      </Modal>
    </Spin>
  );
};

export default FishBattleLeaderboard;
