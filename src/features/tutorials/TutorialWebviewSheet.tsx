import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X, ExternalLink } from 'lucide-react';
import { type Tutorial } from './tutorialsApi';

/**
 * Overlay full-screen yang menampilkan artikel tutorial dalam mode embed
 * (embedUrl -> halaman tanpa header/footer). Dipakai sebagai in-app webview.
 */
export const TutorialWebviewSheet = ({
  tutorial,
  onClose,
}: {
  tutorial: Tutorial | null;
  onClose: () => void;
}) => {
  const [isFrameLoading, setIsFrameLoading] = useState(true);

  useEffect(() => {
    setIsFrameLoading(true);
  }, [tutorial?.embedUrl]);

  // Kunci scroll body selama sheet terbuka.
  useEffect(() => {
    if (!tutorial) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [tutorial]);

  return (
    <AnimatePresence>
      {tutorial && tutorial.embedUrl && (
        <motion.div
          className="fixed inset-0 z-[150] flex flex-col bg-surface"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ type: 'spring', damping: 30, stiffness: 320 }}
        >
          {/* Header */}
          <div
            className="flex items-center gap-3 border-b border-black/[0.08] bg-white px-4 py-3"
            style={{ paddingTop: 'max(env(safe-area-inset-top), 12px)' }}
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ios-gray/[0.1] text-on-surface tap-target active:scale-95"
            >
              <X size={18} strokeWidth={2.2} />
            </button>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase leading-none tracking-[0.05em] text-primary">
                {tutorial.category}
              </p>
              <p className="mt-1 truncate text-[14px] font-bold leading-tight tracking-[-0.01em] text-on-surface">
                {tutorial.title}
              </p>
            </div>
            <a
              href={tutorial.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Buka di browser"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ios-gray/[0.1] text-ios-gray tap-target active:scale-95"
            >
              <ExternalLink size={16} strokeWidth={2.2} />
            </a>
          </div>

          {/* Isi */}
          <div className="relative flex-1 bg-surface">
            {isFrameLoading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="h-7 w-7 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
              </div>
            )}
            <iframe
              key={tutorial.embedUrl}
              src={tutorial.embedUrl}
              title={tutorial.title}
              onLoad={() => setIsFrameLoading(false)}
              className="h-full w-full border-0"
              loading="eager"
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
