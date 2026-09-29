import raw from './schemes.generated.json';
import { Scheme } from '../src/engine/types';

export const SCHEMES = raw as unknown as Scheme[];

export function getSchemeById(id: string): Scheme | undefined {
  return SCHEMES.find((s) => s.id === id);
}

export const SCHEME_COUNT = SCHEMES.length;

export type { Rule } from '../src/engine/types';
