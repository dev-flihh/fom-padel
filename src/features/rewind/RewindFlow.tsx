import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type MouseEvent, type TouchEvent } from 'react';
import { toBlob as htmlToImageBlob } from 'html-to-image';
import { Download, MoreHorizontal, RefreshCw, Share2, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { Tournament, TournamentHistory } from '../../types';
import type { StandingsPlayer } from '../matches/standingsUtils';
import type { ToxicStandingsData } from '../matches/toxicStandings';
import { processLocalCardPhoto } from '../matches/localPhotoProcessing';
import { buildRewindData, REWIND_SLIDE_LABELS, type RewindPhoto, type RewindSlide } from './rewindData';
import { RewindSlideView } from './RewindSlideTemplates';

// FOM Rewind flow (PRD_FOM_REWIND.md): upload → generating → viewer.
// Phase 1: photos are LOCAL-ONLY (processed in-browser, never uploaded);
// generated PNGs live in memory for this session. PNG persistence for shared
// viewers is Phase 2.

export type GeneratedRewindSlide = {
  type: RewindSlide['type'];
  order: number;
  blob: Blob;
  url: string;
};

export type RewindResult = {
  generatedAt: number;
  slides: GeneratedRewindSlide[];
};

const MAX_PHOTOS = 10;
const EXPORT_VIEW = { width: 360, height: 640 };
const EXPORT_CANVAS = { width: 1080, height: 1920 };

const waitFrames = () => new Promise<void>((resolve) => (
  requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
));

const fileSafe = (value: string) => (
  value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48) || 'fom-rewind'
);

