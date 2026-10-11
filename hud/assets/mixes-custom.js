// MixES extension for the compiled Echo 1.0.2 HUD.
// Keeps GSI, team enrichment and Socket.IO handlers from the original HUD.
export function installMixES({ actions, config }) {
  const html = document.documentElement;
  let visible = true;
  let logoVisible = true;
  let swapped = false;
  let settings = {};
  const validColor = value => typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value.trim());
  const darken = hex => "#" + hex.slice(1).match(/../g)
    .map(part => Math.round(parseInt(part, 16) * 0.45).toString(16).padStart(2, "0")).join("");
  const transparent = hex => {
    const rgb = hex.slice(1).match(/../g).map(part => parseInt(part, 16));
    return `rgba(${rgb.join(",")}, .5)`;
  };
  function applyColors() {
    const defaultT = swapped ? "#F51B95" : "#65D4F5";
    const defaultCT = swapped ? "#65D4F5" : "#F51B95";
    const tr = validColor(settings.t_color) ? settings.t_color.trim() : defaultT;
    const ct = validColor(settings.ct_color) ? settings.ct_color.trim() : defaultCT;
    for (const [side, color] of [["t", tr], ["ct", ct]]) {
      html.style.setProperty(`--color-${side}`, color);
      html.style.setProperty(`--color-${side}-variant`, darken(color));
      html.style.setProperty(`--color-${side}-op`, transparent(color));
    }
  }
  function setVisible(value) {
    visible = value;
    html.classList.toggle("mixes-hud-hidden", !visible);
  }
  const logo = document.createElement("img");
  logo.id = "mixes-event-logo";
  logo.src = new URL("./mixes-logo.png", import.meta.url).href;
  logo.alt = "MixES";
  logo.draggable = false;
  document.body.appendChild(logo);
  function applyLogo() {
    logo.hidden = !logoVisible || settings.hide_logo === true;
  }
  function applySettings(data) {
    settings = data?.mixes_settings || {};
    // Photos supplied by the operator are often bust portraits, whereas the
    // stock game models were styled at 200% height / 150% width by Echo.
    const photoScale = value => {
      const number = Number(value);
      return Number.isFinite(number) && number >= 70 && number <= 200 ? number : 100;
    };
    html.style.setProperty("--mixes-player-photo-scale", `${photoScale(settings.player_photo_scale)}%`);
    html.style.setProperty("--mixes-observed-photo-scale", `${photoScale(settings.observed_photo_scale)}%`);
    applyColors();
    applyLogo();
  }
  actions.on("toggleActive", () => setVisible(!visible));
  actions.on("showHud", () => setVisible(true));
  actions.on("hideHud", () => setVisible(false));
  actions.on("toggleMixESLogo", () => { logoVisible = !logoVisible; applyLogo(); });
  actions.on("mixes_controls", action => actions.execute(action));
  actions.on("mixes_palette", action => {
    swapped = action === "swap_palette";
    // Preset buttons override custom colors for this overlay until the next Save.
    settings = { ...settings, t_color: "", ct_color: "" };
    applyColors();
  });
  actions.on("advertising_state", action => {
    if (action === "advertising_white_toggle") {
      html.classList.toggle("mixes-sponsors-white");
    }
  });
  config.onChange(applySettings);
  applySettings(config.data);
}
