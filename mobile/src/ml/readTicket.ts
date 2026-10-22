import {NativeModules, Platform} from 'react-native';
import {decodeBarcode, type DecodedBarcode} from './barcode';
import {fuseTicket, type FusionResult} from './fusion';

type NativeRead = {
  read: (uri: string) => Promise<{barcodes: string[]; text: string}>;
};

const native = NativeModules.TicketReader as NativeRead | undefined;

export type TicketReadResult = {
  barcodes: DecodedBarcode[];
  text: string;
  fusion: FusionResult;
};

export async function readTicketImage(uri: string): Promise<TicketReadResult> {
  if (Platform.OS !== 'android' || !native?.read) {
    return {
      barcodes: [],
      text: '',
      fusion: fuseTicket([], ''),
    };
  }
  const raw = await native.read(uri);
  const barcodes = (raw.barcodes || []).map(decodeBarcode);
  const text = raw.text || '';
  return {barcodes, text, fusion: fuseTicket(barcodes, text)};
}
