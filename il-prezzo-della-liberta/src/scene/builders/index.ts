import type { EnvId } from '../../data/types';
import type { BuiltEnvironment } from './kit';
import { buildPrison } from './prison';
import { buildBakery } from './bakery';
import { buildOffice } from './office';
import { buildBelleville } from './belleville';
import { buildGare } from './gare';
import { buildPhoneCorner, buildNightAvenue, buildMetroEntrance } from './night';
import { buildHospitalCorridor, buildHospitalRoom } from './hospital';
import { buildLaundrette } from './laundrette';
import { buildDawnStreet } from './dawn';

export const ENV_BUILDERS: Record<EnvId, () => BuiltEnvironment> = {
  prison: buildPrison,
  bakery: buildBakery,
  jobOffice: buildOffice,
  belleville: buildBelleville,
  gare: buildGare,
  phoneCorner: buildPhoneCorner,
  nightAvenue: buildNightAvenue,
  metroEntrance: buildMetroEntrance,
  hospitalCorridor: buildHospitalCorridor,
  hospitalRoom: buildHospitalRoom,
  laundrette: buildLaundrette,
  dawnStreet: buildDawnStreet
};

export type { BuiltEnvironment, EnvEventLookup } from './kit';

export function buildEnvironment(env: EnvId): BuiltEnvironment {
  const builder = ENV_BUILDERS[env];
  if (!builder) throw new Error(`Ambiente sconosciuto: ${env}`);
  return builder();
}
