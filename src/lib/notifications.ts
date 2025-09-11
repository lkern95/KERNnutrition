export async function ensureNotificationsPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const res = await Notification.requestPermission();
  return res === 'granted';
}

export async function showLocalNotification(title: string, options?: NotificationOptions) {
  if (!await ensureNotificationsPermission()) return;
  const reg = await navigator.serviceWorker?.ready;
  if (reg?.showNotification) reg.showNotification(title, options);
}
