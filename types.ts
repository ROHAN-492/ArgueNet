
export enum DebateTrack {
  POLITICAL = 'Political',
  AI = 'AI & Ethics',
  SOCIAL = 'Social'
}

export enum RoomStatus {
  WAITING = 'Waiting',
  IN_PROGRESS = 'In Progress',
  FINISHED = 'Finished'
}

export interface User {
  id: string; // Firebase UID
  email: string;
  username: string;
  rating: number;
  winrate: number;
  totalMatches: number; // Added
  matchesWon: number;   // Added
  bio: string;
  avatar: string;
  joinDate: string;
  history: DebateHistory[];
  friends: string[]; // User IDs
  password?: string; // For demo purposes as requested
}

export interface DebateHistory {
  id: string;
  topic: string;
  track: DebateTrack;
  outcome: 'Won' | 'Lost' | 'Draw';
  ratingChange: number;
  date: string;
  transcript: Message[];
}

export interface Message {
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
  score: number; // Added for tactical scoring
}

export interface Room {
  id: string;
  topic: string;
  track: DebateTrack;
  creatorId: string;
  creatorName: string;
  opponentId?: string;
  opponentName?: string;
  status: RoomStatus;
  messages: Message[];
  threshold: number; // Added: Score limit
  creatorScore: number; // Added
  opponentScore: number; // Added
  creatorRequestsEnd: boolean; // Added for mutual agreement
  opponentRequestsEnd: boolean; // Added
  currentTurn?: string; // User ID
}

export interface MatchResult {
  id?: string;
  result: 'win' | 'loss' | 'draw';
  pointsScored: number;
  threshold: number;
  timestamp: any; // Firestore Timestamp
}
