import React, { useState, useEffect, useRef } from 'react';
import { Mic, Square, Play, Pause, Trash2, Volume2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface VoiceRecorderProps {
  initialAudioUrl?: string | null;
  onSaveAudio: (dataUrl: string | null) => void;
}

const MAX_RECORDING_SECONDS = 15;

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  initialAudioUrl,
  onSaveAudio,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(MAX_RECORDING_SECONDS);
  const [audioUrl, setAudioUrl] = useState<string | null>(initialAudioUrl || null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playProgress, setPlayProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (initialAudioUrl !== undefined) setAudioUrl(initialAudioUrl);
  }, [initialAudioUrl]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      if (audioElementRef.current) {
        audioElementRef.current.pause();
      }
    };
  }, []);

  const startRecording = async () => {
    setErrorMsg(null);
    audioChunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeTypes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'];
      const supportedMime = mimeTypes.find((m) => MediaRecorder.isTypeSupported(m)) || '';

      const recorder = new MediaRecorder(stream, {
        mimeType: supportedMime || undefined,
        audioBitsPerSecond: 32000,
      });

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(audioChunksRef.current, { type: supportedMime || 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Data = reader.result as string;
          setAudioUrl(base64Data);
          onSaveAudio(base64Data);
        };
        reader.readAsDataURL(blob);
      };

      recorder.start(250);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setSecondsLeft(MAX_RECORDING_SECONDS);

      timerRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            stopRecording();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch {
      setErrorMsg('Microphone access denied or unavailable.');
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const handleTogglePlay = () => {
    if (!audioUrl) return;

    if (!audioElementRef.current) {
      const audio = new Audio(audioUrl);
      audio.onended = () => {
        setIsPlaying(false);
        setPlayProgress(0);
      };
      audio.ontimeupdate = () => {
        if (audio.duration) {
          setPlayProgress((audio.currentTime / audio.duration) * 100);
        }
      };
      audioElementRef.current = audio;
    }

    if (isPlaying) {
      audioElementRef.current.pause();
      setIsPlaying(false);
    } else {
      audioElementRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleDeleteAudio = () => {
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current = null;
    }
    setAudioUrl(null);
    setIsPlaying(false);
    setPlayProgress(0);
    onSaveAudio(null);
  };

  return (
    <div className="rounded-xl bg-canvas border border-theme p-3 space-y-2.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-theme-primary flex items-center gap-1.5">
          <Volume2 className="h-3.5 w-3.5 text-forest" />
          <span>15s Voice Note</span>
        </span>
        <span className="text-[10px] text-theme-secondary font-mono">Max 15s</span>
      </div>

      {errorMsg && (
        <div className="flex items-center gap-1.5 text-[11px] text-rose-500 bg-rose-500/10 p-2 rounded-lg border border-rose-500/20">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {isRecording ? (
        <div className="flex items-center justify-between p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500" />
            </span>
            <div className="flex items-center gap-0.5 h-4">
              {[40, 80, 50, 100, 60, 90, 45, 70].map((h, i) => (
                <span
                  key={i}
                  className="w-1 bg-rose-500 rounded-full animate-pulse"
                  style={{
                    height: `${h}%`,
                    animationDelay: `${i * 120}ms`,
                    animationDuration: '600ms',
                  }}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold">{secondsLeft}s</span>
            <Button
              size="sm"
              onClick={stopRecording}
              className="h-7 px-2.5 text-xs bg-rose-600 hover:bg-rose-500 text-white font-bold gap-1 rounded-lg"
            >
              <Square className="h-3 w-3 fill-current" />
              <span>Done</span>
            </Button>
          </div>
        </div>
      ) : audioUrl ? (
        <div className="flex items-center justify-between p-2.5 rounded-lg bg-card-theme border border-theme text-xs">
          <div className="flex items-center gap-2.5 flex-1 mr-3">
            <button
              type="button"
              onClick={handleTogglePlay}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-forest text-white shrink-0 shadow-xs"
            >
              {isPlaying ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current ml-0.5" />}
            </button>
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between text-[10px] text-theme-secondary font-mono">
                <span>{isPlaying ? 'Playing...' : 'Voice Note'}</span>
                <span>15s</span>
              </div>
              <div className="w-full bg-canvas h-1.5 rounded-full overflow-hidden border border-theme">
                <div
                  className="bg-forest h-full transition-all duration-150"
                  style={{ width: `${playProgress}%` }}
                />
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDeleteAudio}
            className="p-1.5 rounded-lg text-theme-secondary hover:text-rose-500 hover:bg-canvas transition-colors"
            title="Delete Voice Note"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={startRecording}
          className="w-full h-8 text-xs border-dashed gap-1.5 rounded-lg"
        >
          <Mic className="h-3.5 w-3.5 text-forest" />
          <span>Record 15s Voice Note</span>
        </Button>
      )}
    </div>
  );
};
