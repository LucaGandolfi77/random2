import { useEffect, useMemo, useState } from 'react';
import { useGameStore } from '@/core/gameStore';
import { itemById } from '@/data/items';
import { classById } from '@/data/classes';
import { effectiveAttributes, maxHp, maxResource } from '@/systems/character';
import { Portrait } from '@/ui/Portrait';
import { ModalShell } from './ModalShell';
import { cx, shortName, signed } from '@/utils';
import type { EquipmentSlot } from '@/core/types';

const SLOTS: { key: EquipmentSlot; label: string }[] = [
  { key: 'weapon', label: 'Weapon' },
  { key: 'offhand', label: 'Offhand' },
  { key: 'armor', label: 'Armor' },
  { key: 'helmet', label: 'Helm' },
  { key: 'accessory', label: 'Relic' }
];

type Filter = 'all' | 'weapon' | 'armor' | 'consumable' | 'quest' | 'material';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'weapon', label: 'Weapons' },
  { id: 'armor', label: 'Armor' },
  { id: 'consumable', label: 'Consumables' },
  { id: 'quest', label: 'Quest' },
  { id: 'material', label: 'Materials' }
];

const RARITY_LABEL: Record<string, string> = {
  common: 'Common',
  uncommon: 'Uncommon',
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'Legendary'
};

