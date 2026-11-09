import { describe, expect, it } from 'vitest';
import { maps, mapById } from '@/data/maps';
import { dialogues, dialogueById } from '@/data/dialogues';
import { encounters, encounterById } from '@/data/encounters';
import { enemies, enemyById } from '@/data/enemies';
import { quests, questById } from '@/data/quests';
import { items, itemById } from '@/data/items';
import { abilities, abilityById } from '@/data/abilities';
import { companions, companionById } from '@/data/companions';
import { ancestries, ancestryById } from '@/data/ancestries';
import { classes, classById, backgrounds } from '@/data/classes';
import { endings, endingById } from '@/data/campaign';
import { subclasses, subclassById, subclassesForClass } from '@/data/subclasses';
import { isWalkable } from '@/game/iso';
import type { DialogueEffect } from '@/core/types';

const validItem = (id: string | undefined) => !id || Boolean(itemById[id]);
const validQuest = (id: string | undefined) => !id || Boolean(questById[id]);
const validEncounter = (id: string | undefined) => !id || Boolean(encounterById[id]);
const validMap = (id: string | undefined) => !id || Boolean(mapById[id]);
const validEnding = (id: string | undefined) => !id || Boolean(endingById[id]);
const validCompanion = (id: string | undefined) => !id || Boolean(companionById[id]);

