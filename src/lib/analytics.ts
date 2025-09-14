type Event = { name: string; props?: Record<string, unknown> };
let enabled = false;
export const Analytics = {
  enable() { enabled = true },
  disable() { enabled = false },
  track(event: Event) { if (enabled) console.debug('[analytics]', event) }
};
