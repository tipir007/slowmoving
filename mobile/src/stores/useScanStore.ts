import {create} from 'zustand';
import type {DecodedBarcode} from '../ml/barcode';

type ScanState = {
  hits: DecodedBarcode[];
  photoUri: string | null;
  ocrText: string;
  reading: boolean;
  addHit: (hit: DecodedBarcode) => void;
  setHits: (hits: DecodedBarcode[]) => void;
  setPhoto: (uri: string | null) => void;
  setOcr: (text: string) => void;
  setReading: (reading: boolean) => void;
  beginImage: (uri: string) => void;
  reset: () => void;
};

export const useScanStore = create<ScanState>(set => ({
  hits: [],
  photoUri: null,
  ocrText: '',
  reading: false,
  addHit: hit =>
    set(s => {
      if (s.hits.some(h => h.raw === hit.raw)) return s;
      return {hits: [...s.hits, hit]};
    }),
  setHits: hits => set({hits}),
  setPhoto: photoUri => set({photoUri}),
  setOcr: ocrText => set({ocrText}),
  setReading: reading => set({reading}),
  beginImage: uri => set({hits: [], ocrText: '', photoUri: uri, reading: true}),
  reset: () => set({hits: [], photoUri: null, ocrText: '', reading: false}),
}));
