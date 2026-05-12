// Title and level utility functions

interface Title {
  id: number;
  name: string;
  description: string;
  titleImg?: string;
}

/**
 * Gets the emoji representation for a user level
 * @param level User level
 * @returns Emoji corresponding to the level
 */
export const getLevelEmoji = (level: number): string => {
  switch (level) {
    case 12:
      return '🔱'; // 摸鱼祖师
    case 11:
      return '✨'; // 摸鱼天尊
    case 10:
      return '🌟'; // 摸鱼圣人
    case 9:
      return '🌈'; // 摸鱼仙君
    case 8:
      return '🏮'; // 摸鱼尊者
    case 7:
      return '👑'; // 摸鱼真人
    case 6:
      return '💫';
    case 5:
      return '🏖';
    case 4:
      return '🎣';
    case 3:
      return '⭐';
    case 2:
      return '🐣';
    case 1:
      return '💦';
    default:
      return '💦'; // 默认显示
  }
};

/**
 * Generates a short unique identifier for a user
 * @param userId User ID string
 * @returns Formatted short ID
 */
export const generateUniqueShortId = (userId: string): string => {
  // 如果是数字ID，转换为16进制并取前4位
  if (/^\d+$/.test(userId)) {
    const hex = parseInt(userId).toString(16).toUpperCase();
    return `#${hex.padStart(4, '0').slice(0, 4)}`;
  }
  // 如果是字符串ID，取前4个字符，不足则补0
  return `#${userId.slice(0, 4).padEnd(4, '0').toUpperCase()}`;
};

/**
 * Gets the title tag component properties based on user's admin status, level and title ID
 * @param isAdmin Whether the user is an admin
 * @param level User level
 * @param titleId Optional title ID
 * @returns Object containing tag text, emoji, CSS class and title image URL if available
 */
export const getTitleTagProperties = (isAdmin: boolean, level: number, titleId?: number): { tagText: string, tagEmoji: string, tagClass: string, titleImg?: string } => {
  // 如果有特定的称号ID且不是0（0表示使用等级称号）
  if (titleId !== undefined && titleId != 0) {
    // 从 titles.json 中获取对应的称号
    const titles: Title[] = require('@/config/titles.json').titles;
    const title = titles.find((t: Title) => String(t.id) === String(titleId));

    if (title) {
      let tagEmoji = '';
      let tagClass = '';

      // 根据不同的称号ID设置不同的样式
      switch (String(titleId)) {
        case '-1': // 管理员
          tagEmoji = '🚀';
          tagClass = 'titleTagAdmin';
          break;
        case '1': // 天使投资人
          tagEmoji = '😇';
          tagClass = 'titleTagInvestor';
          break;
        case '2': // 首席摸鱼官
          tagEmoji = '🏆';
          tagClass = 'titleTagChief';
          break;
        case '3': // 白金摸鱼官
          tagEmoji = '💎';
          tagClass = 'titleTagPlatinum';
          break;
        case '4': // 梦幻摸鱼官
          tagEmoji = '🌟';
          tagClass = 'titleTagGold';
          break;
        case '5': // 摸鱼共建者
          tagEmoji = '🛠️';
          tagClass = 'titleTagBuilder';
          break;
        case '6': // 摸鱼行刑官
          tagEmoji = '⚔️';
          tagClass = 'titleTagExecutioner';
          break;
        case '7': // 电玩少女
          tagEmoji = '🌸';
          tagClass = 'titleTagGamer';
          break;
        case '8': // 摸鱼点子王
          tagEmoji = '💡';
          tagClass = 'titleTagIdeaKing';
          break;
        case '9': // 摸鱼大法师
          tagEmoji = '💀';
          tagClass = 'titleTagWizard';
          break;
        case '10': // 入机王
          tagEmoji = '🌟';
          tagClass = 'titleTagGamer2';
          break;
        case '11': // 汉堡大王
          tagEmoji = '🍔';
          tagClass = 'titleTagBurgerKing';
          break;
        case '12': // 摸鱼铲屎官
          tagEmoji = '🦊';
          tagClass = 'titleTagFox';
          break;
        case '25': // 划水新秀（固定等级称号）
          tagEmoji = '💦';
          tagClass = 'levelTagNewbie';
          break;
        default:
          tagEmoji = '🎯';
          tagClass = 'levelTagBeginner';
      }

      return {
        tagText: title.name,
        tagEmoji,
        tagClass,
        titleImg: title.titleImg
      };
    }
  }

  // 如果没有特定称号或称号ID为0，则使用原有的等级称号逻辑
  let tagText = '';
  let tagEmoji = '';
  let tagClass = '';

  switch (level) {
    case 17:
      tagText = '摸鱼皇帝';
      tagEmoji = '🔱';
      tagClass = 'levelTagGrandMaster';
      break;
    case 16:
      tagText = '摸鱼皇帝';
      tagEmoji = '🔱';
      tagClass = 'levelTagGrandMaster';
      break;
    case 15:
      tagText = '摸鱼皇帝';
      tagEmoji = '🔱';
      tagClass = 'levelTagGrandMaster';
      break;
    case 14:
      tagText = '摸鱼皇帝';
      tagEmoji = '🔱';
      tagClass = 'levelTagGrandMaster';
      break;
    case 11:
      tagText = '摸鱼天尊';
      tagEmoji = '✨';
      tagClass = 'levelTagCelestial';
      break;
    case 10:
      tagText = '摸鱼圣人';
      tagEmoji = '🌟';
      tagClass = 'levelTagSaint';
      break;
    case 9:
      tagText = '摸鱼仙君';
      tagEmoji = '🌈';
      tagClass = 'levelTagImmortal';
      break;
    case 8:
      tagText = '摸鱼尊者';
      tagEmoji = '🏮';
      tagClass = 'levelTagElder';
      break;
    case 7:
      tagText = '摸鱼真人';
      tagEmoji = '👑';
      tagClass = 'levelTagMaster';
      break;
    case 6:
      tagText = '躺平宗师';
      tagEmoji = '💫';
      tagClass = 'levelTagExpert';
      break;
    case 5:
      tagText = '摆烂大师';
      tagEmoji = '🏖️';
      tagClass = 'levelTagPro';
      break;
    case 4:
      tagText = '摸鱼专家 ';
      tagEmoji = '🎣';
      tagClass = 'levelTagAdvanced';
      break;
    case 3:
      tagText = '水群达人';
      tagEmoji = '⭐';
      tagClass = 'levelTagBeginner';
      break;
    case 2:
      tagText = '摸鱼学徒';
      tagEmoji = '🐣';
      tagClass = 'levelTagNewbie';
      break;
    default:
      tagText = '划水新秀';
      tagEmoji = '💦';
      tagClass = 'levelTagNewbie';
  }

  return {
    tagText,
    tagEmoji,
    tagClass
  };
};
