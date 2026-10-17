import { normalizeText } from '../../lib/text';
export type VoiceCommand = 'next' | 'prev' | 'repeat' | 'stop';

export function matchCommand(text: string): VoiceCommand | null {
  const value = normalizeText(text);
  // Do not act on negated instructions, including unaccented speech transcripts.
  if (/\b(khong|chua|dung co)\b/.test(value) || /đừng/i.test(text)) return null;
  const rules: [VoiceCommand, RegExp][] = [
    [
      'next',
      /\b(tiep theo|buoc tiep|buoc ke tiep|buoc sau|tiep tuc|sang buoc|chuyen buoc|next|tiep)\b/g,
    ],
    ['prev', /\b(quay lai|buoc truoc|lui lai|lui mot buoc|tro lai|back)\b/g],
    ['repeat', /\b(doc lai|doc buoc nay|nhac lai|nghe lai|lap lai|noi lai|repeat)\b/g],
    ['stop', /\b(dung lai|tam dung|ngung|khoan|dung|stop|pause|tat tieng)\b/g],
  ];
  let command: VoiceCommand | null = null;
  let position = -1;
  for (const [candidate, pattern] of rules) {
    for (const match of value.matchAll(pattern))
      if ((match.index ?? -1) > position) {
        command = candidate;
        position = match.index!;
      }
  }
  return command;
}

export function acceptRecognition(text: string, isFinal: boolean): VoiceCommand | null {
  // Partial transcripts may only stop playback. Navigation waits for a complete phrase.
  const command = matchCommand(text);
  return isFinal || command === 'stop' ? command : null;
}
