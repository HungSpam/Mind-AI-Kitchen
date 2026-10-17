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
    /\b(tiep theo|buoc tiep|buoc ke tiep|buoc sau|tiep tuc|sang buoc|chuyen buoc|next|tiep)\b/g,
  ],
  ['prev', /\b(quay lai|buoc truoc|lui lai|lui mot buoc|tro lai|back)\b/g],
  ['repeat', /\b(doc lai|doc buoc nay|nhac lai|nghe lai|lap lai|noi lai|repeat)\b/g],
  [
    'read',
    /\b(doc di|bat dau doc|doc huong dan|doc cong thuc|doc to len|doc to|doc len|doc|read|speak)\b/g,
  ],
  [
    'timer-start',
    /\b(bat dau hen gio|bat hen gio|chay hen gio|mo hen gio|bat dau dem nguoc|bat dem nguoc|chay dem nguoc|dem nguoc|bat dau dem|bat dem|bat dau tinh gio|tinh gio|bat timer|chay timer|start timer)\b/g,
  ],
  [
    'timer-stop',
    /\b(dung hen gio|tat hen gio|tam dung hen gio|ngung hen gio|dung dem nguoc|tat dem nguoc|tam dung dem nguoc|dung dem|tat dem|tam dung dem|dung timer|tat timer|tam dung timer|stop timer|pause timer)\b/g,
  ],
  [
    'timer-reset',
    /\b(dat lai hen gio|reset hen gio|chinh lai hen gio|hen gio lai|dat lai thoi gian|dem lai tu dau|dem lai|dat lai dem|dat lai timer|reset timer)\b/g,
  ],
  ['stop', /\b(dung lai|tam dung|ngung|khoan|dung|stop|pause|tat tieng)\b/g],
];

export function matchCommand(text: string): VoiceCommand | null {
  const value = normalizeText(text);
  // Do not act on negated instructions, including unaccented speech transcripts.
  if (/\b(khong|chua|dung co)\b/.test(value) || /đừng/i.test(text)) return null;
  let command: VoiceCommand | null = null;
  let position = -1;
  let length = -1;
  for (const [candidate, pattern] of rules) {
    for (const match of value.matchAll(pattern)) {
      const idx = match.index ?? -1;
      const len = match[0]?.length ?? 0;
      if (idx > position || (idx === position && len > length)) {
        command = candidate;
        position = idx;
        length = len;
      }
    }
  }
  return command;
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
