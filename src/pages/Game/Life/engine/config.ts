const lines: Record<string, number[]> = {
  age: [0, 1, 10, 18, 40, 60, 70, 80, 90, 95, 100, 500],
  charm: [0, 1, 2, 4, 7, 9, 11],
  money: [0, 1, 2, 4, 7, 9, 11],
  spirit: [0, 1, 2, 4, 7, 9, 11],
  intelligence: [0, 1, 2, 4, 7, 9, 11, 21, 131, 501],
  strength: [0, 1, 2, 4, 7, 9, 11, 21, 101, 401, 1001, 2001],
};

export const judge = (key: string, value: number) => {
  const values = lines[key] || [0];
  for (let i = values.length - 1; i >= 0; i -= 1) if (value >= values[i]) return i;
  return 0;
};

export const judgeGradeByValue = (key: string, value: number) => Math.min(3, Math.floor(judge(key, value) / 2));
