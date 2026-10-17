import { normalizeText } from '../../lib/text';
export type VoiceCommand =
  | 'next'
  | 'prev'
  | 'repeat'
  | 'read'
  | 'stop'
  | 'timer-start'
  | 'timer-stop'
  | 'timer-reset';

const rules: [VoiceCommand, RegExp][] = [
  [
    'next',
    /\b(chuyen sang buoc tiep theo|chuyen sang buoc tiep|sang buoc tiep theo|qua buoc tiep theo|buoc tiep theo la gi|lam gi tiep theo|xong buoc nay roi|chuyen buoc tiep theo|sang buoc ke tiep|qua buoc ke tiep|buoc ke tiep|buoc tiep theo|sang buoc tiep|qua buoc tiep|sang buoc sau|qua buoc sau|buoc sau la gi|lam xong roi|xong roi|lam gi tiep|buoc tiep di|tiep theo di|tiep tuc di|chuyen buoc|sang buoc|qua buoc|buoc tiep|buoc sau|tiep theo|tiep tuc|tiep nao|tiep di|di tiep|next|tiep)\b/g,
  ],
  [
    'prev',
    /\b(quay lai buoc truoc|tro lai buoc truoc|quay ve buoc truoc|lui ve buoc truoc|xem lai buoc truoc|buoc truoc la gi|lui lai mot buoc|lui mot buoc di|quay lai di|lui lai di|lui di|ve buoc truoc|buoc truoc do|buoc vua roi|buoc luc nay|lui mot buoc|quay lai|buoc truoc|lui lai|tro lai|truoc do|back)\b/g,
  ],
  [
    'repeat',
    /\b(doc lai buoc nay|noi lai buoc nay|nhac lai buoc nay|nghe lai buoc nay|doc lai lan nua|noi lai lan nua|nhac lai lan nua|doc lai cho toi|doc buoc nay|doc lai di|noi lai di|nhac lai di|nghe lai di|lap lai di|doc lai|nhac lai|nghe lai|lap lai|noi lai|repeat)\b/g,
  ],
  [
    'read',
    /\b(doc to buoc nay len|doc to buoc nay|doc buoc nay len|doc cho toi nghe|huong dan buoc nay|buoc nay lam gi|buoc nay la gi|buoc nay lam sao|noi buoc nay di|noi buoc nay|doc giup toi|doc gium toi|doc ho toi|doc cho toi|bat dau doc|doc huong dan|doc cong thuc|doc noi dung|doc to len|bat doc len|bat doc di|phat am thanh|bat doc|doc to|doc len|doc di|doc|read|speak)\b/g,
  ],
  [
    'timer-start',
    /\b(bat dau dem thoi gian|bat dau hen gio di|bat dau dem nguoc di|bat dau tinh gio di|bat dau bam gio di|bat dem thoi gian|bat hen gio len|bat hen gio di|bat dau hen gio|bat dau dem nguoc|bat dau tinh gio|bat dau bam gio|bat dau canh gio|hen gio buoc nay|bat dem nguoc|chay dem nguoc|dem thoi gian|bat tinh gio|bat bam gio|bat canh gio|chay dong ho|bat dong ho|chay hen gio|mo hen gio|dem nguoc di|dem nguoc|bat dau dem|tinh gio di|bam gio di|canh gio di|hen gio di|tinh gio|bam gio|canh gio|bat dem|bat hen gio|bat timer|chay timer|start timer)\b/g,
  ],
  [
    'timer-stop',
    /\b(tam dung hen gio di|tam dung dem nguoc|dung hen gio lai|dung hen gio di|tat hen gio di|dung dem nguoc di|tat dem nguoc di|dung dem thoi gian|tat dem thoi gian|tam dung hen gio|dung dem nguoc|tat dem nguoc|ngung dem nguoc|dung bam gio di|dung tinh gio di|dung dong ho di|tam dung dem|tam dung timer|ngung hen gio|dung bam gio|tat bam gio|dung tinh gio|tat tinh gio|dung dong ho|tat dong ho|dung hen gio|tat hen gio|dung dem di|tat dem di|ngung dem|dung dem|tat dem|dung timer|tat timer|stop timer|pause timer)\b/g,
  ],
  [
    'timer-reset',
    /\b(quay lai tu dau hen gio|hen gio lai tu dau|dat lai hen gio tu dau|bam gio lai tu dau|khoi dong lai hen gio|khoi dong lai timer|dat lai thoi gian|bat dau dem lai|dat lai hen gio|reset lai hen gio|chinh lai hen gio|dat lai bam gio|dat lai dong ho|chinh lai dong ho|reset lai timer|dem lai tu dau|hen gio lai|hen lai gio|bam gio lai|dat lai dem|dat lai timer|dat lai gio|chinh lai gio|reset hen gio|reset timer|dem lai)\b/g,
  ],
  [
    'stop',
    /\b(dung doc lai|dung doc di|dung noi di|ngung doc di|ngung noi di|thoi duoc roi|tat tieng di|dung phat|ngung phat|khoan da|khoan nao|im lang|tat loa|tat am|thoi dung|dung lai|tam dung|dung doc|dung noi|ngung doc|ngung noi|ngung lai|tat tieng|khoan|ngung|dung|stop|pause)\b/g,
  ],
];

interface Token {
  command: VoiceCommand;
  index: number;
  length: number;
}

export function matchCommand(text: string): VoiceCommand | null {
  const value = normalizeText(text);
  // Do not act on negated instructions, including unaccented speech transcripts.
  if (/\b(khong|chua|dung co)\b/.test(value) || /đừng/i.test(text)) return null;

  const tokens: Token[] = [];
  for (const [candidate, pattern] of rules) {
    for (const match of value.matchAll(pattern)) {
      tokens.push({
        command: candidate,
        index: match.index ?? 0,
        length: match[0]?.length ?? 0,
      });
    }
  }

  if (!tokens.length) return null;

  // Filter out any token that is completely enclosed inside another strictly longer token
  const validTokens = tokens.filter((t1) => {
    const end1 = t1.index + t1.length;
    return !tokens.some((t2) => {
      if (t1 === t2) return false;
      const end2 = t2.index + t2.length;
      const isInside = t2.index <= t1.index && end2 >= end1;
      return isInside && t2.length > t1.length;
    });
  });

  if (!validTokens.length) return null;

  // Sort by start index ascending; if same start, longer token comes last.
  validTokens.sort((a, b) => a.index - b.index || a.length - b.length);

  return validTokens[validTokens.length - 1].command;
}

export function acceptRecognition(text: string, isFinal: boolean): VoiceCommand | null {
  // Partial transcripts may only stop playback. Navigation and timers wait for a complete phrase.
  const command = matchCommand(text);
  return isFinal || command === 'stop' ? command : null;
}

// A missing final event may only fall back to a complete, standalone command
// after capture ends. Substrings in unfinished sentences are never sufficient.
export function matchEndedCommand(text: string): VoiceCommand | null {
  const value = normalizeText(text);
  const command = matchCommand(text);
  if (!command) return null;
  return rules.some(
    ([candidate, pattern]) =>
      candidate === command && new RegExp('^(?:' + pattern.source + ')$').test(value),
  )
    ? command
    : null;
}
