
import { User, Room, DebateTrack, RoomStatus, MatchResult } from '../types';
import { db_firestore } from './firebase';
import { 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  addDoc, 
  serverTimestamp, 
  updateDoc,
  increment,
  query,
  orderBy,
  getDocs
} from 'firebase/firestore';

const CURRENT_USER_ID = 'arguenet_current_user_id';
const ROOMS_KEY = 'arguenet_rooms';

export const db = {
  fetchUserData: async (uid: string): Promise<User | null> => {
    const userDoc = await getDoc(doc(db_firestore, 'users', uid));
    if (userDoc.exists()) {
      return { id: uid, ...userDoc.data() } as User;
    }
    return null;
  },

  fetchUserMatches: async (uid: string): Promise<MatchResult[]> => {
    const matchesRef = collection(db_firestore, 'users', uid, 'matches');
    const q = query(matchesRef, orderBy('timestamp', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as MatchResult));
  },

  saveUser: async (user: User) => {
    const userRef = doc(db_firestore, 'users', user.id);
    await setDoc(userRef, {
      username: user.username,
      email: user.email,
      password: user.password || '', 
      rating: user.rating,
      winrate: user.winrate || 0,
      totalMatches: user.totalMatches || 0,
      matchesWon: user.matchesWon || 0,
      bio: user.bio || '',
      avatar: user.avatar || '',
      joinDate: user.joinDate,
      friends: user.friends || []
    }, { merge: true });
  },

  addMatchToHistory: async (uid: string, matchData: { result: 'win' | 'loss' | 'draw', pointsScored: number, threshold: number }) => {
    const userRef = doc(db_firestore, 'users', uid);
    const matchesRef = collection(db_firestore, 'users', uid, 'matches');

    await addDoc(matchesRef, {
      ...matchData,
      timestamp: serverTimestamp()
    });

    // Update main profile stats and calculate new winrate
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      const data = userSnap.data();
      const newTotal = (data.totalMatches || 0) + 1;
      const newWon = (data.matchesWon || 0) + (matchData.result === 'win' ? 1 : 0);
      const newWinRate = Math.round((newWon / newTotal) * 100);

      await updateDoc(userRef, {
        rating: increment(matchData.result === 'win' ? 20 : matchData.result === 'loss' ? -15 : 5),
        totalMatches: newTotal,
        matchesWon: newWon,
        winrate: newWinRate
      });
    }
  },

  getRooms: (): Room[] => {
    const data = localStorage.getItem(ROOMS_KEY);
    return data ? JSON.parse(data) : [];
  },

  createRoom: (topic: string, track: DebateTrack, creator: User, threshold: number): Room => {
    const room: Room = {
      id: Math.random().toString(36).substr(2, 9),
      topic,
      track,
      creatorId: creator.id,
      creatorName: creator.username,
      status: RoomStatus.WAITING,
      messages: [],
      threshold: threshold,
      creatorScore: 0,
      opponentScore: 0,
      creatorRequestsEnd: false,
      opponentRequestsEnd: false
    };
    const rooms = db.getRooms();
    rooms.push(room);
    localStorage.setItem(ROOMS_KEY, JSON.stringify(rooms));
    return room;
  },

  updateRoom: (room: Room) => {
    const rooms = db.getRooms();
    const index = rooms.findIndex(r => r.id === room.id);
    if (index > -1) {
      rooms[index] = room;
      localStorage.setItem(ROOMS_KEY, JSON.stringify(rooms));
    }
  },

  deleteRoom: (id: string) => {
    const rooms = db.getRooms().filter(r => r.id !== id);
    localStorage.setItem(ROOMS_KEY, JSON.stringify(rooms));
  },

  setCurrentUser: (id: string | null) => {
    if (id) {
      localStorage.setItem(CURRENT_USER_ID, id);
    } else {
      localStorage.removeItem(CURRENT_USER_ID);
    }
  }
};
