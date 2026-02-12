
import React from 'react';
import { Room, DebateTrack, RoomStatus } from '../types';
import { Users, Shield, Cpu, Users2, Sword, Radio, Target } from 'lucide-react';

interface RoomCardProps {
  room: Room;
  onJoin: (room: Room) => void;
}

export const RoomCard: React.FC<RoomCardProps> = ({ room, onJoin }) => {
  const getIcon = (track: DebateTrack) => {
    switch (track) {
      case DebateTrack.POLITICAL: return <Shield className="w-6 h-6" />;
      case DebateTrack.AI: return <Cpu className="w-6 h-6" />;
      case DebateTrack.SOCIAL: return <Users2 className="w-6 h-6" />;
    }
  };

  const getStatusColor = (status: RoomStatus) => {
    switch (status) {
      case RoomStatus.WAITING: return 'text-[#00CCFF] bg-[#00CCFF]/10 border-[#00CCFF]/40 shadow-[0_0_10px_rgba(0,204,255,0.2)]';
      case RoomStatus.IN_PROGRESS: return 'text-[#BF00FF] bg-[#BF00FF]/10 border-[#BF00FF]/40 shadow-[0_0_10px_rgba(191,0,255,0.2)]';
      case RoomStatus.FINISHED: return 'text-zinc-500 bg-zinc-500/10 border-white/5';
    }
  };

  return (
    <div className="glass-panel p-8 rounded-[2.5rem] hover:bg-white/5 transition-all group border border-white/10 hover:border-white/20 hover:-translate-y-2 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-[#BF00FF]/20 group-hover:border-[#BF00FF]/60 transition-colors rounded-tl-[2rem]" />
      
      <div className="flex justify-between items-start mb-8">
        <div className={`p-4 rounded-2xl bg-black/40 text-zinc-400 group-hover:text-white transition-all border border-white/5`}>
          {getIcon(room.track)}
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className={`text-[9px] uppercase font-black px-4 py-2 rounded-lg border tracking-[0.2em] flex items-center gap-2 ${getStatusColor(room.status)}`}>
            {room.status === RoomStatus.WAITING ? <Radio className="w-3 h-3 animate-pulse" /> : null}
            {room.status}
          </span>
          <div className="flex items-center gap-2 text-[9px] font-black text-zinc-600 bg-white/5 px-3 py-1 rounded-md border border-white/5">
            <Target className="w-3 h-3 text-[#00CCFF]" />
            THRESHOLD: {room.threshold}
          </div>
        </div>
      </div>
      
      <h3 className="text-2xl font-black text-white mb-2 group-hover:text-[#BF00FF] transition-colors line-clamp-2 tracking-tight leading-tight uppercase cyber-heading">
        {room.topic}
      </h3>
      <p className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.4em] mb-10">SECTOR: {room.track}</p>
      
      <div className="flex items-center justify-between mt-auto">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-zinc-950 flex items-center justify-center text-xs font-black border border-white/5 text-[#00CCFF]">
            {room.creatorName[0].toUpperCase()}
          </div>
          <div>
            <p className="text-[8px] font-black text-zinc-700 uppercase tracking-widest">SIGNAL_BY</p>
            <p className="text-xs font-black text-zinc-400">@{room.creatorName}</p>
          </div>
        </div>
        
        <button
          onClick={() => onJoin(room)}
          disabled={room.status === RoomStatus.FINISHED}
          className="px-6 py-3 bg-[#BF00FF] hover:bg-white hover:text-black disabled:bg-zinc-900 disabled:text-zinc-700 rounded-xl text-[10px] font-black transition-all neon-glow-purple flex items-center gap-3 group/btn uppercase tracking-[0.2em] cyber-heading"
        >
          {room.status === RoomStatus.WAITING ? (
            <>
              <Sword className="w-4 h-4 group-hover/btn:rotate-12 transition-transform" />
              DEPLOY
            </>
          ) : 'SPECTATE'}
        </button>
      </div>
    </div>
  );
};