export const RewindFlow = ({
  tournament,
  sortedPlayers,
  toxicStandings,
  shareId,
  existingResult,
  onGenerated,
  onClose,
}: {
  tournament: Tournament | TournamentHistory;
  sortedPlayers: StandingsPlayer[];
  toxicStandings: ToxicStandingsData;
  shareId?: string;
  existingResult: RewindResult | null;
  onGenerated: (result: RewindResult) => void;
  onClose: () => void;
}) => {
  const [step, setStep] = useState<'upload' | 'generating' | 'viewer' | 'error'>(existingResult ? 'viewer' : 'upload');
  const [photos, setPhotos] = useState<RewindPhoto[]>([]);
  const [isProcessingPhotos, setIsProcessingPhotos] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [result, setResult] = useState<RewindResult | null>(existingResult);
  const [renderSlide, setRenderSlide] = useState<RewindSlide | null>(null);
  const [slideIndex, setSlideIndex] = useState(() => {
    const stored = Number(localStorage.getItem(`fom_rewind_pos_${tournament.id || ''}`) || 0);
    return Number.isFinite(stored) ? stored : 0;
  });
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [shareFeedback, setShareFeedback] = useState('');
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const exportRef = useRef<HTMLDivElement | null>(null);
  const touchStartXRef = useRef<number | null>(null);
  const generationRef = useRef(0);

  const rewindData = useMemo(() => buildRewindData({
    tournament,
    sortedPlayers,
    toxicStandings,
    photos,
    shareId,
  }), [tournament, sortedPlayers, toxicStandings, photos, shareId]);

  useEffect(() => () => {
    // Object URLs for generated slides are owned by the parent via onGenerated;
    // only revoke when this flow created a result the parent never received.
  }, []);

  const slides = result?.slides || [];
  const safeIndex = Math.min(Math.max(0, slideIndex), Math.max(0, slides.length - 1));
  const currentSlide = slides[safeIndex];

  useEffect(() => {
    if (step !== 'viewer' || !tournament.id) return;
    localStorage.setItem(`fom_rewind_pos_${tournament.id}`, String(safeIndex));
  }, [safeIndex, step, tournament.id]);

  // -------------------------------------------------------------------------
  // Upload step
  // -------------------------------------------------------------------------
  const handlePhotosChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const files: File[] = Array.from(event.target.files || []);
    event.target.value = '';
    if (files.length === 0) return;
    setIsProcessingPhotos(true);
    try {
      const room = MAX_PHOTOS - photos.length;
      const processed: RewindPhoto[] = [];
      for (const file of files.slice(0, Math.max(0, room))) {
        try {
          const photo = await processLocalCardPhoto(file);
          processed.push({ dataUrl: photo.dataUrl });
        } catch (err) {
          console.warn('Rewind photo skipped:', err);
        }
      }
      setPhotos((prev) => {
        const next = [...prev, ...processed];
        if (next.length > 0 && !next.some((photo) => photo.isCover)) next[0] = { ...next[0], isCover: true };
        return next;
      });
    } finally {
      setIsProcessingPhotos(false);
    }
  };

  const setCover = (index: number) => {
    setPhotos((prev) => prev.map((photo, photoIndex) => ({ ...photo, isCover: photoIndex === index })));
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => {
      const next = prev.filter((_, photoIndex) => photoIndex !== index);
      if (next.length > 0 && !next.some((photo) => photo.isCover)) next[0] = { ...next[0], isCover: true };
      return next;
    });
  };

  // -------------------------------------------------------------------------
  // Generate pipeline (PRD FR-6)
  // -------------------------------------------------------------------------
  const handleGenerate = async () => {
    const generation = generationRef.current + 1;
    generationRef.current = generation;
    const slidePayloads = rewindData.slides;
    setProgress({ current: 0, total: slidePayloads.length });
    setStep('generating');

    const generated: GeneratedRewindSlide[] = [];
    for (let index = 0; index < slidePayloads.length; index += 1) {
      if (generationRef.current !== generation) return; // superseded
      setProgress({ current: index + 1, total: slidePayloads.length });
      setRenderSlide(slidePayloads[index]);
      try {
        await waitFrames();
        await document.fonts?.ready;
        const node = exportRef.current;
        if (!node) throw new Error('Export node missing');
        const images = Array.from(node.querySelectorAll('img')) as HTMLImageElement[];
        await Promise.all(images.map(async (image) => {
          if (image.complete && image.naturalWidth > 0) return;
          try {
            await image.decode();
          } catch {
            await new Promise<void>((resolve) => {
              image.addEventListener('load', () => resolve(), { once: true });
              image.addEventListener('error', () => resolve(), { once: true });
            });
          }
        }));
        const blob = await htmlToImageBlob(node, {
          width: EXPORT_VIEW.width,
          height: EXPORT_VIEW.height,
          canvasWidth: EXPORT_CANVAS.width,
          canvasHeight: EXPORT_CANVAS.height,
          pixelRatio: 1,
          cacheBust: true,
          backgroundColor: '#111111',
        });
        if (!blob) throw new Error('Empty blob');
        generated.push({
          type: slidePayloads[index].type,
          order: generated.length,
          blob,
          url: URL.createObjectURL(blob),
        });
      } catch (err) {
        // FR-6.4: one failed slide is skipped, the rest continue.
        console.error(`Rewind slide failed (${slidePayloads[index].type}):`, err);
      }
    }
    setRenderSlide(null);
    if (generationRef.current !== generation) return;
    if (generated.length === 0) {
      setStep('error');
      return;
    }
    const nextResult: RewindResult = { generatedAt: Date.now(), slides: generated };
    setResult(nextResult);
    onGenerated(nextResult);
    setSlideIndex(0);
    setStep('viewer');
  };

  // -------------------------------------------------------------------------
  // Viewer interactions (PRD FR-8)
  // -------------------------------------------------------------------------
  const goTo = useCallback((next: number) => {
    setSlideIndex((current) => {
      const target = Math.min(Math.max(0, next), slides.length - 1);
      return Number.isFinite(target) ? target : current;
    });
  }, [slides.length]);

  const handleTap = (event: MouseEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const ratio = (event.clientX - bounds.left) / bounds.width;
    // Tap kanan (60%) = next, tap kiri (40%) = back — konvensi IG (FR-8.2).
    if (ratio <= 0.4) goTo(safeIndex - 1);
    else goTo(safeIndex + 1);
  };

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    touchStartXRef.current = event.touches[0]?.clientX ?? null;
  };
  const handleTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    const startX = touchStartXRef.current;
    touchStartXRef.current = null;
    if (startX === null) return;
    const delta = (event.changedTouches[0]?.clientX ?? startX) - startX;
    if (Math.abs(delta) < 48) return;
    if (delta < 0) goTo(safeIndex + 1);
    else goTo(safeIndex - 1);
  };

  const buildFileName = (slide: GeneratedRewindSlide, index: number) => (
    `${fileSafe(tournament.name || 'fom-play')}-rewind-${index + 1}-${slide.type}.png`
  );

  const downloadSlide = (slide: GeneratedRewindSlide, index: number) => {
    const link = document.createElement('a');
    link.href = slide.url;
    link.download = buildFileName(slide, index);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const shareSlide = async (slide: GeneratedRewindSlide, index: number) => {
    const file = new File([slide.blob], buildFileName(slide, index), { type: 'image/png' });
    const payload = { files: [file], title: `FOM Rewind — ${tournament.name || 'FOM Play'}` };
    try {
      if (navigator.share && (!navigator.canShare || navigator.canShare(payload))) {
        await navigator.share(payload);
        return;
      }
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return;
    }
    downloadSlide(slide, index);
    setShareFeedback('Slide diunduh — share manual dari galeri.');
    window.setTimeout(() => setShareFeedback(''), 2600);
  };

  const downloadAll = () => {
    slides.forEach((slide, index) => {
      window.setTimeout(() => downloadSlide(slide, index), index * 140);
    });
    setIsMenuOpen(false);
  };

  const handleRegenerate = () => {
    setIsMenuOpen(false);
    setStep('upload');
  };

  // -------------------------------------------------------------------------

  const coverIndex = photos.findIndex((photo) => photo.isCover);

  return (
    <div className="fixed inset-0 z-[320] flex flex-col bg-black" role="dialog" aria-modal="true" aria-label="FOM Rewind">
      {/* Hidden export node — 360×640, exported at 1080×1920 */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed left-0 top-0 z-0 opacity-0"
        style={{ width: EXPORT_VIEW.width, height: EXPORT_VIEW.height }}
      >
        <div ref={exportRef} className="relative overflow-hidden" style={{ width: EXPORT_VIEW.width, height: EXPORT_VIEW.height }}>
          {renderSlide && <RewindSlideView slide={renderSlide} shortLink={rewindData.shortLink} />}
        </div>
      </div>

      {step === 'upload' && (
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-white text-on-surface">
          <div
            className="flex items-center justify-between px-5"
            style={{ paddingTop: 'calc(var(--app-safe-top, 0px) + 14px)' }}
          >
            <button
              type="button"
              onClick={onClose}
              className="tap-target flex h-10 w-10 items-center justify-center rounded-full border border-black/10 text-on-surface"
              aria-label="Tutup FOM Rewind"
            >
              <X size={18} />
            </button>
            <button type="button" onClick={() => void handleGenerate()} className="tap-target px-2 text-[13px] font-bold text-ios-gray">
              Skip
            </button>
          </div>
          <div className="px-5 pt-4">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-primary">FOM Rewind · Step 1 of 1</p>
            <h1 className="mt-2 text-[26px] font-extrabold leading-[1.15] tracking-[-0.02em]">
              Every mabar deserves <span className="text-primary">photos.</span>
            </h1>
            <p className="mt-2 text-[13px] leading-[1.5] text-ios-gray">
              Tanpa foto juga bisa, tapi mabar tanpa foto itu kayak menang tanpa saksi. Max {MAX_PHOTOS} foto — foto diproses di HP kamu, tidak di-upload.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 px-5 pt-4">
            {photos.map((photo, index) => (
              <div key={`${index}-${photo.dataUrl.slice(-16)}`} className="relative aspect-square overflow-hidden rounded-[14px]">
                <button type="button" className="h-full w-full" onClick={() => setCover(index)} aria-label={`Jadikan foto ${index + 1} cover`}>
                  <img src={photo.dataUrl} alt="" className="h-full w-full object-cover" />
                </button>
                {photo.isCover && (
                  <span className="pointer-events-none absolute bottom-1.5 left-1.5 rounded-full bg-primary px-2 py-1 text-[8px] font-black uppercase tracking-[0.1em] text-white">
                    Cover
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => removePhoto(index)}
                  className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/55 text-white"
                  aria-label={`Hapus foto ${index + 1}`}
                >
                  <X size={12} />
                </button>
              </div>
            ))}
            {photos.length < MAX_PHOTOS && (
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                disabled={isProcessingPhotos}
                className="flex aspect-square flex-col items-center justify-center gap-1 rounded-[14px] border-2 border-dashed border-[#D9D9DE] text-ios-gray disabled:opacity-60"
              >
                {isProcessingPhotos ? (
                  <RefreshCw size={18} className="animate-spin motion-reduce:animate-none" />
                ) : (
                  <span className="text-[20px] font-extrabold leading-none">+</span>
                )}
                <span className="text-[9px] font-bold">Add</span>
              </button>
            )}
          </div>
          <p className="px-5 pt-2 text-[11px] text-ios-gray/80">
            {photos.length} of {MAX_PHOTOS} photos{photos.length > 0 && coverIndex >= 0 ? ' · tap foto untuk set cover' : ''}
          </p>
          <div className="flex-1" />
          <div className="px-5 pb-[calc(var(--app-safe-bottom,0px)+18px)] pt-4">
            <button
              type="button"
              onClick={() => void handleGenerate()}
              disabled={isProcessingPhotos}
              className="tap-target w-full rounded-full bg-primary px-6 py-4 text-[15px] font-bold text-white shadow-[0_10px_26px_rgba(230,94,20,0.28)] disabled:opacity-60"
            >
              Generate Rewind
            </button>
          </div>
          <input ref={photoInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotosChange} />
        </div>
      )}

      {step === 'generating' && (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-10 text-center">
          <img src="/assets/fom-play-logo-dark-cropped.png" alt="FOM Play" className="mb-9 h-[26px] w-auto object-contain" />
          <div className="mb-7 h-16 w-16 animate-spin rounded-full border-[3px] border-white/12 border-t-primary motion-reduce:animate-none" />
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-primary">FOM Rewind</p>
          <p className="mt-2.5 text-[20px] font-extrabold tracking-[-0.02em] text-white" aria-live="polite">
            Menyiapkan slide {progress.current} dari {progress.total}…
          </p>
          <p className="mt-2 text-[13px] leading-[1.5] text-white/45">
            Ngitung siapa yang paling jago<br />dan siapa yang paling… yaudah lah.
          </p>
          <div className="mt-7 h-1 w-[200px] overflow-hidden rounded-full bg-white/12">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-300"
              style={{ width: `${progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0}%` }}
            />
          </div>
        </div>
      )}

      {step === 'error' && (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-10 text-center">
          <p className="text-[18px] font-extrabold text-white">Gagal membuat Rewind.</p>
          <p className="text-[13px] text-white/55">Coba lagi sebentar — data match kamu aman.</p>
          <button type="button" onClick={() => void handleGenerate()} className="tap-target rounded-full bg-primary px-8 py-3.5 text-[14px] font-bold text-white">
            Coba lagi
          </button>
          <button type="button" onClick={onClose} className="tap-target px-4 py-2 text-[13px] font-bold text-white/60">
            Kembali
          </button>
        </div>
      )}

      {step === 'viewer' && slides.length > 0 && (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex gap-1 px-4" style={{ paddingTop: 'calc(var(--app-safe-top, 0px) + 12px)' }}>
            {slides.map((slide, index) => (
              <div
                key={slide.url}
                className={cn('h-[3px] flex-1 rounded-full', index <= safeIndex ? 'bg-primary' : 'bg-white/25')}
              />
            ))}
          </div>
          <div className="flex items-center justify-between px-4 pt-3">
            <p className="text-[11px] font-bold text-white/60">
              {safeIndex + 1} / {slides.length} · {REWIND_SLIDE_LABELS[currentSlide?.type || 'cover']}
            </p>
            <div className="relative flex gap-2.5">
              <button
                type="button"
                onClick={() => setIsMenuOpen((open) => !open)}
                className="tap-target flex h-9 w-9 items-center justify-center rounded-full bg-white/12 text-white"
                aria-label="Menu Rewind"
                aria-expanded={isMenuOpen}
              >
                <MoreHorizontal size={16} />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="tap-target flex h-9 w-9 items-center justify-center rounded-full bg-white/12 text-white"
                aria-label="Tutup Rewind"
              >
                <X size={16} />
              </button>
              {isMenuOpen && (
                <div className="absolute right-0 top-11 z-10 w-52 overflow-hidden rounded-[16px] border border-white/12 bg-[#1c1c1e] py-1 shadow-[0_18px_44px_rgba(0,0,0,0.5)]">
                  <button type="button" onClick={downloadAll} className="tap-target flex w-full items-center gap-2.5 px-4 py-3 text-left text-[13px] font-semibold text-white active:bg-white/[0.06]">
                    <Download size={15} /> Download semua
                  </button>
                  <button type="button" onClick={handleRegenerate} className="tap-target flex w-full items-center gap-2.5 px-4 py-3 text-left text-[13px] font-semibold text-white active:bg-white/[0.06]">
                    <RefreshCw size={15} /> Regenerate
                  </button>
                </div>
              )}
            </div>
          </div>

          <div
            className="relative mx-4 mt-3 min-h-0 flex-1 select-none overflow-hidden rounded-[20px] bg-[#111111]"
            onClick={handleTap}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            role="group"
            aria-label={`Slide ${safeIndex + 1} dari ${slides.length}: ${REWIND_SLIDE_LABELS[currentSlide?.type || 'cover']}`}
          >
            {currentSlide && (
              <img
                src={currentSlide.url}
                alt={`FOM Rewind slide ${REWIND_SLIDE_LABELS[currentSlide.type]}`}
                className="mx-auto h-full w-auto max-w-full object-contain"
                draggable={false}
              />
            )}
            {/* Hidden but focusable prev/next for screen readers (FR-8.7) */}
            <button type="button" className="sr-only" onClick={(event) => { event.stopPropagation(); goTo(safeIndex - 1); }}>
              Slide sebelumnya
            </button>
            <button type="button" className="sr-only" onClick={(event) => { event.stopPropagation(); goTo(safeIndex + 1); }}>
              Slide berikutnya
            </button>
          </div>

          {shareFeedback && (
            <p className="px-6 pt-2 text-center text-[11px] font-semibold text-white/70">{shareFeedback}</p>
          )}
          <div className="flex gap-2.5 px-4 pb-[calc(var(--app-safe-bottom,0px)+16px)] pt-3.5">
            <button
              type="button"
              onClick={() => currentSlide && void shareSlide(currentSlide, safeIndex)}
              className="tap-target flex flex-1 items-center justify-center gap-2 rounded-full bg-primary px-4 py-3.5 text-[13.5px] font-bold text-white"
            >
              <Share2 size={15} /> Share
            </button>
            <button
              type="button"
              onClick={() => currentSlide && downloadSlide(currentSlide, safeIndex)}
              className="tap-target flex flex-1 items-center justify-center gap-2 rounded-full border border-white/25 px-4 py-3.5 text-[13.5px] font-bold text-white"
            >
              <Download size={15} /> Download
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
