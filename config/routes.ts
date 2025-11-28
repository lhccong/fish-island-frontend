export default [
  {
    path: '/user', layout: false, requireAuth: false, routes: [
      {path: '/user/login', component: './User/Login', requireAuth: false},
      {path: '/user/login/linuxdo', component: './User/Login/LinuxDo', requireAuth: false},
      {path: '/user/register', component: './User/Register', requireAuth: false}
    ]
  },
  {path: '/index', icon: 'BarsOutlined', component: './Index', name: '最新', requireAuth: false},
  {path: '/home', layout: false, icon: 'smile', component: './Home', name: '浏览器页面', requireAuth: false},
  {path: '/todo', icon: 'CalendarOutlined', component: './TODO', name: '每日待办', requireAuth: true},
  {path: '/chat', icon: 'MessageOutlined', component: './Chat', name: '摸鱼室', requireAuth: true},
  {path: '/post', icon: 'InstagramOutlined', component: './Post', name: '摸鱼论坛', requireAuth: true},
  {path: '/post/create', layout: false, icon: 'EditOutlined', component: './Post/Create', requireAuth: true},
  {path: '/post/edit/:id', layout: false, component: './Post/Edit', requireAuth: true},
  {path: '/post/:id',component: './Post/Detail', requireAuth: true},
  {path: '/reader', icon: 'BookOutlined', component: './Reader', name: '摸鱼阅读', requireAuth: true},
  {path: '/pet', icon: 'HeartOutlined', component: './Pet', name: '摸鱼宠物', requireAuth: true},
  {path: '/pet/fight', icon: 'HeartOutlined', component: './Pet/Fight', requireAuth: true},
  { path: '/draw', icon: 'FundViewOutlined', component: './Draw', name: '你画我猜', requireAuth: true },
  {path: '/draw/:id',component: './Draw/Detail', requireAuth: true},
  {
    path: '/game',
    icon: 'DesktopOutlined',
    name: '小游戏',
    requireAuth: true,
    routes: [
      {path: '/game', redirect: '/game/piece', requireAuth: true},
      {icon: 'DesktopOutlined', path: '/game/piece', component: './Game/Piece', name: '五子棋', requireAuth: true},
      // {icon: 'DesktopOutlined', path: '/game/draw', component: './Game/Draw', name: '你画我猜', requireAuth: true},
      {
        icon: 'DesktopOutlined',
        path: '/game/chineseChess',
        component: './Game/ChineseChess',
        name: '中国象棋',
        requireAuth: true
      },
      {icon: 'DesktopOutlined', path: '/game/2048', component: './Game/2048', name: '2048', requireAuth: false},
      {
        icon: 'DesktopOutlined',
        path: '/game/guessHero',
        component: './Game/GuessHero',
        name: '英雄猜猜乐',
        requireAuth: false
      },
      {
        icon: 'DesktopOutlined',
        path: '/game/chicken',
        component: './Game/Chicken',
        name: '🐔鸡了个鸡🐔',
        requireAuth: false
      },
      {
        icon: 'DesktopOutlined',
        path: '/game/life',
        component: './Game/Life',
        name: ' 人生重开模拟器',
        requireAuth: false
      },
      {
        icon: 'DesktopOutlined',
        path: '/game/darkRoom',
        component: './Game/DarkRoom',
        name: ' 小黑屋模拟器',
        requireAuth: false
      },
      {icon: 'DesktopOutlined', path: '/game/car', component: './Game/Car', name: '模拟赛车', requireAuth: false},
      {icon: 'DesktopOutlined', path: '/game/jump', component: './Game/Jump', name: '跳一跳   ', requireAuth: false},
      {
        icon: 'DesktopOutlined',
        path: '/game/infinityGames',
        component: './Game/InfinityGames',
        name: '游戏大全',
        requireAuth: false
      },
    ],
  },
  {
    path: '/utils',
    icon: 'CodeSandboxOutlined',
    name: ' 工具箱',
    requireAuth: true,
    routes: [
      {path: '/utils', redirect: '/utils/json', requireAuth: false},
      {
        icon: 'DesktopOutlined',
        path: '/utils/json',
        component: './Utils/JsonFormat',
        name: 'JSON格式化',
        requireAuth: false
      },
      {
        icon: 'DesktopOutlined',
        path: '/utils/compare',
        component: './Utils/Compare',
        name: '文本比对',
        requireAuth: false
      },
      {
        icon: 'TranslationOutlined',
        path: '/utils/translation',
        component: './Utils/Translation',
        name: '聚合翻译',
        requireAuth: false
      },
      {
        icon: 'GithubOutlined',
        path: '/utils/git-commit',
        component: './Utils/GitCommit',
        name: 'Git提交内容生成',
        requireAuth: false
      },
      {
        icon: 'RobotOutlined',
        path: '/utils/ai-agent',
        component: './Utils/AIAgent',
        name: 'AI智能体',
        requireAuth: false
      },
      {
        icon: 'CalendarOutlined',
        path: '/utils/weekly-report',
        component: './Utils/WeeklyReport',
        name: 'AI周报助手',
        requireAuth: false
      },
    ],
  },
  {
    icon: 'AccountBookOutlined',
    path: '/avatarFrames',
    component: './Utils/AvatarFrames',
    name: '摸鱼商店',
    requireAuth: true
  },
  {
    path: '/rank',
    icon: 'github',
    name: '关于网站',
    routes: [
      {icon: 'DesktopOutlined', path: '/rank/reward', component: './Rank/Reward', name: '打赏榜 👑', requireAuth: false},
      {icon: 'DesktopOutlined', path: '/rank/welfare', component: './Welfare', name: '外卖福利🎁', requireAuth: false},
      {icon: 'DesktopOutlined', path: '/rank/about', component: './About', name: '共建与反馈 🚀', requireAuth: false},
      {icon: 'DesktopOutlined', path: '/rank/other', component: './Other', name: '其他产品 🔥', requireAuth: false},
      {path: 'https://github.com/lhccong/fish-island-backend', name: '狠狠点个 star 🌟'},

    ],
  },
  {
    path: '/admin',
    icon: 'crown',
    name: '管理页',
    access: 'canAdmin',
    requireAuth: true,
    routes: [
      {path: '/admin', redirect: '/admin/user', requireAuth: true},
      {icon: 'LineChartOutlined', path: '/admin/data', component: './Admin/Data', name: '数据分析', requireAuth: true},
      {icon: 'table', path: '/admin/user', component: './Admin/User', name: '用户管理', requireAuth: true},
      {icon: 'BulbOutlined', path: '/admin/title', component: './Admin/User/Title', name: '称号管理', requireAuth: true},
      {icon: 'TagsOutlined', path: '/admin/tags', component: './Admin/Tags', name: '标签管理', requireAuth: true},
      {icon: 'BookOutlined', path: '/admin/word/library', component: './Admin/Word/Library', name: '词库管理', requireAuth: true},
    ],
  },
  {path: '/', redirect: '/index', requireAuth: true},
  {path: '*', layout: false, component: './404', requireAuth: false},
];
