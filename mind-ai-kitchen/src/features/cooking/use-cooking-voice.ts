'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { matchCommand, matchEndedCommand, type VoiceCommand } from './commands';

interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
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
type VoiceStatus =
  'off' | 'starting' | 'ready' | 'hearing' | 'processing' | 'paused' | 'reconnecting';
type Session = { dispose(): void; pause(): void; resume(): void };

export function useCookingVoice(
  onCommand: (command: VoiceCommand, read: (text: string) => void) => string | void,
) {
  // listening records the user's choice; status records actual microphone activity.
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [autoRead, setAutoRead] = useState(false);
  const [error, setError] = useState('');
  const [transcript, setTranscript] = useState('');
  const [status, setStatus] = useState<VoiceStatus>('off');
  const [response, setResponse] = useState('');
  const session = useRef<Session | null>(null);
  const handler = useRef(onCommand);
  const token = useRef(0);
  const speechBusy = useRef(false);
  const speechTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  useEffect(() => {
    handler.current = onCommand;
  }, [onCommand]);

  const stop = useCallback(() => {
    token.current++;
    clearTimeout(speechTimer.current);
    speechBusy.current = false;
    utteranceRef.current = null;
    window.speechSynthesis?.cancel();
    setSpeaking(false);
    session.current?.resume();
  }, []);

  const speak = useCallback((text: string) => {
    if (!text.trim()) return;
    if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) {
      setError('Trình duyệt chưa hỗ trợ đọc văn bản. Bạn vẫn có thể dùng nút chuyển bước.');
      return;
    }
    const current = ++token.current;
    clearTimeout(speechTimer.current);
    // Pause before enqueueing TTS, not after its asynchronous start event.
    speechBusy.current = true;
    session.current?.pause();
    window.speechSynthesis.cancel();
    setSpeaking(true);
    setError('');
    const finish = (message?: string) => {
      if (current !== token.current) return;
      token.current++;
      clearTimeout(speechTimer.current);
      speechBusy.current = false;
      utteranceRef.current = null;
      setSpeaking(false);
      if (message) setError(message);
      session.current?.resume();
    };
    try {
      const utterance = new SpeechSynthesisUtterance(text);
      utteranceRef.current = utterance;
      utterance.lang = 'vi-VN';
      utterance.rate = 0.95;
      const voice = window.speechSynthesis
        .getVoices()
        .find((v) => v.lang.toLowerCase().startsWith('vi'));
      if (voice) utterance.voice = voice;
      const timedOut = () => {
        if (current !== token.current) return;
        finish('Không phát được hướng dẫn. Bấm “Đọc bước này” để thử lại.');
        window.speechSynthesis.cancel();
      };
      speechTimer.current = setTimeout(timedOut, 8000);
      utterance.onstart = () => {
        if (current !== token.current) return;
        clearTimeout(speechTimer.current);
        // Recover even if the browser loses its completion event.
        speechTimer.current = setTimeout(timedOut, Math.max(15000, text.length * 180 + 10000));
      };
      utterance.onend = () => finish();
      utterance.onerror = (event) =>
        finish(
          ['canceled', 'interrupted'].includes(event.error)
            ? undefined
            : 'Không đọc được hướng dẫn. Bấm “Đọc bước này” để thử lại.',
        );
      window.speechSynthesis.speak(utterance);
    } catch {
      finish('Không đọc được hướng dẫn. Bạn vẫn có thể dùng nút chuyển bước.');
    }
  }, []);

  function toggleListening() {
    if (session.current) {
      session.current.dispose();
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
    let cancelled = false;
    let recognition: Recognition | null = null;
    let restart: ReturnType<typeof setTimeout> | undefined;
    let watchdog: ReturnType<typeof setTimeout> | undefined;
    let silence: ReturnType<typeof setTimeout> | undefined;
    let completion: ReturnType<typeof setTimeout> | undefined;
    let failures = 0;
    const clearCaptureTimers = () => {
      clearTimeout(watchdog);
      clearTimeout(silence);
      clearTimeout(completion);
    };
    const release = () => {
      clearCaptureTimers();
      const old = recognition;
      recognition = null;
      if (!old) return;
      old.onend = old.onstart = old.onspeechstart = old.onspeechend = old.onnomatch = null;
      old.onresult = old.onerror = null;
      try {
        old.abort();
      } catch {
        /* Already closed. */
      }
    };
    const dispose = () => {
      cancelled = true;
      clearTimeout(restart);
      release();
    };
    const fail = (message: string) => {
      dispose();
      session.current = null;
      setListening(false);
      setStatus('off');
      setError(message);
    };
    const resume = () => {
      clearTimeout(restart);
      if (cancelled || speechBusy.current || recognition) return;
      setStatus('reconnecting');
      // Allow the tail of the speaker audio to decay before opening the mic.
      restart = setTimeout(start, 400);
    };
    const pause = () => {
      clearTimeout(restart);
      release();
      setTranscript('');
      setResponse('');
      setStatus('paused');
    };
    const start = () => {
      if (cancelled || speechBusy.current || recognition) return;
      let mic: Recognition;
      try {
        mic = new Constructor();
      } catch {
        fail(
          'Không khởi tạo được dịch vụ nhận giọng nói. Thử tải lại trang hoặc dùng nút chuyển bước.',
        );
        return;
      }
      recognition = mic;
      const active = () => !cancelled && !speechBusy.current && recognition === mic;
      let handled = false;
      let finishing = false;
      let heard = false;
      let latestText = '';
      mic.lang = 'vi-VN';
      mic.continuous = false;
      mic.interimResults = true;
      mic.maxAlternatives = 1;
      setStatus(failures ? 'reconnecting' : 'starting');
      const processSentence = (fallback = false) => {
        if (!active() || handled) return;
        handled = true;
        const command = fallback ? matchEndedCommand(latestText) : matchCommand(latestText);
        if (command) {
          if (command === 'stop') stop();
          const feedback = handler.current(command, speak);
          setResponse(
            feedback ||
              {
                next: 'Đã chuyển sang bước tiếp theo.',
                prev: 'Đã quay lại bước trước.',
                repeat: 'Đang đọc lại bước này.',
                stop: 'Đã dừng đọc.',
              }[command],
          );
        } else {
          setResponse(
            latestText
              ? fallback
                ? 'Chưa hiểu lệnh. Thử nói “bước tiếp” hoặc “quay lại”.'
                : 'Chưa thực hiện lệnh. Thử nói “bước tiếp” hoặc “quay lại”.'
              : 'Chưa nghe rõ. Bạn nói lại nhé.',
          );
        }
      };
      const closeSentence = () => {
        if (!active()) return;
        if (heard && !handled) processSentence(true);
        // Reading a repeat command can replace this capture session synchronously.
        if (!active()) return;
        release();
        resume();
      };
      // stop() asks the recognition service for a final result; abort() discards it.
      const finishSentence = () => {
        if (!active() || finishing) return;
        finishing = true;
        clearTimeout(silence);
        if (!handled) setStatus('processing');
        completion = setTimeout(closeSentence, 900);
        try {
          mic.stop();
        } catch {
          closeSentence();
        }
      };
      mic.onstart = () => {
        if (!active()) return;
        clearTimeout(watchdog);
        setStatus('ready');
        setError((message) =>
          message.startsWith('Không kết nối được dịch vụ nhận giọng nói.') ? '' : message,
        );
      };
      mic.onspeechstart = () => {
        if (!active() || finishing) return;
        clearTimeout(silence);
        heard = true;
        setTranscript('');
        setResponse('');
        setStatus('hearing');
      };
      mic.onspeechend = () => {
        if (active()) finishSentence();
      };
      mic.onnomatch = () => {
        if (!active()) return;
        handled = true;
        setResponse('Chưa hiểu lệnh. Thử nói “bước tiếp” hoặc “quay lại”.');
        finishSentence();
      };
      mic.onresult = (event) => {
        if (!active() || handled) return;
        failures = 0;
        // Single-utterance mode: combine segments before acting, so a later correction wins.
        let text = '';
        let final = true;
        for (let i = 0; i < event.results.length; i++) {
          text += ' ' + event.results[i][0].transcript;
          final &&= event.results[i].isFinal;
        }
        text = text.trim();
        latestText = text;
        if (!text) return;
        heard = true;
        setTranscript(text);
        clearTimeout(silence);
        if (!final) {
          setStatus(finishing ? 'processing' : 'hearing');
          // End capture after inactivity; do not execute while the user is speaking.
          if (!finishing) silence = setTimeout(finishSentence, 1600);
          return;
        }
        setStatus('processing');
        processSentence();
        finishSentence();
      };
      mic.onerror = (event) => {
        if (!active()) return;
        clearCaptureTimers();
        if (event.error === 'no-speech') {
          setResponse('Chưa nghe thấy tiếng nói. Hãy nói gần micro hơn.');
          release();
          resume();
          return;
        }
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
        failures++;
        const message =
          event.error === 'network'
            ? 'Không kết nối được dịch vụ nhận giọng nói. Kiểm tra mạng hoặc thử mở bằng Chrome.'
            : 'Dịch vụ nhận giọng nói bị gián đoạn. Bấm bật micro để thử lại.';
        if (failures >= 3 || event.error !== 'network') return fail(message);
        release();
        setError(message + ' Đang thử kết nối lại…');
        setStatus('reconnecting');
        restart = setTimeout(start, 1000 * failures);
      };
      mic.onend = closeSentence;
      watchdog = setTimeout(() => {
        if (active())
          fail('Micro chưa sẵn sàng. Kiểm tra quyền micro và kết nối mạng, rồi bấm bật lại.');
      }, 8000);
      try {
        mic.start();
      } catch {
        fail('Không mở được micro. Kiểm tra quyền micro trong trình duyệt rồi thử lại.');
      }
    };
    session.current = { dispose, pause, resume };
    if (speechBusy.current) pause();
    else start(); // Preserve user activation for the first permission request.
  }
  useEffect(
    () => () => {
      token.current++;
      clearTimeout(speechTimer.current);
      session.current?.dispose();
      session.current = null;
      speechBusy.current = false;
      utteranceRef.current = null;
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
