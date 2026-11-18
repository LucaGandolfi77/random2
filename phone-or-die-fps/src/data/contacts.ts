import type { Contact, ContactId } from './types';

export const CONTACTS: Contact[] = [
  {
    id: 'sophie', name: 'Sophie', role: 'Best friend', number: '+1 (555) 014-2287', initials: 'SO',
    tint: '#d77a9a', startNode: 'sophie_1', cooldownSec: 55,
    benefit: 'Calms you down. Strongly slows the rise of the threat.', fromChapter: 1, untilChapter: 0
  },
  {
    id: 'mom', name: 'Mom', role: 'Mother', number: '+1 (555) 014-9031', initials: 'MO',
    tint: '#d9b06c', startNode: 'mom_1', cooldownSec: 70,
    benefit: 'Emotional protection. A long, steady call holds them back.', fromChapter: 1, untilChapter: 0
  },
  {
    id: 'dad', name: 'Dad', role: 'Father', number: '+1 (555) 014-4450', initials: 'DA',
    tint: '#7fa9d4', startNode: 'dad_1', cooldownSec: 75,
    benefit: 'Teaches you how to secure doors and windows.', fromChapter: 1, untilChapter: 0
  },
  {
    id: 'daniel', name: 'Daniel', role: 'Boyfriend', number: '+1 (555) 014-7762', initials: 'DA',
    tint: '#9a86d8', startNode: 'daniel_1', cooldownSec: 85,
    benefit: 'Knows what is happening. Unlocks special story moments.', fromChapter: 1, untilChapter: 0
  },
  {
    id: 'alex', name: 'Alex', role: 'Childhood friend', number: '+1 (555) 014-3318', initials: 'AL',
    tint: '#74bbae', startNode: 'alex_1', cooldownSec: 65,
    benefit: 'Explains how to detect and avoid the Shadows.', fromChapter: 1, untilChapter: 0
  },
  {
    id: 'jessica', name: 'Jessica', role: 'Sister', number: '+1 (555) 014-6604', initials: 'JE',
    tint: '#c99ad6', startNode: 'jessica_1', cooldownSec: 80,
    benefit: 'Reveals the truth about your family.', fromChapter: 2, untilChapter: 0
  },
  {
    id: 'mike', name: 'Mike', role: 'Neighbour', number: '+1 (555) 014-1190', initials: 'MI',
    tint: '#8cb4c9', startNode: 'mike_1', cooldownSec: 95,
    benefit: 'Checks the garden and can guard an entrance for a while.', fromChapter: 1, untilChapter: 6
  },
  {
    id: 'unknown', name: 'Unknown Number', role: 'No caller ID', number: '+1 (555) 014-????', initials: '??',
    tint: '#cf3b4d', startNode: 'unknown_1', cooldownSec: 40,
    benefit: 'Unpredictable. It may help you. It may know your name.', fromChapter: 2, untilChapter: 0
  }
];

export const CONTACT_BY_ID = Object.fromEntries(CONTACTS.map((c) => [c.id, c])) as Record<ContactId, Contact>;

export const CONTACT_IDS = CONTACTS.map((c) => c.id);
