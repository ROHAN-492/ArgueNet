
import React from 'react';
import { User } from '../types';
import { LogOut, Trophy, User as UserIcon, Radio } from 'lucide-react';

interface NavbarProps {
  user: User;
  onLogout: () => void;
  activeSection: string;
  setActiveSection: (section: 'profile' | 'rooms' | 'friends') => void;
}

export const Navbar: React.FC<NavbarProps> = ({ user, onLogout, activeSection, setActiveSection }) => {
  return (
    <nav className="fixed top-0 left-0 right-0 z-[60] glass-panel border-b border-white/5 h-20 flex items-center justify-between px-10">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 accent-gradient rounded-xl flex items-center justify-center font-black text-2xl shadow-xl shadow-purple-500/20 neon-glow-purple">A</div>
        <div className="flex flex-col">
          <span className="text-2xl font-black tracking-tighter text-white leading-none cyber-heading">ARGUENET</span>
          <span className="text-[8px] font-black tracking-[0.4em] text-[#00CCFF] mt-1">ARENA_OPERATIONAL</span>
        </div>
      </div>

      <div className="hidden lg:flex items-center gap-12">
        {[
          { id: 'rooms', label: 'THE ARENA' },
          { id: 'profile', label: 'INTEL' },
          { id: 'friends', label: 'THE GRID' },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveSection(item.id as any)}
            className={`text-[10px] font-black tracking-[0.4em] transition-all duration-300 relative group uppercase ${
              activeSection === item.id 
                ? 'text-[#BF00FF] drop-shadow-[0_0_8px_rgba(191,0,255,0.8)]' 
                : 'text-zinc-500 hover:text-white'
            }`}
          >
            {item.label}
            {activeSection === item.id && (
              <span className="absolute -bottom-2 left-0 w-full h-0.5 bg-[#BF00FF] shadow-[0_0_10px_#BF00FF]" />
            )}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-8">
        <div className="flex items-center gap-3 bg-black/60 px-5 py-2 rounded-xl border border-white/5 shadow-inner group">
          <Trophy className="w-4 h-4 text-[#FFD700] group-hover:scale-125 transition-transform" />
          <span className="text-sm font-mono font-bold text-white tracking-widest">{user.rating}</span>
        </div>
        <button 
          onClick={onLogout}
          className="p-3 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all border border-red-500/20 group"
        >
          <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
        </button>
      </div>
    </nav>
  );
};
