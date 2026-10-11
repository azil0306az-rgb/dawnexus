export function navigateTo(url: string) {
  if (url.startsWith('/#')) {
    const hash = url.substring(1);
    if (window.location.pathname !== '/') {
      window.history.pushState(null, '', url);
      window.dispatchEvent(new PopStateEvent('popstate'));
      setTimeout(() => {
        const el = document.querySelector(hash);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    } else {
      const el = document.querySelector(hash);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
      window.history.pushState(null, '', hash);
    }
    return;
  }

  window.history.pushState(null, '', url);
  window.dispatchEvent(new PopStateEvent('popstate'));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