describe('campaign data integrity', () => {
  it('keeps all maps rectangular and all interactables inside their bounds', () => {
    for (const map of maps) {
      expect(map.rows).toHaveLength(map.height);
      map.rows.forEach((row) => expect(row).toHaveLength(map.width));
      expect(map.start.x).toBeGreaterThanOrEqual(0);
      expect(map.start.y).toBeGreaterThanOrEqual(0);
      expect(map.start.x).toBeLessThan(map.width);
      expect(map.start.y).toBeLessThan(map.height);
      expect(isWalkable(map.rows[map.start.y][map.start.x])).toBe(true);

      for (const entry of map.interactables) {
        expect(entry.x).toBeGreaterThanOrEqual(0);
        expect(entry.y).toBeGreaterThanOrEqual(0);
        expect(entry.x).toBeLessThan(map.width);
        expect(entry.y).toBeLessThan(map.height);
        expect(validItem(entry.itemId)).toBe(true);
        expect(validEncounter(entry.encounterId)).toBe(true);
        expect(validMap(entry.toMap)).toBe(true);
        if (entry.toMap) {
          const target = mapById[entry.toMap];
          expect(entry.toX ?? target.start.x).toBeGreaterThanOrEqual(0);
          expect(entry.toY ?? target.start.y).toBeGreaterThanOrEqual(0);
          expect(entry.toX ?? target.start.x).toBeLessThan(target.width);
          expect(entry.toY ?? target.start.y).toBeLessThan(target.height);
        }
        if (entry.dialogueId) expect(Boolean(dialogueById[entry.dialogueId])).toBe(true);
      }
    }
  });

  it('has valid dialogue trees and effect references', () => {
    const allEffects: DialogueEffect[] = [];
    for (const dialogue of dialogues) {
      expect(Boolean(dialogueById[dialogue.id])).toBe(true);
      expect(Boolean(dialogue.nodes[dialogue.start])).toBe(true);
      for (const node of Object.values(dialogue.nodes)) {
        if (node.next) expect(Boolean(dialogue.nodes[node.next]), `${dialogue.id} node ${node.id} next`).toBe(true);
        if (node.combat) expect(validEncounter(node.combat)).toBe(true);
        if (node.effects) allEffects.push(...node.effects);
        for (const choice of node.choices ?? []) {
          if (choice.next) expect(Boolean(dialogue.nodes[choice.next]), `${dialogue.id}/${choice.id} next`).toBe(true);
          if (choice.successNext) expect(Boolean(dialogue.nodes[choice.successNext]), `${dialogue.id}/${choice.id} successNext`).toBe(true);
          if (choice.failureNext) expect(Boolean(dialogue.nodes[choice.failureNext]), `${dialogue.id}/${choice.id} failureNext`).toBe(true);
          if (choice.effects) allEffects.push(...choice.effects);
          if (choice.successEffects) allEffects.push(...choice.successEffects);
          if (choice.failureEffects) allEffects.push(...choice.failureEffects);
          if (choice.requiresItem) expect(validItem(choice.requiresItem)).toBe(true);
          if (choice.requiresCompanion) expect(validCompanion(choice.requiresCompanion)).toBe(true);
          if (choice.requiresClass) expect(Boolean(classById[choice.requiresClass])).toBe(true);
          if (choice.requiresAncestry) expect(Boolean(ancestryById[choice.requiresAncestry])).toBe(true);
        }
      }
    }

    for (const effect of allEffects) {
      switch (effect.type) {
        case 'item':
          expect(validItem(effect.id), `item effect ${effect.id}`).toBe(true);
          break;
        case 'quest':
        case 'questStage':
        case 'questComplete':
        case 'questFail':
          expect(validQuest(effect.id), `quest effect ${effect.id}`).toBe(true);
          break;
        case 'startCombat':
          expect(validEncounter(effect.id), `combat effect ${effect.id}`).toBe(true);
          break;
        case 'travel':
          expect(validMap(effect.id), `travel effect ${effect.id}`).toBe(true);
          break;
        case 'ending':
          expect(validEnding(effect.id), `ending effect ${effect.id}`).toBe(true);
          break;
        case 'recruit':
        case 'leave':
          expect(validCompanion(effect.id), `companion effect ${effect.id}`).toBe(true);
          break;
        case 'shop':
          expect(Boolean(effect.id)).toBe(true);
          break;
        default:
          break;
      }
    }
  });

  it('keeps encounter grids, enemy placements, and rewards valid', () => {
    for (const encounter of encounters) {
      expect(encounter.rows).toHaveLength(encounter.height);
      encounter.rows.forEach((row) => expect(row).toHaveLength(encounter.width));
      for (const enemy of encounter.enemies) {
        expect(Boolean(enemyById[enemy.enemyId]), `enemy ${enemy.enemyId}`).toBe(true);
        expect(enemy.x).toBeGreaterThan(0);
        expect(enemy.y).toBeGreaterThan(0);
        expect(enemy.x).toBeLessThan(encounter.width - 1);
        expect(enemy.y).toBeLessThan(encounter.height - 1);
      }
      for (const item of encounter.rewardItems ?? []) expect(validItem(item)).toBe(true);
    }
    for (const enemy of enemies) {
      expect(Boolean(enemyById[enemy.id])).toBe(true);
      for (const ability of enemy.abilities) expect(Boolean(abilityById[ability]), `enemy ability ${ability}`).toBe(true);
    }
  });

  it('validates classes, ancestries, companions, quests, and abilities', () => {
    expect(classes).toHaveLength(6);
    expect(ancestries).toHaveLength(6);
    expect(backgrounds).toHaveLength(5);
    expect(companions.length).toBeGreaterThanOrEqual(5);
    expect(quests.length).toBeGreaterThanOrEqual(8);
    expect(encounters.filter((encounter) => encounter.boss).length).toBeGreaterThanOrEqual(3);
    expect(items.length).toBeGreaterThan(30);
    expect(abilities.length).toBeGreaterThan(40);

    for (const cls of classes) {
      for (const ability of cls.startingAbilities) expect(Boolean(abilityById[ability])).toBe(true);
    }
    for (const companion of companions) {
      expect(validQuest(companion.questId)).toBe(true);
      for (const ability of companion.abilities) expect(Boolean(abilityById[ability])).toBe(true);
      if (companion.subclass) {
        const subclass = subclassById[companion.subclass];
        expect(Boolean(subclass), `companion subclass ${companion.subclass}`).toBe(true);
        expect(subclass.classId).toBe(companion.classId);
        expect(Boolean(abilityById[subclass.abilityId])).toBe(true);
      }
    }
    for (const cls of classes) {
      const paths = subclassesForClass(cls.id);
      expect(paths).toHaveLength(2);
      for (const path of paths) {
        expect(path.classId).toBe(cls.id);
        expect(Boolean(abilityById[path.abilityId]), `subclass ability ${path.abilityId}`).toBe(true);
      }
    }
    expect(subclasses).toHaveLength(12);
    for (const quest of quests) {
      expect(quest.stages.length).toBeGreaterThan(0);
      for (const item of quest.rewardItems ?? []) expect(validItem(item)).toBe(true);
    }
    for (const ability of abilities) {
      expect(ability.name.length).toBeGreaterThan(0);
      expect(ability.apCost).toBeGreaterThanOrEqual(0);
      expect(ability.range).toBeGreaterThanOrEqual(0);
    }
    for (const item of items) {
      expect(item.name.length).toBeGreaterThan(0);
      expect(item.value).toBeGreaterThanOrEqual(0);
    }
    for (const ending of endings) {
      expect(ending.title.length).toBeGreaterThan(0);
      expect(ending.text.length).toBeGreaterThan(0);
    }
  });
});
