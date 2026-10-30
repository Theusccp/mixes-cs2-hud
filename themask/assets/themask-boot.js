const query = new URLSearchParams(location.search);
if (query.get('demo') === '1') {
  import('./themask-demo.js');
} else {
  import('./themask-engine.js');
}
