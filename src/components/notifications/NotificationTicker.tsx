import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Radio } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Notification } from '@/hooks/useNotifications';
import { useNotificationCenter } from './useNotificationCenter';
import { pickMotivationalMessage } from './motivationalMessages';

const SPEED_PX_PER_SECOND = 60;
const MIN_DURATION = 18;
const MIN_COPIES = 2;
const MAX_COPIES = 12;

export function NotificationTicker() {
  const { unread, open } = useNotificationCenter();
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const blockRef = useRef<HTMLDivElement>(null);
  const hoverRef = useRef(false);

  const [duration, setDuration] = useState(MIN_DURATION);
  const [copies, setCopies] = useState(MIN_COPIES);
  const [message, setMessage] = useState(() => pickMotivationalMessage());

  const hasUnread = unread.length > 0;

  // Sorteia nova frase sempre que a caixa fica limpa.
  useEffect(() => {
    if (!hasUnread) setMessage(pickMotivationalMessage());
  }, [hasUnread]);

  const items = useMemo(() => {
    if (hasUnread) return unread;
    return [] as Notification[];
  }, [hasUnread, unread]);

  /** Garante faixa mais larga que a barra e velocidade constante. */
  const measure = useCallback(() => {
    const block = blockRef.current;
    const viewport = viewportRef.current;
    if (!block || !viewport) return;

    const blockWidth = block.getBoundingClientRect().width;
    const viewportWidth = viewport.getBoundingClientRect().width;
    if (blockWidth <= 0) return;

    const needed = Math.min(
      MAX_COPIES,
      Math.max(MIN_COPIES, Math.ceil(viewportWidth / blockWidth) + 1),
    );
    setCopies(needed);
    setDuration(Math.max(MIN_DURATION, blockWidth / SPEED_PX_PER_SECOND));
  }, []);

  useEffect(() => {
    measure();
    const viewport = viewportRef.current;
    if (!viewport || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(viewport);
    return () => ro.disconnect();
  }, [measure, items, message]);

  // Rede de segurança: se a animação CSS não estiver rodando, move na mão.
  useEffect(() => {
    const track = trackRef.current;
    const block = blockRef.current;
    if (!track || !block) return;

    let raf = 0;
    let fallbackRaf = 0;
    let offset = 0;
    let last = 0;

    const step = (now: number) => {
      if (!last) last = now;
      const dt = (now - last) / 1000;
      last = now;
      const blockWidth = block.getBoundingClientRect().width || 1;
      if (!hoverRef.current) {
        offset -= SPEED_PX_PER_SECOND * dt;
        if (-offset >= blockWidth) offset += blockWidth;
        track.style.transform = `translateX(${offset}px)`;
      }
      fallbackRaf = requestAnimationFrame(step);
    };

    const check = () => {
      const running =
        typeof track.getAnimations === 'function'
          ? track
              .getAnimations()
              .some((a) => a.playState === 'running' || a.playState === 'paused')
          : true;
      if (!running) {
        track.style.animationName = 'none';
        fallbackRaf = requestAnimationFrame(step);
      }
    };

    raf = requestAnimationFrame(() => requestAnimationFrame(check));

    return () => {
      cancelAnimationFrame(raf);
      if (fallbackRaf) cancelAnimationFrame(fallbackRaf);
      track.style.transform = '';
      track.style.animationName = '';
    };
  }, [items, message, copies]);

  const block = (index: number) => (
    <div
      key={index}
      ref={index === 0 ? blockRef : undefined}
      className="flex shrink-0 items-center gap-8 pr-8"
    >
      {hasUnread
        ? items.map((n) => (
            <button
              key={`${index}-${n.id}`}
              type="button"
              onClick={() => open(n)}
              className="flex shrink-0 items-center gap-2 text-sm font-semibold text-destructive hover:underline"
            >
              <span className="relative flex h-1.5 w-1.5 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-destructive" />
              </span>
              <span className="whitespace-nowrap">
                {n.title}
                {n.message ? ` — ${n.message}` : ''}
              </span>
            </button>
          ))
        : (
            <span className="shrink-0 whitespace-nowrap text-sm text-muted-foreground">
              {message}
            </span>
          )}
    </div>
  );

  return (
    <div
      className="group relative flex min-w-0 flex-1 items-center gap-2 overflow-hidden"
      onMouseEnter={() => {
        hoverRef.current = true;
      }}
      onMouseLeave={() => {
        hoverRef.current = false;
      }}
    >
      <Radio
        className={cn('h-4 w-4 shrink-0', hasUnread ? 'text-destructive' : 'text-muted-foreground')}
      />
      <div ref={viewportRef} className="ticker-viewport relative min-w-0 flex-1 overflow-hidden">
        <div
          ref={trackRef}
          className="ticker-track flex w-max items-center group-hover:[animation-play-state:paused]"
          style={{
            animationDuration: `${duration}s`,
            ['--ticker-shift' as string]: `-${100 / copies}%`,
          }}
        >
          {Array.from({ length: copies }, (_, i) => block(i))}
        </div>
      </div>
    </div>
  );
}
