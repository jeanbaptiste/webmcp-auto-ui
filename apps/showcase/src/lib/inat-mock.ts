export const INAT_STATS = {
  total_observations: 148_320_441,
  research_grade: 89_204_330,
  species_count: 421_847,
  observers: 4_218_920,
  france_observations: 12_840_221,
  france_species: 58_420,
};

export const TOP_SPECIES = [
  { id: 47219, name: 'Apis mellifera',       common: 'Honey Bee',              count: 2_840_221, iconic: 'Insecta',  icon: '🐝' },
  { id: 13019, name: 'Hirundo rustica',       common: 'Barn Swallow',           count: 1_920_445, iconic: 'Aves',     icon: '🐦' },
  { id: 47158, name: 'Danaus plexippus',      common: 'Monarch Butterfly',      count: 1_840_112, iconic: 'Insecta',  icon: '🦋' },
  { id: 47978, name: 'Amanita muscaria',      common: 'Fly Agaric',             count: 1_204_330, iconic: 'Fungi',    icon: '🍄' },
  { id: 20978, name: 'Vulpes vulpes',         common: 'Red Fox',                count:   984_221, iconic: 'Mammalia', icon: '🦊' },
  { id: 81418, name: 'Quercus robur',         common: 'English Oak',            count:   840_119, iconic: 'Plantae',  icon: '🌳' },
  { id: 14999, name: 'Rana temporaria',       common: 'Common Frog',            count:   720_445, iconic: 'Amphibia', icon: '🐸' },
  { id: 61511, name: 'Lacerta viridis',       common: 'Western Green Lizard',   count:   612_008, iconic: 'Reptilia', icon: '🦎' },
];

export const TOP_OBSERVERS = [
  { login: 'forestier_bird', name: 'Claire Forestier', obs: 48_420, species: 4_218, avatar: 'CF', badge: 'Top France',  color: '#7c6dfa' },
  { login: 'biowatch_eu',    name: 'Jean-Claude M.',   obs: 42_110, species: 3_890, avatar: 'JM', badge: 'Expert Aves', color: '#3ecfb2' },
  { login: 'wildlens',       name: 'Sophie Bernard',   obs: 38_904, species: 3_201, avatar: 'SB', badge: 'Botaniste',   color: '#f0a050' },
  { login: 'botanist_42',    name: 'Pierre Legrand',   obs: 34_221, species: 2_940, avatar: 'PL', badge: 'Mycologue',   color: '#fa6d7c' },
  { login: 'ornitholog',     name: 'Claire Morin',     obs: 29_108, species: 2_780, avatar: 'CM', badge: 'Ornitho',     color: '#a855f7' },
  { login: 'mycoexplorer',   name: 'Luca Rossi',       obs: 26_440, species: 2_340, avatar: 'LR', badge: 'Fungi',       color: '#22c55e' },
];

export const MONTHLY_OBS = [
  ['Jan', 3_240], ['Fév', 3_890], ['Mar', 6_120], ['Avr', 9_840],
  ['Mai', 14_220], ['Juin', 16_880], ['Jul', 18_420], ['Aoû', 17_990],
  ['Sep', 13_440], ['Oct', 9_820], ['Nov', 5_440], ['Déc', 3_980],
] as [string, number][];

export const ICONIC_TAXA = [
  { id: 'pl', label: 'Plantae',    seats: 48, color: '#22c55e' },
  { id: 'av', label: 'Aves',       seats: 32, color: '#3b82f6' },
  { id: 'in', label: 'Insecta',    seats: 28, color: '#f59e0b' },
  { id: 'fu', label: 'Fungi',      seats: 12, color: '#a855f7' },
  { id: 'ma', label: 'Mammalia',   seats: 8,  color: '#ef4444' },
  { id: 're', label: 'Reptilia',   seats: 5,  color: '#84cc16' },
  { id: 'am', label: 'Amphibia',   seats: 4,  color: '#06b6d4' },
  { id: 'fi', label: 'Poissons',   seats: 3,  color: '#6366f1' },
];

export const MULTI_SERIES = {
  labels: ['Jan','Fév','Mar','Avr','Mai','Juin','Jul','Aoû','Sep','Oct','Nov','Déc'],
  datasets: [
    { label: 'Aves',    values: [2.1,2.4,3.8,4.8,6.1,5.9,6.2,5.8,4.2,3.9,2.8,2.0], color: '#3b82f6' },
    { label: 'Insecta', values: [0.4,0.6,1.8,3.2,5.1,5.6,5.8,5.2,3.1,2.1,0.8,0.3], color: '#f59e0b' },
    { label: 'Plantae', values: [1.8,2.0,3.4,5.1,4.8,4.3,4.2,4.0,3.2,2.8,2.0,1.7], color: '#22c55e' },
  ],
};