export function InventoryModal() {
  const [filter, setFilter] = useState<Filter>('all');
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const game = useGameStore((state) => state.game);
  const closeModal = useGameStore((state) => state.closeModal);
  const selectedCharacterId = useGameStore((state) => state.selectedCharacterId);
  const setSelectedCharacter = useGameStore((state) => state.setSelectedCharacter);
  const useItem = useGameStore((state) => state.useItem);
  const equipItem = useGameStore((state) => state.equipItem);
  const unequipItem = useGameStore((state) => state.unequipItem);

  const characterId =
    selectedCharacterId && game?.characters[selectedCharacterId]
      ? selectedCharacterId
      : game?.playerId ?? '';
  const character = game?.characters[characterId];

  const inventory = useMemo(() => {
    if (!game) return [];
    return game.inventory
      .map((stack) => ({ ...stack, item: itemById[stack.itemId] }))
      .filter((entry) => Boolean(entry.item))
      .filter((entry) => {
        if (filter === 'all') return true;
        if (filter === 'weapon') return entry.item.category === 'weapon' || entry.item.category === 'shield';
        if (filter === 'armor') return ['armor', 'helmet', 'accessory'].includes(entry.item.category);
        if (filter === 'consumable') return ['potion', 'scroll'].includes(entry.item.category);
        if (filter === 'quest') return entry.item.category === 'quest';
        return entry.item.category === 'material';
      });
  }, [game, filter]);

  useEffect(() => {
    if (!selectedItem && inventory.length) setSelectedItem(inventory[0].item.id);
  }, [inventory, selectedItem]);

  if (!game || !character) return null;
  const party = game.party.map((id) => game.characters[id]).filter(Boolean);
  const selected = selectedItem ? itemById[selectedItem] : null;
  const current = selected?.slot ? character.equipment[selected.slot] : null;
  const currentItem = current ? itemById[current] : null;
  const canEquip = Boolean(
    selected?.slot &&
      (!selected.classes || selected.classes.includes(character.classId)) &&
      game.inventory.some((entry) => entry.itemId === selected.id)
  );
  const canUse = Boolean(selected && (selected.category === 'potion' || selected.category === 'scroll'));
  const gold = game.characters[game.playerId]?.gold ?? 0;
  const attrs = effectiveAttributes(character);

  return (
    <ModalShell
      title="Inventory"
      kicker="The Burden You Carry"
      onClose={closeModal}
      size="xl"
      footer={
        <div className="inventory-footer">
          <span className="gold-chip">◉ {gold} gold</span>
          <span className="muted small">{game.inventory.reduce((sum, stack) => sum + stack.quantity, 0)} items</span>
        </div>
      }
    >
      <div className="inventory-layout">
        <div className="inventory-main">
          <div className="party-tabs">
            {party.map((member) => (
              <button
                key={member.id}
                className={cx('party-tab', member.id === characterId && 'is-active')}
                onClick={() => setSelectedCharacter(member.id)}
              >
                <Portrait appearance={member.portrait} size="xs" />
                <span>{shortName(member.name)}</span>
              </button>
            ))}
          </div>

          <div className="inventory-character-strip">
            <Portrait appearance={character.portrait} size="sm" />
            <div className="inventory-character-info">
              <strong>{character.name}</strong>
              <span>Level {character.level} · {classById[character.classId]?.name ?? character.classId}</span>
              <div className="mini-bars">
                <span>HP {character.hp}/{maxHp(character)}</span>
                <span>Resource {character.resource}/{maxResource(character)}</span>
              </div>
            </div>
            <div className="inventory-attributes">
              {(['str', 'dex', 'con', 'int', 'wis', 'cha'] as const).map((key) => (
                <span key={key}>
                  {key.toUpperCase()} <strong>{attrs[key]}</strong>
                </span>
              ))}
            </div>
          </div>

          <div className="equipment-grid">
            {SLOTS.map((slot) => {
              const item = character.equipment[slot.key] ? itemById[character.equipment[slot.key]!] : null;
              return (
                <div key={slot.key} className={cx('equipment-slot', item && 'has-item')}>
                  <span className="equipment-slot-label">{slot.label}</span>
                  {item ? (
                    <>
                      <span className="equipment-icon">{item.icon}</span>
                      <span className="equipment-name">{item.name}</span>
                      <button className="text-btn tiny" onClick={() => unequipItem(character.id, slot.key)}>
                        Remove
                      </button>
                    </>
                  ) : (
                    <span className="equipment-empty">Empty</span>
                  )}
                </div>
              );
            })}
          </div>

          <div className="inventory-filter-row">
            {FILTERS.map((entry) => (
              <button
                key={entry.id}
                className={cx('pill', filter === entry.id && 'is-selected')}
                onClick={() => setFilter(entry.id)}
              >
                {entry.label}
              </button>
            ))}
          </div>

          <div className="inventory-grid">
            {inventory.map(({ item, quantity }) => (
              <button
                key={item.id}
                className={cx(
                  'item-card',
                  `rarity-${item.rarity}`,
                  selectedItem === item.id && 'is-selected',
                  item.category === 'quest' && 'is-quest'
                )}
                onClick={() => setSelectedItem(item.id)}
              >
                <span className="item-icon">{item.icon}</span>
                <span className="item-name">{item.name}</span>
                <span className="item-meta">
                  {RARITY_LABEL[item.rarity]}
                  {quantity > 1 && <span className="item-qty">×{quantity}</span>}
                </span>
              </button>
            ))}
            {!inventory.length && <p className="muted empty-note">Nothing in this satchel.</p>}
          </div>
        </div>

        <aside className="inventory-detail">
          {selected ? (
            <>
              <div className="item-detail-head">
                <span className={cx('item-icon item-icon-large', `rarity-${selected.rarity}`)}>{selected.icon}</span>
                <div>
                  <h3>{selected.name}</h3>
                  <p className="muted small">
                    {RARITY_LABEL[selected.rarity]} {selected.category}
                    {selected.slot ? ` · ${selected.slot}` : ''}
                  </p>
                </div>
              </div>
              <p className="item-description">{selected.description}</p>
              {selected.stats && (
                <div className="item-stats">
                  {Object.entries(selected.stats).map(([key, value]) => (
                    <span key={key}>
                      {key === 'attack' ? 'Attack' : key === 'damage' ? 'Damage' : key.toUpperCase()}
                      <strong>{typeof value === 'number' ? signed(value) : value}</strong>
                    </span>
                  ))}
                </div>
              )}
              {selected.effect?.heal && <p className="item-effect">Restores {selected.effect.heal} health.</p>}
              {selected.effect?.resource && <p className="item-effect">Restores {selected.effect.resource} resource.</p>}
              {selected.effect?.status && <p className="item-effect">Effect: {selected.effect.status}.</p>}
              {selected.effect?.damageType && <p className="item-effect">Combat use: {selected.effect.damageType}.</p>}
              {selected.classes && (
                <p className="muted small">Usable by: {selected.classes.join(', ')}</p>
              )}
              {selected.value > 0 && <p className="muted small">Value: {selected.value} gold · sells for {Math.floor(selected.value / 2)}</p>}
              {currentItem && (
                <p className="item-equipped-note">Currently equipped: {currentItem.name}</p>
              )}
              <div className="item-actions">
                {canUse && (
                  <button className="btn btn-primary btn-small" onClick={() => useItem(character.id, selected.id)}>
                    Use
                  </button>
                )}
                {canEquip && (
                  <button className="btn btn-outline btn-small" onClick={() => equipItem(character.id, selected.id)}>
                    Equip
                  </button>
                )}
                {selected.category === 'quest' && <span className="tag tag-muted">Quest item</span>}
              </div>
            </>
          ) : (
            <div className="item-detail-empty">
              <span className="detail-sigil">◇</span>
              <p>Select an item to inspect it.</p>
            </div>
          )}
        </aside>
      </div>
    </ModalShell>
  );
}
