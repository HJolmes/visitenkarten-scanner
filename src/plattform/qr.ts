// QR-Code im Foto suchen, Android-App: ML Kit über expo-camera, offline.
import { scanFromURLAsync } from 'expo-camera';

export async function leseQrCodes(bildUri: string): Promise<string[]> {
  const codes = await scanFromURLAsync(bildUri, ['qr']);
  return codes.map((c) => c.data);
}