export const RECENT_OBS = [
  { taxon: 'Parus major',       common: 'Great Tit',           place: 'Paris',     date: '2026-04-05', quality: 'research' },
  { taxon: 'Bombus lapidarius', common: 'Red-tailed Bumblebee',place: 'Lyon',      date: '2026-04-05', quality: 'research' },
  { taxon: 'Primula veris',     common: 'Cowslip',             place: 'Alsace',    date: '2026-04-04', quality: 'needs_id' },
  { taxon: 'Meles meles',       common: 'Badger',              place: 'Bretagne',  date: '2026-04-04', quality: 'research' },
  { taxon: 'Lacerta agilis',    common: 'Sand Lizard',         place: 'Provence',  date: '2026-04-03', quality: 'research' },
];

export const TAXONOMY_TREE = {
  kingdom: 'Animalia', phylum: 'Chordata', class: 'Aves',
  order: 'Passeriformes', family: 'Paridae', genus: 'Parus',
  species: 'Parus major', common_name: 'Great Tit',
  inat_id: 14916, observations_count: 4_218_221,
  conservation_status: 'LC',
};

export const MIGRATION_FLOWS = {
  nodes: [
    { id: 'af',   label: 'Afrique',      color: '#f59e0b' },
    { id: 'eu_s', label: 'Europe Sud',   color: '#3b82f6' },
    { id: 'eu_n', label: 'Europe Nord',  color: '#6366f1' },
    { id: 'as',   label: 'Asie C.',      color: '#22c55e' },
    { id: 'fr',   label: 'France',       color: '#ef4444' },
  ],
  links: [
    { source: 'af',   target: 'eu_s', value: 4200 },
    { source: 'af',   target: 'fr',   value: 1840 },
    { source: 'eu_s', target: 'eu_n', value: 2100 },
    { source: 'as',   target: 'eu_n', value: 890  },
    { source: 'fr',   target: 'eu_n', value: 620  },
  ],
};

export const ALERTS = [
  { title: 'Espèce envahissante', message: 'Vespa velutina — 2 840 obs en avril, +34% vs 2025.', level: 'warn' as const },
  { title: 'BioBlitz France 2026', message: 'Événement 12-14 avril — 8 200 naturalistes.', level: 'info' as const },
];

export const OBS_TIMELINE = [
  { date: '2024',      title: '120M observations',   description: 'Cap mondial franchi',             status: 'done'    as const },
  { date: 'Jan 2025', title: 'iNat 15 ans',         description: 'Lancé en 2010 à Berkeley',        status: 'done'    as const },
  { date: 'Mar 2026', title: '148M observations',    description: 'Record science participative',    status: 'active'  as const },
  { date: 'Fin 2026', title: '200M prévus',          description: 'Objectif communauté mondiale',   status: 'pending' as const },
];

export const LOG_ENTRIES = [
  { timestamp: '09:42:18', level: 'info'  as const, message: 'GET /v1/observations?taxon_id=14916 → 200 (142ms)', source: 'inat-api' },
  { timestamp: '09:42:19', level: 'info'  as const, message: 'GET /v1/taxa/14916 → 200 (98ms)', source: 'inat-api' },
  { timestamp: '09:42:20', level: 'warn'  as const, message: 'Rate limit: 58 req/min (max: 60)', source: 'rate-limiter' },
  { timestamp: '09:42:21', level: 'info'  as const, message: '5 new research-grade observations indexed', source: 'indexer' },
  { timestamp: '09:42:22', level: 'debug' as const, message: 'Cache hit: species_counts France (TTL 300s)', source: 'cache' },
  { timestamp: '09:42:23', level: 'error' as const, message: 'Photo upload failed: size limit exceeded', source: 'media' },
];

export const GRID_DATA = {
  columns: [
    { key: 'taxon', label: 'Taxon' },
    { key: 'jan', label: 'Jan' },
    { key: 'avr', label: 'Avr' },
    { key: 'jul', label: 'Jul' },
    { key: 'oct', label: 'Oct' },
  ],
  rows: [
    ['Aves',     '2.1M', '4.8M', '6.2M', '3.9M'],
    ['Insecta',  '0.4M', '3.2M', '5.8M', '2.1M'],
    ['Plantae',  '1.8M', '5.1M', '4.2M', '2.8M'],
    ['Fungi',    '0.2M', '0.8M', '1.2M', '2.4M'],
    ['Mammalia', '0.6M', '1.1M', '1.4M', '0.9M'],
  ] as (string)[][],
  highlights: [
    { row: 0, col: 3, color: '#3b82f633' },
    { row: 2, col: 2, color: '#22c55e33' },
  ],
};

