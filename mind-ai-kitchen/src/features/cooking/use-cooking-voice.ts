'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { acceptRecognition, type VoiceCommand } from './commands';

interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
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
  onstart: (() => void) | null;
  onspeechstart: (() => void) | null;
  onspeechend: (() => void) | null;
  onnomatch: (() => void) | null;
}
type SpeechWindow = Window & {
  SpeechRecognition?: new () => Recognition;
  webkitSpeechRecognition?: new () => Recognition;
};

export function useCookingVoice(
  onCommand: (command: VoiceCommand, read: (text: string) => void) => string | void,
) {
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [autoRead, setAutoRead] = useState(false);
  const [error, setError] = useState('');
  const [transcript, setTranscript] = useState('');
  const [status, setStatus] = useState<'off' | 'starting' | 'ready' | 'hearing' | 'reconnecting'>(
    'off',
  );
  const [response, setResponse] = useState('');
  const session = useRef<(() => void) | null>(null);
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
    if (session.current) {
      session.current();
      session.current = null;
      setListening(false);
      setStatus('off');
      return;
    }
    const speechWindow = window as SpeechWindow;
    const Constructor = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!Constructor) {
      setError(
        'Trình duyệt này chưa hỗ trợ nhận giọng nói. Thử mở bằng Chrome hoặc dùng nút chuyển bước.',
      );
      return;
    }
    if (!window.isSecureContext) {
      setError('Micro cần kết nối HTTPS. Mở địa chỉ HTTPS của ứng dụng rồi thử lại.');
      return;
    }
    setError('');
    setTranscript('');
    setResponse('');
    setListening(true);
    setStatus('starting');
    let recognition: Recognition;
    try {
      recognition = new Constructor();
    } catch {
      setListening(false);
      setStatus('off');
      setError(
        'Không khởi tạo được dịch vụ nhận giọng nói. Thử tải lại trang hoặc dùng nút chuyển bước.',
      );
      return;
    }
    recognition.lang = 'vi-VN';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    let cancelled = false;
    let restart: ReturnType<typeof setTimeout> | undefined;
    let watchdog: ReturnType<typeof setTimeout> | undefined;
    let failures = 0;
    const handled = new Set<number>();
    const dispose = () => {
      cancelled = true;
      clearTimeout(restart);
      clearTimeout(watchdog);
      recognition.onend = null;
      recognition.onstart = null;
      recognition.onspeechstart = null;
      recognition.onspeechend = null;
      recognition.onnomatch = null;
      recognition.onresult = null;
      recognition.onerror = null;
      try {
        recognition.abort();
      } catch {
        // Some implementations throw if startup failed before opening a session.
      }
    };
    const fail = (message: string) => {
      dispose();
      session.current = null;
      setListening(false);
      setStatus('off');
      setError(message);
    };
    const start = () => {
      if (cancelled) return;
      handled.clear();
      stopped.current = false;
      watchdog = setTimeout(() => {
        fail('Micro chưa sẵn sàng. Kiểm tra quyền micro và kết nối mạng, rồi bấm bật lại.');
      }, 8000);
      try {
        recognition.start();
      } catch {
        fail('Không mở được micro. Kiểm tra quyền micro trong trình duyệt rồi thử lại.');
      }
    };
    recognition.onstart = () => {
      if (cancelled) return;
      clearTimeout(watchdog);
      setStatus('ready');
      setError('');
    };
    recognition.onspeechstart = () => {
      if (!cancelled) setStatus('hearing');
    };
    recognition.onspeechend = () => {
      if (!cancelled) setStatus('ready');
    };
    recognition.onnomatch = () => {
      if (!cancelled) setResponse('Chưa hiểu lệnh. Hãy nói lại.');
    };
    recognition.onresult = (event) => {
      if (cancelled) return;
      failures = 0;
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0].transcript;
        setTranscript(text);
        setStatus(result.isFinal ? 'ready' : 'hearing');
        if (handled.has(i)) continue;
        const command = acceptRecognition(text, result.isFinal);
        if (!command) {
          setResponse(result.isFinal ? 'Chưa thực hiện lệnh. Hãy nói lại.' : 'Đang nhận câu nói…');
          if (result.isFinal) handled.add(i);
          continue;
        }
        if (result.isFinal) {
          handled.add(i);
          stopped.current = false;
        }
        if (!result.isFinal && command === 'stop') {
          if (!stopped.current) {
            stop();
            stopped.current = true;
            setResponse('Đã dừng đọc.');
          }
          continue;
        }
        stop();
        const feedback = handler.current(command, speak);
        setResponse(
          feedback ||
            {
              next: 'Đã nhận: bước tiếp.',
              prev: 'Đã nhận: quay lại.',
              repeat: 'Đang đọc lại bước này.',
              stop: 'Đã dừng đọc.',
            }[command],
        );
      }
    };
    recognition.onerror = (event) => {
      if (cancelled) return;
      clearTimeout(watchdog);
      if (event.error === 'no-speech') {
        setResponse('Chưa nghe thấy tiếng nói. Hãy nói gần micro hơn.');
        return;
      }
      failures++;
      const messages: Record<string, string> = {
        'not-allowed':
          'Chưa được cấp quyền micro. Cho phép micro trong cài đặt trang của trình duyệt rồi bật lại.',
        'service-not-allowed':
          'Trình duyệt không cho phép dịch vụ nhận giọng nói. Thử mở bằng Chrome hoặc dùng nút chuyển bước.',
        'audio-capture':
          'Không thu được âm thanh. Kiểm tra micro đã kết nối và quyền micro của thiết bị.',
        'language-not-supported':
          'Dịch vụ nhận giọng nói này chưa hỗ trợ tiếng Việt. Thử trình duyệt khác hoặc dùng nút chuyển bước.',
      };
      if (messages[event.error]) return fail(messages[event.error]);
      const message =
        event.error === 'network'
          ? 'Không kết nối được dịch vụ nhận giọng nói. Kiểm tra mạng hoặc thử mở bằng Chrome.'
          : 'Dịch vụ nhận giọng nói bị gián đoạn. Bấm bật micro để thử lại.';
      if (failures >= 3 || event.error !== 'network') return fail(message);
      setError(message + ' Đang thử kết nối lại…');
      setStatus('reconnecting');
    };
    recognition.onend = () => {
      if (cancelled) return;
      clearTimeout(watchdog);
      clearTimeout(restart);
      setStatus('reconnecting');
      restart = setTimeout(start, failures ? 1000 * failures : 250);
    };
    session.current = dispose;
    // Start inside the button gesture; some browsers require user activation.
    start();
  }
  useEffect(
    () => () => {
      token.current++;
      session.current?.();
      session.current = null;
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
    status,
    response,
    speak,
    stop,
    toggleListening,
  };
}
