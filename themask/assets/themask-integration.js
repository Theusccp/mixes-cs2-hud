import { createRenderer } from './themask-renderer.js';
import { normalizeJTs, safeImage } from './themask-state.js';

export function installTheMask({game, actions, config, api, socket, apiBase}) {
  const renderer = createRenderer({debug:new URLSearchParams(location.search).get('debug') === '1'});
  const stage = document.querySelector('#stage');
  let latest = null, match = null, settings = {}, visible = true, logoVisible = true;
  let bombPlayer = '', roundKey = '', loadVersion = 0, loadedMap = '';
  const rerender = () => {
    if (!latest) return;
    const state = normalizeJTs(latest, match, settings, apiBase);
    const key = `${latest.map?.name}:${latest.map?.round}`;
    if (key !== roundKey) { roundKey = key; bombPlayer = ''; }
    if (state.bomb_player && state.bomb !== 'defusing') bombPlayer = state.bomb_player;
    if (state.phase === 'bomb' && !state.bomb_player) state.bomb_player = bombPlayer;
    renderer.render(state);
    stage.hidden = !visible;
    document.querySelector('#hud-credit').hidden = !visible;
    document.documentElement.classList.toggle('hide-themask-logo', !logoVisible || settings.hide_logo === true);
  };
  function apply(data = {}) {
    settings = data.themask_settings || {};
    for (const [key, css] of [['ct_color','--ct'],['t_color','--t']]) {
      const color = /^#[\da-f]{6}$/i.test(String(settings[key] || '').trim()) ? settings[key].trim()
        : key === 'ct_color' ? '#2B93E0' : '#E4AE35';
      document.documentElement.style.setProperty(css, color);
      const dark = '#' + color.slice(1).match(/../g).map(n => Math.round(parseInt(n,16)*.54).toString(16).padStart(2,'0')).join('');
      document.documentElement.style.setProperty(css+'-2', dark);
    }
    const scale = Number(settings.photo_scale);
    document.documentElement.style.setProperty('--photo-scale', String((scale >= 70 && scale <= 160 ? scale : 100)/100));
    document.documentElement.classList.toggle('contain-portraits', settings.contain_photos === true);
    document.documentElement.classList.toggle('hide-alive', settings.hide_alive === true);
    document.documentElement.classList.toggle('hide-radar', settings.hide_radar === true);
    const radarSize=Number(settings.radar_size);
    document.documentElement.style.setProperty('--radar-size',`${radarSize>=240&&radarSize<=420?radarSize:320}px`);
    rerender();
  }
  const show = value => { visible = value; stage.hidden = !visible; document.querySelector('#hud-credit').hidden = !visible; };
  actions.on('toggleActive', () => show(!visible));
  actions.on('showHud', () => show(true));
  actions.on('hideHud', () => show(false));
  actions.on('toggleTheMaskLogo', () => {logoVisible = !logoVisible; rerender();});
  actions.on('themask_controls', action => actions.execute(action));
  config.onChange(apply);
  apply(config.data);
  game.on('data', data => {
    latest = data;
    if (data.map?.name !== loadedMap) { loadedMap = data.map?.name || ''; loadMatch(); }
    rerender();
  });
  socket.on('disconnect', () => renderer.render({ok:false,reason:'aguardando conexão com o JTs'}));

  // The same JTs APIs and side-orientation rules used by the Echo HUD.
  async function loadMatch() {
    const version = ++loadVersion;
    try {
      const current = await api.match.getCurrent();
      const loaded = await Promise.all(['left','right'].map(async side => {
        const id = current?.[side]?.id;
        if (!id) return null;
        const t = await api.teams.getOne(id);
        return {id:t._id, name:t.name, country:t.country,
          logo:safeImage(/^https?:|^data:/i.test(t.logo || '') ? t.logo : `${apiBase}api/teams/logo/${encodeURIComponent(t._id)}`, apiBase), map_score:current[side].wins, extra:t.extra};
      }));
      if (version !== loadVersion) return;
      match = current;
      const map = latest?.map?.name?.split('/').pop();
      const reverse = current?.vetos?.find(v => v.mapName === map)?.reverseSide === true;
      game.teams.left = loaded[reverse ? 1 : 0];
      game.teams.right = loaded[reverse ? 0 : 1];
      rerender();
    } catch (error) {
      if (version !== loadVersion) return;
      match = null; game.teams.left = null; game.teams.right = null;
      console.warn('TheMask: cadastro de times indisponível; usando dados da partida.', error.message);
    }
  }
  socket.on('match', loadMatch);
  loadMatch();
}
