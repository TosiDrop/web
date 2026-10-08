export async function showRewardBrowserNotification(message: string): Promise<void> {
  try {
    if ('serviceWorker' in navigator) {
      await navigator.serviceWorker.register('/reward-alert-sw.js');
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification('TosiDrop rewards ready', {
        body: message,
        icon: '/favicon.svg',
        tag: 'tosidrop-rewards',
      });
      return;
    }
    const alert = new Notification('TosiDrop rewards ready', { body: message, icon: '/favicon.svg', tag: 'tosidrop-rewards' });
    alert.onclick = () => { window.focus(); window.location.assign('/claim'); };
  } catch {
    // The in-app badge remains available when system notifications fail.
  }
}
