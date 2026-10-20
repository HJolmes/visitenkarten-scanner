import { Kontakt } from '../kern/kontakt';

/** Ein Knopf zum Speichern. Welche es gibt, entscheidet die Plattform. */
export interface SpeicherAktion {
  text: string;
  ausfuehren: (k: Kontakt) => Promise<void>;
  /** Hauptknopf (ausgefüllt) statt Nebenknopf */
  haupt?: boolean;
}
