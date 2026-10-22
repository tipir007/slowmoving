export type RootStackParamList = {
  Login: undefined;
  Tabs: undefined;
};

export type StokStackParamList = {
  StokHome: undefined;
  StokDetail: {id: string};
  StokEdit: {id: string};
};

export type ScanStackParamList = {
  ScanHome: undefined;
  Confirm: undefined;
};

export type DispoStackParamList = {
  DispoHome: undefined;
  DispoBaru: {skidId?: string};
  LabelPreview: {id: string};
};

export type LabelStackParamList = DispoStackParamList;

export type TabParamList = {
  Stok: undefined;
  Papan: undefined;
  Daftar: undefined;
  Dispo: undefined;
  Pakai: undefined;
  Kamus: undefined;
};
