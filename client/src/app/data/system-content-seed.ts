export const systemContentSeed = {
  monsters: [
    {
      id: 'goblin',
      name: 'Goblin',
      size: 'Small',
      type: 'Humanoid',
      alignment: 'Neutral Evil',
      challengeRating: '1/4',
      armorClass: 15,
      hitPoints: 7,
      speed: '30 ft.',
      sourceType: 'system',
      data: {
        shortDescription: 'Small, sneaky humanoid enemy.',
        abilities: { str: 8, dex: 14, con: 10, int: 10, wis: 8, cha: 8 },
        skills: 'Stealth +6',
        senses: 'Darkvision 60 ft., passive Perception 9',
        languages: 'Common, Goblin',
        traits: [
          {
            name: 'Nimble Escape',
            description: 'The goblin can take the Disengage or Hide action as a bonus action on each of its turns.'
          }
        ],
        actions: [
          {
            name: 'Scimitar',
            description: 'Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 5 slashing damage.'
          },
          {
            name: 'Shortbow',
            description: 'Ranged Weapon Attack: +4 to hit, range 80/320 ft., one target. Hit: 5 piercing damage.'
          }
        ]
      }
    },
    {
      id: 'orc',
      name: 'Orc',
      size: 'Medium',
      type: 'Humanoid',
      alignment: 'Chaotic Evil',
      challengeRating: '1/2',
      armorClass: 13,
      hitPoints: 15,
      speed: '30 ft.',
      sourceType: 'system',
      data: {
        shortDescription: 'A brutal warrior driven by rage and conquest.',
        abilities: { str: 16, dex: 12, con: 16, int: 7, wis: 11, cha: 10 },
        skills: 'Intimidation +2',
        senses: 'Darkvision 60 ft., passive Perception 10',
        languages: 'Common, Orc',
        traits: [
          {
            name: 'Aggressive',
            description: 'As a bonus action, the orc can move up to its speed toward a hostile creature it can see.'
          }
        ],
        actions: [
          {
            name: 'Greataxe',
            description: 'Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 9 slashing damage.'
          },
          {
            name: 'Javelin',
            description: 'Melee or Ranged Weapon Attack: +5 to hit, reach 5 ft. or range 30/120 ft. Hit: 6 piercing damage.'
          }
        ]
      }
    },
    {
      id: 'skeleton',
      name: 'Skeleton',
      size: 'Medium',
      type: 'Undead',
      alignment: 'Lawful Evil',
      challengeRating: '1/4',
      armorClass: 13,
      hitPoints: 13,
      speed: '30 ft.',
      sourceType: 'system',
      data: {
        shortDescription: 'An animated corpse made of old bones.',
        abilities: { str: 10, dex: 14, con: 15, int: 6, wis: 8, cha: 5 },
        damageVulnerabilities: 'Bludgeoning',
        damageImmunities: 'Poison',
        conditionImmunities: 'Exhaustion, Poisoned',
        senses: 'Darkvision 60 ft., passive Perception 9',
        languages: 'Understands languages it knew in life but cannot speak',
        actions: [
          {
            name: 'Shortsword',
            description: 'Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 5 piercing damage.'
          },
          {
            name: 'Shortbow',
            description: 'Ranged Weapon Attack: +4 to hit, range 80/320 ft., one target. Hit: 5 piercing damage.'
          }
        ]
      }
    },
    {
      id: 'zombie',
      name: 'Zombie',
      size: 'Medium',
      type: 'Undead',
      alignment: 'Neutral Evil',
      challengeRating: '1/4',
      armorClass: 8,
      hitPoints: 22,
      speed: '20 ft.',
      sourceType: 'system',
      data: {
        shortDescription: 'A slow, relentless undead corpse.',
        abilities: { str: 13, dex: 6, con: 16, int: 3, wis: 6, cha: 5 },
        savingThrows: 'Wis +0',
        damageImmunities: 'Poison',
        conditionImmunities: 'Poisoned',
        senses: 'Darkvision 60 ft., passive Perception 8',
        languages: 'Understands languages it knew in life but cannot speak',
        traits: [
          {
            name: 'Undead Fortitude',
            description: 'If damage reduces the zombie to 0 hit points, it can make a Constitution saving throw to drop to 1 hit point instead.'
          }
        ],
        actions: [
          {
            name: 'Slam',
            description: 'Melee Weapon Attack: +3 to hit, reach 5 ft., one target. Hit: 4 bludgeoning damage.'
          }
        ]
      }
    },
    {
      id: 'wolf',
      name: 'Wolf',
      size: 'Medium',
      type: 'Beast',
      alignment: 'Unaligned',
      challengeRating: '1/4',
      armorClass: 13,
      hitPoints: 11,
      speed: '40 ft.',
      sourceType: 'system',
      data: {
        shortDescription: 'A fast pack hunter with sharp senses.',
        abilities: { str: 12, dex: 15, con: 12, int: 3, wis: 12, cha: 6 },
        skills: 'Perception +3, Stealth +4',
        senses: 'Passive Perception 13',
        languages: '—',
        traits: [
          {
            name: 'Keen Hearing and Smell',
            description: 'The wolf has advantage on Wisdom (Perception) checks that rely on hearing or smell.'
          },
          {
            name: 'Pack Tactics',
            description: 'The wolf has advantage on attack rolls against a creature if at least one ally is within 5 feet of the creature.'
          }
        ],
        actions: [
          {
            name: 'Bite',
            description: 'Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 7 piercing damage. The target may be knocked prone.'
          }
        ]
      }
    },
    {
      id: 'giant-spider',
      name: 'Giant Spider',
      size: 'Large',
      type: 'Beast',
      alignment: 'Unaligned',
      challengeRating: '1',
      armorClass: 14,
      hitPoints: 26,
      speed: '30 ft., climb 30 ft.',
      sourceType: 'system',
      data: {
        shortDescription: 'A huge venomous spider that hunts with webs.',
        abilities: { str: 14, dex: 16, con: 12, int: 2, wis: 11, cha: 4 },
        skills: 'Stealth +7',
        senses: 'Blindsight 10 ft., darkvision 60 ft., passive Perception 10',
        languages: '—',
        traits: [
          {
            name: 'Spider Climb',
            description: 'The spider can climb difficult surfaces, including ceilings, without needing an ability check.'
          },
          {
            name: 'Web Sense',
            description: 'While in contact with a web, the spider knows the location of any other creature in contact with the same web.'
          }
        ],
        actions: [
          {
            name: 'Bite',
            description: 'Melee Weapon Attack: +5 to hit, reach 5 ft., one creature. Hit: piercing damage plus poison damage.'
          },
          {
            name: 'Web',
            description: 'Ranged Weapon Attack: +5 to hit, range 30/60 ft. The target is restrained by webbing.'
          }
        ]
      }
    },
    {
      id: 'ogre',
      name: 'Ogre',
      size: 'Large',
      type: 'Giant',
      alignment: 'Chaotic Evil',
      challengeRating: '2',
      armorClass: 11,
      hitPoints: 59,
      speed: '40 ft.',
      sourceType: 'system',
      data: {
        shortDescription: 'A huge, dim-witted brute with devastating strength.',
        abilities: { str: 19, dex: 8, con: 16, int: 5, wis: 7, cha: 7 },
        senses: 'Darkvision 60 ft., passive Perception 8',
        languages: 'Common, Giant',
        actions: [
          {
            name: 'Greatclub',
            description: 'Melee Weapon Attack: +6 to hit, reach 5 ft., one target. Hit: 13 bludgeoning damage.'
          },
          {
            name: 'Javelin',
            description: 'Melee or Ranged Weapon Attack: +6 to hit, reach 5 ft. or range 30/120 ft. Hit: 11 piercing damage.'
          }
        ]
      }
    },
    {
      id: 'troll',
      name: 'Troll',
      size: 'Large',
      type: 'Giant',
      alignment: 'Chaotic Evil',
      challengeRating: '5',
      armorClass: 15,
      hitPoints: 84,
      speed: '30 ft.',
      sourceType: 'system',
      data: {
        shortDescription: 'A regenerating giant that tears enemies apart.',
        abilities: { str: 18, dex: 13, con: 20, int: 7, wis: 9, cha: 7 },
        skills: 'Perception +2',
        senses: 'Darkvision 60 ft., passive Perception 12',
        languages: 'Giant',
        traits: [
          {
            name: 'Keen Smell',
            description: 'The troll has advantage on Wisdom (Perception) checks that rely on smell.'
          },
          {
            name: 'Regeneration',
            description: 'The troll regains hit points at the start of its turn unless it took acid or fire damage.'
          }
        ],
        actions: [
          {
            name: 'Multiattack',
            description: 'The troll makes three attacks: one with its bite and two with its claws.'
          },
          {
            name: 'Bite',
            description: 'Melee Weapon Attack: +7 to hit, reach 5 ft., one target. Hit: 7 piercing damage.'
          },
          {
            name: 'Claw',
            description: 'Melee Weapon Attack: +7 to hit, reach 5 ft., one target. Hit: 11 slashing damage.'
          }
        ]
      }
    },
    {
      id: 'young-red-dragon',
      name: 'Young Red Dragon',
      size: 'Large',
      type: 'Dragon',
      alignment: 'Chaotic Evil',
      challengeRating: '10',
      armorClass: 18,
      hitPoints: 178,
      speed: '40 ft., climb 40 ft., fly 80 ft.',
      sourceType: 'system',
      data: {
        shortDescription: 'A proud and terrifying fire-breathing dragon.',
        abilities: { str: 23, dex: 10, con: 21, int: 14, wis: 11, cha: 19 },
        savingThrows: 'Dex +4, Con +9, Wis +4, Cha +8',
        skills: 'Perception +8, Stealth +4',
        damageImmunities: 'Fire',
        senses: 'Blindsight 30 ft., darkvision 120 ft., passive Perception 18',
        languages: 'Common, Draconic',
        actions: [
          {
            name: 'Multiattack',
            description: 'The dragon makes three attacks: one with its bite and two with its claws.'
          },
          {
            name: 'Bite',
            description: 'Melee Weapon Attack: +10 to hit, reach 10 ft., one target. Hit: piercing damage plus fire damage.'
          },
          {
            name: 'Fire Breath',
            description: 'The dragon exhales fire in a cone. Each creature in the area makes a Dexterity saving throw, taking fire damage on a failed save.'
          }
        ]
      }
    },
    {
      id: 'lich',
      name: 'Lich',
      size: 'Medium',
      type: 'Undead',
      alignment: 'Any Evil Alignment',
      challengeRating: '21',
      armorClass: 17,
      hitPoints: 135,
      speed: '30 ft.',
      sourceType: 'system',
      data: {
        shortDescription: 'An ancient undead spellcaster of terrifying power.',
        abilities: { str: 11, dex: 16, con: 16, int: 20, wis: 14, cha: 16 },
        savingThrows: 'Con +10, Int +12, Wis +9',
        skills: 'Arcana +18, History +12, Insight +9, Perception +9',
        damageResistances: 'Cold, Lightning, Necrotic',
        damageImmunities: 'Poison; bludgeoning, piercing, and slashing from nonmagical attacks',
        conditionImmunities: 'Charmed, Exhaustion, Frightened, Paralyzed, Poisoned',
        senses: 'Truesight 120 ft., passive Perception 19',
        languages: 'Common plus up to five other languages',
        traits: [
          {
            name: 'Legendary Resistance',
            description: 'If the lich fails a saving throw, it can choose to succeed instead.'
          },
          {
            name: 'Rejuvenation',
            description: 'If it has a phylactery, a destroyed lich gains a new body after a time.'
          }
        ],
        actions: [
          {
            name: 'Paralyzing Touch',
            description: 'Melee Spell Attack: the target takes cold damage and may become paralyzed.'
          }
        ],
        legendaryActions: [
          {
            name: 'Cantrip',
            description: 'The lich casts a cantrip.'
          },
          {
            name: 'Frightening Gaze',
            description: 'The lich fixes its gaze on one creature it can see, potentially frightening it.'
          },
          {
            name: 'Disrupt Life',
            description: 'Each non-undead creature near the lich takes necrotic damage.'
          }
        ]
      }
    }
  ]
};