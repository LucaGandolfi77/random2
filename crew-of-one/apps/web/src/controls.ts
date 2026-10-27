export type Handedness = 'right' | 'left';
export type ControlRect = { x: number; y: number; w: number; h: number };

export type ControlLayout = {
  act: ControlRect;
  dash: ControlRect;
  rewind: ControlRect;
  undo: ControlRect;
};

const KEY = 'crew-of-one:handedness';

export const CONTROL_LAYOUTS: Record<Handedness, ControlLayout> = {
  right: {
    act: { x: 14, y: 588, w: 72, h: 34 },
    dash: { x: 92, y: 588, w: 58, h: 34 },
    rewind: { x: 156, y: 588, w: 96, h: 34 },
    undo: { x: 258, y: 588, w: 88, h: 34 },
  },
  left: {
    undo: { x: 14, y: 588, w: 88, h: 34 },
    rewind: { x: 108, y: 588, w: 96, h: 34 },
    dash: { x: 210, y: 588, w: 58, h: 34 },
    act: { x: 274, y: 588, w: 72, h: 34 },
  },
};

export const loadHandedness = (): Handedness => {
  try {
    return localStorage.getItem(KEY) === 'left' ? 'left' : 'right';
  } catch {
    return 'right';
  }
};

export const saveHandedness = (handedness: Handedness): void => {
  try {
    localStorage.setItem(KEY, handedness);
  } catch {
    // The layout still changes for this session.
  }
};
