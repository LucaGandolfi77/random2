import rawScript from '../../data/script.it.json';
import rawCamera from '../../data/camera.json';
import rawLights from '../../data/lights.json';
import type { CameraFile, LightsFile, RawScript } from '../data/types';
import { compileFilm } from './compile';

export const script = rawScript as unknown as RawScript;
export const cameraFile = rawCamera as unknown as CameraFile;
export const lightsFile = rawLights as unknown as LightsFile;
export const film = compileFilm(script);

export { SPEAKER_LABELS } from './speakers';
