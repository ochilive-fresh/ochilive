const DATABASE_NAME = 'ochi-creator-drafts';
const STORE_NAME = 'drafts';

const openDatabase = () => new Promise((resolve, reject) => {
  if (!globalThis.indexedDB) {
    reject(new Error('Draft storage is unavailable in this browser.'));
    return;
  }
  const request = indexedDB.open(DATABASE_NAME, 1);
  request.onupgradeneeded = () => {
    if (!request.result.objectStoreNames.contains(STORE_NAME)) {
      request.result.createObjectStore(STORE_NAME, { keyPath: 'userId' });
    }
  };
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error || new Error('Unable to open draft storage.'));
  request.onblocked = () => reject(new Error('Draft storage is blocked by another browser tab.'));
});

const runDraftRequest = async (mode, action) => {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, mode);
    const request = action(transaction.objectStore(STORE_NAME));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Unable to update the draft.'));
    transaction.onabort = () => reject(transaction.error || new Error('Draft storage transaction failed.'));
    transaction.oncomplete = () => database.close();
  });
};

export const getUploadDraft = (userId) => runDraftRequest('readonly', (store) => store.get(userId));

export const saveUploadDraft = (userId, draft) => runDraftRequest('readwrite', (store) => store.put({ ...draft, userId, updatedAt: Date.now() }));

export const clearUploadDraft = (userId) => runDraftRequest('readwrite', (store) => store.delete(userId));
