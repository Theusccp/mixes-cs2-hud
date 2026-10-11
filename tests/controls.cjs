const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
process.chdir(path.join(__dirname, '..'));
const assert = require('node:assert/strict');
const listeners = {};
const properties = {};
const classes = new Set();
const actions = {
  on: (name, callback) => (listeners[name] ||= []).push(callback),
  execute: (name, data) => (listeners[name] || []).forEach(callback => callback(data))
};
const config = { data: {}, onChange: callback => config.listener = callback };
const document = {
  documentElement: {
    classList: { toggle: (name, enabled) => {
      const add = enabled === undefined ? !classes.has(name) : enabled;
      add ? classes.add(name) : classes.delete(name);
    } },
    style: { setProperty: (name, value) => properties[name] = value }
  },
  createElement: () => ({}),
  body: { appendChild: node => document.logo = node }
};
let source = fs.readFileSync('hud/assets/mixes-custom.js', 'utf8');
source = source.replace('export function', 'function').replaceAll('import.meta.url', '"http://localhost/assets/mixes-custom.js"');
const context = vm.createContext({ document, URL, actions, config });
vm.runInContext(source + '\ninstallMixES({actions,config});', context);
assert.equal(properties['--color-t'], '#65D4F5');
assert.equal(properties['--color-ct'], '#F51B95');
assert.equal(document.logo.hidden, false);
actions.execute('toggleActive');
assert.equal(classes.has('mixes-hud-hidden'), true);
// Config updates cannot accidentally show a hidden HUD.
config.listener({ mixes_settings: { t_color: '#AABBCC', ct_color: 'invalid' } });
assert.equal(properties['--color-t'], '#AABBCC');
assert.equal(properties['--color-ct'], '#F51B95');
assert.equal(classes.has('mixes-hud-hidden'), true);
actions.execute('mixes_controls', 'showHud');
assert.equal(classes.has('mixes-hud-hidden'), false);
actions.execute('mixes_controls', 'hideHud');
assert.equal(classes.has('mixes-hud-hidden'), true);
actions.execute('toggleActive');
assert.equal(classes.has('mixes-hud-hidden'), false);
actions.execute('mixes_palette', 'swap_palette');
assert.equal(properties['--color-t'], '#F51B95');
assert.equal(properties['--color-ct'], '#65D4F5');
actions.execute('mixes_palette', 'default_palette');
assert.equal(properties['--color-t'], '#65D4F5');
assert.equal(properties['--color-ct'], '#F51B95');
assert.match(properties['--color-t-variant'], /^#[a-f0-9]{6}$/);
assert.equal(properties['--color-t-op'], 'rgba(101,212,245, .5)');
actions.execute('toggleMixESLogo');
assert.equal(document.logo.hidden, true);
actions.execute('toggleMixESLogo');
assert.equal(document.logo.hidden, false);
config.listener({ mixes_settings: { hide_logo: true } });
assert.equal(document.logo.hidden, true);
actions.execute('toggleMixESLogo');
assert.equal(document.logo.hidden, true);
config.listener({ mixes_settings: { hide_logo: false } });
actions.execute('toggleMixESLogo');
assert.equal(document.logo.hidden, false);
actions.execute('advertising_state', 'advertising_white_toggle');
assert.equal(classes.has('mixes-sponsors-white'), true);
actions.execute('advertising_state', 'advertising_white_toggle');
assert.equal(classes.has('mixes-sponsors-white'), false);
const bundle = fs.readFileSync('hud/assets/index-7d7a885a.js', 'utf8');
assert.ok(bundle.includes('Se.on("keybindAction",e=>{q3.execute(e)})'));
assert.ok(bundle.includes('Se.on("hud_action",e=>{q3.execute(e.action,e.data)})'));
for (const text of ['Rodada ${t}/24', 'PR ${r}', 'pausa tática', 'está plantando a bomba',
  'está desarmando a bomba', 'bônus de\\nderrota', 'dinheiro da\\nequipe', 'venceu a rodada',
  'destaque da rodada', 'abates', 'mortes', 'dano', 'decisivo']) assert.ok(bundle.includes(text), text);
const keys = JSON.parse(fs.readFileSync('hud/keybinds.json'));
for (const { action } of keys) assert.equal(listeners[action]?.length, 1, action);
const panel = JSON.parse(fs.readFileSync('hud/panel.json'));
for (const section of panel) for (const input of section.inputs) {
  if (input.type === 'action') {
    assert.ok(input.name === 'advertising_state' || listeners[input.name], input.name);
    if (input.name === 'mixes_controls') for (const value of input.values) assert.ok(listeners[value.name]);
  }
}
const css = fs.readFileSync('hud/assets/mixes-custom.css', 'utf8');
assert.ok(css.includes('html.mixes-hud-hidden body * { visibility: hidden !important; }'));
console.log('PASS: shortcuts and panel wiring, show/hide state, logo, colors, config, sponsors and PT-BR labels.');
