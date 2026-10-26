import { z } from 'zod';
import type { VaultDef } from '@crew-of-one/sim';

const vec2 = z.object({ x: z.number(), y: z.number() });
const rect = z.object({ x: z.number(), y: z.number(), w: z.number(), h: z.number() });

export const vaultSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  chapter: z.number().int().nonnegative(),
  loopSeconds: z.number().positive(),
  maxEchoes: z.number().int().nonnegative(),
  parEchoes: z.number().int().nonnegative(),
  tilesX: z.number().int().positive(),
  tilesY: z.number().int().positive(),
  tileSize: z.number().int().positive(),
  playerStart: vec2,
  exit: z.object({ x: z.number(), y: z.number(), radius: z.number().positive() }),
  walls: z.array(rect),
  plates: z.array(
    z.object({
      id: z.string().min(1),
      x: z.number(),
      y: z.number(),
      radius: z.number().positive(),
      mode: z.enum(['hold', 'latch']),
      targets: z.array(z.string()),
    }),
  ),
  doors: z.array(
    z.object({
      id: z.string().min(1),
      x: z.number(),
      y: z.number(),
      w: z.number().positive(),
      h: z.number().positive(),
      mode: z.enum(['plate', 'lever', 'oneway']),
      passDirection: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]).optional(),
    }),
  ),
  guards: z.array(
    z.object({
      id: z.string().min(1),
      path: z.array(vec2).min(1),
      waitMs: z.number().nonnegative(),
      speed: z.number().positive(),
      visionRange: z.number().positive(),
      visionAngleDeg: z.number().positive().max(360),
      hearingRadius: z.number().nonnegative(),
      facing: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]).optional(),
    }),
  ).default([]),
  cameras: z
    .array(
      z.object({
        id: z.string().min(1),
        x: z.number(),
        y: z.number(),
        facing: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
        fovDeg: z.number().positive().max(360),
        range: z.number().positive(),
        sweepDeg: z.number().nonnegative().max(360),
        sweepMs: z.number().nonnegative(),
        phaseMs: z.number(),
      }),
    )
    .default([]),
  levers: z
    .array(
      z.object({
        id: z.string().min(1),
        x: z.number(),
        y: z.number(),
        radius: z.number().positive(),
        mode: z.enum(['hold', 'toggle']),
        targetIds: z.array(z.string()),
        disableMs: z.number().positive().optional(),
      }),
    )
    .default([]),
  lasers: z
    .array(
      z.object({
        id: z.string().min(1),
        x1: z.number(),
        y1: z.number(),
        x2: z.number(),
        y2: z.number(),
        onMs: z.number().nonnegative(),
        offMs: z.number().nonnegative(),
        phaseMs: z.number(),
      }),
    )
    .default([]),
  gem: z.object({ x: z.number(), y: z.number(), radius: z.number().positive() }).optional(),
  requiresGem: z.boolean(),
  hints: z.array(z.string()).default([]),
});

export const parseVault = (input: unknown): VaultDef => vaultSchema.parse(input) as VaultDef;
