import { useEffect, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { Modal } from './Common';
import { Icon, type IconName } from './Icons';

const STEPS: Array<{
  icon: IconName;
  kicker: string;
  title: string;
  body: string;
  tip: string;
}> = [
  {
    icon: 'flame',
    kicker: '01 · THE FIRE',
    title: 'Feed the furnace before you feed anything else.',
    body:
      'The central furnace burns coal every second and stores heat. Heat is the city temperature. In a whiteout, engage Overdrive: it burns coal far faster, but it may be the only thing between the settlement and the frost.',
    tip: 'Watch the whiteout countdown in the weather strip. The furnace stalls if coal reaches zero.',
  },
  {
    icon: 'survivors',
    kicker: '02 · THE HANDS',
    title: 'Every survivor is a pair of hands and a mouth.',
    body:
      'Assign workers to the lumber mill, coal mine, hunter’s hut and cookhouse. Production depends on their health, warmth, hunger and happiness. The cookhouse turns raw meat into cooked meals; the meal call at 17:00 consumes them.',
    tip: 'Use the plus and minus controls on any facility card, or reassign someone from the Survivors tab.',
  },
  {
    icon: 'snow',
    kicker: '03 · THE WHITEOUT',
    title: 'Build for the storm, not for the calm.',
    body:
      'Every upgrade feeds the next chapter: the furnace unlocks new buildings, shelters add beds and warmth, clinics heal the sick, and research makes every system stronger. Decrees decide what you ask of your people.',
    tip: 'First clear an expedition stage for iron. Iron is the bottleneck on furnace upgrades from level 3 onward.',
  },
];

export function Onboarding() {
  const open = useGameStore((state) => state.onboardingOpen);
  const dismiss = useGameStore((state) => state.dismissOnboarding);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  const entry = STEPS[step];
  const last = step === STEPS.length - 1;

  return (
    <Modal
      open={open}
      onClose={dismiss}
      title="The long night begins"
      subtitle="A small settlement, one furnace, and an endless whiteout."
      variant="center"
      footer={
        <div className="flex w-full items-center gap-2">
          <button type="button" className="text-button" onClick={dismiss}>
            Skip
          </button>
          <div className="ml-auto flex items-center gap-2">
            {step > 0 && (
              <button type="button" className="secondary-button" onClick={() => setStep((value) => value - 1)}>
                <Icon name="chevronLeft" size={14} /> Back
              </button>
            )}
            <button
              type="button"
              className="primary-button"
              onClick={() => (last ? dismiss() : setStep((value) => value + 1))}
            >
              {last ? 'Light the furnace' : 'Next'}
              <Icon name={last ? 'flame' : 'chevronRight'} size={14} />
            </button>
          </div>
        </div>
      }
    >
      <div className="onboarding-hero">
        <span className="onboarding-halo" />
        <Icon name={entry.icon} size={42} />
        <span className="onboarding-label">LAST EMBER · FIELD MANUAL</span>
      </div>
      <div className="onboarding-copy">
        <span className="eyebrow">{entry.kicker}</span>
        <h3>{entry.title}</h3>
        <p>{entry.body}</p>
        <div className="tip-callout">
          <Icon name="spark" size={14} />
          <span>{entry.tip}</span>
        </div>
      </div>
      <div className="flex items-center justify-center gap-1.5 py-1">
        {STEPS.map((item, index) => (
          <button
            key={item.kicker}
            type="button"
            className={`step-dot ${index === step ? 'is-active' : ''}`}
            onClick={() => setStep(index)}
            aria-label={`Go to step ${index + 1}: ${item.kicker}`}
            aria-current={index === step ? 'step' : undefined}
          />
        ))}
      </div>
    </Modal>
  );
}
