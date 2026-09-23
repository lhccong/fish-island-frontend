export const properties = {
  charm: '颜值',
  intelligence: '智力',
  strength: '体质',
  money: '家境',
  spirit: '快乐',
  age: '享年',
} as const;

const base = ['地狱', '折磨', '不佳', '普通', '优秀', '罕见', '逆天', '传说'];
export const judgeNames: Record<string, string[]> = {
  charm: base,
  intelligence: [...base, '识海', '元神', '仙魂'],
  strength: [...base, '凝气', '筑基', '金丹', '元婴', '仙体'],
  money: base,
  spirit: ['地狱', '折磨', '不幸', '普通', '幸福', '极乐', '天命'],
  age: ['胎死腹中', '早夭', '少年', '盛年', '中年', '花甲', '古稀', '杖朝', '南山', '不老', '修仙', '仙寿'],
};
