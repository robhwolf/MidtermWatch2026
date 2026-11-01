// The light/dark switch. The page is light until a reader chooses dark. The
// inline script in index.html applies a saved choice before the first paint.

const GROUND = { light: '#f8f3e9', dark: '#2b2018' };
const root = document.documentElement;
const button = document.getElementById('theme');

const current = () => root.dataset.theme || 'light';

function sync() {
  const dark = current() === 'dark';
  button.setAttribute('aria-label', `Switch to ${dark ? 'light' : 'dark'} mode`);
  button.title = button.getAttribute('aria-label');
  button.querySelector('.sun').toggleAttribute('hidden', !dark);
  button.querySelector('.moon').toggleAttribute('hidden', dark);
  document.querySelectorAll('meta[name="theme-color"]').forEach(m => { m.content = GROUND[current()]; });
  dispatchEvent(new Event('themechange'));
}

button.addEventListener('click', () => {
  root.dataset.theme = current() === 'dark' ? 'light' : 'dark';
  try { localStorage.setItem('theme', root.dataset.theme); } catch {}
  sync();
});
sync();
