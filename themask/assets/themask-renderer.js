import { safeImage } from './themask-state.js';
import { createRadar } from './themask-radar.js';
export function createRenderer(options = {}) {
  const radar=createRadar();
  let lastState = null;
  const failedImages = new Set();
  const $ = (s, el = document) => el.querySelector(s);
  const stage = $('#stage'), dbg = $('#dbg');
  const DEMO = options.demo === true, DEBUG = options.debug === true;
  const SHIELD = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l8 3v6c0 5-3.4 9.4-8 11-4.6-1.6-8-6-8-11V5z"/></svg>';
  const BOMB_S = 40;

  function fit() { stage.style.transform = `scale(${Math.min(innerWidth / 1920, innerHeight / 1080)})`; }
  addEventListener('resize', fit); fit();
  if (DEBUG) dbg.style.display = 'block';

  const txt = (el, v) => { v = v == null ? '' : String(v); if (el.textContent !== v) el.textContent = v; };
  const html = (el, v) => { if (el.innerHTML !== v) el.innerHTML = v; };
  const side = (el, s) => { el.classList.toggle('CT', s === 'CT'); el.classList.toggle('T', s === 'T'); };
  const src = (img, url) => {
    const fallback = img.closest('.pc-av,.ob-av') ? './assets/themask-logo-256.webp' : '';
    const safe = safeImage(url);
    const next = (failedImages.has(safe) ? '' : safe) || fallback;
    img.onerror = () => { failedImages.add(next); img.onerror = null; if (fallback) img.src = fallback; else img.style.display = 'none'; };
    if (next && img.getAttribute('src') !== next) img.src = next;
    img.style.display = next ? '' : 'none';
  };
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const mmss = (s) => { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  const short = (t) => (t.tag || t.name || '').slice(0, 5).toUpperCase();

  let endAt = null, phase = '', actTotal = 0, actEndAt = null, actPlanting = false;
  (function clock() {
    if (endAt != null) {
      const left = (endAt - performance.now()) / 1000;
      txt($('#time'), phase === 'bomb' || phase === 'defuse' ? Math.max(0, left).toFixed(left < 10 ? 1 : 0) : mmss(left));
      if (actTotal && actEndAt != null) { const remaining = (actEndAt-performance.now())/1000; const ratio = remaining/actTotal; $('#actBar').style.width = Math.max(0, Math.min(100, (actPlanting ? 1-ratio : ratio)*100))+'%'; }
    }
    requestAnimationFrame(clock);
  })();

  function card(box, p) {
    let el = [...box.children].find(child => child.dataset.id === String(p.id));
    if (!el) {
      el = document.createElement('div'); el.className = 'pc'; el.dataset.id = String(p.id);
      el.innerHTML = '<div class="pc-box"></div><div class="pc-av hex"><img class="hex" alt=""></div><div class="pc-rk"></div>' +
        '<span class="pc-slot hex"></span><span class="pc-tag"></span>' +
        '<div class="pc-row1"><span class="pc-name"></span><span class="pc-hp">' + SHIELD + '<b class="tabnum"></b></span></div>' +
        '<div class="pc-row2"><span class="k tabnum"></span><span class="d tabnum"></span><span class="pc-money tabnum"></span></div>' +
        '<div class="pc-strip"><div class="fill"></div><div class="in"><span class="gun"></span><span class="nds"></span></div></div>' +
        '<div class="pc-dead"><b></b><span></span></div>';
    }
    return el;
  }

  function team(box, list) {
    const keep = new Set(list.map((p) => p.id));
    [...box.children].forEach((c) => { if (!keep.has(c.dataset.id)) c.remove(); });
    list.forEach((p, i) => {
      const el = card(box, p);
      if (box.children[i] !== el) box.insertBefore(el, box.children[i] || null);
      side(el, p.side);
      el.classList.toggle('dead', p.hp <= 0); el.classList.toggle('obs', !!p.observed);
      txt($('.pc-slot', el), p.slot == null ? '' : p.slot);
      src($('.pc-av img', el), p.avatar);
      txt($('.pc-name', el), p.name);
      $('.pc-hp svg', el).style.visibility = p.armor > 0 ? '' : 'hidden';
      txt($('.pc-hp b', el), p.hp);
      txt($('.k', el), p.kills); txt($('.d', el), p.deaths); txt($('.pc-money', el), '$' + p.money);
      const fill = $('.fill', el); fill.style.width = p.hp + '%'; fill.classList.toggle('low', p.hp > 0 && p.hp <= 25);
      txt($('.gun', el), p.weapon || p.secondary || 'Faca');
      html($('.nds', el), p.nades.map((n) => `<i class="nd ${n}"></i>`).join(''));
      const tag = $('.pc-tag', el);
      tag.className = 'pc-tag' + (p.bomb ? ' bomb' : p.kit ? ' kit' : ''); txt(tag, p.bomb ? 'C4' : p.kit ? 'KIT' : '');
      html($('.pc-rk', el), '<i></i>'.repeat(Math.min(p.round_kills || 0, 5)));
      txt($('.pc-dead b', el), p.name);
      txt($('.pc-dead span', el), `${p.kills}K · ${p.deaths}D · $${p.money}`);
    });
  }

  function observed(o) {
    const box = $('#obs');
    if (!o || o.hp <= 0) { box.hidden = true; return; }
    box.hidden = false; side(box, o.side);
    src($('.ob-av img', box), o.avatar);
    txt($('#obName'), o.name); txt($('#obHp'), o.hp);
    $('#obLine').style.width = o.hp + '%';
    html($('#obAmmo'), o.ammo ? `${o.ammo[0]}<small> / ${o.ammo[1]}</small>` : '');
    txt($('#obGun'), o.active || o.weapon);
    box.querySelectorAll('[data-k]').forEach((b) => txt(b, o[b.dataset.k]));
  }

  function series(s) {
    const parts = ['<img src="./assets/themask-logo-128.webp" alt="">'];
    const ser = s.series;
    if (ser && ser.best_of > 1) {
      parts.push(`<span class="bo">Melhor de ${ser.best_of}</span>`);
      ser.maps.forEach((m) => {
        const cur = m.status === 'live' || (!m.winner && m.name === s.map);
        parts.push(`<span class="mp${cur ? ' cur' : m.winner ? ' done' : ''}">${esc(m.name)}${m.winner ? `<b>${esc(m.a)}-${esc(m.b)}</b>` : ''}</span>`);
      });
    } else parts.push(`<span class="bo">${esc(s.champ || 'The Mask Cup')}</span><span class="mp cur">${esc(s.map)}</span>`);
    html($('#series'), parts.join(''));
  }

  function pips(el, ser, key) {
    let h = '';
    if (ser && ser.best_of > 1) { const need = Math.floor(ser.best_of / 2) + 1; for (let i = 0; i < need; i++) h += `<i class="${i < ser[key] ? 'on' : ''}"></i>`; }
    html(el, h);
  }

  function logo(box, t) {
    side(box, t.side);
    const def = !t.logo || /default-team/.test(t.logo);
    const failed = failedImages.has(safeImage(t.logo));
    src($('img', box), def ? '' : t.logo); txt($('span', box), def || failed ? short(t) : '');
    if (!def) $('img', box).onerror = () => { failedImages.add(safeImage(t.logo)); $('img', box).style.display = 'none'; txt($('span', box), short(t)); };
  }

  function render(s) {
    lastState = s;
    stage.classList.toggle('on', !!s.ok);
    txt(dbg, !s.ok ? 'HUD: ' + (s.reason || 'sem sinal') : DEMO ? 'HUD: demonstração' : 'HUD: ao vivo');
    if (!s.ok) return;
    const L = s.left, R = s.right;
    radar.render(s);
    logo($('#lgL'), L); logo($('#lgR'), R);
    side($('#scL'), L.side); side($('#scR'), R.side);
    txt($('#scL b'), L.score); txt($('#scR b'), R.score);
    pips($('#scL .pips'), s.series, 'a'); pips($('#scR .pips'), s.series, 'b');
    txt($('#nmL'), L.name); txt($('#nmR'), R.name);

    phase = s.phase;
    const mid = $('#mid');
    mid.classList.toggle('bomb', s.phase === 'bomb');
    mid.classList.toggle('pause', /timeout|paused/.test(s.phase));
    const lbl = { freezetime: 'Compra', warmup: 'Aquecimento', over: 'Fim do round', timeout_ct: 'Pausa técnica', timeout_t: 'Pausa técnica',
                  paused: 'Pausa', gameover: 'Fim de mapa', bomb: 'Bomba plantada', defuse: 'Desarmando' }[s.phase];
    txt($('#rnd'), lbl || (s.round <= 24 ? `Rodada ${s.round}/24` : `Prorrogação · ${s.round}`));
    if (s.time_left != null) endAt = performance.now() + s.time_left * 1000; else { endAt = null; txt($('#time'), ''); }
    $('#sb').classList.toggle('has-bomb', s.phase === 'bomb');

    const act = $('#act');
    if (s.phase === 'bomb' || s.phase === 'defuse' || s.bomb === 'planting') {
      const def = s.phase === 'defuse', planting = s.bomb === 'planting';
      actTotal = s.action_total || (def ? (s.time_left > 5.5 ? 10 : 5) : planting ? 3 : BOMB_S);
      side(act, def ? 'CT' : 'T');
      actPlanting = planting; actEndAt = performance.now() + (s.action_left ?? s.time_left ?? actTotal) * 1000;
      txt($('#actTxt'), planting ? `${s.bomb_player || 'Jogador'} está plantando a bomba` : def ? (s.bomb_player ? `${s.bomb_player} está desarmando` : 'Desarmando a bomba')
                            : (s.bomb_player ? `${s.bomb_player} plantou a bomba` : 'Bomba plantada'));
      act.classList.add('on');
    } else { act.classList.remove('on'); actTotal = 0; actEndAt = null; }

    const win = $('#win');
    if (s.phase === 'over' && s.win_team) {
      const t = L.side === s.win_team ? L : R;
      side(win, s.win_team); src($('img', win), /default-team/.test(t.logo || '') ? '' : t.logo);
      txt($('b', win), t.name); win.classList.add('show');
    } else win.classList.remove('show');

    side($('#alL'), L.side); side($('#alR'), R.side);
    txt($('#alL'), L.players.filter((p) => p.hp > 0).length); txt($('#alR'), R.players.filter((p) => p.hp > 0).length);
    series(s);
    team($('#tL'), L.players); team($('#tR'), R.players);
    observed(s.observed);
  }


  return { render, getState: () => lastState };
}
