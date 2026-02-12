
import React, { useState, useEffect, useRef } from 'react';
import { Room, User, Message, RoomStatus } from '../types';
import { Send, Scale, ArrowLeft, Loader2, Timer, XCircle, ShieldCheck, Radio, Target, Zap, CheckCircle2 } from 'lucide-react';
import { debateAI } from '../services/gemini';

interface DebateRoomProps {
  room: Room;
  user: User;
  onLeave: (roomId: string, isCreator: boolean) => void;
  onUpdateRoom: (room: Room) => void;
  onFinishDebate: (judgment: any) => void;
}

export const DebateRoom: React.FC<DebateRoomProps> = ({ room, user, onLeave, onUpdateRoom, onFinishDebate }) => {
  const [inputText, setInputText] = useState('');
  const [isJudging, setIsJudging] = useState(false);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(3);
  const scrollRef = useRef<HTMLDivElement>(null);

  const isCreator = room.creatorId === user.id;
  const isOpponent = room.opponentId === user.id;

  // Turn logic: Commander starts, then alternating
  const isMyTurn = () => {
    if (countdown !== null) return false;
    if (room.messages.length % 2 === 0) {
      return isCreator;
    } else {
      return isOpponent || (!room.opponentId && isCreator); // In AI mode, creator can send after AI if needed, or we restrict
    }
  };

  useEffect(() => {
    if (countdown !== null && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      const timer = setTimeout(() => setCountdown(null), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [room.messages]);

  // Check for victory/end conditions
  useEffect(() => {
    if (room.status === RoomStatus.FINISHED) return;

    // Threshold breach
    if (room.creatorScore >= room.threshold || (room.opponentId && room.opponentScore >= room.threshold)) {
      handleEndDebate();
    }
    // Mutual agreement
    if (room.creatorRequestsEnd && room.opponentRequestsEnd) {
      handleEndDebate();
    }
  }, [room.creatorScore, room.opponentScore, room.creatorRequestsEnd, room.opponentRequestsEnd]);

  const handleSendMessage = async () => {
    if (!inputText.trim() || !isMyTurn()) return;

    const score = await debateAI.scoreMessage(room.topic, inputText);

    const newMessage: Message = {
      senderId: user.id,
      senderName: user.username,
      text: inputText,
      timestamp: Date.now(),
      score: score
    };

    const newCreatorScore = isCreator ? room.creatorScore + score : room.creatorScore;
    const newOpponentScore = isOpponent ? room.opponentScore + score : room.opponentScore;

    const updatedRoom = {
      ...room,
      messages: [...room.messages, newMessage],
      status: RoomStatus.IN_PROGRESS,
      creatorScore: newCreatorScore,
      opponentScore: newOpponentScore
    };

    onUpdateRoom(updatedRoom);
    setInputText('');

    // AI Debater logic
    if (isCreator && !room.opponentId) {
      setIsAiThinking(true);
      try {
        const aiResponseText = await debateAI.getAIResponse(room.topic, room.track, updatedRoom.messages);
        const aiScore = await debateAI.scoreMessage(room.topic, aiResponseText);
        const aiMessage: Message = {
          senderId: 'ai-debater',
          senderName: 'GEMINI_AI',
          text: aiResponseText,
          timestamp: Date.now(),
          score: aiScore
        };
        onUpdateRoom({
          ...updatedRoom,
          messages: [...updatedRoom.messages, aiMessage],
          opponentScore: updatedRoom.opponentScore + aiScore
        });
      } catch (err) {
        console.error("AI error", err);
      } finally {
        setIsAiThinking(false);
      }
    }
  };

  const toggleRequestEnd = () => {
    const updated = { ...room };
    if (isCreator) updated.creatorRequestsEnd = !room.creatorRequestsEnd;
    if (isOpponent) updated.opponentRequestsEnd = !room.opponentRequestsEnd;
    onUpdateRoom(updated);
  };

  const handleEndDebate = async () => {
    if (isJudging) return;
    setIsJudging(true);
    try {
      // Determine winner by points if threshold reached or mutual agreement
      let winnerName = 'Draw';
      if (room.creatorScore > room.opponentScore) winnerName = room.creatorName;
      else if (room.opponentScore > room.creatorScore) winnerName = room.opponentName || 'GEMINI_AI';

      const judgment = await debateAI.judgeDebate(room.topic, room.messages);
      // Ensure winnerName from scores is considered if threshold was reached
      onFinishDebate({
        ...judgment,
        winnerName: winnerName,
        ratingChange: Math.abs(room.creatorScore - room.opponentScore) + 10
      });
    } catch (err) {
      console.error(err);
      alert("VERDICT ERROR: RETRY SIGNAL.");
    } finally {
      setIsJudging(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] mt-4 relative animate-in fade-in zoom-in-95 duration-700">
      {countdown !== null && (
        <div className="absolute inset-0 z-[60] flex flex-col items-center justify-center bg-black/90 backdrop-blur-[40px] rounded-[3rem] border border-[#BF00FF]/30">
          <div className="text-[14rem] font-black cyber-heading text-white drop-shadow-[0_0_50px_rgba(191,0,255,0.8)]">
            {countdown === 0 ? "FIGHT" : countdown}
          </div>
          <p className="mt-12 text-3xl font-black tracking-[1em] text-[#00CCFF] uppercase cyber-heading">Logical Engagement Imminent</p>
        </div>
      )}

      <div className="flex items-center justify-between mb-8 px-6">
        <button 
          onClick={() => onLeave(room.id, isCreator)} 
          className="flex items-center gap-3 text-zinc-600 hover:text-red-500 transition-all font-black text-[10px] tracking-[0.4em] uppercase group"
        >
          <XCircle className="w-5 h-5 group-hover:rotate-90 transition-transform" />
          {isCreator ? 'TERMINATE_SESSION' : 'ABANDON_FIELD'}
        </button>
        <div className="text-center flex-1">
          <h2 className="text-4xl font-black text-white uppercase tracking-tighter cyber-heading drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">{room.topic}</h2>
          <div className="flex items-center justify-center gap-6 mt-4">
            <span className="text-[9px] font-black text-[#00CCFF] border border-[#00CCFF]/30 px-5 py-1 rounded-full uppercase tracking-[0.3em] flex items-center gap-2">
              <Target className="w-3 h-3" /> THRESHOLD: {room.threshold}
            </span>
            <span className="text-[9px] font-black text-white bg-[#BF00FF] px-5 py-1 rounded-full uppercase tracking-[0.3em] flex items-center gap-2">
              <Timer className="w-3 h-3 animate-pulse" /> LIVE_ENGAGEMENT
            </span>
          </div>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={toggleRequestEnd}
            disabled={isJudging}
            className={`flex items-center gap-4 px-8 py-4 rounded-2xl text-[10px] font-black transition-all shadow-2xl uppercase tracking-[0.2em] cyber-heading ${
              (isCreator && room.creatorRequestsEnd) || (isOpponent && room.opponentRequestsEnd)
              ? 'bg-[#00CCFF] text-black'
              : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            { (isCreator && room.creatorRequestsEnd) || (isOpponent && room.opponentRequestsEnd) ? 'END REQUESTED' : 'REQUEST END' }
          </button>
          <button 
            onClick={handleEndDebate}
            disabled={isJudging}
            className="flex items-center gap-4 px-10 py-4 bg-white text-black hover:bg-[#00CCFF] hover:text-black disabled:bg-zinc-900 disabled:text-zinc-700 rounded-2xl text-[10px] font-black transition-all shadow-2xl uppercase tracking-[0.2em] cyber-heading"
          >
            {isJudging ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
            FORCED_VERDICT
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden glass-panel rounded-[3.5rem] flex flex-col border border-white/5 relative">
        <div className="bg-black/60 p-5 border-b border-white/5 flex items-center justify-center gap-20">
           <div className="flex items-center gap-6 group">
              <div className="flex flex-col items-center">
                <div className="w-14 h-14 rounded-2xl accent-gradient flex items-center justify-center font-black text-xl border border-white/20 shadow-2xl neon-glow-purple">
                  {room.creatorName[0].toUpperCase()}
                </div>
                <div className="mt-2 text-[#BF00FF] font-mono font-bold text-lg">{room.creatorScore} pts</div>
              </div>
              <div>
                <p className="text-[8px] font-black text-zinc-700 uppercase tracking-[0.5em]">COMMANDER</p>
                <p className="text-lg font-black text-white group-hover:text-[#BF00FF] transition-colors">@{room.creatorName}</p>
                {room.creatorRequestsEnd && <p className="text-[8px] text-[#00CCFF] font-black uppercase mt-1">Ready to conclude</p>}
              </div>
           </div>
           <div className="text-zinc-800 font-black text-5xl italic tracking-tighter opacity-30 select-none">VS</div>
           <div className="flex items-center gap-6 text-right group">
              <div>
                <p className="text-[8px] font-black text-zinc-700 uppercase tracking-[0.5em]">CHALLENGER</p>
                <p className="text-lg font-black text-white group-hover:text-[#00CCFF] transition-colors">{room.opponentName ? `@${room.opponentName}` : 'SCANNING...'}</p>
                {room.opponentRequestsEnd && <p className="text-[8px] text-[#00CCFF] font-black uppercase mt-1">Ready to conclude</p>}
              </div>
              <div className="flex flex-col items-center">
                <div className="w-14 h-14 rounded-2xl bg-zinc-950 border border-white/5 flex items-center justify-center font-black text-xl text-zinc-700 shadow-inner group-hover:border-[#00CCFF]/40">
                  {room.opponentName ? room.opponentName[0].toUpperCase() : '?'}
                </div>
                <div className="mt-2 text-[#00CCFF] font-mono font-bold text-lg">{room.opponentScore} pts</div>
              </div>
           </div>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-12 space-y-12">
          {room.messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-zinc-800 gap-8">
              <div className="w-32 h-32 rounded-[3rem] bg-black border border-white/5 flex items-center justify-center">
                <Radio className="w-12 h-12 opacity-10 animate-pulse" />
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.5em]">Awaiting Data Injection</p>
            </div>
          )}
          {room.messages.map((m, i) => (
            <div key={i} className={`flex flex-col ${m.senderId === user.id ? 'items-end' : 'items-start'} animate-in slide-in-from-bottom-2`}>
              <div className={`max-w-[70%] px-10 py-8 rounded-[2.5rem] text-sm leading-relaxed shadow-[0_0_50px_rgba(0,0,0,0.5)] transition-all hover:scale-[1.02] border relative ${
                m.senderId === user.id 
                  ? 'bg-gradient-to-br from-[#BF00FF] to-[#7A00FF] text-white rounded-tr-none border-[#BF00FF]/50 shadow-purple-950/20' 
                  : 'bg-black/60 text-zinc-100 rounded-tl-none border-white/5'
              }`}>
                <div className="absolute -top-3 right-6 bg-black border border-white/10 px-3 py-1 rounded-md text-[10px] font-black text-[#00CCFF] flex items-center gap-2">
                  <Zap className="w-3 h-3 fill-[#00CCFF]" />
                  +{m.score} PTS
                </div>
                <p className="font-medium tracking-tight">{m.text}</p>
              </div>
              <div className={`flex items-center gap-4 mt-5 px-4 font-black uppercase tracking-[0.3em] text-[8px] ${m.senderId === user.id ? 'flex-row-reverse' : ''}`}>
                <span className="text-zinc-500">{m.senderName}</span>
                <span className="w-1 h-1 rounded-full bg-zinc-800" />
                <span className="text-zinc-800 font-mono">{new Date(m.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}</span>
              </div>
            </div>
          ))}
          {isAiThinking && (
            <div className="flex flex-col items-start">
              <div className="flex items-center gap-6 px-10 py-8 bg-black/40 rounded-[2.5rem] text-zinc-500 text-sm animate-pulse border border-[#00CCFF]/20">
                <Loader2 className="w-5 h-5 animate-spin text-[#00CCFF]" />
                <span className="font-black tracking-[0.3em] text-[9px] uppercase">Neural Engine Processing Response...</span>
              </div>
            </div>
          )}
        </div>

        <div className="p-8 border-t border-white/5 bg-black/80 backdrop-blur-[50px]">
          <div className="relative max-w-6xl mx-auto flex flex-col gap-4">
             {!isMyTurn() && countdown === null && (
               <div className="text-center text-[10px] font-black tracking-[0.5em] text-zinc-700 uppercase animate-pulse">
                 Awaiting Opponent Logic Stream...
               </div>
             )}
            <div className="flex gap-6">
              <div className="absolute left-6 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none opacity-20">
                <div className="w-1 h-4 bg-[#BF00FF]" />
                <div className="w-1 h-3 bg-[#BF00FF]" />
              </div>
              <input
                type="text"
                value={inputText}
                disabled={countdown !== null || !isMyTurn()}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder={!isMyTurn() ? "CHANNEL_LOCKED" : "INJECT_ARGUMENT_SEQUENCE..."}
                className="flex-1 bg-black/60 border border-white/10 rounded-2xl pl-12 pr-6 py-6 text-sm focus:outline-none focus:ring-2 focus:ring-[#BF00FF]/40 transition-all font-mono placeholder:text-zinc-800 placeholder:font-black placeholder:tracking-[0.4em] placeholder:text-[9px]"
              />
              <button
                onClick={handleSendMessage}
                disabled={countdown !== null || !inputText.trim() || !isMyTurn()}
                className="bg-[#BF00FF] hover:bg-white hover:text-black disabled:bg-zinc-950 disabled:text-zinc-900 text-white px-10 rounded-2xl transition-all shadow-2xl active:scale-95 flex items-center justify-center border border-white/10 group"
              >
                <Send className="w-6 h-6 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
