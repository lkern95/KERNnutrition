let attached = false;
function onError(ev: ErrorEvent) { /* z.B. Sentry.captureException(ev.error) */ }
function onRejection(ev: PromiseRejectionEvent) { /* ... */ }
export const CrashReporter = {
  enable() {
    if (attached) return;
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    attached = true;
  },
  disable() {
    if (!attached) return;
    window.removeEventListener('error', onError);
    window.removeEventListener('unhandledrejection', onRejection);
    attached = false;
  }
};
