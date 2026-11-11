import { useEffect, useRef } from 'react';
import type PhaserType from 'phaser';
import type { MiniGameProps } from '../types';
import { scorePerfectSlice } from '../scoring';
import { clamp } from '@/utils/math';

export const PerfectSliceGame = ({ difficulty, relax, onFinish }: MiniGameProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const finishRef = useRef(onFinish);
  finishRef.current = onFinish;

  useEffect(() => {
    let destroyed = false;
    let game: PhaserType.Game | undefined;

    const boot = async () => {
      const Phaser = (await import('phaser')).default;
      if (destroyed || !containerRef.current) return;
      const width = 360;
      const height = 280;
      const targetX = width / 2;

      class SliceScene extends Phaser.Scene {
        private dragging = false;
        private startX = 0;
        private startY = 0;
        private endX = 0;
        private endY = 0;
        private deviation = 0;
        private moves = 0;
        private finished = false;
        private knife!: PhaserType.GameObjects.Graphics;

        constructor() {
          super('perfect-slice');
        }

        create() {
          this.add.rectangle(width / 2, height / 2, width, height, 0xf7f1e5);
          const board = this.add.graphics();
          board.fillStyle(0x80614e, 0.12);
          board.fillRoundedRect(34, 70, 292, 132, 20);
          board.fillStyle(0xc9a97a, 1);
          board.fillRoundedRect(38, 64, 284, 132, 18);
          board.lineStyle(2, 0x80614e, 0.18);
          board.strokeRoundedRect(38, 64, 284, 132, 18);

          const fish = this.add.graphics();
          fish.fillStyle(0xef9d91, 1);
          fish.fillRoundedRect(78, 90, 202, 78, 26);
          fish.fillStyle(0xf4c3a5, 0.65);
          fish.fillRoundedRect(94, 105, 168, 12, 6);
          fish.fillStyle(0xfffdf7, 0.55);
          fish.fillRoundedRect(94, 124, 168, 6, 3);
          fish.lineStyle(2, 0x80614e, 0.2);
          fish.strokeRoundedRect(78, 90, 202, 78, 26);

          const face = this.add.graphics();
          face.fillStyle(0x393a36, 1);
          face.fillCircle(128, 148, 4);
          face.fillCircle(158, 148, 4);
          face.lineStyle(2, 0x393a36, 1);
          face.beginPath();
          face.arc(143, 154, 8, 0.2, Math.PI - 0.2);
          face.strokePath();
          face.fillStyle(0xef9d91, 0.35);
          face.fillEllipse(114, 160, 16, 8);
          face.fillEllipse(172, 160, 16, 8);

          const guide = this.add.graphics();
          guide.lineStyle(2, 0x607b62, 0.6);
          for (let y = 52; y < 222; y += 12) {
            guide.lineBetween(targetX, y, targetX, y + 6);
          }
          guide.fillStyle(0x607b62, 0.08);
          guide.fillRect(targetX - (relax ? 28 : 16), 58, (relax ? 56 : 32), 166);

          this.add.text(width / 2, 26, 'Perfect Slice', {
            fontFamily: 'Nunito, sans-serif',
            fontSize: '19px',
            fontStyle: 'bold',
            color: '#393a36',
          }).setOrigin(0.5);
          this.add.text(width / 2, 45, 'Drag the knife down the guide and release near the bottom', {
            fontFamily: 'Nunito, sans-serif',
            fontSize: '10px',
            color: '#80614e',
          }).setOrigin(0.5);
          this.add.text(width / 2, 238, 'A calm, straight cut makes the prettiest sashimi', {
            fontFamily: 'Nunito, sans-serif',
            fontSize: '10px',
            color: '#80614e',
          }).setOrigin(0.5);
          this.add.text(targetX, 54, 'guide', {
            fontFamily: 'Nunito, sans-serif',
            fontSize: '8px',
            color: '#607b62',
          }).setOrigin(0.5);

          this.knife = this.add.graphics();
          this.drawKnife(targetX, 74);

          this.input.on('pointerdown', (pointer: PhaserType.Input.Pointer) => {
            if (this.finished) return;
            this.dragging = true;
            this.startX = pointer.x;
            this.startY = pointer.y;
            this.deviation = 0;
            this.moves = 0;
            this.drawKnife(pointer.x, clamp(pointer.y, 58, 215));
          });

          this.input.on('pointermove', (pointer: PhaserType.Input.Pointer) => {
            if (!this.dragging || this.finished) return;
            this.deviation += Math.abs(pointer.x - targetX);
            this.moves += 1;
            this.endX = pointer.x;
            this.endY = pointer.y;
            this.drawKnife(pointer.x, clamp(pointer.y, 58, 215));
          });

          this.input.on('pointerup', (pointer: PhaserType.Input.Pointer) => {
            if (!this.dragging || this.finished) return;
            this.dragging = false;
            this.endX = pointer.x;
            this.endY = pointer.y;
            if (this.moves < 3 || this.endY - this.startY < 30) {
              this.drawKnife(targetX, 74);
              return;
            }
            this.finished = true;
            const avgDeviation = this.deviation / Math.max(1, this.moves);
            const deviation = clamp(avgDeviation / (relax ? 46 : 32));
            const angleError = clamp(Math.abs(this.endX - this.startX) / (relax ? 90 : 58));
            const thicknessError = clamp(Math.abs(this.endY - (relax ? 202 : 208)) / (relax ? 80 : 48));
            const score = scorePerfectSlice({
              deviation,
              angleError,
              thicknessError,
            });
            this.input.enabled = false;
            this.drawCut(this.endX);
            window.setTimeout(() => finishRef.current(score), 260);
          });
        }

        private drawKnife(x: number, y: number) {
          this.knife.clear();
          this.knife.lineStyle(6, 0xfffdf7, 1);
          this.knife.lineBetween(x, 55, x, y);
          this.knife.lineStyle(2, 0x80614e, 0.4);
          this.knife.lineBetween(x, 55, x, y);
          this.knife.fillStyle(0x393a36, 1);
          this.knife.fillRoundedRect(x - 4, 44, 8, 16, 3);
          this.knife.fillStyle(0xf4c3a5, 1);
          this.knife.fillRoundedRect(x - 2, 61, 4, 9, 2);
        }

        private drawCut(x: number) {
          const cut = this.add.graphics();
          cut.lineStyle(3, 0xfffdf7, 0.9);
          cut.lineBetween(x, 92, x, 166);
          cut.lineStyle(1, 0x80614e, 0.4);
          cut.lineBetween(x + 4, 92, x + 4, 166);
        }
      }

      game = new Phaser.Game({
        type: Phaser.AUTO,
        width,
        height,
        parent: containerRef.current,
        backgroundColor: '#F7F1E5',
        scene: [SliceScene],
        scale: {
          mode: Phaser.Scale.FIT,
          autoCenter: Phaser.Scale.CENTER_BOTH,
        },
        render: {
          antialias: true,
          roundPixels: false,
        },
      });
    };

    void boot();
    return () => {
      destroyed = true;
      game?.destroy(true);
    };
  }, [difficulty, relax]);

  return (
    <div className="mg-game mg-slice">
      <div ref={containerRef} className="mg-phaser" />
      <p className="mg-hint">Phaser canvas · works with mouse and touch. Release gently near the bottom.</p>
    </div>
  );
};
