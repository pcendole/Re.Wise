export const isDarkMode = (): boolean => {
  return typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
};

const listeners = new Set<(dark: boolean) => void>();

export const toggleDarkMode = (): boolean => {
  const next = !isDarkMode();
  setDarkMode(next);
  return next;
};

export const setDarkMode = (dark: boolean): void => {
  if (typeof document === 'undefined') return;
  if (dark) {
    document.documentElement.classList.add('dark');
    localStorage.setItem('rewise_theme', 'dark');
    const meta = document.getElementById('theme-color-meta');
    if (meta) meta.setAttribute('content', '#000000');
  } else {
    document.documentElement.classList.remove('dark');
    localStorage.setItem('rewise_theme', 'light');
    const meta = document.getElementById('theme-color-meta');
    if (meta) meta.setAttribute('content', '#F7F7F4');
  }
  listeners.forEach((fn) => fn(dark));
};

export const subscribeTheme = (fn: (dark: boolean) => void): (() => void) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};
