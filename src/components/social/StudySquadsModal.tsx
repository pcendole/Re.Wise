import React, { useState, useEffect } from 'react';
import { X, Users, Flame, Copy, Check, MessageCircle, Plus, Key } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { StudyStats } from '@/types/models';

interface StudySquadsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userStats: StudyStats;
}

interface SquadMember {
  id: string;
  name: string;
  daysActiveThisWeek: number;
  streak: number;
  isYou: boolean;
}

export const StudySquadsModal: React.FC<StudySquadsModalProps> = ({ isOpen, onClose, userStats }) => {
  const [squadName, setSquadName] = useState('');
  const [squadCode, setSquadCode] = useState('');
  const [members, setMembers] = useState<SquadMember[]>([]);
  const [view, setView] = useState<'squad' | 'create' | 'join'>('squad');
  const [newSquadName, setNewSquadName] = useState('');
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const saved = localStorage.getItem('rewise_squad_data');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSquadName(parsed.name || '');
        setSquadCode(parsed.code || '');
        setMembers(parsed.members || []);
        return;
      } catch {}
    }
    setSquadName('');
    setSquadCode('');
    setMembers([]);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(squadCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareWhatsApp = () => {
    const text = `Join my Study Squad "${squadName}" on Re.Wise! Squad Code: ${squadCode}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleCreateSquad = () => {
    if (!newSquadName.trim()) return;
    const generatedCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const updatedMembers: SquadMember[] = [
      { id: 'you', name: 'You', daysActiveThisWeek: Math.min(7, userStats.streak_days || 1), streak: userStats.streak_days || 0, isYou: true },
    ];
    setSquadName(newSquadName.trim());
    setSquadCode(generatedCode);
    setMembers(updatedMembers);
    localStorage.setItem('rewise_squad_data', JSON.stringify({ name: newSquadName.trim(), code: generatedCode, members: updatedMembers }));
    setView('squad');
  };

  const handleJoinSquad = () => {
    if (!joinCodeInput.trim()) return;
    const code = joinCodeInput.trim().toUpperCase();
    const joinedSquadName = `Squad #${code}`;
    const updatedMembers: SquadMember[] = [
      { id: 'you', name: 'You', daysActiveThisWeek: Math.min(7, userStats.streak_days || 1), streak: userStats.streak_days || 0, isYou: true },
    ];
    setSquadName(joinedSquadName);
    setSquadCode(code);
    setMembers(updatedMembers);
    localStorage.setItem('rewise_squad_data', JSON.stringify({ name: joinedSquadName, code, members: updatedMembers }));
    setView('squad');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-md rounded-3xl border border-theme bg-card-theme p-5 shadow-2xl text-theme-primary space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-theme pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sage text-forest">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-theme-primary tracking-tight">Study Squads</h3>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-theme-secondary hover:text-theme-primary hover:bg-canvas transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {view === 'squad' && (
          members.length === 0 ? (
            <div className="text-center py-8 rounded-2xl border border-dashed border-theme bg-canvas p-6 space-y-3">
              <div className="h-10 w-10 rounded-2xl bg-sage text-forest flex items-center justify-center mx-auto">
                <Users className="h-5 w-5" />
              </div>
              <h4 className="text-sm font-semibold text-theme-primary">No squad yet</h4>
              <div className="flex items-center justify-center gap-2 pt-1">
                <Button size="sm" onClick={() => setView('create')} className="h-8 px-3 text-xs bg-forest hover:opacity-90 text-white gap-1 rounded-xl active:scale-95">
                  <Plus className="h-3.5 w-3.5" /> + New Squad
                </Button>
                <Button size="sm" variant="outline" onClick={() => setView('join')} className="h-8 px-3 text-xs rounded-xl active:scale-95">
                  <Key className="h-3.5 w-3.5 mr-1 text-forest" /> Join Code
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3.5">
              {/* Squad Info Pill */}
              <div className="p-3.5 rounded-2xl bg-sage/40 border border-theme flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-theme-primary">{squadName}</h4>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-theme-secondary">Code:</span>
                    <span className="font-mono text-xs font-bold text-forest tracking-wider">{squadCode}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button size="sm" variant="ghost" onClick={handleCopyCode} className="h-8 px-2 text-xs">
                    {copied ? <Check className="h-3.5 w-3.5 text-forest" /> : <Copy className="h-3.5 w-3.5" />}
                  </Button>
                  <Button size="sm" onClick={handleShareWhatsApp} className="h-8 px-2.5 text-xs bg-forest hover:opacity-90 text-white rounded-xl">
                    <MessageCircle className="h-3.5 w-3.5 mr-1" /> Invite
                  </Button>
                </div>
              </div>

              {/* Weekly Consistency Leaderboard */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-semibold text-theme-secondary uppercase tracking-wider px-1">
                  <span>Active Days</span>
                </div>

                <div className="space-y-2">
                  {members.map((member, idx) => (
                    <div
                      key={member.id}
                      className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                        member.isYou ? 'bg-sage/30 border-forest/30 shadow-xs' : 'bg-canvas border-theme'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs font-bold text-theme-secondary w-4 text-center">
                          {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                        </span>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className={`text-xs font-bold ${member.isYou ? 'text-forest' : 'text-theme-primary'}`}>
                              {member.name}
                            </span>
                            {member.isYou && (
                              <span className="text-[9px] uppercase px-1.5 py-0.5 rounded-md bg-sage text-forest font-bold">
                                You
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-[10px] text-theme-secondary">
                            <Flame className="h-3 w-3 text-amber-500 fill-current" />
                            <span>{member.streak} day streak</span>
                          </div>
                        </div>
                      </div>

                      {/* Streak Ring Pill */}
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <span className="text-xs font-black text-theme-primary">{member.daysActiveThisWeek}/7</span>
                          <span className="text-[10px] text-theme-secondary block">Days</span>
                        </div>
                        <div className="h-7 w-7 rounded-full border-2 border-forest/40 flex items-center justify-center text-[10px] font-bold text-forest bg-sage">
                          {Math.round((member.daysActiveThisWeek / 7) * 100)}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Switch Squad Actions */}
              <div className="flex items-center gap-2 pt-1">
                <Button size="sm" variant="outline" onClick={() => setView('create')} className="flex-1 h-8 text-xs">
                  <Plus className="h-3 w-3 mr-1" /> New Squad
                </Button>
                <Button size="sm" variant="outline" onClick={() => setView('join')} className="flex-1 h-8 text-xs">
                  <Key className="h-3 w-3 mr-1" /> Join Code
                </Button>
              </div>
            </div>
          )
        )}

        {view === 'create' && (
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-theme-primary uppercase tracking-wider">New Squad</h4>
            <input
              type="text"
              value={newSquadName}
              onChange={(e) => setNewSquadName(e.target.value)}
              placeholder="Squad name"
              className="w-full bg-canvas border border-theme rounded-2xl px-3.5 py-2 text-xs text-theme-primary placeholder:text-theme-secondary focus:outline-none focus:border-forest"
            />
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => setView('squad')} className="flex-1 text-xs">Cancel</Button>
              <Button size="sm" onClick={handleCreateSquad} disabled={!newSquadName.trim()} className="flex-1 text-xs bg-forest hover:opacity-90 text-white font-bold rounded-xl">Create</Button>
            </div>
          </div>
        )}

        {view === 'join' && (
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-theme-primary uppercase tracking-wider">Join Squad</h4>
            <input
              type="text"
              value={joinCodeInput}
              onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
              placeholder="Code (e.g. MED90X)"
              maxLength={8}
              className="w-full bg-canvas border border-theme rounded-2xl px-3.5 py-2 text-xs text-theme-primary placeholder:text-theme-secondary font-mono tracking-widest text-center focus:outline-none focus:border-forest"
            />
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => setView('squad')} className="flex-1 text-xs">Cancel</Button>
              <Button size="sm" onClick={handleJoinSquad} disabled={!joinCodeInput.trim()} className="flex-1 text-xs bg-forest hover:opacity-90 text-white font-bold rounded-xl">Join</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
