const query = new URLSearchParams(location.search);
document.documentElement.classList.toggle('hud-live',query.get('demo')!=='1');
if (query.get('demo') === '1') {
  import('./themask-demo.js');
} else {
  import('./themask-engine.js');
}
