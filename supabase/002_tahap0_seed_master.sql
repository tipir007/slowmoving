-- Compound Slow Moving — seed master Tahap 0
-- Jalankan SETELAH 001_tahap0_schema.sql
-- PIN semua user demo: 1234 (ganti nanti)

insert into public.location (id, code, name, zone) values
  ('loc_nc', 'NC', 'Non Conformance / Rak Merah', 'NC'),
  ('loc_fifo', 'FIFO', 'Area FIFO', 'FIFO'),
  ('loc_fifo_jendela', 'FIFO_JENDELA', 'FIFO Jendela', 'FIFO'),
  ('loc_rack_depan', 'RACK_DEPAN', 'Rack depan laydown', 'NC'),
  ('loc_laydown_bb2', 'LAYDOWN_BB2', 'Depan laydown BB2', 'NC'),
  ('loc_samping_bb2', 'SAMPING_BB2', 'Samping laydown BB2', 'NC'),
  ('loc_wt_release', 'WT_RELEASE', 'Area WT Release', 'NC'),
  ('loc_ext_8', 'EXT_8', '8 inch Extruder', 'MESIN'),
  ('loc_timbangan_ext', 'TIMBANGAN_EXT', 'Timbangan Ext', 'DISPO'),
  ('loc_die_shop', 'DIE_SHOP', 'Rack Die Shop', 'DISPO'),
  ('loc_restack', 'RESTACK_AREA', 'Restacking Area', 'NC'),
  ('loc_bb1', 'BB1', 'BB1', 'MESIN'),
  ('loc_bb2', 'BB2', 'BB2', 'MESIN'),
  ('loc_calcut', 'CALCUT', 'Calender / Calcut', 'MESIN'),
  ('loc_cal_3roll', 'CAL_3ROLL', '3 Roll Calender', 'MESIN'),
  ('loc_pulandian', 'PULANDIAN', 'Pulandian', 'DISPO'),
  ('loc_siap_pakai', 'SIAP_PAKAI', 'Siap pakai', 'DISPO'),
  ('loc_rubber_cutter', 'RUBBER_CUTTER', 'Rubber cutter', 'MESIN')
on conflict (id) do nothing;

insert into public.app_user (nik, name, role, pin) values
  ('MIX001', 'Mixing (demo)', 'MIXING', '1234'),
  ('QC001', 'QC (demo)', 'QC', '1234'),
  ('PC001', 'PC Planner (demo)', 'PC', '1234'),
  ('EXT001', 'Extruder (demo)', 'EXT', '1234'),
  ('CAL001', 'Calender (demo)', 'CALCUT', '1234'),
  ('SPV001', 'Supervisor (demo)', 'SUPERVISOR', '1234'),
  ('ADM001', 'Admin (demo)', 'ADMIN', '1234')
on conflict (nik) do nothing;
