export default [
  { path: '/user', layout: false, requireAuth: false, routes: [
    { path: '/user/login', component: './User/Login', requireAuth: false },
    { path: '/user/register', component: './User/Register', requireAuth: false }
  ]},
  { 
    path: '/auth-callback', 
    layout: false, 
    component: './AuthCallback',
    requireAuth: false 
  },
  { path: '/index', icon: 'smile', component: './Index', name: '最新', requireAuth: false },
  { path: '/home', layout: false, icon: 'smile', component: './Home', name: '浏览器页面', requireAuth: false },
  { path: '/todo', icon: 'CalendarOutlined', component: './TODO', name: '每日待办', requireAuth: true },
  { path: '/chat', icon: 'MessageOutlined', component: './Chat', name: '摸鱼室', requireAuth: true },
  // { path: '/draw', icon: 'MessageOutlined', component: './Draw', name: '你画我猜', requireAuth: true },
  {
    path: '/game',
    icon: 'DesktopOutlined',
    name: '小游戏',
    requireAuth: true,
    routes: [
      { path: '/game', redirect: '/game/piece', requireAuth: true },
      { icon: 'DesktopOutlined', path: '/game/piece', component: './Game/Piece', name: '五子棋', requireAuth: true },
      { icon: 'DesktopOutlined', path: '/game/2048', component: './Game/2048', name: '2048', requireAuth: false },
      { icon: 'DesktopOutlined', path: '/game/car', component: './Game/Car', name: '模拟赛车', requireAuth: false },
      { icon: 'DesktopOutlined', path: '/game/jump', component: './Game/Jump', name: '跳一跳   ', requireAuth: false },
      { icon: 'DesktopOutlined', path: '/game/infinityGames', component: './Game/InfinityGames', name: '游戏大全', requireAuth: false },
    ],
  },
  {
    path: '/utils',
    icon: 'CodeSandboxOutlined',
    name: ' 工具箱',
    requireAuth: true,
    routes: [
      { path: '/utils', redirect: '/utils/json', requireAuth: false },
      { icon: 'DesktopOutlined', path: '/utils/json', component: './Utils/JsonFormat', name: 'JSON格式化', requireAuth: false },
    ],
  },
  { icon: 'PictureOutlined', path: '/avatarFrames', component: './Utils/AvatarFrames', name: '头像框兑换', requireAuth: true },
  {
    path: '/github',
    icon: 'github',
    name: '支持网站',
    routes: [
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
      { path: '/admin', redirect: '/admin/user', requireAuth: true },
      { icon: 'table', path: '/admin/user', component: './Admin/User', name: '用户管理', requireAuth: true },
    ],
  },
  { path: '/', redirect: '/index', requireAuth: true },
  { path: '*', layout: false, component: './404', requireAuth: false },
];
