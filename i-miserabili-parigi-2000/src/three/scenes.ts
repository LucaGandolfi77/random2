import type { FilmChapter } from '../film/types'
import { CHAPTERS } from '../film/timeline'
import { buildBishop, buildDoors, buildFantine, buildMadeleine, buildOuverture, buildRelease } from './scenes-a'
import { buildChampmathieu, buildFantineDeath, buildMontfermeil, buildParis } from './scenes-b'
import { buildBarricade, buildCandlesticks, buildSewers } from './scenes-c'
import type { ChapterScene } from './types'

const BUILDERS: Record<string, (chapter: FilmChapter) => ChapterScene> = {
  ouverture: buildOuverture,
  release: buildRelease,
  doors: buildDoors,
  bishop: buildBishop,
  madeleine: buildMadeleine,
  fantine: buildFantine,
  champmathieu: buildChampmathieu,
  'fantine-death': buildFantineDeath,
  montfermeil: buildMontfermeil,
  paris: buildParis,
  barricade: buildBarricade,
  sewers: buildSewers,
  candlesticks: buildCandlesticks,
}

export function buildChapterScene(chapter: FilmChapter): ChapterScene {
  const builder = BUILDERS[chapter.id]
  if (!builder) throw new Error(`Nessun regista per il capitolo ${chapter.id}`)
  return builder(chapter)
}

export function buildFilmScenes(): ChapterScene[] {
  return CHAPTERS.map((chapter) => buildChapterScene(chapter))
}

export function stageBuilderIds(): string[] {
  return Object.keys(BUILDERS)
}
