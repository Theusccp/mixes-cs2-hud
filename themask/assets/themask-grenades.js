// Small vector silhouettes stay readable in the broadcast inventory strip.
const icons={
  he:{label:'Granada HE',path:'<path d="M9 7h6l3 5v7l-3 3H9l-3-3v-7z"/><path d="M10 7V4h5l3 3M9 12h6M8 16h8M11 9v11M15 10v10"/>'},
  flash:{label:'Flashbang',path:'<path d="M9 7h7v15H9zM10 7V3h6l3 4M7 3H5v4h2M9 11h7M9 15h7M9 19h7"/>'},
  smoke:{label:'Granada de fumaça',path:'<path d="M8 9h9v13H8zM10 9V5h6l3 3M8 14h9M8 18h9M7 5C3 3 6 1 8 2M13 3c-2-2 1-3 3-2"/>'},
  fire:{label:'Molotov / incendiária',path:'<path d="M10 9V3h5v6l3 4v9H7v-9zM10 3l7 2M9 15h7M18 9c0-3 4-3 3-7 5 5 1 8-3 7z"/>'},
  decoy:{label:'Granada de distração',path:'<path d="M9 7h7v15H9zM11 7V3h6l3 4M11 11h3M11 15h3M11 19h3M6 12l-2 3 2 3M19 12l2 3-2 3"/>'}
};

export function grenadeBadge(type){
  const icon=icons[type];
  if(!icon)return '';
  return `<span class="nd ${type}" role="img" aria-label="${icon.label}" title="${icon.label}"><svg viewBox="0 0 26 26" aria-hidden="true">${icon.path}</svg></span>`;
}
