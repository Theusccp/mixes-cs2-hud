const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const clamp = (value, low, high) => Math.max(low, Math.min(high, finite(value)));

export function safeImage(value, base) {
  if (typeof value !== 'string' || !value.trim()) return '';
  if (/^data:image\/(png|jpeg|webp|gif);base64,[a-z0-9+/=\s]+$/i.test(value)) return value;
  try {
    const fallback = typeof location !== 'undefined' ? location.href : 'http://localhost/';
    const parsed = new URL(value, base || fallback);
    return ['http:', 'https:'].includes(parsed.protocol) ? parsed.href : '';
  } catch { return ''; }
}

export function weaponName(value) {
  const raw = String(value || '').replace(/^weapon_/, '');
  const names = { m4a1_silencer: 'M4A1-S', m4a1: 'M4A4', usp_silencer: 'USP-S',
    galilar: 'Galil AR', hkp2000: 'P2000', glock: 'Glock-18', elite: 'Dual Berettas',
    hegrenade: 'HE', smokegrenade: 'Smoke', flashbang: 'Flash', incgrenade: 'Incendiária',
    molotov: 'Molotov', c4: 'C4', knife: 'Faca', knife_t: 'Faca', taser: 'Zeus' };
  return names[raw] || (/knife|bayonet/.test(raw) ? 'Faca' : raw.replace(/_/g, ' ').toUpperCase());
}

export function normalizeJTs(data, match = null, settings = {}, apiBase) {
  if (!data?.map || !Array.isArray(data.players)) return { ok: false, reason: 'aguardando dados do CS2' };
  const teams = [data.map.team_ct, data.map.team_t].filter(Boolean);
  if (teams.length !== 2) return { ok: false, reason: 'aguardando os dois times' };
  const left = teams.find(t => t.orientation === 'left') || teams[0];
  const right = teams.find(t => t !== left);
  const observedId = String(data.player?.steamid || '');
  const player = p => {
    const weapons = Array.isArray(p.weapons) ? p.weapons : Object.values(p.weapons || {});
    const active = weapons.find(w => w.state === 'active');
    const primary = weapons.find(w => /Rifle|SniperRifle|Submachine Gun|Shotgun|Machine Gun/.test(w.type));
    const pistol = weapons.find(w => w.type === 'Pistol');
    const nades = [];
    for (const w of weapons) {
      const type = ({weapon_hegrenade:'he',weapon_smokegrenade:'smoke',weapon_flashbang:'flash',
        weapon_molotov:'fire',weapon_incgrenade:'fire',weapon_decoy:'decoy'})[w.name];
      if (type) for (let i = 0; i < clamp(w.ammo_reserve ?? 1, 0, 2); i++) nades.push(type);
    }
    return {
      id: String(p.steamid), name: String(p.name || p.defaultName || 'Jogador'),
      avatar: safeImage(p.avatar, apiBase), slot: finite(p.observer_slot, 0), side: p.team?.side || 'CT',
      hp: clamp(p.state?.health, 0, 100), armor: clamp(p.state?.armor, 0, 100),
      kit: Boolean(p.state?.defusekit), helmet: Boolean(p.state?.helmet),
      money: Math.max(0, finite(p.state?.money)), kills: finite(p.stats?.kills),
      deaths: finite(p.stats?.deaths), assists: finite(p.stats?.assists),
      round_kills: clamp(p.state?.round_kills, 0, 5), round_dmg: finite(p.state?.round_totaldmg),
      weapon: weaponName((primary || active)?.name), secondary: weaponName(pistol?.name),
      active: weaponName(active?.name), ammo: active?.ammo_clip != null
        ? [finite(active.ammo_clip), finite(active.ammo_reserve)] : null,
      nades, bomb: weapons.some(w => w.type === 'C4' || w.name === 'weapon_c4'),
      observed: String(p.steamid) === observedId
    };
  };
  const all = data.players.map(player);
  const team = t => ({side:t.side, name:String(t.name || t.side), tag:t.shortName || '',
    score:finite(t.score), logo:safeImage(t.logo, apiBase),
    players:all.filter(p => p.side === t.side).sort((a,b) => (a.slot || 10) - (b.slot || 10))});
  let phase = data.phase_countdowns?.phase || data.round?.phase || 'live';
  if (data.map.phase === 'gameover') phase = 'gameover';
  else if (data.bomb?.state === 'defusing') phase = 'defuse';
  else if (data.bomb?.state === 'planted' && phase !== 'over') phase = 'bomb';
  const time = phase === 'defuse' ? data.bomb?.countdown : data.phase_countdowns?.phase_ends_in;
  const maps = (match?.vetos || []).filter(v => v.type !== 'ban');
  const requestedBestOf = finite(settings.best_of, 1);
  const bestOf = maps.length > 1 ? maps.length : [1,3,5].includes(requestedBestOf) ? requestedBestOf : 1;
  return {
    ok: true, champ: String(settings.championship || 'THE MASK CUP'),
    map:String(data.map.name || '').split('/').pop().replace(/^de_/, '').toUpperCase(),
    round:Math.max(1, finite(data.map.round) + (data.round?.phase === 'over' ? 0 : 1)),
    phase, time_left:time == null ? null : Math.max(0, finite(time)),
    bomb:data.bomb?.state || '', bomb_player:data.bomb?.player?.name || '',
    action_left: data.bomb?.countdown == null ? null : Math.max(0, finite(data.bomb.countdown)),
    action_total:phase === 'defuse' ? (data.bomb?.player?.state?.defusekit ? 5 : 10)
      : data.bomb?.state === 'planting' ? 3 : 40,
    win_team:data.round?.win_team || '', left:team(left), right:team(right),
    observed:all.find(p => p.observed) || null,
    series:{best_of:bestOf, maps:maps.map(v => ({name:String(v.mapName || '').replace(/^de_/, '').toUpperCase(),
      status:v.mapEnd ? 'done' : String(v.mapName) === String(data.map.name) ? 'live' : '',
      winner:v.winner || '', a:Object.values(v.score || {})[0] ?? 0, b:Object.values(v.score || {})[1] ?? 0})),
      a:finite(left.matches_won_this_series), b:finite(right.matches_won_this_series)}
  };
}
