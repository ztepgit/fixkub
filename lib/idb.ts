import { openDB } from 'idb'

const DB_NAME = 'esyq_db'
const STORE_NAME = 'cache'

export async function initDB() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    },
  })
}

export async function getCache(key: string) {
  const db = await initDB()
  return db.get(STORE_NAME, key)
}

export async function setCache(key: string, val: any) {
  const db = await initDB()
  return db.put(STORE_NAME, val, key)
}