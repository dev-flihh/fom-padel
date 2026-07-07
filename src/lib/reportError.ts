import type { ErrorInfo } from 'react';

/**
 * Single crash-reporting funnel for the whole app. Fase 2.2 wires Sentry in
 * here (Sentry.captureException) — every boundary and global handler already
 * routes through this one function, so that's a one-place change.
 */
export const reportError = (error: unknown, context: string) => {
  // TODO(fase-2.2): Sentry.captureException(error, { tags: { context } });
  console.error(`[report:${context}]`, error);
};

/** Matches AppErrorBoundary's onError signature. */
export const reportBoundaryError = (error: Error, _info: ErrorInfo, context: string) => {
  reportError(error, context);
};

let installed = false;
/**
 * React error boundaries only catch render/lifecycle errors, so we also capture
 * uncaught async errors and unhandled promise rejections at the window level.
 */
export const installGlobalErrorHandlers = () => {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  window.addEventListener('error', (event) => {
    reportError(event.error ?? event.message, 'window.error');
  });
  window.addEventListener('unhandledrejection', (event) => {
    reportError(event.reason, 'unhandledrejection');
  });
};
