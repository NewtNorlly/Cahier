/**
 * 零依赖拼音首字母提取（构建期在 Node 运行）。
 *
 * 原理：现代 Node 自带 full-ICU，`Intl.Collator('zh-CN-u-co-pinyin')`
 * 能让「汉字之间」按拼音排序，但跨脚本比较时汉字恒排在拉丁字母之前，
 * 无法直接用汉字 vs 'A'..'Z' 推断首字母。因此为每个拼音首字母选取一个
 * 「该字母下拼音序最小音节」的代表汉字作为哨兵，目标字与这些哨兵做
 * 汉字间比较，落到哪个哨兵区间即属于哪个首字母。
 *
 * 哨兵均取该首字母最小音节的常用字（sensitivity:'base' 忽略声调）：
 * A 啊(a) B 芭(ba) C 擦(ca) D 搭(da) E 蛾(e) F 发(fa) G 旮(ga)
 * H 哈(ha) J 击(ji) K 咖(ka) L 拉(la) M 妈(ma) N 拿(na) O 喔(o)
 * P 趴(pa) Q 七(qi) R 然(ran) S 撒(sa) T 塌(ta) W 挖(wa) X 西(xi)
 * Y 压(ya) Z 匝(za)。拼音无 I/U/V 开头，故跳过。
 */

const collator = new Intl.Collator('zh-CN-u-co-pinyin', {
  sensitivity: 'base',
  numeric: true,
});

/** 按拼音序递增排列的「首字母 → 哨兵字」 */
const SENTINELS: ReadonlyArray<readonly [string, string]> = [
  ['A', '啊'],
  ['B', '芭'],
  ['C', '擦'],
  ['D', '搭'],
  ['E', '蛾'],
  ['F', '发'],
  ['G', '旮'],
  ['H', '哈'],
  ['J', '击'],
  ['K', '咖'],
  ['L', '拉'],
  ['M', '妈'],
  ['N', '拿'],
  ['O', '喔'],
  ['P', '趴'],
  ['Q', '七'],
  ['R', '然'],
  ['S', '撒'],
  ['T', '塌'],
  ['W', '挖'],
  ['X', '西'],
  ['Y', '压'],
  ['Z', '匝'],
];

const CJK = /[一-鿿]/;

/** 取单个字符的拼音首字母；英文字母转大写；其余返回 '#' */
export function pinyinInitial(char: string): string {
  const ch = Array.from(char)[0] ?? '';
  if (!ch) return '#';
  if (/^[a-zA-Z]$/.test(ch)) return ch.toUpperCase();
  if (!CJK.test(ch)) return '#';

  let result = '#';
  for (const [letter, sentinel] of SENTINELS) {
    // ch 排在哨兵之后（或相等）说明其拼音首字母不早于该字母
    if (collator.compare(ch, sentinel) >= 0) {
      result = letter;
    } else {
      break;
    }
  }
  return result;
}

/** 取一段文本首个有效字符的拼音首字母 */
export function pinyinInitialOf(text: string): string {
  const first = Array.from(String(text ?? '').trim())[0] ?? '';
  return pinyinInitial(first);
}
