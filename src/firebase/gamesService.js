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

// Games live in their own collection, completely separate from the watchlist
const GAMES_COLLECTION = 'games';

// Get all games
export const getAllGames = async () => {
  try {
    const querySnapshot = await getDocs(
      query(collection(db, GAMES_COLLECTION), orderBy('title'))
    );
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error fetching games:', error);
    throw error;
  }
};

// Add new game
export const addGame = async (game) => {
  try {
    const docRef = await addDoc(collection(db, GAMES_COLLECTION), {
      ...game,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error adding game:', error);
    throw error;
  }
};

// Update game
export const updateGame = async (id, updates) => {
  try {
    const docRef = doc(db, GAMES_COLLECTION, id);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating game:', error);
    throw error;
  }
};

// Delete game
export const deleteGame = async (id) => {
  try {
    await deleteDoc(doc(db, GAMES_COLLECTION, id));
  } catch (error) {
    console.error('Error deleting game:', error);
    throw error;
  }
};

// Real-time listener for game list updates
export const subscribeToGames = (callback) => {
  const q = query(collection(db, GAMES_COLLECTION), orderBy('title'));

  return onSnapshot(q, (querySnapshot) => {
    const games = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(games);
  });
};
