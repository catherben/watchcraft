import { 
  collection, 
  doc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy,
  serverTimestamp,
  onSnapshot
} from 'firebase/firestore';
import { db } from './config';

const WATCHLIST_COLLECTION = 'watchlist';

// Get all watchlist items
export const getAllWatchlistItems = async () => {
  try {
    const querySnapshot = await getDocs(
      query(collection(db, WATCHLIST_COLLECTION), orderBy('title'))
    );
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error fetching watchlist:', error);
    throw error;
  }
};

// Add new item to watchlist
export const addWatchlistItem = async (item) => {
  try {
    const docRef = await addDoc(collection(db, WATCHLIST_COLLECTION), {
      ...item,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error adding item:', error);
    throw error;
  }
};

// Update watchlist item
export const updateWatchlistItem = async (id, updates) => {
  try {
    const docRef = doc(db, WATCHLIST_COLLECTION, id);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating item:', error);
    throw error;
  }
};

// Delete watchlist item
export const deleteWatchlistItem = async (id) => {
  try {
    await deleteDoc(doc(db, WATCHLIST_COLLECTION, id));
  } catch (error) {
    console.error('Error deleting item:', error);
    throw error;
  }
};

// Real-time listener for watchlist updates
export const subscribeToWatchlist = (callback) => {
  const q = query(collection(db, WATCHLIST_COLLECTION), orderBy('title'));
  
  return onSnapshot(q, (querySnapshot) => {
    const items = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(items);
  });
};