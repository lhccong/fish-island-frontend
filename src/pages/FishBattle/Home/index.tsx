import React, { useEffect, useState } from 'react';
import { Spin, message } from 'antd';
import { history, useModel } from '@umijs/max';
import { fishBattleStatsOverview, fishBattleHeroList } from '@/services/backend/fishBattleController';
import type { FishBattleHero, FishBattleOverview } from '../types';
import { FISH_BATTLE_HERO_ROLES } from '@/constants';
import {
  Fish, Zap, Eye, Megaphone, Drama,
} from 'lucide-react';
import './index.less';

const FishBattleHome: React.FC = () => {
  const { initialState } = useModel('@@initialState');
  const currentUser = initialState?.currentUser;
  const [overview, setOverview] = useState<FishBattleOverview>({ onlineCount: 0, totalGames: 0, fightingCount: 0, fightingPlayers: [] });
  const [heroes, setHeroes] = useState<FishBattleHero[]>([]);
  const [loading, setLoading] = useState(true);

  const requireLogin = (callback: () => void) => {
    if (!currentUser) {
      message.warning('请先登录后再操作');
      history.push(`/user/login?redirect=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    callback();
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [overviewRes, heroRes] = await Promise.all([
          fishBattleStatsOverview(),
          fishBattleHeroList(),
        ]);
        if (overviewRes?.data) setOverview(overviewRes.data as FishBattleOverview);
        if (heroRes?.data) {
          const rawHeroes = heroRes.data as FishBattleHero[];
          const uniqueMap = new Map<number, FishBattleHero>();
          rawHeroes.forEach((h) => {
            if (!uniqueMap.has(h.heroId)) uniqueMap.set(h.heroId, h);
          });
          setHeroes(Array.from(uniqueMap.values()));
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <Spin spinning={loading}>
      <div className="fish-battle-home">
        {/* Particles background */}
        <div className="particles-bg">
          {Array.from({ length: 20 }).map((_, i) => (
            <span key={i} className="particle" style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${3 + Math.random() * 4}s`,
            }} />
          ))}
        </div>

        {/* Hero Section */}
        <section className="hero-section">
          <div className="hero-badge">
            <span className="hero-badge-dot" />
            <strong>{overview.fightingCount}</strong> 位玩家正在战斗中
          </div>

          <div className="hero-mascot"><Fish size={64} /></div>

          <h1 className="hero-title">摸鱼大乱斗</h1>
          <p className="hero-subtitle">
            见面就团！<br />和网友一起在嚎哭深渊摸鱼对战
          </p>

          <div className="hero-actions">
            <button
              className="btn-play"
              onClick={() => requireLogin(() => history.push('/fishBattle/lobby'))}
            >
              <Zap size={18} /> 开始战斗
            </button>
            <button
              className="btn-spectate"
              onClick={() => requireLogin(() => history.push('/fishBattle/lobby'))}
            >
              <Eye size={18} /> 观看对局
            </button>
          </div>

          <div className="stats-bar">
            <div className="stat-item">
              <div className="stat-number">{heroes.length}</div>
              <div className="stat-label">英雄数量</div>
            </div>
            <div className="stat-divider" />
            <div className="stat-item">
              <div className="stat-number">5v5</div>
              <div className="stat-label">经典模式</div>
            </div>
          </div>
        </section>

        {/* Hero Preview — 英雄轮播放在顶部 */}
        <section className="hero-preview-section">
          <h2 className="section-title"><Drama size={22} className="section-title-icon" /> 英雄阵容</h2>
          <p className="section-subtitle">
            {heroes.length}位个性鲜明的英雄等你来战！每局随机分配，局局新体验
          </p>
          <div className={`hero-carousel-wrapper ${heroes.length <= 5 ? 'no-mask' : ''}`}>
            <div className={`hero-carousel-track ${heroes.length <= 5 ? 'no-scroll' : ''}`}>
              {(heroes.length > 5 ? [...heroes, ...heroes] : heroes).map((hero, idx) => (
                  <div key={`${hero.heroId}-${idx}`} className="hero-char-card">
                    <div className="hero-char-avatar">
                      {hero.avatarUrl ? (
                        <img src={hero.avatarUrl} alt={hero.name} className="hero-char-avatar-img" />
                      ) : (
                        <span className="hero-char-avatar-emoji">🐟</span>
                      )}
                    </div>
                    <div className="hero-char-name">{hero.name}</div>
                    <div className="hero-char-role">
                      {FISH_BATTLE_HERO_ROLES[hero.role] || hero.role}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </section>

        {/*
        <section className="features-section">
          <h2 className="section-title">为什么选择摸鱼大乱斗？</h2>
        </section>
        */}

        {/* Announcements */}
        <section className="announcements-section">
          <h2 className="section-title"><Megaphone size={22} className="section-title-icon" /> 公告栏</h2>
          <div className="announcement-list">
            <div className="announcement-item">
              <span className="announcement-tag tag-new">NEW</span>
              <span className="announcement-text">摸鱼大乱斗正式上线！欢迎来战！</span>
              <span className="announcement-time">刚刚</span>
            </div>
            <div className="announcement-item">
              <span className="announcement-tag tag-update">更新</span>
              <span className="announcement-text">新增多位英雄，快来体验！</span>
              <span className="announcement-time">1小时前</span>
            </div>
            <div className="announcement-item">
              <span className="announcement-tag tag-event">活动</span>
              <span className="announcement-text">连胜挑战赛开启，最高三连胜额外奖励50积分</span>
              <span className="announcement-time">今天</span>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="home-footer">
          <p>摸鱼大乱斗 — 一个让你快乐战斗的地方 <Fish size={16} className="footer-icon" /></p>
        </footer>
      </div>
    </Spin>
  );
};

export default FishBattleHome;
