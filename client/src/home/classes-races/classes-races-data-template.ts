import { db } from "src/app/player/firebase-config";
import { doc, writeBatch } from 'firebase/firestore';

export interface ClassesRacesSeedItem {
  id: string;
  collectionName: 'classes' | 'races';
  name: string;
  sourceType: 'system' | 'user';
  data: any;
}

export const CLASSES_RACES_CONTENT: ClassesRacesSeedItem[] = [
  {
    id: 'artificer',
    collectionName: 'classes',
    name: 'Artificer',
    sourceType: 'system',
    data: {
      source: 'Custom / saját adat',
      description: 'Magical inventors and spellcasters.',
      hitPoints: {
        hitDice: '1d8 per artificer level',
        firstLevel: '8 + your Constitution modifier',
        higherLevels: '1d8 (or 5) + your Constitution modifier per artificer level after 1st'
      },
      proficiencies: {
        armor: 'Light armor, medium armor, shields',
        weapons: 'Simple weapons',
        tools: 'Thieves’ tools, tinker’s tools, one type of artisan’s tools of your choice',
        savingThrows: 'Constitution, Intelligence',
        skills: 'Choose two from Arcana, History, Investigation, Medicine, Nature, Perception, Sleight of Hand'
      },
      equipment: [
        'any two simple weapons',
        'a light crossbow and 20 bolts',
        '(a) studded leather armor or (b) scale mail',
        'thieves’ tools and a dungeoneer’s pack'
      ],
      startingGold: '5d4 × 10 gp',
      classTableColumns: [
        { key: 'level', label: 'Level' },
        { key: 'proficiencyBonus', label: 'Proficiency Bonus' },
        { key: 'features', label: 'Features' },
        { key: 'infusionsKnown', label: 'Infusions Known' },
        { key: 'infusedItems', label: 'Infused Items' },
        { key: 'cantripsKnown', label: 'Cantrips Known' },
        { key: 'spellSlots1', label: '1st' },
        { key: 'spellSlots2', label: '2nd' },
        { key: 'spellSlots3', label: '3rd' },
        { key: 'spellSlots4', label: '4th' },
        { key: 'spellSlots5', label: '5th' }
      ],
      classTable: [
        { level: 1, proficiencyBonus: '+2', features: 'Magical Tinkering, Spellcasting', infusionsKnown: '—', infusedItems: '—', cantripsKnown: 2, spellSlots1: 2, spellSlots2: '—', spellSlots3: '—', spellSlots4: '—', spellSlots5: '—' }
      ],
      features: [
        { level: 1, title: 'Magical Tinkering', description: 'Ide kerül a teljes feature szöveged.' },
        { level: 1, title: 'Spellcasting', description: 'Ide kerül a teljes feature szöveged.' }
      ],
      subclasses: [
        {
          name: 'Alchemist',
          description: 'Ide kerül az alosztály leírása.',
          features: [
            { level: 3, title: 'Tool Proficiency', description: 'Ide kerül a teljes feature szöveged.' }
          ]
        }
      ]
    }
  },
  {
    id: 'human',
    collectionName: 'races',
    name: 'Human',
    sourceType: 'system',
    data: {
      source: 'Custom / saját adat',
      description: 'A flexible and ambitious ancestry.',
      abilityScoreIncrease: '+1 to all ability scores',
      age: 'Humans reach adulthood in their late teens and live less than a century.',
      size: 'Medium',
      speed: '30 feet',
      languages: 'Common and one extra language of your choice',
      traits: [
        { title: 'Ability Score Increase', description: '+1 to all ability scores.' },
        { title: 'Languages', description: 'Common and one extra language of your choice.' }
      ],
      subraces: []
    }
  }
];

export async function uploadClassesRacesContent(): Promise<void> {
  const batch = writeBatch(db);

  for (const item of CLASSES_RACES_CONTENT) {
    const ref = doc(db, item.collectionName, item.id);

    batch.set(ref, {
      name: item.name,
      sourceType: item.sourceType,
      data: item.data
    });
  }

  await batch.commit();
}