export const PROFILE_OBSERVER = {
  name: 'Claire Forestier',
  subtitle: 'Top observatrice France · depuis 2014',
  badge: { text: '#1 France', variant: 'success' as const },
  fields: [
    { label: 'Login',        value: 'forestier_bird' },
    { label: 'Localisation', value: 'Strasbourg, Alsace' },
    { label: 'Membre depuis', value: '2014' },
    { label: 'Spécialité',  value: 'Ornithologie, Botanique' },
  ],
  stats: [
    { label: 'Observations',    value: '48 420' },
    { label: 'Espèces',         value: '4 218' },
    { label: 'Identifications', value: '12 840' },
  ],
};

export const GALLERY_IMAGES = [
  { src: 'https://picsum.photos/seed/parus/400/300',   alt: 'Parus major',       caption: 'Mésange charbonnière · Paris 2026'   },
  { src: 'https://picsum.photos/seed/bombus/400/300',  alt: 'Bombus lapidarius', caption: 'Bourdon des pierres · Lyon 2026'       },
  { src: 'https://picsum.photos/seed/primula/400/300', alt: 'Primula veris',     caption: 'Coucou des prés · Alsace 2026'         },
  { src: 'https://picsum.photos/seed/vulpes/400/300',  alt: 'Vulpes vulpes',     caption: 'Renard roux · Bretagne 2026'           },
  { src: 'https://picsum.photos/seed/quercus/400/300', alt: 'Quercus robur',     caption: 'Chêne pédonculé · Normandie 2026'      },
  { src: 'https://picsum.photos/seed/amanita/400/300', alt: 'Amanita muscaria',  caption: 'Amanite tue-mouches · Vosges 2026'     },
];

export function speciesToProfile(row: Record<string, unknown>) {
  return {
    name: String(row.common ?? row.name ?? ''),
    subtitle: String(row.name ?? ''),
    badge: { text: String(row.iconic ?? 'Animalia'), variant: 'default' as const },
    fields: [
      { label: 'Taxon', value: String(row.name ?? '') },
      { label: 'Iconic', value: String(row.iconic ?? '') },
      { label: 'Observations', value: String(row.count ?? 0) },
    ],
    stats: [
      { label: 'Observations', value: String(row.count ?? 0) },
    ],
  };
}

export function observerToProfile(person: Record<string, unknown>) {
  return {
    name: String(person.name ?? ''),
    subtitle: String(person.subtitle ?? ''),
    fields: [
      { label: 'Observations', value: String(person.obs ?? person.count ?? '') },
    ],
    stats: [
      { label: 'Obs', value: String(person.obs ?? '') },
      { label: 'Espèces', value: String(person.species ?? '') },
    ],
  };
}

export function filterSpeciesByGroup(group: Record<string, unknown>, allSpecies: typeof TOP_SPECIES) {
  const groupLabel = String(group.label ?? '');
  return {
    title: `Espèces — ${groupLabel}`,
    striped: true,
    rows: allSpecies.filter(s => s.iconic === groupLabel),
    columns: [
      { key: 'icon', label: '' },
      { key: 'common', label: 'Nom' },
      { key: 'name', label: 'Espèce' },
      { key: 'count', label: 'Obs', align: 'right' as const, type: 'number' as const },
    ],
  };
}

export const CAROUSEL_SLIDES = [
  {
    src: 'https://picsum.photos/seed/inat1/800/400',
    title: 'iNaturalist — 148 millions d\'observations',
    subtitle: 'Science participative mondiale',
    content: 'En 2026, iNaturalist dépasse 148 millions d\'observations validées, couvrant 421 847 espèces sur tous les continents.',
  },
  {
    src: 'https://picsum.photos/seed/inat2/800/400',
    title: 'Biodiversité française en plein essor',
    subtitle: '12,8 millions d\'obs en France',
    content: 'La France compte parmi les 5 pays les plus actifs sur iNaturalist. Aves et Plantae dominent avec 80% des observations.',
  },
  {
    src: 'https://picsum.photos/seed/inat3/800/400',
    title: 'BioBlitz France 2026',
    subtitle: '8 200 naturalistes · 12-14 avril',
    content: 'L\'événement annuel mobilise des milliers de citoyens-scientifiques pour documenter la biodiversité locale en 72 heures.',
  },
  {
    src: 'https://picsum.photos/seed/inat4/800/400',
    title: 'Intelligence artificielle et identification',
    subtitle: 'Précision > 92% sur les espèces communes',
    content: 'Le modèle de vision d\'iNaturalist identifie automatiquement les taxons à partir de photos, accélérant la validation research-grade.',
  },
];
