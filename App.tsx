
import React, { useState, useEffect } from 'react';
import { User, Room, DebateTrack, RoomStatus, MatchResult } from './types';
import { db } from './services/db';
import { Navbar } from './components/Navbar';
import { RoomCard } from './components/RoomCard';
import { DebateRoom } from './components/DebateRoom';
import { auth, googleProvider } from './services/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  signInWithPopup
} from 'firebase/auth';
import { 
  Users, 
  Plus, 
  Trophy, 
  History, 
  UserPlus, 
  ChevronRight, 
  Target,
  BarChart3,
  Calendar,
  Shield,
  Cpu,
  Users2,
  Sword,
  Search,
  ArrowLeft,
  Lock,
  Zap,
  Globe,
  Radio,
  Mail,
  Chrome,
  AlertCircle
} from 'lucide-react';

type ArenaStep = 'TRACK_SELECT' | 'ACTION_SELECT' | 'JOIN_LIST' | 'CREATE_FORM';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userMatches, setUserMatches] = useState<MatchResult[]>([]);
  const [activeSection, setActiveSection] = useState<'profile' | 'rooms' | 'friends'>('rooms');
  const [arenaStep, setArenaStep] = useState<ArenaStep>('TRACK_SELECT');
  const [selectedTrack, setSelectedTrack] = useState<DebateTrack | null>(null);
  const [threshold, setThreshold] = useState<number>(50);
  
  const [rooms, setRooms] = useState<Room[]>([]);
  const [activeRoom, setActiveRoom] = useState<Room | null>(null);

  // Login/Signup state
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('signup');
  const [authForm, setAuthForm] = useState({ email: '', password: '', username: '', bio: '' });
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        let localUser = await db.fetchUserData(firebaseUser.uid);
        
        if (!localUser) {
          localUser = {
            id: firebaseUser.uid,
            email: firebaseUser.email || '',
            username: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
            rating: 1200, 
            winrate: 0,
            totalMatches: 0,
            matchesWon: 0,
            bio: "New recruit.",
            avatar: firebaseUser.photoURL || `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${firebaseUser.uid}`,
            joinDate: new Date().toLocaleDateString(),
            history: [],
            friends: []
          };
          await db.saveUser(localUser);
        }
        setCurrentUser(localUser);
        const matches = await db.fetchUserMatches(localUser.id);
        setUserMatches(matches);
        db.setCurrentUser(localUser.id);
      } else {
        setCurrentUser(null);
        setUserMatches([]);
        db.setCurrentUser(null);
      }
    });

    setRooms(db.getRooms());
    return () => unsubscribe();
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    try {
      if (authMode === 'signup') {
        const userCredential = await createUserWithEmailAndPassword(auth, authForm.email, authForm.password);
        const firebaseUser = userCredential.user;

        const newUser: User = {
          id: firebaseUser.uid,
          email: authForm.email,
          username: authForm.username || authForm.email.split('@')[0],
          password: authForm.password, 
          rating: 1200, 
          winrate: 0,
          totalMatches: 0,
          matchesWon: 0,
          bio: authForm.bio || "Logic-driven mind.",
          avatar: `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${firebaseUser.uid}`,
          joinDate: new Date().toLocaleDateString(),
          history: [],
          friends: []
        };
        await db.saveUser(newUser);
        setCurrentUser(newUser);
      } else {
        await signInWithEmailAndPassword(auth, authForm.email, authForm.password);
      }
    } catch (error: any) {
      console.error("Auth error:", error.code);
      if (authMode === 'signup' && error.code === 'auth/email-already-in-use') {
        setAuthError("User already exists. Please sign in");
      } else if (authMode === 'login' && (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password')) {
        setAuthError("Email or password is incorrect");
      } else {
        setAuthError("An error occurred. Please try again.");
      }
    }
  };

  const handleGoogleSignIn = async () => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error("Google Auth error:", error);
      setAuthError("Google Sign-In failed. Please try again.");
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setCurrentUser(null);
      setActiveRoom(null);
      setArenaStep('TRACK_SELECT');
      setActiveSection('rooms');
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const createRoom = (topic: string) => {
    if (!currentUser || !selectedTrack) return;
    const room = db.createRoom(topic, selectedTrack, currentUser, threshold);
    setRooms(db.getRooms());
    setActiveRoom(room);
    setArenaStep('TRACK_SELECT');
  };

  const joinRoom = (room: Room) => {
    if (!currentUser) return;
    if (room.status === RoomStatus.WAITING && room.creatorId !== currentUser.id) {
      const updatedRoom = {
        ...room,
        opponentId: currentUser.id,
        opponentName: currentUser.username,
        status: RoomStatus.IN_PROGRESS
      };
      db.updateRoom(updatedRoom);
      setActiveRoom(updatedRoom);
    } else {
      setActiveRoom(room);
    }
    setRooms(db.getRooms());
    setArenaStep('TRACK_SELECT');
  };

  const handleLeaveRoom = (roomId: string, isCreator: boolean) => {
    if (isCreator) {
      db.deleteRoom(roomId);
      setRooms(db.getRooms());
      setActiveRoom(null);
    } else {
      setActiveRoom(null);
    }
  };

  const handleFinishDebate = async (judgment: any) => {
    if (!activeRoom || !currentUser) return;

    // Use tactical score to determine winner name if judgment winner is generic
    const isCreatorWinner = activeRoom.creatorScore > activeRoom.opponentScore;
    const creatorResult = isCreatorWinner ? 'win' : (activeRoom.creatorScore === activeRoom.opponentScore ? 'draw' : 'loss');
    
    await db.addMatchToHistory(activeRoom.creatorId, {
      result: creatorResult as any,
      pointsScored: activeRoom.creatorScore,
      threshold: activeRoom.threshold
    });

    if (activeRoom.opponentId && activeRoom.opponentId !== 'ai-debater') {
      const isOpponentWinner = activeRoom.opponentScore > activeRoom.creatorScore;
      const opponentResult = isOpponentWinner ? 'win' : (activeRoom.creatorScore === activeRoom.opponentScore ? 'draw' : 'loss');
      await db.addMatchToHistory(activeRoom.opponentId, {
        result: opponentResult as any,
        pointsScored: activeRoom.opponentScore,
        threshold: activeRoom.threshold
      });
    }

    const updatedUser = await db.fetchUserData(currentUser.id);
    if (updatedUser) setCurrentUser(updatedUser);
    const matches = await db.fetchUserMatches(currentUser.id);
    setUserMatches(matches);

    db.deleteRoom(activeRoom.id);
    setRooms(db.getRooms());
    setActiveRoom(null);
  };

  return (
    <div className="min-h-screen pt-32 pb-16 px-8 max-w-[1600px] mx-auto">
      <Navbar 
        user={currentUser || { id: '', email: '', username: 'Guest', rating: 0, winrate: 0, totalMatches: 0, matchesWon: 0, bio: '', avatar: '', joinDate: '', history: [], friends: [] }} 
        onLogout={handleLogout}
        activeSection={activeSection}
        setActiveSection={setActiveSection}
      />

      {currentUser && activeRoom ? (
        <DebateRoom 
          room={activeRoom} 
          user={currentUser}
          onLeave={handleLeaveRoom}
          onUpdateRoom={(updated) => {
            db.updateRoom(updated);
            setActiveRoom(updated);
            setRooms(db.getRooms());
          }}
          onFinishDebate={handleFinishDebate}
        />
      ) : currentUser ? (
        <main>
          {activeSection === 'rooms' && (
            <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
              {arenaStep === 'TRACK_SELECT' && (
                <div className="max-w-6xl mx-auto text-center">
                  <h1 className="text-7xl cyber-heading mb-6 tracking-tighter text-white">ARENA SELECT</h1>
                  <p className="text-zinc-500 mb-16 text-xl font-medium tracking-tight">Deployment imminent. Choose your vector.</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                    {[
                      { id: DebateTrack.POLITICAL, icon: <Shield className="w-16 h-16" />, label: 'POLITICAL', color: 'hover:border-[#00CCFF]/50 text-[#00CCFF]', glow: 'hover:shadow-[0_0_40px_rgba(0,204,255,0.2)]' },
                      { id: DebateTrack.SOCIAL, icon: <Users2 className="w-16 h-16" />, label: 'SOCIAL', color: 'hover:border-[#BF00FF]/50 text-[#BF00FF]', glow: 'hover:shadow-[0_0_40px_rgba(191,0,255,0.2)]' },
                      { id: DebateTrack.AI, icon: <Cpu className="w-16 h-16" />, label: 'AI ETHICS', color: 'hover:border-white/50 text-white', glow: 'hover:shadow-[0_0_40px_rgba(255,255,255,0.1)]' }
                    ].map(track => (
                      <button
                        key={track.id}
                        onClick={() => {
                          setSelectedTrack(track.id);
                          setArenaStep('ACTION_SELECT');
                        }}
                        className={`group glass-panel p-12 rounded-[3rem] transition-all hover:-translate-y-4 flex flex-col items-center gap-8 ${track.color} ${track.glow}`}
                      >
                        <div className="p-6 rounded-[2rem] bg-black/40 group-hover:bg-white/10 transition-all border border-white/5">
                          {track.icon}
                        </div>
                        <div>
                          <h3 className="text-3xl cyber-heading text-white">{track.label}</h3>
                          <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40 mt-4">LOCK IN</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {arenaStep === 'ACTION_SELECT' && (
                <div className="max-w-4xl mx-auto">
                   <button 
                    onClick={() => setArenaStep('TRACK_SELECT')} 
                    className="mb-12 flex items-center gap-3 text-zinc-500 hover:text-white transition-all font-black text-xs tracking-[0.3em] uppercase"
                  >
                    <ArrowLeft className="w-5 h-5" /> REVERT SELECTION ({selectedTrack})
                  </button>
                  
                  <h2 className="text-5xl cyber-heading mb-16 text-center text-white">ARENA OPERATIONS</h2>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
                    <button
                      onClick={() => setArenaStep('CREATE_FORM')}
                      className="group glass-panel p-16 rounded-[3rem] transition-all hover:-translate-y-3 hover:bg-[#BF00FF] neon-glow-purple flex flex-col items-center gap-8"
                    >
                      <div className="w-24 h-24 bg-black/40 group-hover:bg-white/20 rounded-[2rem] flex items-center justify-center transition-all border border-white/5">
                        <Plus className="w-12 h-12 text-[#BF00FF] group-hover:text-white" />
                      </div>
                      <div className="text-center">
                        <h3 className="text-3xl cyber-heading group-hover:text-white text-white">INITIALIZE</h3>
                        <p className="text-zinc-500 group-hover:text-white/70 mt-3 font-bold text-sm uppercase tracking-widest">Post new debate claim</p>
                      </div>
                    </button>

                    <button
                      onClick={() => setArenaStep('JOIN_LIST')}
                      className="group glass-panel p-16 rounded-[3rem] transition-all hover:-translate-y-3 hover:bg-[#00CCFF] neon-glow-blue flex flex-col items-center gap-8"
                    >
                      <div className="w-24 h-24 bg-black/40 group-hover:bg-black/20 rounded-[2rem] flex items-center justify-center transition-all border border-white/5">
                        <Sword className="w-12 h-12 text-[#00CCFF] group-hover:text-white" />
                      </div>
                      <div className="text-center">
                        <h3 className="text-3xl cyber-heading group-hover:text-white text-white">ENGAGE</h3>
                        <p className="text-zinc-500 group-hover:text-white/70 mt-3 font-bold text-sm uppercase tracking-widest">Challenge active signals</p>
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {arenaStep === 'JOIN_LIST' && (
                <div className="max-w-6xl mx-auto">
                  <button 
                    onClick={() => setArenaStep('ACTION_SELECT')} 
                    className="mb-10 flex items-center gap-3 text-zinc-500 hover:text-white transition-all font-black text-xs tracking-[0.3em] uppercase"
                  >
                    <ArrowLeft className="w-5 h-5" /> REVERT MODE
                  </button>
                  
                  <h2 className="text-4xl cyber-heading mb-12 text-white">DETECTED {selectedTrack} SIGNALS</h2>

                  {rooms.filter(r => r.track === selectedTrack && r.status === RoomStatus.WAITING).length === 0 ? (
                    <div className="glass-panel py-32 rounded-[3.5rem] text-center">
                      <Search className="w-20 h-20 mx-auto mb-8 text-zinc-800" />
                      <p className="text-2xl font-black text-zinc-600 uppercase tracking-widest">Frequency Clear. No Opponents.</p>
                      <button onClick={() => setArenaStep('CREATE_FORM')} className="mt-8 text-[#00CCFF] hover:text-white font-black text-sm tracking-widest uppercase cyber-heading underline">Initiate Signal?</button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                      {rooms
                        .filter(r => r.track === selectedTrack && r.status === RoomStatus.WAITING)
                        .map(room => (
                        <RoomCard key={room.id} room={room} onJoin={joinRoom} />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {arenaStep === 'CREATE_FORM' && (
                <div className="max-w-3xl mx-auto">
                  <button 
                    onClick={() => setArenaStep('ACTION_SELECT')} 
                    className="mb-10 flex items-center gap-3 text-zinc-500 hover:text-white transition-all font-black text-xs tracking-[0.3em] uppercase"
                  >
                    <ArrowLeft className="w-5 h-5" /> REVERT MODE
                  </button>
                  
                  <div className="glass-panel p-16 rounded-[3.5rem] relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#BF00FF]/5 blur-[60px]" />
                    <h2 className="text-4xl cyber-heading mb-4 text-white">COMMENCE PROTOCOL</h2>
                    <p className="text-zinc-500 mb-12 font-medium tracking-tight">Define the theater of logical operation.</p>
                    
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      const formData = new FormData(e.currentTarget);
                      createRoom(formData.get('topic') as string);
                    }} className="space-y-10">
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-[0.4em] text-zinc-700 mb-6">DISCOURSE PARAMETERS</label>
                        <input
                          name="topic"
                          required
                          autoFocus
                          placeholder="ENTER DEBATE SUBJECT..."
                          className="w-full bg-transparent border-b-2 border-zinc-900 focus:border-[#00CCFF] rounded-none py-6 text-3xl font-black tracking-tight focus:outline-none transition-all placeholder:text-zinc-900"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-[0.4em] text-zinc-700 mb-6">VICTORY THRESHOLD (10-100 pts)</label>
                        <div className="flex items-center gap-8">
                           <input
                            type="range"
                            min="10"
                            max="100"
                            step="5"
                            value={threshold}
                            onChange={(e) => setThreshold(parseInt(e.target.value))}
                            className="flex-1 accent-[#BF00FF] cursor-pointer"
                          />
                          <span className="text-3xl font-mono font-bold text-[#BF00FF] w-16">{threshold}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-6 bg-white/5 p-6 rounded-3xl border border-white/5">
                        <div className="p-4 bg-[#00CCFF]/10 text-[#00CCFF] rounded-2xl">
                          <Target className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-1">SELECTED DOMAIN</p>
                          <p className="text-xl font-black text-white tracking-tighter">{selectedTrack}</p>
                        </div>
                      </div>

                      <button className="w-full bg-white text-black font-black text-xl py-6 rounded-2xl transition-all shadow-2xl shadow-white/5 uppercase tracking-[0.2em] hover:scale-[1.02] active:scale-95 cyber-heading">
                        BROADCAST SIGNAL
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeSection === 'profile' && (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-12 animate-in slide-in-from-bottom-8 duration-700">
              <div className="lg:col-span-1 space-y-8">
                <div className="glass-panel p-10 rounded-[3rem] text-center relative border border-[#BF00FF]/20">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-1 bg-[#BF00FF] blur-[1px]" />
                  <img src={currentUser.avatar} className="w-32 h-32 rounded-[2.5rem] mx-auto mb-8 border-4 border-black shadow-2xl" alt="Identity" />
                  <h2 className="text-3xl cyber-heading text-white tracking-tighter mb-4">@{currentUser.username}</h2>
                  <p className="text-zinc-500 text-sm font-bold italic mb-10 px-4">"{currentUser.bio}"</p>
                  
                  <div className="space-y-4">
                    <div className="bg-black/40 p-6 rounded-3xl border border-white/5 shadow-inner">
                      <p className="text-[10px] font-black text-zinc-700 uppercase tracking-[0.4em] mb-2">RATING</p>
                      <p className="text-4xl font-mono text-[#BF00FF] font-bold tracking-tighter">{currentUser.rating}</p>
                    </div>
                    <div className="bg-black/40 p-6 rounded-3xl border border-white/5 shadow-inner">
                      <p className="text-[10px] font-black text-zinc-700 uppercase tracking-[0.4em] mb-2">WIN RATE</p>
                      <p className="text-4xl font-mono text-white font-bold tracking-tighter">
                        {currentUser.winrate}%
                      </p>
                      <p className="text-[9px] font-black text-zinc-700 mt-2 uppercase tracking-widest">({currentUser.matchesWon} / {currentUser.totalMatches})</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-3 space-y-8">
                <div className="glass-panel p-12 rounded-[3.5rem] min-h-[700px] border border-white/5 flex flex-col">
                  <h3 className="text-3xl cyber-heading mb-12 flex items-center gap-4 text-white">
                    <History className="w-10 h-10 text-[#00CCFF]" /> COMBAT LOG
                  </h3>
                  
                  <div className="flex-1 space-y-6">
                    {userMatches.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-zinc-800">
                        <Sword className="w-32 h-32 mb-10 opacity-5" />
                        <p className="text-2xl font-black tracking-widest uppercase">No battles fought yet</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto max-h-[600px] pr-2">
                        {userMatches.map((match, idx) => (
                          <div key={match.id || idx} className="glass-panel p-6 rounded-[2rem] border border-white/5 hover:border-[#BF00FF]/30 transition-all group relative overflow-hidden">
                            <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${match.result === 'win' ? 'bg-[#00CCFF]' : match.result === 'loss' ? 'bg-red-500' : 'bg-zinc-600'}`} />
                            <div className="flex justify-between items-start mb-4">
                              <span className={`text-[10px] font-black uppercase tracking-[0.3em] ${match.result === 'win' ? 'text-[#00CCFF]' : match.result === 'loss' ? 'text-red-500' : 'text-zinc-500'}`}>
                                {match.result === 'win' ? 'VICTORY' : match.result === 'loss' ? 'DEFEAT' : 'STALEMATE'}
                              </span>
                              <div className="flex items-center gap-2 text-zinc-600 text-[9px] font-black uppercase tracking-widest">
                                <Calendar className="w-3 h-3" />
                                {match.timestamp?.toDate ? match.timestamp.toDate().toLocaleDateString() : 'RECENT'}
                              </div>
                            </div>
                            <div className="flex items-end justify-between">
                              <div>
                                <p className="text-[8px] font-black text-zinc-700 uppercase tracking-widest mb-1">SCORE / THRESHOLD</p>
                                <p className="text-3xl font-mono font-bold text-white tracking-tighter">
                                  {match.pointsScored} <span className="text-zinc-700 text-lg">/</span> {match.threshold}
                                </p>
                              </div>
                              <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl border ${
                                match.result === 'win' ? 'border-[#00CCFF]/20 text-[#00CCFF]' : 'border-red-500/20 text-red-500'
                              }`}>
                                {match.result === 'win' ? '+' : match.result === 'loss' ? '-' : ''}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-12 pt-8 border-t border-white/5 flex justify-center">
                    <button 
                      onClick={() => setActiveSection('rooms')} 
                      className="bg-zinc-900 hover:bg-white hover:text-black px-12 py-5 rounded-2xl text-xs font-black tracking-[0.3em] text-white transition-all uppercase cyber-heading flex items-center gap-3 active:scale-95"
                    >
                      <Radio className="w-4 h-4 animate-pulse" />
                      Deploy to Arena
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'friends' && (
            <div className="max-w-4xl mx-auto animate-in fade-in zoom-in-95 duration-700">
              <div className="flex items-center justify-between mb-12">
                <h1 className="text-6xl cyber-heading text-white tracking-tighter">SOCIAL GRID</h1>
                <button className="flex items-center gap-4 bg-white text-black px-8 py-4 rounded-2xl font-black text-sm tracking-widest transition-all shadow-2xl shadow-white/5 active:scale-95 uppercase cyber-heading">
                  <UserPlus className="w-5 h-5" /> RECRUIT
                </button>
              </div>

              <div className="glass-panel p-4 rounded-[4rem] overflow-hidden shadow-2xl border border-white/5">
                {currentUser.friends.length === 0 ? (
                  <div className="py-56 text-center text-zinc-800">
                    <Users className="w-32 h-32 mx-auto mb-10 opacity-5" />
                    <p className="text-2xl font-black tracking-widest uppercase">Grid Unpopulated</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {currentUser.friends.map(friendId => (
                      <div key={friendId} className="p-8 flex items-center justify-between hover:bg-white/5 transition-all rounded-[2.5rem] group">
                        <div className="flex items-center gap-6">
                          <div className="w-20 h-20 rounded-[2rem] bg-black border border-white/5 shadow-inner" />
                          <div>
                            <p className="text-2xl font-black text-white">NODE_{friendId}</p>
                            <p className="text-[10px] font-black text-[#00CCFF] uppercase tracking-widest mt-1 flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-[#00CCFF] animate-pulse" /> SYNCED & READY
                            </p>
                          </div>
                        </div>
                        <button className="w-14 h-14 rounded-2xl bg-zinc-950 flex items-center justify-center text-zinc-600 hover:text-white hover:bg-[#BF00FF] transition-all border border-white/5 group-hover:border-[#BF00FF]/50">
                          <ChevronRight className="w-8 h-8" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      ) : (
        <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden">
          <div className="glass-panel p-12 rounded-[3rem] border border-[#BF00FF]/20 shadow-2xl relative overflow-hidden flex flex-col justify-center w-full max-w-xl">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#BF00FF]/10 blur-[60px]" />
            <div className="flex flex-col items-center mb-12">
              <div className="w-20 h-20 accent-gradient rounded-3xl flex items-center justify-center font-black text-4xl mb-6 shadow-2xl shadow-purple-500/50 neon-glow-purple">A</div>
              <h1 className="cyber-heading text-5xl tracking-tighter mb-2 text-white">ARGUENET</h1>
              <p className="text-zinc-500 text-[10px] font-black tracking-[0.5em] uppercase opacity-60">Cognitive Warfare Engine</p>
            </div>

            <form onSubmit={handleAuth} className="space-y-6">
              <div className="space-y-4">
                {authError && (
                  <div className="bg-red-500/20 border border-red-500/50 text-red-400 p-4 rounded-xl text-[10px] font-bold tracking-widest text-center uppercase flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    {authError}
                  </div>
                )}
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 group-focus-within:text-[#00CCFF] transition-colors" />
                  <input
                    type="email"
                    required
                    placeholder="EMAIL ADDRESS"
                    className="w-full bg-black/40 border border-white/5 rounded-2xl pl-12 pr-4 py-5 text-xs font-black tracking-widest focus:outline-none focus:ring-2 focus:ring-[#00CCFF]/30 transition-all placeholder:text-zinc-800"
                    value={authForm.email}
                    onChange={e => setAuthForm({ ...authForm, email: e.target.value })}
                  />
                </div>
                {authMode === 'signup' && (
                  <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 group-focus-within:text-[#00CCFF] transition-colors" />
                    <input
                      type="text"
                      required
                      placeholder="USERNAME"
                      className="w-full bg-black/40 border border-white/5 rounded-2xl pl-12 pr-4 py-5 text-xs font-black tracking-widest focus:outline-none focus:ring-2 focus:ring-[#00CCFF]/30 transition-all placeholder:text-zinc-800"
                      value={authForm.username}
                      onChange={e => setAuthForm({ ...authForm, username: e.target.value })}
                    />
                  </div>
                )}
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 group-focus-within:text-[#BF00FF] transition-colors" />
                  <input
                    type="password"
                    required
                    placeholder="ACCESS KEY"
                    className="w-full bg-black/40 border border-white/5 rounded-2xl pl-12 pr-4 py-5 text-xs font-black tracking-widest focus:outline-none focus:ring-2 focus:ring-[#BF00FF]/30 transition-all placeholder:text-zinc-800"
                    value={authForm.password}
                    onChange={e => setAuthForm({ ...authForm, password: e.target.value })}
                  />
                </div>
              </div>
              <button className="w-full bg-white text-black font-black py-5 rounded-2xl transition-all shadow-xl shadow-white/5 hover:scale-[1.02] active:scale-95 text-sm tracking-widest uppercase cyber-heading">
                {authMode === 'signup' ? 'ESTABLISH LINK' : 'RESTORE SESSION'}
              </button>
            </form>

            <div className="mt-8 flex flex-col gap-4">
              <div className="flex items-center gap-4">
                <div className="flex-1 h-px bg-white/5" />
                <span className="text-[10px] font-black text-zinc-700 tracking-[0.4em] uppercase">OR CONNECT VIA</span>
                <div className="flex-1 h-px bg-white/5" />
              </div>
              <button 
                onClick={handleGoogleSignIn}
                className="w-full bg-white/5 border border-white/10 hover:bg-white/10 text-white font-black py-4 rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-4 text-xs tracking-widest uppercase cyber-heading"
              >
                <Chrome className="w-5 h-5 text-[#00CCFF]" />
                GOOGLE ACCOUNT
              </button>
            </div>

            <p className="text-center text-[10px] font-black tracking-[0.4em] text-zinc-600 mt-10 uppercase">
              {authMode === 'signup' ? 'LINK ALREADY SYNCED?' : "TERMINAL UNREGISTERED?"}{' '}
              <button 
                onClick={() => {
                  setAuthMode(authMode === 'login' ? 'signup' : 'login');
                  setAuthError(null);
                }}
                className="text-[#BF00FF] hover:underline hover:text-[#00CCFF] transition-colors"
              >
                {authMode === 'login' ? 'REGISTER' : 'AUTHORIZE'}
              </button>
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
