'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { acceptRecognition, type VoiceCommand } from './commands';

interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  abort(): void;
  onresult:
    | ((event: {
        resultIndex: number;
        results: {
          length: number;
          [index: number]: { isFinal: boolean; 0: { transcript: string } };
        };
      }) => void)
    | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
}
type SpeechWindow = Window & {
  SpeechRecognition?: new () => Recognition;
  webkitSpeechRecognition?: new () => Recognition;
};

export function useCookingVoice(
  onCommand: (command: VoiceCommand, read: (text: string) => void) => void,
) {
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [autoRead, setAutoRead] = useState(false);
  const [error, setError] = useState('');
  const [transcript, setTranscript] = useState('');
  const handler = useRef(onCommand);
  const token = useRef(0);
  const stopped = useRef(false);
  useEffect(() => {
    handler.current = onCommand;
  }, [onCommand]);
  const stop = useCallback(() => {
    token.current++;
    window.speechSynthesis?.cancel();
    setSpeaking(false);
  }, []);
  const speak = useCallback((text: string) => {
    if (!('speechSynthesis' in window)) {
      setError('Trình duyệt chưa hỗ trợ đọc văn bản. Bạn vẫn có thể đọc và chuyển bước bằng nút.');
      return;
    }
    token.current++;
    const current = token.current;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'vi-VN';
    utterance.rate = 0.95;
    const voice = window.speechSynthesis
      .getVoices()
      .find((v) => v.lang.toLowerCase().startsWith('vi'));
    if (voice) utterance.voice = voice;
    utterance.onstart = () => {
      if (current === token.current) setSpeaking(true);
    };
    utterance.onend = () => {
      if (current === token.current) setSpeaking(false);
    };
    utterance.onerror = (event) => {
      if (current !== token.current) return;
      setSpeaking(false);
      if (!['canceled', 'interrupted'].includes(event.error))
        setError('Không đọc được giọng nói. Thử tắt/bật đọc hoặc dùng nút điều khiển.');
    };
    window.speechSynthesis.speak(utterance);
  }, []);
  function toggleListening() {
    const speechWindow = window as SpeechWindow;
    if (!(speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition)) {
      setError('Trình duyệt chưa hỗ trợ nhận giọng nói. Các nút điều khiển vẫn dùng được.');
      return;
    }
    setError('');
    setListening((v) => !v);
  }
  useEffect(() => {
    if (!listening) return;
    const speechWindow = window as SpeechWindow;
    const Constructor = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!Constructor) return;
    const recognition = new Constructor();
    recognition.lang = 'vi-VN';
    recognition.continuous = true;
    recognition.interimResults = true;
    let cancelled = false;
    let restart: ReturnType<typeof setTimeout> | undefined;
    let failures = 0;
    const handled = new Set<number>();
    recognition.onresult = (event) => {
      failures = 0;
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0].transcript;
        setTranscript(text);
        if (handled.has(i)) continue;
        const command = acceptRecognition(text, result.isFinal);
        if (!command) continue;
        if (result.isFinal) {
          handled.add(i);
          stopped.current = false;
        }
        if (!result.isFinal && command === 'stop') {
          if (!stopped.current) {
            stop();
            stopped.current = true;
          }
          continue;
        }
        stop();
        handler.current(command, speak);
      }
    };
    recognition.onerror = (event) => {
      if (cancelled || event.error === 'aborted' || event.error === 'no-speech') return;
      failures++;
      if (event.error === 'not-allowed' || event.error === 'audio-capture' || failures >= 3) {
        cancelled = true;
        setListening(false);
        setError(
          event.error === 'not-allowed'
            ? 'Chưa được cấp quyền micro. Cho phép micro trong trình duyệt rồi bật lại.'
            : 'Micro tạm thời không hoạt động. Bạn có thể tiếp tục bằng các nút bên dưới.',
        );
      }
    };
    recognition.onend = () => {
      if (cancelled) return;
      restart = setTimeout(() => {
        if (cancelled) return;
        handled.clear();
        stopped.current = false;
        try {
          recognition.start();
        } catch {
          setListening(false);
          setError('Chưa khởi động lại được micro. Bấm bật micro để thử lại.');
        }
      }, 350);
    };
    try {
      recognition.start();
    } catch {
      restart = setTimeout(() => {
        setListening(false);
        setError('Không mở được micro. Vui lòng thử lại.');
      }, 0);
    }
    return () => {
      cancelled = true;
      clearTimeout(restart);
      recognition.onend = null;
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.abort();
    };
  }, [listening, stop, speak]);
  useEffect(
    () => () => {
      token.current++;
      window.speechSynthesis?.cancel();
    },
    [],
  );
  return {
    listening,
    speaking,
    autoRead,
    setAutoRead,
    error,
    transcript,
    speak,
    stop,
    toggleListening,
  };
}
