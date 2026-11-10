export type Vec2 = [number, number];
export type Vec3Tuple = [number, number, number];

export interface CityMeta {
  city: string;
  country: string;
  pilot: string;
  generated_at: string;
  origin: { name: string; lon: number; lat: number };
  crs_metric: string;
  bbox_wgs84: [number, number, number, number];
  pilot_bbox_wgs84: [number, number, number, number];
  bbox_local: [number, number, number, number];
  pilot_bbox_local: [number, number, number, number];
  origin_ground_elevation_m: number;
  lod_distances_m: { lod0: number; lod1: number; lod2: number; lod3: number };
  chunk_size_m?: number;
  parent_chunk_size_m?: number;
  detail_radius_m?: { high: number; medium: number; low: number };
  max_detail_chunks?: { desktop: number; mobile: number };
}

export interface District {
  id: string;
  name: string;
  color: string;
  description: string;
  lon: number;
  lat: number;
  local: Vec2;
}

export interface Terrain {
  nx: number;
  nz: number;
  bbox_local: [number, number, number, number];
  width_m: number;
  depth_m: number;
  origin_ground_elevation_m: number;
  heights: (number | null)[];
}

export interface Ground {
  image: string;
  width: number;
  height: number;
  bbox_local: [number, number, number, number];
  license: string;
}

export interface WindowLayout {
  u: number;
  v: number;
  width: number;
  height: number;
  type: string;
  frame: string;
  sill: boolean;
  floor: number;
  shutters?: boolean;
  shutter_type?: string;
}

export interface DoorLayout {
  u: number;
  v: number;
  width: number;
  height: number;
  type: string;
  colour: string;
}

export interface ShopfrontLayout {
  u: number;
  v: number;
  width: number;
  height: number;
  type: string;
  colour: string;
}

export interface BalconyLayout {
  u: number;
  v: number;
  width: number;
  depth: number;
  type: string;
  railing: string;
  floor: number;
  continuous: boolean;
}

export interface FloorLayout {
  index: number;
  y0: number;
  y1: number;
  height: number;
}

export interface SideLayout {
  floors: FloorLayout[];
  bays: number;
  bay_width_m: number;
  margin_m: number;
  windows: WindowLayout[];
  doors: DoorLayout[];
  shopfronts: ShopfrontLayout[];
  balconies: BalconyLayout[];
  pilasters: { u: number; width: number; depth: number }[];
  string_courses: { v: number; height: number; depth: number }[];
  cornice: { height: number; depth: number; colour: string } | null;
  ornaments: string[];
  shop_bays: number[];
  door_bay: number | null;
  window_count: number;
  balcony_count: number;
  street_facing: boolean;
  road_name: string | null;
  road_class: string | null;
  main_facade: boolean;
}

export interface Side {
  index: number;
  p1: Vec2;
  p2: Vec2;
  length_m: number;
  bearing_deg: number;
  facing_deg: number;
  normal: Vec2;
  street_facing: boolean;
  road_name: string | null;
  road_class: string | null;
  main_facade: boolean;
  layout?: SideLayout;
}

export interface Roof {
  shape: string;
  pitch_deg: number;
  overhang_m: number;
  colour: string;
  material: string;
  ridge_deg: number;
  confidence: number;
}

export interface Facade {
  primary: string;
  secondary: string[];
  material: string;
  roughness: number;
  metalness: number;
}

export interface Building {
  id: string;
  osm_id: string;
  detail: 'pilot' | 'context';
  district_id?: string | null;
  chunk?: string | null;
  parent_chunk?: string | null;
  name: string | null;
  archetype: string;
  style_label: string | null;
  category: string | null;
  landmark: boolean;
  tier: string;
  tags: Record<string, string>;
  centroid_local: Vec2;
  centroid_lonlat: Vec2;
  footprint: Vec2[];
  holes: Vec2[][];
  min_rect: {
    corners: Vec2[];
    length_m: number;
    width_m: number;
    angle_deg: number;
  };
  area_m2: number;
  base_elevation_m: number | null;
  base_y: number;
  height_m: number;
  eave_height_m: number;
  roof_height_m: number;
  floors: number;
  ground_floor_height_m: number;
  upper_floor_height_m: number;
  roof: Roof;
  facade: Facade;
  sides: Side[];
  window_count: number;
  balcony_count: number;
  height_source: string;
  height_confidence: number;
  archetype_confidence: number;
  geometry_confidence: number;
  texture_confidence: number;
  evidence: string[];
  procedural_flags: string[];
  provenance: Record<string, string>;
  notes: string | null;
}

export interface Road {
  osm_id: string;
  name: string | null;
  kind: string;
  width_m: number;
  surface: string;
  sidewalk: boolean;
  oneway: boolean;
  points: [number, number, number][];
  markings: boolean;
}

export interface Plaza {
  osm_id: string;
  name: string | null;
  kind: string;
  ring: [number, number, number][];
  surface: string;
}

export interface Prop {
  osm_id: string;
  kind: string;
  name: string | null;
  x: number;
  y: number;
  z: number;
  rotation: number;
  tags: Record<string, string>;
}

export interface Stats {
  buildings: number;
  pilot_buildings: number;
  context_buildings: number;
  windows: number;
  balconies: number;
  landmarks: number;
  height_sources: Record<string, number>;
  tiers: Record<string, number>;
  archetypes: Record<string, number>;
  roof_shapes: Record<string, number>;
  height_confidence_median: number;
  districts?: Record<string, number>;
  detail_chunks?: number;
}

export interface ChunkEntry {
  key: string;
  url: string;
  parent: string;
  bbox_local: [number, number, number, number];
  count: number;
}

export interface ParentChunkEntry {
  key: string;
  bbox_local: [number, number, number, number];
  chunks: string[];
}

export interface Manifest {
  meta: CityMeta;
  stats: Stats;
  districts: District[];
  files: {
    world: string;
    massing: string;
    landmarks: string;
    detail_dir: string;
    fallback: string;
  };
  chunks: Record<string, ChunkEntry>;
  parents: Record<string, ParentChunkEntry>;
  coverage: CityData['coverage'];
  licenses: CityData['licenses'];
  limits: string[];
}

export interface WorldPayload {
  terrain: Terrain;
  ground: Ground;
  roads: Road[];
  plazas: Plaza[];
  props: Prop[];
}

export interface MassingPayload {
  buildings: Building[];
}

export interface LandmarksPayload {
  landmarks: {
    id: string;
    name: string;
    kind: string;
    osm_id: string;
    local: Vec2;
    lon: number;
    lat: number;
    height_m: number | null;
    tier: string | null;
    archetype: string | null;
  }[];
}

export interface DetailChunkPayload {
  key: string;
  parent: string;
  size_m: number;
  bbox_local: [number, number, number, number];
  buildings: Building[];
}

export interface CityData {
  meta: CityMeta;
  terrain: Terrain;
  ground: Ground;
  buildings: Building[];
  roads: Road[];
  plazas: Plaza[];
  props: Prop[];
  districts?: District[];
  stats: Stats;
  coverage: {
    street_level: {
      source: string;
      photo_count: number;
      photo_count_nearby?: number;
      points_with_photos: number;
      available: boolean;
    };
    reference_photos: { source: string; file_count: number };
  };
  licenses: { source: string; license: string; url: string; attribution: string }[];
  limits: string[];
}
