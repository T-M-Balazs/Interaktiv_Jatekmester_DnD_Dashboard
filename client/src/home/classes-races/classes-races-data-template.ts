import { db } from "../../app/player/firebase-config";
import { doc, writeBatch } from 'firebase/firestore';

export interface ClassesRacesSeedItem {
  id: string;
  collectionName: 'classes' | 'races';
  name: string;
  sourceType: 'system' | 'user';
  data: any;
}

export const CLASSES_RACES_CONTENT: ClassesRacesSeedItem[] = [
  // 1. ARTIFICER
  {
    id: 'artificer',
    collectionName: 'classes',
    name: 'Artificer',
    sourceType: 'system',
    data: {
      source: 'Tasha’s Cauldron of Everything / Eberron: Rising from the Last War',
      shortDescription: 'Masters of invention, artificers use ingenuity and magic to unlock extraordinary capabilities in objects.',
      description: 'Artificers master the magical energy permeating mundane items and tinker with devices to create incredible effects. They see magic as a complex system waiting to be decoded and then harnessed in their spells and inventions. Artificers use a variety of tools to channel their arcane power, whether creating potent elixirs, inscribing sigils, or crafting temporary charms.\n\n*Multiclassing Requirement: Intelligence 13 or higher.*',
      hitPoints: {
        hitDice: '1d8 per artificer level',
        firstLevel: '8 + your Constitution modifier',
        higherLevels: '1d8 (or 5) + your Constitution modifier per artificer level after 1st'
      },
      proficiencies: {
        armor: 'Light armor, medium armor, shields',
        weapons: 'Simple weapons, firearms (optional rule)',
        tools: 'Thieves’ tools, tinker’s tools, one type of artisan’s tools of your choice',
        savingThrows: 'Constitution, Intelligence',
        skills: 'Choose two from Arcana, History, Investigation, Medicine, Nature, Perception, Sleight of Hand'
      },
      equipment: [
        'Any two simple weapons of your choice',
        'A light crossbow and 20 bolts',
        'Studded leather armor or scale mail',
        'Thieves’ tools and a dungeoneer’s pack (or 5d4 × 10 gp starting gold)'
      ],
      classTableColumns: [
        { key: 'level', label: 'Level' },
        { key: 'proficiencyBonus', label: 'PB' },
        { key: 'features', label: 'Features' },
        { key: 'infusionsKnown', label: 'Infusions' },
        { key: 'infusedItems', label: 'Items' },
        { key: 'cantripsKnown', label: 'Cantrips' },
        { key: 'spellSlots1', label: '1st' },
        { key: 'spellSlots2', label: '2nd' },
        { key: 'spellSlots3', label: '3rd' },
        { key: 'spellSlots4', label: '4th' },
        { key: 'spellSlots5', label: '5th' }
      ],
      classTable: [
        { level: 1, proficiencyBonus: '+2', features: 'Magical Tinkering, Spellcasting', infusionsKnown: '—', infusedItems: '—', cantripsKnown: 2, spellSlots1: 2, spellSlots2: '—', spellSlots3: '—', spellSlots4: '—', spellSlots5: '—' },
        { level: 2, proficiencyBonus: '+2', features: 'Infuse Item', infusionsKnown: '4', infusedItems: '2', cantripsKnown: 2, spellSlots1: 2, spellSlots2: '—', spellSlots3: '—', spellSlots4: '—', spellSlots5: '—' },
        { level: 3, proficiencyBonus: '+2', features: 'Artificer Specialist, The Right Tool for the Job', infusionsKnown: '4', infusedItems: '2', cantripsKnown: 2, spellSlots1: 3, spellSlots2: '—', spellSlots3: '—', spellSlots4: '—', spellSlots5: '—' },
        { level: 4, proficiencyBonus: '+2', features: 'Ability Score Improvement', infusionsKnown: '4', infusedItems: '2', cantripsKnown: 2, spellSlots1: 3, spellSlots2: '—', spellSlots3: '—', spellSlots4: '—', spellSlots5: '—' },
        { level: 5, proficiencyBonus: '+3', features: 'Specialist Feature', infusionsKnown: '4', infusedItems: '2', cantripsKnown: 2, spellSlots1: 4, spellSlots2: 2, spellSlots3: '—', spellSlots4: '—', spellSlots5: '—' },
        { level: 6, proficiencyBonus: '+3', features: 'Tool Expertise', infusionsKnown: '6', infusedItems: '3', cantripsKnown: 2, spellSlots1: 4, spellSlots2: 2, spellSlots3: '—', spellSlots4: '—', spellSlots5: '—' },
        { level: 7, proficiencyBonus: '+3', features: 'Flash of Genius', infusionsKnown: '6', infusedItems: '3', cantripsKnown: 2, spellSlots1: 4, spellSlots2: 3, spellSlots3: '—', spellSlots4: '—', spellSlots5: '—' },
        { level: 8, proficiencyBonus: '+3', features: 'Ability Score Improvement', infusionsKnown: '6', infusedItems: '3', cantripsKnown: 2, spellSlots1: 4, spellSlots2: 3, spellSlots3: '—', spellSlots4: '—', spellSlots5: '—' },
        { level: 9, proficiencyBonus: '+4', features: 'Specialist Feature', infusionsKnown: '6', infusedItems: '3', cantripsKnown: 2, spellSlots1: 4, spellSlots2: 3, spellSlots3: 2, spellSlots4: '—', spellSlots5: '—' },
        { level: 10, proficiencyBonus: '+4', features: 'Magic Item Adept', infusionsKnown: '8', infusedItems: '4', cantripsKnown: 3, spellSlots1: 4, spellSlots2: 3, spellSlots3: 2, spellSlots4: '—', spellSlots5: '—' },
        { level: 11, proficiencyBonus: '+4', features: 'Spell-Storing Item', infusionsKnown: '8', infusedItems: '4', cantripsKnown: 3, spellSlots1: 4, spellSlots2: 3, spellSlots3: 3, spellSlots4: '—', spellSlots5: '—' },
        { level: 12, proficiencyBonus: '+4', features: 'Ability Score Improvement', infusionsKnown: '8', infusedItems: '4', cantripsKnown: 3, spellSlots1: 4, spellSlots2: 3, spellSlots3: 3, spellSlots4: '—', spellSlots5: '—' },
        { level: 13, proficiencyBonus: '+5', features: '—', infusionsKnown: '8', infusedItems: '4', cantripsKnown: 3, spellSlots1: 4, spellSlots2: 3, spellSlots3: 3, spellSlots4: 1, spellSlots5: '—' },
        { level: 14, proficiencyBonus: '+5', features: 'Magic Item Savant', infusionsKnown: '10', infusedItems: '5', cantripsKnown: 4, spellSlots1: 4, spellSlots2: 3, spellSlots3: 3, spellSlots4: 2, spellSlots5: '—' },
        { level: 15, proficiencyBonus: '+5', features: 'Specialist Feature', infusionsKnown: '10', infusedItems: '5', cantripsKnown: 4, spellSlots1: 4, spellSlots2: 3, spellSlots3: 3, spellSlots4: 2, spellSlots5: '—' },
        { level: 16, proficiencyBonus: '+5', features: 'Ability Score Improvement', infusionsKnown: '10', infusedItems: '5', cantripsKnown: 4, spellSlots1: 4, spellSlots2: 3, spellSlots3: 3, spellSlots4: 2, spellSlots5: '—' },
        { level: 17, proficiencyBonus: '+6', features: '—', infusionsKnown: '10', infusedItems: '5', cantripsKnown: 4, spellSlots1: 4, spellSlots2: 3, spellSlots3: 3, spellSlots4: 3, spellSlots5: 1 },
        { level: 18, proficiencyBonus: '+6', features: 'Magic Item Master', infusionsKnown: '12', infusedItems: '6', cantripsKnown: 4, spellSlots1: 4, spellSlots2: 3, spellSlots3: 3, spellSlots4: 3, spellSlots5: 1 },
        { level: 19, proficiencyBonus: '+6', features: 'Ability Score Improvement', infusionsKnown: '12', infusedItems: '6', cantripsKnown: 4, spellSlots1: 4, spellSlots2: 3, spellSlots3: 3, spellSlots4: 3, spellSlots5: 2 },
        { level: 20, proficiencyBonus: '+6', features: 'Soul of Artifice', infusionsKnown: '12', infusedItems: '6', cantripsKnown: 4, spellSlots1: 4, spellSlots2: 3, spellSlots3: 3, spellSlots4: 3, spellSlots5: 2 }
      ],
      features: [
        { level: 1, title: 'Magical Tinkering', description: 'At 1st level, you learn how to invest a spark of magic into mundane objects. To use this ability, you must have tinker’s tools or other artisan’s tools in hand. You then touch a Tiny nonmagical object as an action and give it one of several magical properties, such as emitting light, playing a recorded message, emitting an odor, or displaying a static visual effect.' },
        { level: 1, title: 'Spellcasting', description: 'You have studied the workings of magic, how to channel it through objects. To cast a spell, you must use thieves’ tools or artisan’s tools as a spellcasting focus. Intelligence is your spellcasting ability for artificer spells.' },
        { level: 2, title: 'Infuse Item', description: 'You gain the ability to imbue mundane items with certain magical infusions, turning them into magic items. You learn 4 infusions at 2nd level and can maintain 2 infused items simultaneously.' },
        { level: 3, title: 'Artificer Specialist', description: 'Choose a subclass that represents your specialization: Alchemist, Artillerist, Battle Smith, or Armorer.' },
        { level: 3, title: 'The Right Tool for the Job', description: 'You learn how to produce exactly the tool you need. With tinker’s tools in hand, you can magically create one set of artisan’s tools in an unoccupied space within 5 feet of you at the end of a 1-hour period.' },
        { level: 6, title: 'Tool Expertise', description: 'Your proficiency bonus is doubled for any ability check you make that uses your proficiency with any tool.' },
        { level: 7, title: 'Flash of Genius', description: 'When you or another creature you can see within 30 feet of you makes an ability check or a saving throw, you can use your reaction to add your Intelligence modifier to the roll.' },
        { level: 10, title: 'Magic Item Adept', description: 'You can attune to up to four magic items at once, and crafting common or uncommon magic items takes you a quarter of the normal time and half the gold.' },
        { level: 11, title: 'Spell-Storing Item', description: 'Whenever you finish a long rest, you can touch one simple or martial weapon or one item that you can use as a spellcasting focus, and store a 1st- or 2nd-level spell in it.' },
        { level: 14, title: 'Magic Item Savant', description: 'You can attune to up to five magic items at once, and you ignore all level, class, race, and spell requirements on attuning to or using magic items.' },
        { level: 18, title: 'Magic Item Master', description: 'You can attune to up to six magic items at once.' },
        { level: 20, title: 'Soul of Artifice', description: 'You gain a +1 bonus to all saving throws per magic item you are currently attuned to. Additionally, if you are reduced to 0 hit points, you can use your reaction to end one of your infusions to drop to 1 hit point instead.' }
      ],
      subclasses: [
        {
          id: 'alchemist',
          name: 'Alchemist',
          source: 'Tasha’s Cauldron of Everything / Eberron: Rising from the Last War',
          description: 'An Alchemist is an expert at combining reagents to produce mystical effects. Alchemists use their creations to give life and to leech it away. Alchemy is the oldest of artificer traditions, and its versatility has long been valued during times of war and peace.',
          features: [
            { level: 3, title: 'Tool Proficiency', description: 'When you adopt this specialization at 3rd level, you gain proficiency with alchemist’s supplies. If you already have this proficiency, you gain proficiency with one other type of artisan’s tools of your choice.' },
            { 
              level: 3, 
              title: 'Alchemist Spells', 
              description: 'Starting at 3rd level, you always have certain spells prepared after you reach particular levels in this class:\n\n' +
                '| Artificer Level | Alchemist Spells |\n' +
                '| --- | --- |\n' +
                '| 3rd | Healing Word, Ray of Sickness |\n' +
                '| 5th | Flaming Sphere, Melf’s Acid Arrow |\n' +
                '| 9th | Gaseous Form, Mass Healing Word |\n' +
                '| 13th | Blight, Death Ward |\n' +
                '| 17th | Cloudkill, Raise Dead |\n\n' +
                'These spells count as artificer spells for you, but don’t count against the number of spells you prepare.' 
            },
            { 
              level: 3, 
              title: 'Experimental Elixir', 
              description: 'Whenever you finish a long rest, you can magically produce an experimental elixir in an empty flask you touch. Roll on the Experimental Elixir table for its effect:\n\n' +
                '| d6 | Elixir Effect |\n' +
                '| --- | --- |\n' +
                '| 1 | **Healing.** The drinker regains 2d4 + Intelligence modifier hit points. |\n' +
                '| 2 | **Swiftness.** The drinker’s walking speed increases by 10 feet for 1 hour. |\n' +
                '| 3 | **Resilience.** The drinker gains a +1 bonus to AC for 10 minutes. |\n' +
                '| 4 | **Boldness.** The drinker can roll a d4 and add the number to every attack roll and saving throw for 1 minute. |\n' +
                '| 5 | **Flight.** The drinker gains a flying speed of 10 feet for 10 minutes. |\n' +
                '| 6 | **Transformation.** The drinker’s body is transformed as if by the Alter Self spell for 10 minutes. |\n\n' +
                'You can create additional experimental elixirs by expending a 1st-level or higher spell slot for each. You make 2 elixirs at 6th level, and 3 at 15th level.' 
            },
            { level: 5, title: 'Alchemical Savant', description: 'At 5th level, whenever you cast a spell using your alchemist’s supplies as the spellcasting focus, you gain a bonus equal to your Intelligence modifier to one roll of the spell that restores hit points or deals acid, fire, necrotic, or poison damage.' },
            { level: 9, title: 'Restorative Reagents', description: 'Starting at 9th level, whenever a creature drinks an experimental elixir you created, it gains temporary hit points equal to 2d6 + your Intelligence modifier. Additionally, you can cast Lesser Restoration without expending a spell slot.' },
            { level: 15, title: 'Chemical Mastery', description: 'By 15th level, you gain resistance to acid damage and poison damage, and immunity to the poisoned condition. You can also cast Greater Restoration and Heal without expending a spell slot.' }
          ]
        },
        {
          id: 'armorer',
          name: 'Armorer',
          source: 'Tasha’s Cauldron of Everything',
          description: 'An Armorer specializes in modifying armor to function almost like a second skin. The armor is enhanced to hone the artificer’s magic and unleash potent attacks.',
          features: [
            { level: 3, title: 'Tools of the Trade', description: 'You gain proficiency with heavy armor and smith’s tools.' },
            { level: 3, title: 'Arcane Armor', description: 'Your metallurgical pursuits allow you to turn a suit of armor into a conduit for your magic. It attaches to you, can’t be removed against your will, replaces lost limbs, and ignores Strength requirements.' },
            { level: 3, title: 'Armor Model', description: 'You can customize your Arcane Armor to be Guardian (designed for front-line melee with Thunder Gauntlets) or Infiltrator (designed for stealth and speed with Lightning Launcher).' },
            { level: 5, title: 'Extra Attack', description: 'You can attack twice, instead of once, whenever you take the Attack action on your turn.' },
            { level: 9, title: 'Armor Modifications', description: 'You learn how to use your artificer infusions to specially modify your Arcane Armor. The armor counts as separate items: chest piece, boots, helmet, and weapon.' },
            { level: 15, title: 'Perfected Armor', description: 'Your Arcane Armor gains additional benefits based on its model (Guardian or Infiltrator).' }
          ]
        },
        {
          id: 'artillerist',
          name: 'Artillerist',
          source: 'Tasha’s Cauldron of Everything / Eberron: Rising from the Last War',
          description: 'An Artillerist specializes in hurling fire, force, and magical projectiles onto the battlefield, creating magical cannons to devastate foes or shield allies.',
          features: [
            { level: 3, title: 'Tool Proficiency', description: 'You gain proficiency with woodcarver’s tools.' },
            { 
              level: 3, 
              title: 'Artillerist Spells', 
              description: '| Artificer Level | Artillerist Spells |\n| --- | --- |\n| 3rd | Shield, Thunderwave |\n| 5th | Scorching Ray, Shatter |\n| 9th | Fireball, Wind Wall |\n| 13th | Ice Storm, Wall of Fire |\n| 17th | Cone of Cold, Wall of Force |' 
            },
            { level: 3, title: 'Eldritch Cannon', description: 'You learn how to create a magical cannon (Flamethrower, Force Ballista, or Protector) as an action using woodcarver’s tools. It lasts for 1 hour and can be commanded as a bonus action.' },
            { level: 5, title: 'Arcane Firearm', description: 'You turn a wand, staff, or rod into an arcane firearm. When you cast an artificer spell through it, roll a d8 and add the result to one of the spell’s damage rolls.' },
            { level: 9, title: 'Explosive Cannon', description: 'Every cannon you create now deals 3d8 damage or grants 1d8 + Int mod temporary hit points. As an action, you can detonate the cannon.' },
            { level: 15, title: 'Fortified Position', description: 'You can now have two cannons at the same time, and your cannons provide half cover (+2 AC and Dex saves) to allies within 10 feet.' }
          ]
        },
        {
          id: 'battle-smith',
          name: 'Battle Smith',
          source: 'Tasha’s Cauldron of Everything / Eberron: Rising from the Last War',
          description: 'Armored defenders and weapon masters, Battle Smiths forge magical iron defenders to fight alongside them in battle.',
          features: [
            { level: 3, title: 'Tool Proficiency', description: 'You gain proficiency with smith’s tools.' },
            { 
              level: 3, 
              title: 'Battle Smith Spells', 
              description: '| Artificer Level | Battle Smith Spells |\n| --- | --- |\n| 3rd | Heroism, Shield |\n| 5th | Branding Smite, Warding Bond |\n| 9th | Aura of Vitality, Blinding Smite |\n| 13th | Aura of Purity, Staggering Smite |\n| 17th | Banishing Smite, Mass Cure Wounds |' 
            },
            { level: 3, title: 'Battle Ready', description: 'You gain proficiency with martial weapons. When you attack with a magic weapon, you can use your Intelligence modifier instead of Strength or Dexterity for attack and damage rolls.' },
            { level: 3, title: 'Steel Defender', description: 'Your tinkering produces a faithful Steel Defender companion that accompanies you on adventures and obeys your mental commands in battle.' },
            { level: 5, title: 'Extra Attack', description: 'You can attack twice, instead of once, whenever you take the Attack action on your turn.' },
            { level: 9, title: 'Arcane Jolt', description: 'When you or your Steel Defender hits a target with a weapon attack, you can channel magical energy to deal an extra 2d6 force damage or restore 2d6 hit points to a nearby creature.' },
            { level: 15, title: 'Improved Defender', description: 'Your Arcane Jolt and Steel Defender become significantly more powerful, increasing damage and AC bonus.' }
          ]
        }
      ]
    }
  },

  // 2. BARBARIAN
  {
    id: 'barbarian',
    collectionName: 'classes',
    name: 'Barbarian',
    sourceType: 'system',
    data: {
      source: 'Player’s Handbook (PHB)',
      shortDescription: 'A fierce warrior of primitive background who can enter a battle rage.',
      description: 'Barbarians are driven by a primal instinct and furious rage that grants them superhuman strength, resilience, and combat prowess. In battle, they tap into an inner reservoir of fury that allows them to shrug off lethal blows and strike down enemies with overwhelming force.\n\n*Multiclassing Requirement: Strength 13 or higher.*',
      hitPoints: {
        hitDice: '1d12 per barbarian level',
        firstLevel: '12 + your Constitution modifier',
        higherLevels: '1d12 (or 7) + your Constitution modifier per barbarian level after 1st'
      },
      proficiencies: {
        armor: 'Light armor, medium armor, shields',
        weapons: 'Simple weapons, martial weapons',
        tools: 'None',
        savingThrows: 'Strength, Constitution',
        skills: 'Choose two from Animal Handling, Athletics, Intimidation, Nature, Perception, Survival'
      },
      equipment: [
        'A greataxe or any martial melee weapon',
        'Two handaxes or any simple weapon',
        'An explorer’s pack and four javelins'
      ],
      classTableColumns: [
        { key: 'level', label: 'Level' },
        { key: 'proficiencyBonus', label: 'PB' },
        { key: 'features', label: 'Features' },
        { key: 'rages', label: 'Rages' },
        { key: 'rageDamage', label: 'Rage Damage' }
      ],
      classTable: [
        { level: 1, proficiencyBonus: '+2', features: 'Rage, Unarmored Defense', rages: '2', rageDamage: '+2' },
        { level: 2, proficiencyBonus: '+2', features: 'Reckless Attack, Danger Sense', rages: '2', rageDamage: '+2' },
        { level: 3, proficiencyBonus: '+2', features: 'Primal Path', rages: '3', rageDamage: '+2' },
        { level: 4, proficiencyBonus: '+2', features: 'Ability Score Improvement', rages: '3', rageDamage: '+2' },
        { level: 5, proficiencyBonus: '+3', features: 'Extra Attack, Fast Movement', rages: '3', rageDamage: '+2' },
        { level: 6, proficiencyBonus: '+3', features: 'Path Feature', rages: '4', rageDamage: '+2' },
        { level: 7, proficiencyBonus: '+3', features: 'Feral Instinct', rages: '4', rageDamage: '+2' },
        { level: 8, proficiencyBonus: '+3', features: 'Ability Score Improvement', rages: '4', rageDamage: '+2' },
        { level: 9, proficiencyBonus: '+4', features: 'Brutal Critical (1 die)', rages: '4', rageDamage: '+3' },
        { level: 10, proficiencyBonus: '+4', features: 'Path Feature', rages: '4', rageDamage: '+3' },
        { level: 11, proficiencyBonus: '+4', features: 'Relentless Rage', rages: '4', rageDamage: '+3' },
        { level: 12, proficiencyBonus: '+4', features: 'Ability Score Improvement', rages: '5', rageDamage: '+3' },
        { level: 13, proficiencyBonus: '+5', features: 'Brutal Critical (2 dice)', rages: '5', rageDamage: '+3' },
        { level: 14, proficiencyBonus: '+5', features: 'Path Feature', rages: '5', rageDamage: '+3' },
        { level: 15, proficiencyBonus: '+5', features: 'Persistent Rage', rages: '5', rageDamage: '+3' },
        { level: 16, proficiencyBonus: '+5', features: 'Ability Score Improvement', rages: '5', rageDamage: '+4' },
        { level: 17, proficiencyBonus: '+6', features: 'Brutal Critical (3 dice)', rages: '6', rageDamage: '+4' },
        { level: 18, proficiencyBonus: '+6', features: 'Indomitable Might', rages: '6', rageDamage: '+4' },
        { level: 19, proficiencyBonus: '+6', features: 'Ability Score Improvement', rages: '6', rageDamage: '+4' },
        { level: 20, proficiencyBonus: '+6', features: 'Primal Champion', rages: 'Unlimited', rageDamage: '+4' }
      ],
      features: [
        { level: 1, title: 'Rage', description: 'In battle, you fight with primal ferocity. On your turn, you can enter a rage as a bonus action. While raging, you gain advantage on Strength checks and Strength saving throws, a bonus to damage rolls when making a melee weapon attack using Strength, and resistance to bludgeoning, piercing, and slashing damage.' },
        { level: 1, title: 'Unarmored Defense', description: 'While you are wearing no armor, your Armor Class equals 10 + your Dexterity modifier + your Constitution modifier. You can use a shield and still gain this benefit.' },
        { level: 2, title: 'Reckless Attack', description: 'When you make your first attack on your turn, you can decide to attack recklessly. Doing so gives you advantage on melee weapon attack rolls using Strength during this turn, but attack rolls against you have advantage until your next turn.' },
        { level: 2, title: 'Danger Sense', description: 'You gain an uncanny sense of when things nearby aren’t as they should be. You have advantage on Dexterity saving throws against effects that you can see, such as traps and spells.' },
        { level: 3, title: 'Primal Path', description: 'Choose a path that shapes the nature of your rage, such as Path of the Berserker, Path of the Totem Warrior, Path of the Zealot, or Path of Wild Magic.' },
        { level: 5, title: 'Extra Attack', description: 'You can attack twice, instead of once, whenever you take the Attack action on your turn.' },
        { level: 5, title: 'Fast Movement', description: 'Your speed increases by 10 feet while you aren’t wearing heavy armor.' },
        { level: 7, title: 'Feral Instinct', description: 'Your instincts are so honed that you have advantage on initiative rolls. If you are surprised at the beginning of combat and aren’t incapacitated, you can act normally on your first turn if you enter your rage before doing anything else.' },
        { level: 9, title: 'Brutal Critical', description: 'You can roll one additional weapon damage die when determining the extra damage for a critical hit with a melee attack.' },
        { level: 11, title: 'Relentless Rage', description: 'Your rage can keep you fighting despite grievous wounds. If you drop to 0 hit points while raging and don’t die outright, you can make a DC 10 Constitution saving throw to drop to 1 hit point instead.' },
        { level: 15, title: 'Persistent Rage', description: 'Your rage is so fierce that it ends early only if you fall unconscious or if you choose to end it.' },
        { level: 18, title: 'Indomitable Might', description: 'If your total for a Strength check is less than your Strength score, you can use that score in place of the total.' },
        { level: 20, title: 'Primal Champion', description: 'You embody the power of the wilds. Your Strength and Constitution scores increase by 4. Your maximum for those scores is now 24.' }
      ],
      subclasses: [
        {
          id: 'path-of-the-berserker',
          name: 'Path of the Berserker',
          source: 'Player’s Handbook (PHB)',
          description: 'For some barbarians, rage is a means to an end. The Path of the Berserker is a path of untamed fury and bloodlust.',
          features: [
            { level: 3, title: 'Frenzy', description: 'Starting when you choose this path at 3rd level, you can go into a frenzy when you rage. If you do so, for the duration of your rage you can make a single melee weapon attack as a bonus action on each of your turns after this one. When your rage ends, you suffer one level of exhaustion.' },
            { level: 6, title: 'Mindless Rage', description: 'Beginning at 6th level, you can’t be charmed or frightened while raging. If you are charmed or frightened when you enter your rage, the effect is suspended for the duration of the rage.' },
            { level: 10, title: 'Intimidating Presence', description: 'Starting at 10th level, you can use your action to frighten someone with your menacing presence. Choose one creature that you can see within 30 feet. If the creature can see or hear you, it must succeed on a Wisdom saving throw (DC 8 + PB + Cha mod) or be frightened until the end of your next turn.' },
            { level: 14, title: 'Retaliation', description: 'Starting at 14th level, when you take damage from a creature that is within 5 feet of you, you can use your reaction to make a melee weapon attack against that creature.' }
          ]
        },
        {
          id: 'path-of-the-totem-warrior',
          name: 'Path of the Totem Warrior',
          source: 'Player’s Handbook (PHB)',
          description: 'The Path of the Totem Warrior is a spiritual journey, as the barbarian accepts a spirit animal as a guide, protector, and inspiration.',
          features: [
            { level: 3, title: 'Spirit Seeker', description: 'Yours is a path that seeks attunement with nature. You gain the ability to cast Beast Sense and Speak with Animals as rituals.' },
            { level: 3, title: 'Totem Spirit', description: 'Choose a totem spirit (Bear, Eagle, or Wolf). **Bear:** While raging, you have resistance to all damage except psychic. **Eagle:** While raging and not wearing heavy armor, other creatures have disadvantage on opportunity attack rolls against you. **Wolf:** While raging, your friends have advantage on melee attack rolls against any creature within 5 feet of you.' },
            { level: 6, title: 'Aspect of the Beast', description: 'You gain a magical benefit based on the totem animal of your choice (Bear gains double carrying capacity, Eagle can see up to 1 mile, Wolf can track while traveling fast).' },
            { level: 14, title: 'Totemic Attunement', description: 'You gain a magical benefit based on your totem spirit when raging (Bear forces disadvantage on attacks against allies, Eagle gains a flying speed, Wolf can knock creatures prone as a bonus action).' }
          ]
        },
        {
          id: 'path-of-the-zealot',
          name: 'Path of the Zealot',
          source: 'Xanathar’s Guide to Everything (XGE)',
          description: 'Barbarians who follow the Path of the Zealot channel their rage into powerful manifestations of divine favor.',
          features: [
            { level: 3, title: 'Divine Fury', description: 'Starting at 3rd level, when you hit a target with a weapon attack while raging, you deal extra necrotic or radiant damage equal to 1d6 + half your barbarian level.' },
            { level: 3, title: 'Warrior of the Gods', description: 'If a spell (such as Raise Dead) has the sole effect of restoring you to life, the caster doesn’t need material components to cast the spell on you.' },
            { level: 6, title: 'Fanatical Focus', description: 'Starting at 6th level, if you fail a saving throw while raging, you can reroll it, and you must use the new roll. You can use this ability once per rage.' },
            { level: 14, title: 'Rage Beyond Death', description: 'Starting at 14th level, while raging, having 0 hit points doesn’t knock you unconscious. You still must make death saving throws, and you suffer normal effects of taking damage.' }
          ]
        },
        {
          id: 'path-of-wild-magic',
          name: 'Path of Wild Magic',
          source: 'Tasha’s Cauldron of Everything (TCE)',
          description: 'Many barbarians embody wild magic that surges whenever their emotions boil over in rage.',
          features: [
            { level: 3, title: 'Magic Awareness', description: 'As an action, you can open your awareness to detect the presence of magic within 60 feet.' },
            { 
              level: 3, 
              title: 'Wild Surge', 
              description: 'When you enter your rage, roll a d8 on the Wild Magic Surge table to unleash a chaotic spell effect (teleportation, shadow tendrils, radiant light, AC bonus to allies, etc.).' 
            },
            { level: 6, title: 'Bolstering Magic', description: 'You can harness your wild magic to bolster yourself or a companion. Touch a creature as an action to give it a 1d3 bonus to attack rolls or restore an expended spell slot.' }
          ]
        }
      ]
    }
  },

  // 3. BARD
  {
    id: 'bard',
    collectionName: 'classes',
    name: 'Bard',
    sourceType: 'system',
    data: {
      source: 'Player’s Handbook (PHB)',
      shortDescription: 'An inspiring magician whose power echoes the music of creation.',
      description: 'Bards weave magic through words and music to inspire allies, demoralize foes, manipulate minds, and heal wounds. Versatile and charismatic, bards master a wide array of skills and spells.',
      hitPoints: {
        hitDice: '1d8 per bard level',
        firstLevel: '8 + your Constitution modifier',
        higherLevels: '1d8 (or 5) + your Constitution modifier per bard level after 1st'
      },
      proficiencies: {
        armor: 'Light armor',
        weapons: 'Simple weapons, hand crossbows, longswords, rapiers, shortswords',
        tools: 'Three musical instruments of your choice',
        savingThrows: 'Dexterity, Charisma',
        skills: 'Choose any three skills'
      },
      equipment: [
        'A rapier, longsword, or any simple weapon',
        'A diplomat’s pack or an entertainer’s pack',
        'A lute or any musical instrument',
        'Leather armor and a dagger'
      ],
      classTableColumns: [
        { key: 'level', label: 'Level' },
        { key: 'proficiencyBonus', label: 'PB' },
        { key: 'features', label: 'Features' },
        { key: 'cantripsKnown', label: 'Cantrips' },
        { key: 'spellsKnown', label: 'Spells' },
        { key: 'spellSlots1', label: '1st' },
        { key: 'spellSlots2', label: '2nd' },
        { key: 'spellSlots3', label: '3rd' },
        { key: 'spellSlots4', label: '4th' },
        { key: 'spellSlots5', label: '5th' }
      ],
      classTable: [
        { level: 1, proficiencyBonus: '+2', features: 'Spellcasting, Bardic Inspiration (d6)', cantripsKnown: 2, spellsKnown: 4, spellSlots1: 2, spellSlots2: '—', spellSlots3: '—', spellSlots4: '—', spellSlots5: '—' },
        { level: 2, proficiencyBonus: '+2', features: 'Jack of All Trades, Song of Rest (d6)', cantripsKnown: 2, spellsKnown: 5, spellSlots1: 3, spellSlots2: '—', spellSlots3: '—', spellSlots4: '—', spellSlots5: '—' },
        { level: 3, proficiencyBonus: '+2', features: 'Bard College, Expertise', cantripsKnown: 2, spellsKnown: 6, spellSlots1: 4, spellSlots2: 2, spellSlots3: '—', spellSlots4: '—', spellSlots5: '—' },
        { level: 4, proficiencyBonus: '+2', features: 'Ability Score Improvement', cantripsKnown: 3, spellsKnown: 7, spellSlots1: 4, spellSlots2: 3, spellSlots3: '—', spellSlots4: '—', spellSlots5: '—' },
        { level: 5, proficiencyBonus: '+3', features: 'Bardic Inspiration (d8), Font of Inspiration', cantripsKnown: 3, spellsKnown: 8, spellSlots1: 4, spellSlots2: 3, spellSlots3: 2, spellSlots4: '—', spellSlots5: '—' }
      ],
      features: [
        { level: 1, title: 'Spellcasting', description: 'You have learned to untangle and reshape the fabric of reality in harmony with your wishes and music. Charisma is your spellcasting ability.' },
        { level: 1, title: 'Bardic Inspiration', description: 'You can inspire others through stirring words or music. As a bonus action, choose one creature within 60 feet. That creature gains one Bardic Inspiration die (d6), which it can add to one ability check, attack roll, or saving throw.' },
        { level: 2, title: 'Jack of All Trades', description: 'Starting at 2nd level, you can add half your proficiency bonus, rounded down, to any ability check you make that doesn’t already include your proficiency bonus.' },
        { level: 2, title: 'Song of Rest', description: 'You can use soothing music or oration to help revitalize your wounded allies during a short rest. If you or any friendly creatures regain hit points at the end of the short rest, each regains an extra 1d6 hit points.' },
        { level: 3, title: 'Expertise', description: 'Choose two of your skill proficiencies. Your proficiency bonus is doubled for any ability check you make that uses either of the chosen proficiencies.' },
        { level: 5, title: 'Font of Inspiration', description: 'You regain all of your expended uses of Bardic Inspiration when you finish a short or long rest.' }
      ],
      subclasses: [
        {
          id: 'college-of-lore',
          name: 'College of Lore',
          description: 'Bards of the College of Lore know something about most everything, collecting tidbits of knowledge from sources as diverse as scholarly tomes and peasant tales.',
          features: [
            { level: 3, title: 'Bonus Proficiencies', description: 'You gain proficiency with three skills of your choice.' },
            { level: 3, title: 'Cutting Words', description: 'When a creature that you can see within 60 feet of you makes an attack roll, an ability check, or a damage roll, you can use your reaction to expend one of your uses of Bardic Inspiration, subtracting the number rolled from the creature’s roll.' }
          ]
        },
        {
          id: 'college-of-valor',
          name: 'College of Valor',
          description: 'Bards of the College of Valor are daring skalds whose tales keep alive the memory of great heroes of the past.',
          features: [
            { level: 3, title: 'Bonus Proficiencies', description: 'You gain proficiency with medium armor, shields, and martial weapons.' },
            { level: 3, title: 'Combat Inspiration', description: 'A creature that has a Bardic Inspiration die from you can add it to a weapon damage roll or use a reaction to add it to AC against an attack.' }
          ]
        }
      ]
    }
  },

  // 4. CLERIC
  {
    id: 'cleric',
    collectionName: 'classes',
    name: 'Cleric',
    sourceType: 'system',
    data: {
      source: 'Player’s Handbook (PHB)',
      shortDescription: 'A priestly champion who wields divine magic in service of a higher power.',
      description: 'Clerics are intermediaries between the mortal world and the distant planes of the gods. As varied as the gods they serve, clerics strive to embody the ideals of their deities and channel holy or unholy magic.',
      hitPoints: {
        hitDice: '1d8 per cleric level',
        firstLevel: '8 + your Constitution modifier',
        higherLevels: '1d8 (or 5) + your Constitution modifier per cleric level after 1st'
      },
      proficiencies: {
        armor: 'Light armor, medium armor, shields',
        weapons: 'Simple weapons',
        tools: 'None',
        savingThrows: 'Wisdom, Charisma',
        skills: 'Choose two from History, Insight, Medicine, Persuasion, Religion'
      },
      equipment: [
        'A mace or a warhammer (if proficient)',
        'Scale mail, leather armor, or chain mail (if proficient)',
        'A light crossbow and 20 bolts or any simple weapon',
        'A priest’s pack or an explorer’s pack, a shield and a holy symbol'
      ],
      classTableColumns: [
        { key: 'level', label: 'Level' },
        { key: 'proficiencyBonus', label: 'PB' },
        { key: 'features', label: 'Features' },
        { key: 'cantripsKnown', label: 'Cantrips' },
        { key: 'spellSlots1', label: '1st' },
        { key: 'spellSlots2', label: '2nd' },
        { key: 'spellSlots3', label: '3rd' }
      ],
      classTable: [
        { level: 1, proficiencyBonus: '+2', features: 'Spellcasting, Divine Domain', cantripsKnown: 3, spellSlots1: 2, spellSlots2: '—', spellSlots3: '—' },
        { level: 2, proficiencyBonus: '+2', features: 'Channel Divinity (1/rest), Domain Feature', cantripsKnown: 3, spellSlots1: 3, spellSlots2: '—', spellSlots3: '—' },
        { level: 3, proficiencyBonus: '+2', features: '—', cantripsKnown: 3, spellSlots1: 4, spellSlots2: 2, spellSlots3: '—' },
        { level: 4, proficiencyBonus: '+2', features: 'Ability Score Improvement', cantripsKnown: 4, spellSlots1: 4, spellSlots2: 3, spellSlots3: '—' },
        { level: 5, proficiencyBonus: '+3', features: 'Destroy Undead (CR 1/2)', cantripsKnown: 4, spellSlots1: 4, spellSlots2: 3, spellSlots3: 2 }
      ],
      features: [
        { level: 1, title: 'Spellcasting', description: 'As a conduit for divine power, you can cast cleric spells. Wisdom is your spellcasting ability.' },
        { level: 1, title: 'Divine Domain', description: 'Choose one domain related to your deity: Life, Light, Tempest, Trickery, War, Knowledge, or Nature.' },
        { level: 2, title: 'Channel Divinity', description: 'You gain the ability to channel divine energy directly from your deity to fuel magical effects, including Turn Undead and domain-specific options.' },
        { level: 5, title: 'Destroy Undead', description: 'When an undead fails its saving throw against your Turn Undead feature, the creature is instantly destroyed if its challenge rating is at or below a certain threshold.' }
      ],
      subclasses: [
        {
          id: 'life-domain',
          name: 'Life Domain',
          description: 'The Life domain focuses on the vibrant positive energy—one of the fundamental forces of the multiverse—that sustains all life.',
          features: [
            { level: 1, title: 'Bonus Proficiency', description: 'You gain proficiency with heavy armor.' },
            { level: 1, title: 'Disciple of Life', description: 'Your healing spells are more effective. Whenever you use a spell of 1st level or higher to restore hit points, the creature regains additional hit points equal to 2 + the spell’s level.' }
          ]
        },
        {
          id: 'light-domain',
          name: 'Light Domain',
          description: 'Gods of light promote truth, vigilance, and beauty, driving back the shadows with blinding radiance and searing flames.',
          features: [
            { level: 1, title: 'Bonus Cantrip', description: 'You gain the Light cantrip if you don’t already know it.' },
            { level: 1, title: 'Warding Flare', description: 'When you are attacked by a creature within 30 feet that you can see, you can use your reaction to impose disadvantage on the attack roll.' }
          ]
        }
      ]
    }
  },

  // 5. DRUID
  {
    id: 'druid',
    collectionName: 'classes',
    name: 'Druid',
    sourceType: 'system',
    data: {
      source: 'Player’s Handbook (PHB)',
      shortDescription: 'A priest of the Old Faith, wielding the powers of nature and adopting animal forms.',
      description: 'Druids call upon the elemental forces of nature and the spirits of wild beasts. Whether turning into fierce animals or calling down lightning, druids protect the balance of the natural world.',
      hitPoints: {
        hitDice: '1d8 per druid level',
        firstLevel: '8 + your Constitution modifier',
        higherLevels: '1d8 (or 5) + your Constitution modifier per druid level after 1st'
      },
      proficiencies: {
        armor: 'Light armor, medium armor, shields (druids will not wear armor or use shields made of metal)',
        weapons: 'Clubs, daggers, darts, javelins, maces, quarterstaffs, scimitars, sickles, slings, spears',
        tools: 'Herbalism kit',
        savingThrows: 'Intelligence, Wisdom',
        skills: 'Choose two from Arcana, Animal Handling, Insight, Medicine, Nature, Perception, Religion, Survival'
      },
      equipment: [
        'A wooden shield or any simple weapon',
        'A scimitar or any simple melee weapon',
        'Leather armor, an explorer’s pack, and a druidic focus'
      ],
      classTableColumns: [
        { key: 'level', label: 'Level' },
        { key: 'proficiencyBonus', label: 'PB' },
        { key: 'features', label: 'Features' },
        { key: 'cantripsKnown', label: 'Cantrips' },
        { key: 'spellSlots1', label: '1st' },
        { key: 'spellSlots2', label: '2nd' }
      ],
      classTable: [
        { level: 1, proficiencyBonus: '+2', features: 'Druidic, Spellcasting', cantripsKnown: 2, spellSlots1: 2, spellSlots2: '—' },
        { level: 2, proficiencyBonus: '+2', features: 'Wild Shape, Druid Circle', cantripsKnown: 2, spellSlots1: 3, spellSlots2: '—' },
        { level: 3, proficiencyBonus: '+2', features: '—', cantripsKnown: 2, spellSlots1: 4, spellSlots2: 2 }
      ],
      features: [
        { level: 1, title: 'Druidic', description: 'You know Druidic, the secret language of druids. You can speak the language and use it to leave hidden messages.' },
        { level: 1, title: 'Spellcasting', description: 'Drawing on the divine essence of nature itself, you can cast spells to shape that essence to your will. Wisdom is your spellcasting ability.' },
        { level: 2, title: 'Wild Shape', description: 'You can use your action to magically assume the shape of a beast that you have seen before. You can use this feature twice per short or long rest.' }
      ],
      subclasses: [
        {
          id: 'circle-of-the-moon',
          name: 'Circle of the Moon',
          description: 'Druids of the Circle of the Moon are fierce guardians of the wilds who master combat transformation.',
          features: [
            { level: 2, title: 'Combat Wild Shape', description: 'You can use Wild Shape as a bonus action rather than an action. Additionally, while transformed, you can spend a spell slot to heal yourself.' },
            { level: 2, title: 'Circle Forms', description: 'You can transform into more dangerous beast forms (CR 1 at 2nd level).' }
          ]
        },
        {
          id: 'circle-of-the-land',
          name: 'Circle of the Land',
          description: 'The Circle of the Land is made up of mystics and sages who preserve ancient knowledge and rites through a vast oral tradition.',
          features: [
            { level: 2, title: 'Bonus Cantrip', description: 'You learn one additional druid cantrip of your choice.' },
            { level: 2, title: 'Natural Recovery', description: 'During a short rest, you can choose expended spell slots to recover.' }
          ]
        }
      ]
    }
  },

  // 6. FIGHTER
  {
    id: 'fighter',
    collectionName: 'classes',
    name: 'Fighter',
    sourceType: 'system',
    data: {
      source: 'Player’s Handbook (PHB)',
      shortDescription: 'A master of martial combat, skilled with a variety of weapons and armor.',
      description: 'Fighters master weapons and armor, studying tactics and combat techniques to excel on the battlefield. From armored knights to agile archers, fighters are relentless warriors who turn combat into an art form.',
      hitPoints: {
        hitDice: '1d10 per fighter level',
        firstLevel: '10 + your Constitution modifier',
        higherLevels: '1d10 (or 6) + your Constitution modifier per fighter level after 1st'
      },
      proficiencies: {
        armor: 'All armor, shields',
        weapons: 'Simple weapons, martial weapons',
        tools: 'None',
        savingThrows: 'Strength, Constitution',
        skills: 'Choose two from Acrobatics, Animal Handling, Athletics, History, Insight, Intimidation, Perception, Survival'
      },
      equipment: [
        'Chain mail or leather armor, longbow, and 20 arrows',
        'A martial weapon and a shield or two martial weapons',
        'A light crossbow and 20 bolts or two handaxes',
        'A dungeoneer’s pack or an explorer’s pack'
      ],
      classTableColumns: [
        { key: 'level', label: 'Level' },
        { key: 'proficiencyBonus', label: 'PB' },
        { key: 'features', label: 'Features' }
      ],
      classTable: [
        { level: 1, proficiencyBonus: '+2', features: 'Fighting Style, Second Wind' },
        { level: 2, proficiencyBonus: '+2', features: 'Action Surge (1 use)' },
        { level: 3, proficiencyBonus: '+2', features: 'Martial Archetype' },
        { level: 4, proficiencyBonus: '+2', features: 'Ability Score Improvement' },
        { level: 5, proficiencyBonus: '+3', features: 'Extra Attack' },
        { level: 9, proficiencyBonus: '+4', features: 'Indomitable (1 use)' },
        { level: 11, proficiencyBonus: '+4', features: 'Extra Attack (2)' },
        { level: 20, proficiencyBonus: '+6', features: 'Extra Attack (3)' }
      ],
      features: [
        { level: 1, title: 'Fighting Style', description: 'You adopt a particular style of fighting as your specialty, such as Archery, Defense, Dueling, Great Weapon Fighting, Protection, or Two-Weapon Fighting.' },
        { level: 1, title: 'Second Wind', description: 'You have a limited well of stamina that you can draw on to protect yourself from harm. On your turn, you can use a bonus action to regain hit points equal to 1d10 + your fighter level.' },
        { level: 2, title: 'Action Surge', description: 'You can push yourself beyond your normal limits for a moment. On your turn, you can take one additional action on top of your regular action and a possible bonus action.' },
        { level: 5, title: 'Extra Attack', description: 'You can attack twice whenever you take the Attack action on your turn.' }
      ],
      subclasses: [
        {
          id: 'champion',
          name: 'Champion',
          description: 'The archetypal Champion focuses on the development of raw physical power honed to deadly perfection.',
          features: [
            { level: 3, title: 'Improved Critical', description: 'Your weapon attacks score a critical hit on a roll of 19 or 20.' },
            { level: 7, title: 'Remarkable Athlete', description: 'You can add half your proficiency bonus to any Strength, Dexterity, or Constitution check you make that doesn’t already use your proficiency bonus.' }
          ]
        },
        {
          id: 'battle-master',
          name: 'Battle Master',
          description: 'Battle Masters view combat as an academic field, applying tactics and maneuver superiority on the battlefield.',
          features: [
            { level: 3, title: 'Combat Superiority', description: 'You learn maneuvers that are fueled by special dice called superiority dice (d8).' },
            { level: 3, title: 'Student of War', description: 'You gain proficiency with one type of artisan’s tools of your choice.' }
          ]
        }
      ]
    }
  },

  // 7. MONK
  {
    id: 'monk',
    collectionName: 'classes',
    name: 'Monk',
    sourceType: 'system',
    data: {
      source: 'Player’s Handbook (PHB)',
      shortDescription: 'A master of martial arts, harnessing the power of ki within their body.',
      description: 'Monks harness the magic of ki to perform superhuman feats of agility, speed, and martial arts. Through intense discipline and meditation, they turn their own bodies into deadly weapons.',
      hitPoints: {
        hitDice: '1d8 per monk level',
        firstLevel: '8 + your Constitution modifier',
        higherLevels: '1d8 (or 5) + your Constitution modifier per monk level after 1st'
      },
      proficiencies: {
        armor: 'None',
        weapons: 'Simple weapons, shortswords',
        tools: 'Choose one type of artisan’s tools or one musical instrument',
        savingThrows: 'Strength, Dexterity',
        skills: 'Choose two from Acrobatics, Athletics, History, Insight, Religion, Stealth'
      },
      equipment: [
        'A shortsword or any simple weapon',
        'A dungeoneer’s pack or an explorer’s pack',
        '10 darts'
      ],
      classTableColumns: [
        { key: 'level', label: 'Level' },
        { key: 'proficiencyBonus', label: 'PB' },
        { key: 'features', label: 'Features' },
        { key: 'martialArts', label: 'Martial Arts' },
        { key: 'kiPoints', label: 'Ki Points' },
        { key: 'unarmoredMovement', label: 'Unarmored Speed' }
      ],
      classTable: [
        { level: 1, proficiencyBonus: '+2', features: 'Unarmored Defense, Martial Arts', martialArts: '1d4', kiPoints: '—', unarmoredMovement: '—' },
        { level: 2, proficiencyBonus: '+2', features: 'Ki, Unarmored Movement', martialArts: '1d4', kiPoints: '2', unarmoredMovement: '+10 ft.' },
        { level: 3, proficiencyBonus: '+2', features: 'Monastic Tradition, Deflect Missiles', martialArts: '1d4', kiPoints: '3', unarmoredMovement: '+10 ft.' },
        { level: 5, proficiencyBonus: '+3', features: 'Extra Attack, Stunning Strike', martialArts: '1d6', kiPoints: '5', unarmoredMovement: '+10 ft.' }
      ],
      features: [
        { level: 1, title: 'Unarmored Defense', description: 'Beginning at 1st level, while you are wearing no armor and not wielding a shield, your AC equals 10 + your Dexterity modifier + your Wisdom modifier.' },
        { level: 1, title: 'Martial Arts', description: 'At 1st level, your practice of martial arts gives you mastery of combat styles that use unarmed strikes and monk weapons.' },
        { level: 2, title: 'Ki', description: 'Your training allows you to harness the mystic energy of ki. You can spend Ki points to fuel Flurry of Blows, Patient Defense, or Step of the Wind.' },
        { level: 3, title: 'Deflect Missiles', description: 'You can use your reaction to deflect or catch the missile when you are hit by a ranged weapon attack.' },
        { level: 5, title: 'Stunning Strike', description: 'You can interfere with the flow of ki in an opponent’s body. When you hit another creature with a melee weapon attack, you can spend 1 ki point to attempt to stun the target.' }
      ],
      subclasses: [
        {
          id: 'way-of-the-open-hand',
          name: 'Way of the Open Hand',
          description: 'Monks of the Way of the Open Hand are the ultimate masters of martial arts combat, whether armed or unarmed.',
          features: [
            { level: 3, title: 'Open Hand Technique', description: 'Whenever you hit a creature with one of the attacks granted by your Flurry of Blows, you can impose one of several effects: knock prone, push 15 ft, or deny reactions.' }
          ]
        }
      ]
    }
  },

  // 8. PALADIN
  {
    id: 'paladin',
    collectionName: 'classes',
    name: 'Paladin',
    sourceType: 'system',
    data: {
      source: 'Player’s Handbook (PHB)',
      shortDescription: 'A holy warrior bound by a sacred oath to uphold justice and righteousness.',
      description: 'Paladins are holy champions bound by powerful oaths to fight evil and protect the innocent. Combining heavy armor, martial skill, and divine smites, paladins serve as beacons of hope and terror to their foes.',
      hitPoints: {
        hitDice: '1d10 per paladin level',
        firstLevel: '10 + your Constitution modifier',
        higherLevels: '1d10 (or 6) + your Constitution modifier per paladin level after 1st'
      },
      proficiencies: {
        armor: 'All armor, shields',
        weapons: 'Simple weapons, martial weapons',
        tools: 'None',
        savingThrows: 'Wisdom, Charisma',
        skills: 'Choose two from Athletics, Insight, Intimidation, Medicine, Persuasion, Religion'
      },
      equipment: [
        'A martial weapon and a shield or two martial weapons',
        'Five javelins or any simple melee weapon',
        'A priest’s pack or an explorer’s pack',
        'Chain mail and a holy symbol'
      ],
      classTableColumns: [
        { key: 'level', label: 'Level' },
        { key: 'proficiencyBonus', label: 'PB' },
        { key: 'features', label: 'Features' },
        { key: 'spellSlots1', label: '1st' },
        { key: 'spellSlots2', label: '2nd' }
      ],
      classTable: [
        { level: 1, proficiencyBonus: '+2', features: 'Divine Sense, Lay on Hands', spellSlots1: '—', spellSlots2: '—' },
        { level: 2, proficiencyBonus: '+2', features: 'Fighting Style, Spellcasting, Divine Smite', spellSlots1: '2', spellSlots2: '—' },
        { level: 3, proficiencyBonus: '+2', features: 'Divine Health, Sacred Oath', spellSlots1: '3', spellSlots2: '—' },
        { level: 5, proficiencyBonus: '+3', features: 'Extra Attack', spellSlots1: '4', spellSlots2: '2' },
        { level: 6, proficiencyBonus: '+3', features: 'Aura of Protection', spellSlots1: '4', spellSlots2: '2' }
      ],
      features: [
        { level: 1, title: 'Divine Sense', description: 'The presence of strong evil registers on your senses like a noxious odor, and good rings like heavenly music. As an action, you can open your awareness to detect celestials, fiends, or undead within 60 feet.' },
        { level: 1, title: 'Lay on Hands', description: 'Your blessed touch can heal wounds. You have a pool of healing power that replenishes when you take a long rest. With that pool, you can restore a total number of hit points equal to your paladin level × 5.' },
        { level: 2, title: 'Divine Smite', description: 'When you hit a creature with a melee weapon attack, you can expend one spell slot to deal radiant damage to the target, in addition to the weapon’s damage. The extra damage is 2d8 for a 1st-level spell slot, plus 1d8 for each spell level higher than 1st.' },
        { level: 6, title: 'Aura of Protection', description: 'Whenever you or a friendly creature within 10 feet of you must make a saving throw, the creature gains a bonus to the saving throw equal to your Charisma modifier.' }
      ],
      subclasses: [
        {
          id: 'oath-of-devotion',
          name: 'Oath of Devotion',
          description: 'The Oath of Devotion binds a paladin to the loftiest ideals of justice, virtue, and order.',
          features: [
            { level: 3, title: 'Sacred Weapon', description: 'As an action, you can imbue one weapon that you are holding with positive energy. For 1 minute, you add your Charisma modifier to attack rolls made with that weapon.' }
          ]
        }
      ]
    }
  },

  // 9. RANGER
  {
    id: 'ranger',
    collectionName: 'classes',
    name: 'Ranger',
    sourceType: 'system',
    data: {
      source: 'Player’s Handbook (PHB)',
      shortDescription: 'A warrior who uses martial prowess and nature magic to combat threats on the edges of civilization.',
      description: 'Rangers are master hunters and trackers who guard the wilderness and hunt down dangerous beasts and monsters. Combining archery or dual-wielding with nature magic, rangers are deadly survivalists.',
      hitPoints: {
        hitDice: '1d10 per ranger level',
        firstLevel: '10 + your Constitution modifier',
        higherLevels: '1d10 (or 6) + your Constitution modifier per ranger level after 1st'
      },
      proficiencies: {
        armor: 'Light armor, medium armor, shields',
        weapons: 'Simple weapons, martial weapons',
        tools: 'None',
        savingThrows: 'Strength, Dexterity',
        skills: 'Choose three from Animal Handling, Athletics, Insight, Investigation, Nature, Perception, Stealth, Survival'
      },
      equipment: [
        'Scale mail or leather armor',
        'Two shortswords or two simple melee weapons',
        'A dungeoneer’s pack or an explorer’s pack',
        'A longbow and a quiver of 20 arrows'
      ],
      classTableColumns: [
        { key: 'level', label: 'Level' },
        { key: 'proficiencyBonus', label: 'PB' },
        { key: 'features', label: 'Features' },
        { key: 'spellsKnown', label: 'Spells' },
        { key: 'spellSlots1', label: '1st' }
      ],
      classTable: [
        { level: 1, proficiencyBonus: '+2', features: 'Favored Enemy, Natural Explorer', spellsKnown: '—', spellSlots1: '—' },
        { level: 2, proficiencyBonus: '+2', features: 'Fighting Style, Spellcasting', spellsKnown: '2', spellSlots1: '2' },
        { level: 3, proficiencyBonus: '+2', features: 'Ranger Archetype, Primeval Awareness', spellsKnown: '3', spellSlots1: '3' },
        { level: 5, proficiencyBonus: '+3', features: 'Extra Attack', spellsKnown: '4', spellSlots1: '4' }
      ],
      features: [
        { level: 1, title: 'Favored Enemy', description: 'You have significant experience studying, tracking, hunting, and even talking to a certain type of enemy.' },
        { level: 1, title: 'Natural Explorer', description: 'You are particularly familiar with one type of natural environment and are adept at traveling and surviving in such regions.' },
        { level: 3, title: 'Primeval Awareness', description: 'You can use your action and expend one ranger spell slot to focus your awareness on the region around you to detect aberrations, celestials, dragons, elementals, fey, fiends, and undead.' }
      ],
      subclasses: [
        {
          id: 'hunter',
          name: 'Hunter',
          description: 'Emulating the Hunter archetype means accepting your role as a bulwark between civilization and the terrors of the wilderness.',
          features: [
            { level: 3, title: 'Hunter’s Prey', description: 'Choose one feature: Colossus Slayer (extra 1d8 damage against wounded foes), Giant Killer, or Horde Breaker.' }
          ]
        }
      ]
    }
  },

  // 10. ROGUE
  {
    id: 'rogue',
    collectionName: 'classes',
    name: 'Rogue',
    sourceType: 'system',
    data: {
      source: 'Player’s Handbook (PHB)',
      shortDescription: 'A scoundrel who uses stealth and trickery to overcome obstacles and enemies.',
      description: 'Rogues rely on skill, stealth, and their foes’ vulnerabilities to get the upper hand in any situation. They have a knack for finding the solution to any problem, demonstrating a resourcefulness that few other classes can match.',
      hitPoints: {
        hitDice: '1d8 per rogue level',
        firstLevel: '8 + your Constitution modifier',
        higherLevels: '1d8 (or 5) + your Constitution modifier per rogue level after 1st'
      },
      proficiencies: {
        armor: 'Light armor',
        weapons: 'Simple weapons, hand crossbows, longswords, rapiers, shortswords',
        tools: 'Thieves’ tools',
        savingThrows: 'Dexterity, Intelligence',
        skills: 'Choose four from Acrobatics, Athletics, Deception, Insight, Intimidation, Investigation, Perception, Performance, Persuasion, Sleight of Hand, Stealth'
      },
      equipment: [
        'A rapier or a shortsword',
        'A shortbow and quiver of 20 arrows or a shortsword',
        'A burglar’s pack, a dungeoneer’s pack, or an explorer’s pack',
        'Leather armor, two daggers, and thieves’ tools'
      ],
      classTableColumns: [
        { key: 'level', label: 'Level' },
        { key: 'proficiencyBonus', label: 'PB' },
        { key: 'sneakAttack', label: 'Sneak Attack' },
        { key: 'features', label: 'Features' }
      ],
      classTable: [
        { level: 1, proficiencyBonus: '+2', sneakAttack: '1d6', features: 'Expertise, Sneak Attack, Thieves’ Cant' },
        { level: 2, proficiencyBonus: '+2', sneakAttack: '1d6', features: 'Cunning Action' },
        { level: 3, proficiencyBonus: '+2', sneakAttack: '2d6', features: 'Roguish Archetype' },
        { level: 5, proficiencyBonus: '+3', sneakAttack: '3d6', features: 'Uncanny Dodge' },
        { level: 7, proficiencyBonus: '+3', sneakAttack: '4d6', features: 'Evasion' },
        { level: 11, proficiencyBonus: '+4', sneakAttack: '6d6', features: 'Reliable Talent' }
      ],
      features: [
        { level: 1, title: 'Sneak Attack', description: 'Beginning at 1st level, you know how to strike subtly and exploit a foe’s distraction. Once per turn, you can deal an extra 1d6 damage to one creature you hit with an attack if you have advantage on the attack roll or an ally is within 5 feet of the target.' },
        { level: 1, title: 'Expertise', description: 'Choose two of your skill proficiencies, or one of your skill proficiencies and your proficiency with thieves’ tools. Your proficiency bonus is doubled for any ability check you make that uses either of the chosen proficiencies.' },
        { level: 2, title: 'Cunning Action', description: 'Your quick thinking and agility allow you to move and act quickly. You can take a bonus action on each of your turns in combat to take the Dash, Disengage, or Hide action.' },
        { level: 5, title: 'Uncanny Dodge', description: 'When an attacker that you can see hits you with an attack, you can use your reaction to halve the attack’s damage against you.' },
        { level: 7, title: 'Evasion', description: 'When you are subjected to an effect that allows you to make a Dexterity saving throw to take only half damage, you instead take no damage if you succeed on the saving throw, and only half damage if you fail.' }
      ],
      subclasses: [
        {
          id: 'thief',
          name: 'Thief',
          description: 'You hone your skills in the larcenous arts. Burglars, bandits, cutpurses, and other criminals usually follow this archetype.',
          features: [
            { level: 3, title: 'Fast Hands', description: 'You can use the bonus action granted by your Cunning Action to make a Dexterity (Sleight of Hand) check, use your thieves’ tools to disarm a trap or open a lock, or take the Use an Object action.' },
            { level: 3, title: 'Second-Story Work', description: 'You gain the ability to climb faster than normal; climbing no longer costs you extra movement.' }
          ]
        },
        {
          id: 'assassin',
          name: 'Assassin',
          description: 'You focus your training on the grim art of death, specializing in disguises, poisons, and quick lethal strikes.',
          features: [
            { level: 3, title: 'Assassinate', description: 'You have advantage on attack rolls against any creature that hasn’t taken a turn in the combat yet. In addition, any hit you score against a creature that is surprised is a critical hit.' }
          ]
        }
      ]
    }
  },

  // 11. SORCERER
  {
    id: 'sorcerer',
    collectionName: 'classes',
    name: 'Sorcerer',
    sourceType: 'system',
    data: {
      source: 'Player’s Handbook (PHB)',
      shortDescription: 'A spellcaster who draws on inherent magic from a gift or bloodline.',
      description: 'Sorcerers carry a magical birthright conferred upon them by an exotic bloodline, an otherworldly influence, or exposure to unknown cosmic forces. Magic is not something they study; it is an innate part of their very being.',
      hitPoints: {
        hitDice: '1d6 per sorcerer level',
        firstLevel: '6 + your Constitution modifier',
        higherLevels: '1d6 (or 4) + your Constitution modifier per sorcerer level after 1st'
      },
      proficiencies: {
        armor: 'None',
        weapons: 'Daggers, darts, slings, quarterstaffs, light crossbows',
        tools: 'None',
        savingThrows: 'Constitution, Charisma',
        skills: 'Choose two from Arcana, Deception, Insight, Intimidation, Persuasion, Religion'
      },
      equipment: [
        'A light crossbow and 20 bolts or any simple weapon',
        'A component pouch or an arcane focus',
        'A dungeoneer’s pack or an explorer’s pack, and two daggers'
      ],
      classTableColumns: [
        { key: 'level', label: 'Level' },
        { key: 'proficiencyBonus', label: 'PB' },
        { key: 'sorceryPoints', label: 'Sorcery Points' },
        { key: 'features', label: 'Features' },
        { key: 'cantripsKnown', label: 'Cantrips' },
        { key: 'spellsKnown', label: 'Spells' }
      ],
      classTable: [
        { level: 1, proficiencyBonus: '+2', sorceryPoints: '—', features: 'Spellcasting, Sorcerous Origin', cantripsKnown: 4, spellsKnown: 2 },
        { level: 2, proficiencyBonus: '+2', sorceryPoints: '2', features: 'Font of Magic', cantripsKnown: 4, spellsKnown: 3 },
        { level: 3, proficiencyBonus: '+2', sorceryPoints: '3', features: 'Metamagic', cantripsKnown: 4, spellsKnown: 4 }
      ],
      features: [
        { level: 1, title: 'Spellcasting', description: 'An event in your past or in the life of a parent or ancestor left an indelible mark on you, infusing you with arcane magic. Charisma is your spellcasting ability.' },
        { level: 2, title: 'Font of Magic', description: 'You tap into a wellspring of magic within yourself. You gain Sorcery Points which can be used to create spell slots or converted back from spell slots.' },
        { level: 3, title: 'Metamagic', description: 'You gain the ability to twist your spells to suit your needs (Twinned Spell, Quickened Spell, Subtle Spell, Empowered Spell).' }
      ],
      subclasses: [
        {
          id: 'draconic-bloodline',
          name: 'Draconic Bloodline',
          description: 'Your innate magic comes from draconic magic that was mingled with your blood or that of your ancestors.',
          features: [
            { level: 1, title: 'Dragon Ancestor', description: 'Choose a dragon type. You can speak Draconic and gain advantages when interacting with dragons.' },
            { level: 1, title: 'Draconic Resilience', description: 'Your hit point maximum increases by 1 for each sorcerer level, and your unarmored AC equals 13 + your Dexterity modifier.' }
          ]
        }
      ]
    }
  },

  // 12. WARLOCK
  {
    id: 'warlock',
    collectionName: 'classes',
    name: 'Warlock',
    sourceType: 'system',
    data: {
      source: 'Player’s Handbook (PHB)',
      shortDescription: 'A wielder of magic derived from a bargain with an otherworldly entity.',
      description: 'Warlocks are seekers of the knowledge that lies hidden in the fabric of the multiverse. Through pacts made with mysterious beings of supernatural power, warlocks unlock magical effects both subtle and spectacular.',
      hitPoints: {
        hitDice: '1d8 per warlock level',
        firstLevel: '8 + your Constitution modifier',
        higherLevels: '1d8 (or 5) + your Constitution modifier per warlock level after 1st'
      },
      proficiencies: {
        armor: 'Light armor',
        weapons: 'Simple weapons',
        tools: 'None',
        savingThrows: 'Wisdom, Charisma',
        skills: 'Choose two from Arcana, Deception, History, Intimidation, Investigation, Nature, Religion'
      },
      equipment: [
        'A light crossbow and 20 bolts or any simple weapon',
        'A component pouch or an arcane focus',
        'A scholar’s pack or a dungeoneer’s pack, leather armor, any simple weapon, and two daggers'
      ],
      classTableColumns: [
        { key: 'level', label: 'Level' },
        { key: 'proficiencyBonus', label: 'PB' },
        { key: 'features', label: 'Features' },
        { key: 'cantripsKnown', label: 'Cantrips' },
        { key: 'spellSlots', label: 'Slots' },
        { key: 'slotLevel', label: 'Slot Level' },
        { key: 'invocations', label: 'Invocations' }
      ],
      classTable: [
        { level: 1, proficiencyBonus: '+2', features: 'Otherworldly Patron, Pact Magic', cantripsKnown: 2, spellSlots: 1, slotLevel: '1st', invocations: '—' },
        { level: 2, proficiencyBonus: '+2', features: 'Eldritch Invocations', cantripsKnown: 2, spellSlots: 2, slotLevel: '1st', invocations: 2 },
        { level: 3, proficiencyBonus: '+2', features: 'Pact Boon', cantripsKnown: 2, spellSlots: 2, slotLevel: '2nd', invocations: 2 }
      ],
      features: [
        { level: 1, title: 'Otherworldly Patron', description: 'At 1st level, you have made a bargain with an otherworldly being of your choice: The Fiend, The Archfey, or The Great Old One.' },
        { level: 1, title: 'Pact Magic', description: 'Your arcane research and the magic bestowed on you by your patron have given you facility with spells. Your spell slots recharge on a short rest and are all of the same level.' },
        { level: 2, title: 'Eldritch Invocations', description: 'In your study of occult lore, you have unburied eldritch invocations, fragments of forbidden knowledge that imbue you with an abiding magical ability.' },
        { level: 3, title: 'Pact Boon', description: 'Your patron bestows a gift upon you for your loyal service (Pact of the Chain, Pact of the Blade, or Pact of the Tome).' }
      ],
      subclasses: [
        {
          id: 'the-fiend',
          name: 'The Fiend',
          description: 'You have made a pact with a fiend from the lower planes of existence, a being whose aims are evil.',
          features: [
            { level: 1, title: 'Dark One’s Blessing', description: 'When you reduce a hostile creature to 0 hit points, you gain temporary hit points equal to your Charisma modifier + your warlock level.' }
          ]
        }
      ]
    }
  },

  // 13. WIZARD
  {
    id: 'wizard',
    collectionName: 'classes',
    name: 'Wizard',
    sourceType: 'system',
    data: {
      source: 'Player’s Handbook (PHB)',
      shortDescription: 'A scholarly magic-user capable of manipulating the structures of reality.',
      description: 'Wizards are supreme magic-users, defined and united as a class by the spells they cast. Drawing on the subtle weave of magic that permeates the cosmos, wizards cast spells of explosive fire, arcing lightning, subtle deception, and brute force.',
      hitPoints: {
        hitDice: '1d6 per wizard level',
        firstLevel: '6 + your Constitution modifier',
        higherLevels: '1d6 (or 4) + your Constitution modifier per wizard level after 1st'
      },
      proficiencies: {
        armor: 'None',
        weapons: 'Daggers, darts, slings, quarterstaffs, light crossbows',
        tools: 'None',
        savingThrows: 'Intelligence, Wisdom',
        skills: 'Choose two from Arcana, History, Insight, Investigation, Medicine, Religion'
      },
      equipment: [
        'A quarterstaff or a dagger',
        'A component pouch or an arcane focus',
        'A scholar’s pack or an explorer’s pack, and a spellbook'
      ],
      classTableColumns: [
        { key: 'level', label: 'Level' },
        { key: 'proficiencyBonus', label: 'PB' },
        { key: 'features', label: 'Features' },
        { key: 'cantripsKnown', label: 'Cantrips' },
        { key: 'spellSlots1', label: '1st' },
        { key: 'spellSlots2', label: '2nd' }
      ],
      classTable: [
        { level: 1, proficiencyBonus: '+2', features: 'Spellcasting, Arcane Recovery', cantripsKnown: 3, spellSlots1: 2, spellSlots2: '—' },
        { level: 2, proficiencyBonus: '+2', features: 'Arcane Tradition', cantripsKnown: 3, spellSlots1: 3, spellSlots2: '—' },
        { level: 3, proficiencyBonus: '+2', features: '—', cantripsKnown: 3, spellSlots1: 4, spellSlots2: 2 }
      ],
      features: [
        { level: 1, title: 'Spellcasting', description: 'As a student of arcane magic, you have a spellbook containing spells that show the first glimmerings of your true power. Intelligence is your spellcasting ability.' },
        { level: 1, title: 'Arcane Recovery', description: 'You have learned to regain some of your magical energy by studying your spellbook. Once per day when you finish a short rest, you can choose expended spell slots to recover.' },
        { level: 2, title: 'Arcane Tradition', description: 'Choose an Arcane Tradition, specializing in a school of magic such as School of Evocation or School of Abjuration.' }
      ],
      subclasses: [
        {
          id: 'school-of-evocation',
          name: 'School of Evocation',
          description: 'You focus your study on magic that creates powerful elemental effects such as bitter cold, searing flame, and thunder.',
          features: [
            { level: 2, title: 'Evocation Savant', description: 'The gold and time you must spend to copy an evocation spell into your spellbook is halved.' },
            { level: 2, title: 'Sculpt Spells', description: 'You can create pockets of relative safety within the effects of your evocation spells. When you cast an evocation spell that affects other creatures, you can choose a number of them equal to 1 + the spell’s level to succeed on their saves and take no damage.' }
          ]
        }
      ]
    }
  },

  // RACES
  {
    id: 'human',
    collectionName: 'races',
    name: 'Human',
    sourceType: 'system',
    data: {
      source: 'Player’s Handbook (PHB)',
      shortDescription: 'Flexible and ambitious, humans are the most adaptable of all common ancestries.',
      description: 'Humans are the most adaptable and ambitious people among the common races. They have widely varying tastes, morals, and customs in whatever lands they settle.',
      abilityScoreIncrease: '+1 to all ability scores',
      size: 'Medium',
      speed: '30 feet',
      languages: 'Common and one extra language of your choice',
      traits: [
        { title: 'Ability Score Increase', description: 'Your ability scores each increase by 1.' },
        { title: 'Age', description: 'Humans reach adulthood in their late teens and live less than a century.' },
        { title: 'Languages', description: 'You can speak, read, and write Common and one extra language of your choice.' }
      ],
      subraces: []
    }
  },
  {
    id: 'elf',
    collectionName: 'races',
    name: 'Elf',
    sourceType: 'system',
    data: {
      source: 'Player’s Handbook (PHB)',
      shortDescription: 'Magical people of supernatural grace and long lives.',
      description: 'Elves are a magical people of supernatural grace and subtlety, living in the world but not entirely part of it. They dwell in places of ethereal beauty, in the midst of ancient forests or in silvery spires.',
      abilityScoreIncrease: '+2 Dexterity',
      size: 'Medium',
      speed: '30 feet',
      languages: 'Common and Elvish',
      traits: [
        { title: 'Darkvision', description: 'You can see in dim light within 60 feet of you as if it were bright light, and in darkness as if it were dim light.' },
        { title: 'Keen Senses', description: 'You have proficiency in the Perception skill.' },
        { title: 'Fey Ancestry', description: 'You have advantage on saving throws against being charmed, and magic can’t put you to sleep.' },
        { title: 'Trance', description: 'Elves don’t need to sleep. Instead, they meditate deeply for 4 hours a day.' }
      ],
      subraces: [
        {
          name: 'High Elf',
          description: 'High elves have a keen mind and a mastery of at least the basics of magic.',
          traits: [
            { title: 'Ability Score Increase', description: 'Your Intelligence score increases by 1.' },
            { title: 'Elf Weapon Training', description: 'You have proficiency with the longsword, shortsword, shortbow, and longbow.' },
            { title: 'Cantrip', description: 'You know one cantrip of your choice from the wizard spell list.' }
          ]
        },
        {
          name: 'Wood Elf',
          description: 'Wood elves have keen senses and intuition, and their fleet feet carry them quickly through native forests.',
          traits: [
            { title: 'Ability Score Increase', description: 'Your Wisdom score increases by 1.' },
            { title: 'Fleet of Foot', description: 'Your base walking speed increases to 35 feet.' },
            { title: 'Mask of the Wild', description: 'You can attempt to hide even when you are only lightly obscured by foliage, heavy rain, falling snow, mist, and other natural phenomena.' }
          ]
        }
      ]
    }
  },
  {
    id: 'dwarf',
    collectionName: 'races',
    name: 'Dwarf',
    sourceType: 'system',
    data: {
      source: 'Player’s Handbook (PHB)',
      shortDescription: 'Bold and hardy, dwarfs are known as skilled warriors, miners, and workers of stone and metal.',
      description: 'Kingdoms rich in ancient grandeur, halls carved into the roots of mountains, the echoing din of picks and hammers in deep mines and blazing forges—these are the heritage of every dwarf.',
      abilityScoreIncrease: '+2 Constitution',
      size: 'Medium',
      speed: '25 feet',
      languages: 'Common and Dwarvish',
      traits: [
        { title: 'Darkvision', description: 'Accustomed to life underground, you have superior vision in dark and dim conditions.' },
        { title: 'Dwarven Resilience', description: 'You have advantage on saving throws against poison, and you have resistance against poison damage.' },
        { title: 'Dwarven Combat Training', description: 'You have proficiency with the battleaxe, handaxe, light hammer, and warhammer.' },
        { title: 'Stonecunning', description: 'Whenever you make a History check related to the origin of stonework, you add double your proficiency bonus to the check.' }
      ],
      subraces: [
        {
          name: 'Hill Dwarf',
          description: 'As a hill dwarf, you have keen senses, deep intuition, and remarkable resilience.',
          traits: [
            { title: 'Ability Score Increase', description: 'Your Wisdom score increases by 1.' },
            { title: 'Dwarven Toughness', description: 'Your hit point maximum increases by 1, and it increases by 1 every time you gain a level.' }
          ]
        },
        {
          name: 'Mountain Dwarf',
          description: 'As a mountain dwarf, you are strong and hardy, accustomed to a difficult life in rugged terrain.',
          traits: [
            { title: 'Ability Score Increase', description: 'Your Strength score increases by 2.' },
            { title: 'Dwarven Armor Training', description: 'You have proficiency with light and medium armor.' }
          ]
        }
      ]
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
