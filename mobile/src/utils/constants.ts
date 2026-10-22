import {SUPABASE_URL as ENV_URL, SUPABASE_ANON_KEY as ENV_KEY} from '@env';

export const SUPABASE_URL = (ENV_URL || '').trim().replace(/\/+$/, '');
export const SUPABASE_ANON_KEY = (ENV_KEY || '').trim();

export const LIVE_STATUSES = [
  'UNDER_REVIEW',
  'RESTACKING',
  'PICKLE_OUT',
  'GAGAL_TRIAL',
  'DISPOSED',
  'IN_EXECUTION',
] as const;

export const STATUSES = [
  {id: 'UNDER_REVIEW', label: 'Under review', zone: 'Rak merah'},
  {id: 'RESTACKING', label: 'Restacking', zone: 'Rak merah'},
  {id: 'PICKLE_OUT', label: 'Pickle out', zone: 'Rak merah'},
  {id: 'DISPOSED', label: 'Siap pakai', zone: 'Area disposisi'},
  {id: 'IN_EXECUTION', label: 'Sedang dipakai', zone: 'Mesin'},
  {id: 'GAGAL_TRIAL', label: 'Gagal trial', zone: 'Rak merah'},
  {id: 'CONSUMED', label: 'Habis', zone: 'Selesai'},
  {id: 'CLEANER', label: 'Cleaner', zone: 'Cleaner'},
  {id: 'SCRAP', label: 'Scrap', zone: 'Scrap'},
] as const;

export const ACTIONS = [
  {id: 'RESTACK', label: 'Restacking', hint: 'Susun ulang di rak'},
  {id: 'PICKLE_OUT', label: 'Pickle out', hint: 'Keluarkan lumpy / pisah'},
  {id: 'USE_AS_IS', label: 'Pakai langsung', hint: 'Pakai di mesin tanpa giling ulang'},
  {id: 'MILL_THEN_USE', label: 'Giling lalu pakai', hint: 'Giling Ext / 4 roll dulu'},
  {id: 'BLEND', label: 'Blend', hint: 'Campur dengan fresh / OK'},
  {id: 'WORKAWAY', label: 'Workaway / ODS', hint: 'Pakai sebagian kg per batch'},
  {id: 'CONGKEL', label: 'Congkel', hint: 'Congkel compound menempel'},
  {id: 'SEGREGATE', label: 'Segregasi', hint: 'Pisah yang bagus dan jelek'},
  {id: 'CUT', label: 'Potong-potong', hint: 'Potong biar bisa dipakai'},
  {id: 'REMILL', label: 'Remill', hint: 'Remill di mixing'},
  {id: 'CLEANER', label: 'Sebagai cleaner', hint: 'Dialihkan jadi cleaner'},
  {id: 'SCRAP', label: 'Scrap', hint: 'Tidak layak pakai'},
] as const;

export const CONDITIONS = [
  'OK',
  'Lumpy',
  'Lengket',
  'Format benang',
  'Campuran',
  'Expired / retest',
  'Tidak ada ID',
];

export const SOURCE_AREAS = [
  'BB1',
  'BB2',
  'BB3',
  'BB4',
  '10in Ext',
  '8in Ext',
  'Triplex',
  '3 Roll Cal',
  '4 Roll Cal',
  'UB Bead',
  'Hexa Bead',
] as const;

export const TARGET_AREAS = [
  '8in Ext',
  '10in Ext',
  'Triplex',
  '3 Roll Cal',
  '4 Roll Cal',
  'UB Bead',
  'Hexa Bead',
  'Mixing',
  'Cleaner',
  'Scrap',
];

export const LOCATIONS = [
  {code: 'NC', name: 'Non Conformance / Rak Merah', zone: 'NC'},
  {code: 'FIFO', name: 'Area FIFO', zone: 'FIFO'},
  {code: 'FIFO_JENDELA', name: 'FIFO Jendela', zone: 'FIFO'},
  {code: 'RACK_DEPAN', name: 'Rack depan laydown', zone: 'NC'},
  {code: 'LAYDOWN_BB2', name: 'Depan laydown BB2', zone: 'NC'},
  {code: 'SAMPING_BB2', name: 'Samping laydown BB2', zone: 'NC'},
  {code: 'WT_RELEASE', name: 'Area WT Release', zone: 'NC'},
  {code: 'EXT_8', name: '8 inch Extruder', zone: 'MESIN'},
  {code: 'TIMBANGAN_EXT', name: 'Timbangan Ext', zone: 'DISPO'},
  {code: 'DIE_SHOP', name: 'Rack Die Shop', zone: 'DISPO'},
  {code: 'RESTACK_AREA', name: 'Restacking Area', zone: 'NC'},
  {code: 'BB1', name: 'BB1', zone: 'MESIN'},
  {code: 'BB2', name: 'BB2', zone: 'MESIN'},
  {code: 'CALCUT', name: 'Calender / Calcut', zone: 'MESIN'},
  {code: 'CAL_3ROLL', name: '3 Roll Calender', zone: 'MESIN'},
  {code: 'PULANDIAN', name: 'Pulandian', zone: 'DISPO'},
  {code: 'SIAP_PAKAI', name: 'Siap pakai', zone: 'DISPO'},
  {code: 'RUBBER_CUTTER', name: 'Rubber cutter', zone: 'MESIN'},
];

export const EVENT_ACTIONS = [
  {id: 'DAFTAR', label: 'Daftar'},
  {id: 'EDIT', label: 'Edit'},
  {id: 'RESTACK', label: 'Restacking'},
  {id: 'PICKLE_OUT', label: 'Pickle out'},
  {id: 'DISPO', label: 'Disposisi'},
  {id: 'PRINT', label: 'Print label'},
  {id: 'VERIFY', label: 'Scan verify'},
  {id: 'PAKAI', label: 'Pakai'},
  {id: 'GAGAL_TRIAL', label: 'Gagal trial'},
  {id: 'SNAPSHOT', label: 'Snapshot papan'},
] as const;

export function eventLabel(id: string) {
  return EVENT_ACTIONS.find(e => e.id === id)?.label ?? id;
}

export function statusLabel(id: string) {
  return STATUSES.find(s => s.id === id)?.label ?? id;
}

export function actionLabel(id: string) {
  return ACTIONS.find(a => a.id === id)?.label ?? id;
}
