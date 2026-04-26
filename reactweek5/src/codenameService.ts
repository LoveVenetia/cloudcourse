const ADJECTIVES = [
  'Sneaky',
  'Cosmic',
  'Nimble',
  'Witty',
  'Brave',
  'Mystic',
  'Turbo',
  'Funky',
  'Shadow',
  'Lucky',
];

const ANIMALS = [
  'Panda',
  'Otter',
  'Fox',
  'Falcon',
  'Lynx',
  'Koala',
  'Rabbit',
  'Hedgehog',
  'Tiger',
  'Dolphin',
];

function createCodename(): string {
  const adjective = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
  const number = Math.floor(Math.random() * 90) + 10;

  return `${adjective}${animal}${number}`;
}

/**
 * Get or create a codename for a user (stored in localStorage)
 */
export function getOrCreateCodename(userId: string): string {
  const storageKey = `codename_${userId}`;
  let codename = localStorage.getItem(storageKey);

  if (!codename) {
    codename = createCodename();
    localStorage.setItem(storageKey, codename);
  }

  return codename;
}
