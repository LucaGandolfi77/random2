import { useState } from 'react';
import { useGameStore } from '@/core/gameStore';
import { itemById } from '@/data/items';
import { merchantById } from '@/data/merchants';
import { ModalShell } from './ModalShell';
import { cx, signed } from '@/utils';

type Tab = 'buy' | 'sell';

export function ShopModal() {
  const [tab, setTab] = useState<Tab>('buy');
  const game = useGameStore((state) => state.game);
  const shop = useGameStore((state) => state.shop);
  const closeShop = useGameStore((state) => state.closeShop);
  const buyItem = useGameStore((state) => state.buyItem);
  const sellItem = useGameStore((state) => state.sellItem);
  if (!game || !shop) return null;

  const merchant = merchantById[shop.merchantId];
  const player = game.characters[game.playerId];
  const gold = player?.gold ?? 0;
  const sellable = game.inventory
    .map((stack) => ({ ...stack, item: itemById[stack.itemId] }))
    .filter((entry) => entry.item && entry.item.category !== 'quest' && entry.item.value > 0);

  return (
    <ModalShell
      title={shop.name}
      kicker="A Fair Exchange"
      onClose={closeShop}
      size="lg"
      footer={
        <div className="shop-footer">
          <span className="gold-chip">◉ {gold} gold</span>
          <span className="muted small">Prices are fixed. Bree has a remarkable memory for faces.</span>
        </div>
      }
    >
      {merchant && <p className="shop-greeting">“{merchant.greeting}”</p>}
      <div className="journal-tabs">
        <button className={cx('pill', tab === 'buy' && 'is-selected')} onClick={() => setTab('buy')}>
          Buy <span className="pill-count">{shop.stock.reduce((sum, entry) => sum + entry.quantity, 0)}</span>
        </button>
        <button className={cx('pill', tab === 'sell' && 'is-selected')} onClick={() => setTab('sell')}>
          Sell <span className="pill-count">{sellable.length}</span>
        </button>
      </div>

      {tab === 'buy' ? (
        <div className="shop-list">
          {shop.stock.map((entry) => {
            const item = itemById[entry.itemId];
            if (!item) return null;
            const soldOut = entry.quantity <= 0;
            const affordable = gold >= item.value;
            return (
              <article key={entry.itemId} className={cx('shop-item', soldOut && 'is-sold-out')}>
                <span className={cx('item-icon', `rarity-${item.rarity}`)}>{item.icon}</span>
                <div className="shop-item-info">
                  <div className="shop-item-head">
                    <strong>{item.name}</strong>
                    <span className="tag tag-muted">{item.rarity}</span>
                  </div>
                  <p>{item.description}</p>
                  {item.stats && (
                    <div className="shop-stats">
                      {Object.entries(item.stats).map(([key, value]) => (
                        <span key={key}>{key.toUpperCase()} {typeof value === 'number' ? signed(value) : value}</span>
                      ))}
                    </div>
                  )}
                  <small className="muted">
                    {soldOut ? 'Sold out' : `${entry.quantity} in stock`}
                  </small>
                </div>
                <div className="shop-buy">
                  <span className="price">{item.value} ◉</span>
                  <button
                    className="btn btn-small btn-primary"
                    disabled={soldOut || !affordable}
                    onClick={() => buyItem(item.id)}
                  >
                    {soldOut ? 'Sold' : affordable ? 'Buy' : 'Too costly'}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="shop-list">
          {sellable.map(({ item, quantity }) => (
            <article key={item.id} className="shop-item">
              <span className={cx('item-icon', `rarity-${item.rarity}`)}>{item.icon}</span>
              <div className="shop-item-info">
                <div className="shop-item-head">
                  <strong>{item.name}</strong>
                  <span className="tag tag-muted">×{quantity}</span>
                </div>
                <p>{item.description}</p>
                <small className="muted">Sells for {Math.max(1, Math.floor(item.value / 2))} gold</small>
              </div>
              <div className="shop-buy">
                <span className="price">{Math.max(1, Math.floor(item.value / 2))} ◉</span>
                <button className="btn btn-small btn-outline" onClick={() => sellItem(item.id, 1)}>
                  Sell one
                </button>
              </div>
            </article>
          ))}
          {!sellable.length && <p className="muted empty-note">You have nothing Bree wants.</p>}
        </div>
      )}
    </ModalShell>
  );
}
