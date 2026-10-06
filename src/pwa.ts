// Offline support for the installable app. Service workers need http(s), so this is skipped for file://.

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
