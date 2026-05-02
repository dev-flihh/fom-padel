import { ChevronLeft, PlusCircle, Trophy, Zap } from 'lucide-react';

export const NoActiveMatchScreen = ({
  onBack,
  onStartNewMatch
}: {
  onBack: () => void;
  onStartNewMatch: () => void;
}) => (
  <div className="min-h-screen bg-surface flex flex-col pb-24">
    <header className="ios-blur sticky top-0 w-full z-50 flex items-center px-4 h-14 border-b border-ios-gray/10">
      <div className="flex items-center gap-2">
        <button onClick={onBack} className="tap-target p-2 -ml-2">
          <ChevronLeft size={24} className="text-on-surface" />
        </button>
        <h1 className="text-[17px] font-bold tracking-tight text-on-surface">Match</h1>
      </div>
    </header>

    <main className="flex-1 flex flex-col items-center justify-center px-8 text-center">
      <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-6">
        <Trophy size={48} className="text-primary/40" />
      </div>
      <h2 className="text-2xl font-bold text-on-surface mb-2">No Active Match</h2>
      <p className="text-ios-gray text-sm mb-8 leading-relaxed">
        There are no active matches right now. Start a new match to track scores and standings.
      </p>

      <div className="w-full bg-primary/5 rounded-2xl p-4 mb-10 border border-primary/10 flex items-start gap-3 text-left">
        <div className="p-2 bg-primary/10 rounded-lg shrink-0">
          <Zap size={18} className="text-primary" />
        </div>
        <div>
          <h4 className="text-[13px] font-bold text-primary uppercase tracking-wide mb-1">Quick Tip</h4>
          <p className="text-[12px] text-ios-gray leading-snug font-medium">
            Invite at least 4 players to start Americano matches. You can set the number of courts based on availability.
          </p>
        </div>
      </div>

      <button
        onClick={onStartNewMatch}
        className="w-full h-[56px] bg-primary text-white rounded-[16px] font-bold text-[17px] shadow-lg shadow-primary/20 tap-target flex items-center justify-center gap-2"
      >
        <PlusCircle size={20} />
        <span>Start New Match</span>
      </button>
    </main>
  </div>
);
