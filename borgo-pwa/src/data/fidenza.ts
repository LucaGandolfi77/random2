import raw from './fidenza.json';
import type { WorldBounds } from './types';

export interface FidenzaMeta {
  id: string;
  name: string;
  source: string;
  attribution: string;
  license: string;
  generated: string;
  origin: { lat: number; lon: number };
  bounds: WorldBounds;
  view: WorldBounds;
  counts: {
    buildings: number;
    roads: number;
    areas: number;
    trees: number;
    furniture: number;
    places: number;
    railways: number;
    waterways?: number;
  };
}

export interface FidenzaBuilding {
  id: string;
  kind: string;
  name: string;
  x: number;
  z: number;
  h: number;
  area: number;
  landmark: string | null;
  /** Flat [x,z,x,z,…] ring, local metres. */
  poly: number[];
}

export interface FidenzaRoad {
  id: string;
  kind: string;
  name: string;
  w: number;
  /** Flat [x,z,x,z,…] polyline. */
  pts: number[];
}

export interface FidenzaArea {
  id: string;
  kind: string;
  name: string;
  color: number;
  /** Flat [x,z,x,z,…] ring. */
  poly: number[];
}

export interface FidenzaTree {
  x: number;
  z: number;
  h: number;
  leaf: string;
}

export interface FidenzaFurniture {
  type: string;
  x: number;
  z: number;
}

export interface FidenzaWaterway {
  id: string;
  kind: string;
  name: string;
  w: number;
  /** Flat [x,z,x,z,…] polyline. */
  pts: number[];
}

export interface FidenzaRailway {
  id: string;
  name: string;
  /** Flat [x,z,x,z,…] polyline. */
  pts: number[];
}

export interface FidenzaPlace {
  id: string;
  name: string;
  category: string;
  x: number;
  z: number;
  radius: number;
}

export interface FidenzaData {
  meta: FidenzaMeta;
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  buildings: FidenzaBuilding[];
  roads: FidenzaRoad[];
  areas: FidenzaArea[];
  waterways: FidenzaWaterway[];
  railways: FidenzaRailway[];
  trees: FidenzaTree[];
  furniture: FidenzaFurniture[];
  places: FidenzaPlace[];
}

export const FIDENZA = raw as unknown as FidenzaData;
export const FIDENZA_WORLD: WorldBounds = FIDENZA.meta.bounds;
export const FIDENZA_VIEW: WorldBounds = FIDENZA.meta.view;
