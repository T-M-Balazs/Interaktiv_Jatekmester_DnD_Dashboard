import { doc, setDoc } from 'firebase/firestore';
import { db } from '../player/firebase-config';
import { systemContentSeed } from './system-content-seed';

function makeId(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function uploadCollection(collectionName: string, items: any[]): Promise<void> {
  for (const item of items) {
    const id = item.id || makeId(item.name);

    await setDoc(doc(db, collectionName, id), item, { merge: true });

    console.log(`Uploaded ${collectionName}: ${item.name}`);
  }
}

export async function uploadSystemContent(): Promise<void> {
 
await uploadCollection('monsters', systemContentSeed.monsters);
  console.log('System content upload finished.');
}