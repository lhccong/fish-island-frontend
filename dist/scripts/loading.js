/**
 * loading 占位
 * 解决首次加载时白屏的问题
 * 摸鱼风格加载页面
 */
(function () {
  const _root = document.querySelector('#root');
  if (_root && _root.innerHTML === '') {
    _root.innerHTML = `
      <style>
        html,
        body,
        #root {
          height: 100%;
          margin: 0;
          padding: 0;
          background: linear-gradient(-45deg, #48cae4, #00b4d8, #0096c7, #023e8a);
          background-size: 400% 400%;
          animation: gradientBG 15s ease infinite;
          font-family: "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          overflow: hidden;
        }

        @keyframes gradientBG {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }

        .loading-container {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          color: white;
        }

        .fish-container {
          position: relative;
          width: 300px;
          height: 300px;
          margin-bottom: 2rem;
        }

        .fish {
          position: absolute;
          font-size: 3rem;
          animation: swim 8s linear infinite;
          opacity: 0;
        }

        .fish:nth-child(1) {
          animation-delay: 0s;
        }
        .fish:nth-child(2) {
          animation-delay: 2s;
        }
        .fish:nth-child(3) {
          animation-delay: 4s;
        }
        .fish:nth-child(4) {
          animation-delay: 6s;
        }

        @keyframes swim {
          0% {
            left: -50px;
            top: 150px;
            opacity: 0;
            transform: scale(0.5);
          }
          20% {
            opacity: 1;
            transform: scale(1);
          }
          80% {
            opacity: 1;
            transform: scale(1) scaleX(1);
          }
          100% {
            left: 350px;
            top: 150px;
            opacity: 0;
            transform: scale(0.5) scaleX(-1);
          }
        }

        .loading-text {
          font-size: 2.5rem;
          font-weight: 600;
          margin-bottom: 1rem;
          opacity: 0;
          transform: translateY(20px);
          animation: fadeInUp 0.8s ease forwards;
          background: rgba(255, 255, 255, 0.2);
          backdrop-filter: blur(10px);
          padding: 1rem 2rem;
          border-radius: 20px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        }

        .loading-subtext {
          font-size: 1.2rem;
          opacity: 0;
          transform: translateY(20px);
          animation: fadeInUp 0.8s ease 0.2s forwards;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .fun-facts {
          position: absolute;
          bottom: 100px;
          text-align: center;
          font-size: 1rem;
          opacity: 0;
          animation: fadeInUp 0.8s ease 0.4s forwards;
          background: rgba(255, 255, 255, 0.1);
          padding: 1rem;
          border-radius: 10px;
          max-width: 80%;
        }

        @keyframes fadeInUp {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .progress-container {
          position: relative;
          width: 200px;
          height: 6px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 3px;
          margin-top: 2rem;
          overflow: hidden;
        }

        .progress-bar {
          position: absolute;
          top: 0;
          left: 0;
          height: 100%;
          background: white;
          border-radius: 3px;
          animation: progress 2s ease-in-out infinite;
        }

        @keyframes progress {
          0% {
            width: 0;
            opacity: 1;
          }
          50% {
            width: 100%;
            opacity: 0.5;
          }
          100% {
            width: 0;
            opacity: 1;
            left: unset;
            right: 0;
          }
        }

        .bubbles {
          position: absolute;
          width: 100%;
          height: 100%;
          pointer-events: none;
        }

        .bubble {
          position: absolute;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 50%;
          backdrop-filter: blur(1px);
          animation: float 8s ease-in infinite;
        }

        @keyframes float {
          0% {
            transform: translateY(100vh) scale(0);
            opacity: 0;
          }
          50% {
            opacity: 0.8;
          }
          100% {
            transform: translateY(-20vh) scale(1);
            opacity: 0;
          }
        }

        .seaweed {
          position: fixed;
          bottom: -20px;
          width: 30px;
          height: 100px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 50px;
          transform-origin: bottom;
          animation: sway 4s ease-in-out infinite;
        }

        @keyframes sway {
          0%, 100% {
            transform: rotate(-10deg);
          }
          50% {
            transform: rotate(10deg);
          }
        }
      </style>

      <div class="loading-container">
        <div class="bubbles">
          ${Array.from({length: 15}, (_, i) => `
            <div class="bubble" style="
              left: ${Math.random() * 100}%;
              width: ${10 + Math.random() * 30}px;
              height: ${10 + Math.random() * 30}px;
              animation-delay: -${Math.random() * 8}s;
              animation-duration: ${6 + Math.random() * 4}s;
            "></div>
          `).join('')}
        </div>

        ${Array.from({length: 5}, (_, i) => `
          <div class="seaweed" style="
            left: ${20 + i * 20}%;
            height: ${80 + Math.random() * 40}px;
            animation-delay: -${Math.random() * 2}s;
          "></div>
        `).join('')}

        <div class="fish-container">
          <div class="fish">🐠</div>
          <div class="fish">🐟</div>
          <div class="fish">🐡</div>
          <div class="fish"></div>
        </div>

        <div class="loading-text">摸鱼时间到... 🎏</div>
        <div class="loading-subtext">正在寻找最佳摸鱼姿势 🏊‍♂️</div>

        <div class="fun-facts">
          ${[
            "摸鱼小贴士：假装在键盘上打字，实际上是在玩贪吃蛇 🐍",
            "摸鱼小贴士：把Excel打开，其实在玩2048 🎮",
            "摸鱼小贴士：戴着耳机假装在开会，实际在听音乐 🎵",
            "摸鱼小贴士：看似在认真看文档，其实在看小说 📚",
            "摸鱼小贴士：装作在写报告，实际在刷视频 📱"
          ][Math.floor(Math.random() * 5)]}
        </div>

        <div class="progress-container">
          <div class="progress-bar"></div>
        </div>
      </div>
    `;
  }
})();
