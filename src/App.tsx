import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Home,
  Trophy,
  Users,
  User,
  Bell,
  PlusCircle,
  ChevronLeft,
  ChevronRight,
  Plus,
  Minus,
  Edit3,
  Trash2,
  Camera,
  Check,
  X,
  Search,
  Lock,
  Eye,
  EyeOff,
  Share2,
  Zap,
  BarChart2,
  Circle,
  Settings,
  LogOut,
  MapPin,
  Award,
  TrendingUp,
  Calendar,
  Star,
  MessageCircle,
  Instagram,
  RefreshCw,
  Phone,
  Mail,
  ArrowRight,
  Download,
  Building2
} from 'lucide-react';
import { cn } from './lib/utils';
import { Screen, Player, Tournament, Match, Round, MatchFormat, RankingCriteria, AppNotification, ScoringType, TournamentHistory, RankTier, UserProfile, Friend } from './types';
import { INITIAL_PLAYERS, INITIAL_TOURNAMENT } from './constants';
import { auth, db, googleProvider } from './firebase';
import { RegionSelector } from './components/RegionSelector';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  sendPasswordResetEmail,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp, collection, query, where, getDocs, orderBy, onSnapshot } from 'firebase/firestore';

const Logo = ({ className }: { className?: string }) => (
  <img
    src="https://res.cloudinary.com/dfyov6lu7/image/upload/v1775573986/FOM_Logomark_-_Color_opxjpk.png"
    alt="Gas Padel Logo"
    className={cn("object-contain", className)}
  />
);

// --- Constants & Helpers ---

const RANK_TIERS: { name: RankTier, min: number, max: number, color: string, icon: any }[] = [
  { name: 'Rookie', min: 0, max: 1000, color: 'bg-ios-gray/10 text-ios-gray', icon: Circle },
  { name: 'Amateur', min: 1001, max: 2000, color: 'bg-orange-400/10 text-orange-600', icon: Zap },
  { name: 'Challenger', min: 2001, max: 3000, color: 'bg-purple-500/10 text-purple-600', icon: TrendingUp },
  { name: 'Elite', min: 3001, max: 4000, color: 'bg-blue-500/10 text-blue-600', icon: Award },
  { name: 'Master', min: 4001, max: 5000, color: 'bg-emerald-500/10 text-emerald-600', icon: Star },
  { name: 'Grandmaster', min: 5001, max: 6000, color: 'bg-red-500/10 text-red-600', icon: Zap },
  { name: 'Legend', min: 6001, max: 7000, color: 'bg-yellow-400/10 text-yellow-600', icon: Trophy },
  { name: 'Hall of Fame', min: 7001, max: Infinity, color: 'bg-primary/10 text-primary', icon: Award },
];

const getRankInfo = (mmr: number) => {
  const rank = RANK_TIERS.find(r => mmr >= r.min && mmr <= r.max) || RANK_TIERS[0];
  const nextRank = RANK_TIERS[RANK_TIERS.indexOf(rank) + 1];
  const progress = nextRank ? ((mmr - rank.min) / (nextRank.min - rank.min)) * 100 : 100;
  return { ...rank, progress, nextRank };
};

const calculateMMRChange = (isWin: boolean, scoreDiff: number, isUnderdog: boolean, isFavorite: boolean) => {
  let change = 0;
  if (isWin) {
    change = scoreDiff >= 10 ? 40 : 25;
    if (isUnderdog) change += 15;
  } else {
    change = scoreDiff >= 10 ? -35 : -20;
    if (isFavorite) change -= 15;
  }
  return change;
};

const formatDurationFromMs = (elapsedMs: number) => {
  const totalSec = Math.max(0, Math.floor(elapsedMs / 1000));
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const RankBadge = ({ mmr, size = 'md', showLabel = true }: { mmr: number, size?: 'sm' | 'md' | 'lg', showLabel?: boolean }) => {
  const rank = getRankInfo(mmr);
  const Icon = rank.icon;

  const sizes = {
    sm: { container: 'px-1.5 py-0.5 gap-1', icon: 12, text: 'text-[9px]' },
    md: { container: 'px-2.5 py-1 gap-1.5', icon: 16, text: 'text-[11px]' },
    lg: { container: 'px-4 py-2 gap-2', icon: 24, text: 'text-[14px]' },
  };

  return (
    <div className={cn(
      "inline-flex items-center rounded-full font-bold uppercase tracking-wider",
      rank.color,
      sizes[size].container
    )}>
      <Icon size={sizes[size].icon} />
      {showLabel && <span className={sizes[size].text}>{rank.name}</span>}
    </div>
  );
};

const getPlayersStorageKey = (uid: string) => `gas_padel_players_${uid}`;
const getTournamentStorageKey = (uid: string) => `fom_play_active_tournament_${uid}`;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const InstallAppButton = ({
  className,
  compact = false
}: {
  className?: string;
  compact?: boolean;
}) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);

  const isIos = useMemo(() => {
    const ua = window.navigator.userAgent.toLowerCase();
    const isiPhoneOrIPad = /iphone|ipad|ipod/.test(ua);
    const isiPadOSDesktop = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
    return isiPhoneOrIPad || isiPadOSDesktop;
  }, []);

  useEffect(() => {
    const checkStandalone = () => {
      const byDisplayMode = window.matchMedia?.('(display-mode: standalone)').matches;
      const byNavigator = Boolean((window.navigator as any).standalone);
      setIsStandalone(Boolean(byDisplayMode || byNavigator));
    };

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const handleInstalled = () => {
      setDeferredPrompt(null);
      setIsStandalone(true);
    };

    checkStandalone();
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      return;
    }

    if (isIos) {
      window.alert('Untuk iPhone/iPad: buka menu Share di Safari, lalu pilih "Add to Home Screen".');
      return;
    }

    window.alert('Buka menu browser (⋮), lalu pilih "Install app" atau "Add to Home screen".');
  };

  if (isStandalone) return null;

  return (
    <button
      onClick={handleInstall}
      className={cn(
        "tap-target h-9 rounded-full inline-flex items-center justify-center gap-1.5 border",
        compact ? "px-2.5 text-[11px]" : "px-3 text-[12px]",
        "font-semibold",
        className
      )}
      aria-label="Install app"
    >
      <Download size={15} />
      <span>{compact ? 'Install' : 'Install App'}</span>
    </button>
  );
};

// --- Components ---

const BottomNav = ({
  currentScreen,
  setScreen,
  unreadCount,
  currentFormat,
  hasActiveGame
}: {
  currentScreen: Screen,
  setScreen: (s: Screen) => void,
  unreadCount: number,
  currentFormat: MatchFormat,
  hasActiveGame: boolean
}) => {
  const tabs: { id: Screen, label: string, icon: any }[] = [
    { id: 'dashboard', label: 'Beranda', icon: Home },
    { id: 'leaderboard', label: 'Ranking', icon: BarChart2 },
    { id: 'active', label: 'Main', icon: Trophy },
    { id: 'notifications', label: 'Notif', icon: Bell },
    { id: 'profile', label: 'Profil', icon: User },
  ];
  const mainTheme =
    hasActiveGame && currentFormat === 'Americano'
      ? {
        active: "bg-[#18A486]/12 text-[#12806A] border border-[#18A486]/30",
        idle: "bg-ios-gray/8 text-ios-gray"
      }
      : hasActiveGame && currentFormat === 'Mexicano'
        ? {
          active: "bg-primary/12 text-primary border border-primary/25",
          idle: "bg-ios-gray/8 text-ios-gray"
        }
        : hasActiveGame && currentFormat === 'Match Play'
          ? {
            active: "bg-[#2F6FE4]/12 text-[#2F6FE4] border border-[#2F6FE4]/25",
            idle: "bg-ios-gray/8 text-ios-gray"
          }
          : {
          active: "bg-[#2F6FE4]/12 text-[#2F6FE4] border border-[#2F6FE4]/25",
          idle: "bg-ios-gray/8 text-ios-gray"
          };

  const mainActiveClass = hasActiveGame
    ? mainTheme.active
    : "bg-primary/12 text-primary border border-primary/25";

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 px-4" style={{ paddingBottom: 'max(10px, env(safe-area-inset-bottom))' }}>
      <div className="mx-auto w-full max-w-md rounded-full border border-white/70 bg-white/68 backdrop-blur-2xl supports-[backdrop-filter]:bg-white/58 px-2 py-2 shadow-[0_10px_28px_rgba(17,24,39,0.10)]">
        <div className="flex items-center justify-between gap-1">
          {tabs.map((tab) => {
            const isActive = currentScreen === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setScreen(tab.id)}
                className={cn(
                  "relative h-10 transition-all duration-200 select-none",
                  isActive
                    ? cn(
                      "flex items-center gap-2 rounded-full px-3.5",
                      tab.id === 'active' ? mainActiveClass : "bg-primary/12 text-primary border border-primary/25"
                    )
                    : cn(
                      "w-10 rounded-full flex items-center justify-center",
                      tab.id === 'active' ? mainTheme.idle : "bg-ios-gray/8 text-ios-gray"
                    )
                )}
                aria-label={tab.label}
              >
                <tab.icon size={18} strokeWidth={isActive ? 2.5 : 2.2} />
                {isActive && <span className="text-[12px] font-semibold tracking-tight whitespace-nowrap">{tab.label}</span>}
                {tab.id === 'notifications' && unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-error text-white text-[9px] font-bold rounded-full flex items-center justify-center border border-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

// --- Screens ---

const LoginScreen = () => {
  const [mode, setMode] = useState<'masuk' | 'daftar' | 'forgot' | 'otp'>('masuk');
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const recaptchaRef = useRef<HTMLDivElement>(null);
  const [recaptchaVerifier, setRecaptchaVerifier] = useState<RecaptchaVerifier | null>(null);

  useEffect(() => {
    if (mode === 'otp' && !recaptchaVerifier && recaptchaRef.current) {
      const verifier = new RecaptchaVerifier(auth, recaptchaRef.current, {
        size: 'invisible',
      });
      setRecaptchaVerifier(verifier);
    }
  }, [mode, recaptchaVerifier]);

  const handleAuthError = (err: any) => {
    console.error(err);
    if (err.code === 'auth/user-not-found') setError('Email tidak terdaftar.');
    else if (err.code === 'auth/wrong-password') setError('Kata sandi salah.');
    else if (err.code === 'auth/email-already-in-use') setError('Email sudah digunakan.');
    else if (err.code === 'auth/invalid-email') setError('Format email tidak valid.');
    else if (err.code === 'auth/weak-password') setError('Kata sandi terlalu lemah.');
    else if (err.code === 'auth/operation-not-allowed') setError('Metode daftar Email/Password belum aktif di Firebase Console.');
    else if (err.code === 'auth/network-request-failed') setError('Koneksi internet bermasalah. Coba lagi.');
    else if (err.code === 'auth/too-many-requests') setError('Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.');
    else setError('Terjadi kesalahan. Silakan coba lagi.');
  };

  const handleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      handleAuthError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    const sanitizedName = name.trim();
    const sanitizedEmail = email.trim().toLowerCase();

    if (!sanitizedName) {
      setError('Nama lengkap wajib diisi.');
      return;
    }
    if (!sanitizedEmail) {
      setError('Email wajib diisi.');
      return;
    }
    if (password.length < 6) {
      setError('Kata sandi minimal 6 karakter.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, sanitizedEmail, password);
      await updateProfile(userCredential.user, { displayName: sanitizedName });

      // Best effort profile sync: auth account already exists even if Firestore write fails.
      try {
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          uid: userCredential.user.uid,
          email: userCredential.user.email || sanitizedEmail,
          displayName: sanitizedName,
          createdAt: serverTimestamp(),
        }, { merge: true });
      } catch (profileErr) {
        console.error('Register profile sync error:', profileErr);
      }
    } catch (err) {
      handleAuthError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) {
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          createdAt: serverTimestamp(),
        });
      }
    } catch (err) {
      handleAuthError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Masukkan email Anda terlebih dahulu.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      alert('Email pemulihan kata sandi telah dikirim!');
      setMode('masuk');
    } catch (err) {
      handleAuthError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    if (!phone) {
      setError('Masukkan nomor telepon Anda.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      if (!recaptchaVerifier) throw new Error('Recaptcha not ready');
      const result = await signInWithPhoneNumber(auth, phone, recaptchaVerifier);
      setConfirmationResult(result);
    } catch (err) {
      handleAuthError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || !confirmationResult) return;
    setError('');
    setLoading(true);
    try {
      await confirmationResult.confirm(otp);
    } catch (err) {
      setError('Kode OTP salah.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-white">
      <div className="w-full max-w-sm space-y-8">
        <header className="text-center space-y-6">
          <div className="flex justify-center">
            <Logo className="h-16 w-auto" />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-extrabold tracking-tight text-on-surface leading-tight">
              {mode === 'forgot' ? 'Lupa Kata Sandi?' : mode === 'otp' ? 'Masuk dengan OTP' : 'Capek kerja? Butuh gerak?'}
              {mode !== 'forgot' && mode !== 'otp' && <span className="text-primary block mt-0.5">Ya Gas Padel!</span>}
            </h1>
            <p className="text-on-surface/40 font-medium text-sm">
              {mode === 'forgot' ? 'Kami akan mengirimkan link pemulihan' : mode === 'otp' ? 'Masukkan nomor telepon aktif Anda' : 'Mulai gratis, coba sekarang'}
            </p>
          </div>
        </header>

        <main className="space-y-6">
          {(mode === 'masuk' || mode === 'daftar') && (
            <div className="bg-ios-gray/10 p-1 rounded-xl flex items-center">
              <button
                onClick={() => setMode('masuk')}
                className={cn(
                  "flex-1 py-1.5 text-[13px] font-semibold rounded-lg transition-all duration-200",
                  mode === 'masuk' ? "bg-white shadow-sm text-on-surface" : "text-on-surface/50"
                )}
              >
                Masuk
              </button>
              <button
                onClick={() => setMode('daftar')}
                className={cn(
                  "flex-1 py-1.5 text-[13px] font-semibold rounded-lg transition-all duration-200",
                  mode === 'daftar' ? "bg-white shadow-sm text-on-surface" : "text-on-surface/50"
                )}
              >
                Daftar
              </button>
            </div>
          )}

          <div className="bg-white rounded-3xl p-6 shadow-[0_4px_12px_rgba(0,0,0,0.05)] space-y-6 border border-white/50">
            {error && (
              <div className="p-3 bg-error/10 border border-error/20 rounded-xl text-error text-xs font-semibold text-center">
                {error}
              </div>
            )}

            <div className="space-y-5">
              {mode === 'daftar' && (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-on-surface/40 px-1 ml-0.5">Nama Lengkap</label>
                  <div className="relative group">
                    <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface/30 group-focus-within:text-primary transition-colors" />
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-ios-gray/5 rounded-2xl border-none focus:ring-2 focus:ring-primary/20 text-[15px] font-medium transition-all placeholder:text-on-surface/30"
                      placeholder="Nama Anda"
                      type="text"
                    />
                  </div>
                </div>
              )}

              {(mode === 'masuk' || mode === 'daftar' || mode === 'forgot') && (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-on-surface/40 px-1 ml-0.5">Email</label>
                  <div className="relative group">
                    <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface/30 group-focus-within:text-primary transition-colors" />
                    <input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-ios-gray/5 rounded-2xl border-none focus:ring-2 focus:ring-primary/20 text-[15px] font-medium transition-all placeholder:text-on-surface/30"
                      placeholder="email@contoh.com"
                      type="email"
                    />
                  </div>
                </div>
              )}

              {(mode === 'masuk' || mode === 'daftar') && (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-on-surface/40 px-1 ml-0.5">Kata Sandi</label>
                  <div className="relative group">
                    <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface/30 group-focus-within:text-primary transition-colors" />
                    <input
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-11 pr-12 py-3 bg-ios-gray/5 rounded-2xl border-none focus:ring-2 focus:ring-primary/20 text-[15px] font-medium transition-all placeholder:text-on-surface/30"
                      placeholder="••••••••"
                      type={showPassword ? "text" : "password"}
                    />
                    <button
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface/30 hover:text-on-surface"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              )}

              {mode === 'otp' && (
                <div className="space-y-5">
                  {!confirmationResult ? (
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-on-surface/40 px-1 ml-0.5">Nomor Telepon</label>
                      <div className="relative group">
                        <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface/30 group-focus-within:text-primary transition-colors" />
                        <input
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="w-full pl-11 pr-4 py-3 bg-ios-gray/5 rounded-2xl border-none focus:ring-2 focus:ring-primary/20 text-[15px] font-medium transition-all placeholder:text-on-surface/30"
                          placeholder="+628123456789"
                          type="tel"
                        />
                      </div>
                      <div ref={recaptchaRef}></div>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-on-surface/40 px-1 ml-0.5">Kode OTP</label>
                      <div className="relative group">
                        <ArrowRight size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface/30 group-focus-within:text-primary transition-colors" />
                        <input
                          value={otp}
                          onChange={(e) => setOtp(e.target.value)}
                          className="w-full pl-11 pr-4 py-3 bg-ios-gray/5 rounded-2xl border-none focus:ring-2 focus:ring-primary/20 text-[15px] font-medium transition-all placeholder:text-on-surface/30"
                          placeholder="123456"
                          type="text"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {mode === 'masuk' && (
                <div className="flex justify-between items-center pr-1">
                  <button
                    onClick={() => setMode('otp')}
                    className="text-xs font-semibold text-ios-gray hover:text-primary transition-colors"
                  >
                    Masuk via OTP
                  </button>
                  <button
                    onClick={() => setMode('forgot')}
                    className="text-xs font-semibold text-primary hover:opacity-80 transition-opacity"
                  >
                    Lupa Password?
                  </button>
                </div>
              )}

              {mode === 'forgot' && (
                <button
                  onClick={() => setMode('masuk')}
                  className="text-xs font-semibold text-ios-gray hover:text-primary transition-colors"
                >
                  Kembali ke Masuk
                </button>
              )}

              {mode === 'otp' && (
                <button
                  onClick={() => {
                    setMode('masuk');
                    setConfirmationResult(null);
                  }}
                  className="text-xs font-semibold text-ios-gray hover:text-primary transition-colors"
                >
                  Kembali ke Masuk
                </button>
              )}

              <button
                onClick={
                  mode === 'masuk' ? handleLogin :
                    mode === 'daftar' ? handleRegister :
                      mode === 'forgot' ? handleForgotPassword :
                        !confirmationResult ? handleSendOtp : handleVerifyOtp
                }
                disabled={loading}
                className="w-full bg-primary text-white py-4 rounded-2xl font-bold text-[16px] shadow-lg shadow-primary/20 active:scale-[0.97] disabled:opacity-50 disabled:active:scale-100 transition-all duration-200"
              >
                {loading ? 'Memproses...' :
                  mode === 'masuk' ? 'Masuk' :
                    mode === 'daftar' ? 'Daftar' :
                      mode === 'forgot' ? 'Kirim Link' :
                        !confirmationResult ? 'Kirim OTP' : 'Verifikasi OTP'}
              </button>
            </div>

            {(mode === 'masuk' || mode === 'daftar') && (
              <>
                <div className="relative flex items-center py-1">
                  <div className="flex-grow border-t border-ios-gray/20"></div>
                  <span className="flex-shrink mx-4 text-[10px] font-bold text-on-surface/30 uppercase tracking-[0.2em]">Atau</span>
                  <div className="flex-grow border-t border-ios-gray/20"></div>
                </div>

                <button
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-3 py-3.5 bg-white border border-ios-gray/20 rounded-2xl font-bold text-[14px] text-on-surface hover:bg-surface active:scale-[0.97] transition-all duration-200"
                >
                  <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
                  Lanjutkan dengan Google
                </button>
              </>
            )}
          </div>
        </main>

        <footer className="text-center">
          <p className="text-[11px] text-on-surface/30 leading-relaxed max-w-[260px] mx-auto font-medium">
            Dengan melanjutkan, Anda menyetujui <button className="underline underline-offset-2">Ketentuan Layanan</button> dan <button className="underline underline-offset-2">Kebijakan Privasi</button> FOM Play.
          </p>
        </footer>
      </div>
    </div>
  );
};

const DashboardScreen = ({
  onStartMatch,
  onViewRank,
  tournament,
  onContinueMatch,
  onNotifications,
  onViewHistory,
  unreadCount,
  tournaments,
  user,
  addNotification
}: {
  onStartMatch: () => void,
  onViewRank: () => void,
  tournament: Tournament,
  onContinueMatch: () => void,
  onNotifications: () => void,
  onViewHistory: (t: TournamentHistory) => void,
  unreadCount: number,
  tournaments: TournamentHistory[],
  user: any,
  addNotification: (title: string, message: string, type: AppNotification['type']) => void
}) => {
  const activeRound = tournament.rounds?.find(r => r && r.matches && r.matches.some(m => m && m.status === 'active'));
  const activeMatches = activeRound ? activeRound.matches.filter(m => m && m.status === 'active') : [];

  return (
    <div className="pb-32">
      <header className="ios-blur sticky top-0 w-full z-50 flex items-center px-4 h-14 border-b border-ios-gray/10">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <Logo className="h-8 w-auto" />
            <span className="font-bold text-primary">FOM Play</span>
          </div>
          <div className="flex items-center gap-1.5">
            <InstallAppButton
              compact
              className="bg-white text-primary border-primary/20"
            />
            <button
              onClick={onNotifications}
              className="tap-target flex items-center justify-center p-2 relative"
            >
              <Bell size={24} className="text-primary" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-3 h-3 bg-error text-white text-[8px] font-bold rounded-full flex items-center justify-center border border-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="pt-6 max-w-2xl mx-auto">
        <section className="px-5 mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-ios-gray text-[13px] font-semibold uppercase tracking-wide mb-1">Halo, {user?.displayName || 'Pemain Padel'}</h2>
              <h1 className="text-[34px] leading-[41px] font-display font-bold tracking-tight text-on-surface">Siap Untuk<br />Kemenangan Hari Ini?</h1>
            </div>
            <div className="flex flex-col items-end gap-2">
              <RankBadge mmr={user?.mmr || 0} size="lg" />
              <button
                onClick={onViewRank}
                className="text-[10px] font-bold text-primary uppercase tracking-widest bg-primary/5 px-2 py-1 rounded-lg tap-target active:scale-95 transition-transform"
              >
                Lihat Detail Rank
              </button>
            </div>
          </div>
        </section>

        <section className="px-5 mb-10">
          <div
            onClick={onStartMatch}
            className="w-full bg-primary text-white p-5 rounded-[18px] flex items-center justify-between tap-target cursor-pointer"
          >
            <div className="text-left">
              <span className="block text-lg font-display font-bold tracking-tight">Mulai Pertandingan Baru</span>
              <span className="text-sm font-medium opacity-80">Atur skor dan lawan</span>
            </div>
            <PlusCircle size={32} />
          </div>
        </section>

        {activeMatches.length > 0 && (
          <section className="mb-10">
            <div
              onClick={onContinueMatch}
              className="px-5 flex justify-between items-center mb-4 cursor-pointer group"
            >
              <h2 className="text-xl font-bold tracking-tight">Pertandingan Aktif</h2>
              <button className="text-primary text-sm font-semibold tap-target px-2 group-hover:underline">Lihat Semua</button>
            </div>
            <div className="flex overflow-x-auto gap-4 no-scrollbar px-5 pb-2 snap-x snap-mandatory">
              {activeMatches.map((match) => (
                <div
                  key={match.id}
                  onClick={onContinueMatch}
                  className={cn(
                    "bg-white p-5 rounded-[20px] shadow-sm border border-ios-gray/10 shrink-0 cursor-pointer tap-target snap-start",
                    activeMatches.length === 1 ? "w-full" : "w-[84vw] max-w-[360px]"
                  )}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="min-w-0 pr-2">
                      <span className="inline-block px-2 py-0.5 bg-primary/10 text-primary text-[11px] font-bold rounded-md mb-1 uppercase">{tournament.name}</span>
                      <h3 className="text-[16px] leading-tight font-bold truncate">Ronde {match.roundId}: Lapangan {match.court}</h3>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="block text-[10px] font-bold text-ios-gray uppercase tracking-wider">DURASI</span>
                      <span className="text-sm font-semibold text-primary">{match.duration || '00:00'}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 mb-6">
                    <div className="flex flex-col items-center gap-1.5 min-w-0">
                      <div className="flex -space-x-3">
                        {match.teamA.players?.map((p, idx) => (
                          <div key={idx} className="w-9 h-9 rounded-full border-2 border-white bg-ios-gray/20 flex items-center justify-center text-[10px] font-bold">
                            {p?.initials}
                          </div>
                        ))}
                      </div>
                      <span className="text-[11px] font-bold text-ios-gray uppercase text-center truncate w-full leading-none">
                        {match.teamA.players?.map(p => p?.name?.split(' ')[0]).join(' & ')}
                      </span>
                    </div>
                    <div className="flex flex-col items-center min-w-[84px]">
                      <div className="text-[30px] leading-none font-display font-black italic tracking-tighter">
                        <span className="text-primary">{match.teamA.score}</span>
                        <span className="text-ios-gray/30 mx-1">-</span>
                        <span className="text-on-surface">{match.teamB.score}</span>
                      </div>
                      <span className="text-[10px] font-bold text-ios-gray tracking-wide">SKOR</span>
                    </div>
                    <div className="flex flex-col items-center gap-1.5 min-w-0">
                      <div className="flex -space-x-3">
                        {match.teamB.players?.map((p, idx) => (
                          <div key={idx} className="w-9 h-9 rounded-full border-2 border-white bg-ios-gray/20 flex items-center justify-center text-[10px] font-bold">
                            {p?.initials}
                          </div>
                        ))}
                      </div>
                      <span className="text-[11px] font-bold text-ios-gray uppercase text-center truncate w-full leading-none">
                        {match.teamB.players?.map(p => p?.name?.split(' ')[0]).join(' & ')}
                      </span>
                    </div>
                  </div>
                  <div
                    className="w-full bg-on-surface text-white py-3 rounded-[14px] font-bold text-sm flex items-center justify-center gap-2"
                  >
                    <span>Lanjutkan Score</span>
                    <ChevronRight size={16} />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="mb-10">
          <div
            onClick={() => {
              if (tournaments.length > 0) {
                onViewHistory(tournaments[0]);
              } else {
                addNotification('Riwayat', 'Belum ada riwayat turnamen untuk ditampilkan.', 'system');
              }
            }}
            className="px-5 flex justify-between items-center mb-4 cursor-pointer group"
          >
            <h2 className="text-xl font-bold tracking-tight">Riwayat Terakhir</h2>
            <button
              className="text-primary text-sm font-semibold tap-target px-2 group-hover:underline"
            >
              Buka Riwayat
            </button>
          </div>
          <div className="px-5 flex flex-col gap-4">
            {tournaments.length === 0 ? (
              <div className="bg-white border border-ios-gray/10 rounded-[20px] p-8 text-center shadow-sm">
                <Trophy size={40} className="text-ios-gray/20 mx-auto mb-3" />
                <p className="text-ios-gray font-medium">Belum ada riwayat turnamen.</p>
              </div>
            ) : (
              tournaments.slice(0, 5).map((item) => (
                <button
                  key={item.id}
                  onClick={() => onViewHistory(item)}
                  className="w-full bg-white rounded-[20px] p-4 text-left shadow-sm border border-ios-gray/10 tap-target flex flex-col gap-3"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col min-w-0">
                      <span className="text-[10px] font-bold text-ios-gray uppercase tracking-wider mb-1">
                        {item.date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </span>
                      <h4 className="text-[17px] font-bold text-on-surface leading-tight truncate">{item.name}</h4>
                    </div>
                    <div className="bg-surface p-1.5 rounded-full">
                      <ChevronRight size={18} className="text-ios-gray" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center bg-primary/5 px-3 py-2 rounded-xl gap-2 border border-primary/10">
                      <Zap size={16} className="text-primary" />
                      <div className="flex flex-col">
                        <span className="text-[9px] font-bold text-primary uppercase leading-none mb-0.5">Rounds</span>
                        <span className="text-xs font-bold leading-none">{item.numRounds}</span>
                      </div>
                    </div>
                    <div className="flex items-center bg-ios-gray/5 px-3 py-2 rounded-xl gap-2 border border-ios-gray/10">
                      <Users size={16} className="text-ios-gray" />
                      <div className="flex flex-col">
                        <span className="text-[9px] font-bold text-ios-gray uppercase leading-none mb-0.5">Pemain</span>
                        <span className="text-xs font-bold leading-none">{item.numPlayers}</span>
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

const AddPlayerModal = ({ isOpen, onClose, onAdd }: { isOpen: boolean, onClose: () => void, onAdd: (p: Player) => void }) => {
  const [name, setName] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [modalBottomOffset, setModalBottomOffset] = useState(24);

  useEffect(() => {
    if (!isOpen) return;

    const updateModalOffset = () => {
      const vv = window.visualViewport;
      if (!vv) {
        setModalBottomOffset(24);
        return;
      }
      const keyboardHeight = Math.max(0, window.innerHeight - (vv.height + vv.offsetTop));
      setModalBottomOffset(Math.max(24, keyboardHeight + 18));
    };

    updateModalOffset();
    window.addEventListener('resize', updateModalOffset);
    window.visualViewport?.addEventListener('resize', updateModalOffset);
    window.visualViewport?.addEventListener('scroll', updateModalOffset);
    return () => {
      window.removeEventListener('resize', updateModalOffset);
      window.visualViewport?.removeEventListener('resize', updateModalOffset);
      window.visualViewport?.removeEventListener('scroll', updateModalOffset);
    };
  }, [isOpen]);

  const handleTakePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    const newPlayer: Player = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      rating: 0,
      initials,
      avatar: photo || undefined,
      stats: { matches: 0, won: 0, lost: 0, draw: 0, diff: 0 }
    };

    onAdd(newPlayer);
    setName('');
    setPhoto(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
      />
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        className="relative w-full max-w-md bg-white rounded-[32px] shadow-2xl overflow-hidden"
        style={{ marginBottom: modalBottomOffset }}
      >
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold tracking-tight">Tambah Pemain Baru</h3>
            <button onClick={onClose} className="p-2 bg-ios-gray/10 rounded-full tap-target">
              <X size={20} className="text-on-surface" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex flex-col items-center gap-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-24 h-24 rounded-full bg-ios-gray/10 border-2 border-dashed border-ios-gray/30 flex flex-col items-center justify-center cursor-pointer overflow-hidden relative group"
              >
                {photo ? (
                  <img src={photo} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <>
                    <Camera size={24} className="text-ios-gray mb-1" />
                    <span className="text-[10px] font-bold text-ios-gray uppercase">Ambil Foto</span>
                  </>
                )}
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Camera size={20} className="text-white" />
                </div>
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleTakePhoto}
                accept="image/*"
                capture="user"
                className="hidden"
              />
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-ios-gray px-1">Nama Lengkap</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Falih Hermon"
                  className="w-full h-14 bg-ios-gray/5 border border-ios-gray/10 rounded-2xl px-4 font-semibold focus:outline-none focus:border-primary transition-colors"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full h-14 bg-primary text-white rounded-2xl font-bold text-lg shadow-lg shadow-primary/20 tap-target mt-4"
            >
              Simpan Pemain
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

const MatchSettingsScreen = ({ onBack, onGenerate, tournament, setTournament, allPlayers, setAllPlayers, onAddNotification, currentUser }: {
  onBack: () => void,
  onGenerate: (t: Tournament) => void,
  tournament: Tournament,
  setTournament: React.Dispatch<React.SetStateAction<Tournament>>,
  allPlayers: Player[],
  setAllPlayers: React.Dispatch<React.SetStateAction<Player[]>>,
  onAddNotification: (title: string, message: string, type: AppNotification['type']) => void,
  currentUser: any
}) => {
  const sanitizeInitialCourtText = (value?: string) => {
    if (!value) return '';
    const lower = value.toLowerCase();
    const looksLikeGenericCityRegion =
      value.includes(',') &&
      !lower.includes('padel') &&
      !lower.includes('court') &&
      !lower.includes('arena');
    return looksLikeGenericCityRegion ? '' : value;
  };

  type CourtSuggestion = {
    id: string;
    name: string;
    address: string;
    lat: number;
    lon: number;
    type?: string;
  };

  const [selectedPlayers, setSelectedPlayers] = useState<Player[]>(tournament.players);
  const [format, setFormat] = useState<MatchFormat>(tournament.format);
  const [criteria, setCriteria] = useState<RankingCriteria>(tournament.criteria);
  const [scoringType, setScoringType] = useState<ScoringType>(tournament.scoringType || 'Golden Point');
  const [courts, setCourts] = useState(tournament.courts);
  const [points, setPoints] = useState(tournament.totalPoints);
  const [numRounds, setNumRounds] = useState(tournament.numRounds || 5);
  const [gameName, setGameName] = useState(tournament.name || '');
  const [venueName, setVenueName] = useState(tournament.venueName || '');
  const [customModalType, setCustomModalType] = useState<'courts' | 'rounds' | 'points' | null>(null);
  const [customModalValue, setCustomModalValue] = useState('');
  const customInputRef = useRef<HTMLInputElement>(null);
  const [location, setLocation] = useState(sanitizeInitialCourtText(tournament.location));
  const [courtQuery, setCourtQuery] = useState(sanitizeInitialCourtText(tournament.location));
  const [courtSuggestions, setCourtSuggestions] = useState<CourtSuggestion[]>([]);
  const [isSearchingCourts, setIsSearchingCourts] = useState(false);
  const [courtSearchError, setCourtSearchError] = useState('');
  const [showCourtSuggestions, setShowCourtSuggestions] = useState(false);
  const [courtSearchProvider, setCourtSearchProvider] = useState<'google' | 'osm' | 'none'>('none');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [selectedCourtId, setSelectedCourtId] = useState<string | null>(null);
  const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
  const [googlePlacesBlocked, setGooglePlacesBlocked] = useState(false);

  useEffect(() => {
    const uid = currentUser?.uid;
    let cancelled = false;

    setFriends([]);
    if (!uid) {
      setLoadingFriends(false);
      return;
    }

    setLoadingFriends(true);
    const q = query(collection(db, 'users', uid, 'friends'), orderBy('displayName', 'asc'));
    getDocs(q).then(snapshot => {
      if (cancelled) return;
      const fetched: Friend[] = [];
      snapshot.forEach(doc => fetched.push(doc.data() as Friend));
      setFriends(fetched);
      setLoadingFriends(false);
    }).catch(err => {
      if (cancelled) return;
      console.error('Error fetching friends for settings:', err);
      setFriends([]);
      setLoadingFriends(false);
    });

    return () => {
      cancelled = true;
    };
  }, [currentUser?.uid]);

  const minPlayersNeeded = courts * 4;
  const isReady = selectedPlayers.length >= minPlayersNeeded;

  const mapToCourtSuggestions = (items: any[], queryLower: string): CourtSuggestion[] => {
    const cityLikeTypes = new Set([
      'city',
      'town',
      'village',
      'municipality',
      'administrative',
      'county',
      'state',
      'province',
      'district',
      'suburb'
    ]);

    const scoreSuggestion = (item: CourtSuggestion) => {
      const name = item.name.toLowerCase();
      const address = item.address.toLowerCase();
      const type = (item.type || '').toLowerCase();
      let score = 0;

      if (cityLikeTypes.has(type)) score += 100;
      if (name.startsWith(queryLower)) score += 40;
      if (name.includes(queryLower)) score += 25;
      if (address.includes(queryLower)) score += 10;
      if (name.includes('padel') || name.includes('court') || name.includes('arena')) score += 8;

      return score;
    };

    return items
      .map((item: any) => {
        const lat = Number(item.lat);
        const lon = Number(item.lon);
        const name = item.name || item.display_name || '';
        const address = item.address || '';
        const id = item.id || `${name}:${lat}:${lon}`;
        return { id, name, address, lat, lon, type: item.type || '' };
      })
      .filter((item: CourtSuggestion) => item.name && !Number.isNaN(item.lat) && !Number.isNaN(item.lon))
      .sort((a, b) => scoreSuggestion(b) - scoreSuggestion(a))
      .slice(0, 6);
  };

  useEffect(() => {
    const query = courtQuery.trim();
    setLocation(query);

    if (query.length < 3) {
      setCourtSuggestions([]);
      setCourtSearchError('');
      setIsSearchingCourts(false);
      setCourtSearchProvider('none');
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingCourts(true);
      setCourtSearchError('');

      try {
        const queryWithPadel = query;
        const queryLower = query.toLowerCase();
        let suggestions: CourtSuggestion[] = [];

        if (googleMapsApiKey && !googlePlacesBlocked) {
          try {
            const googleResponse = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': googleMapsApiKey,
                'X-Goog-FieldMask': 'suggestions.placePrediction.placeId,suggestions.placePrediction.text,suggestions.placePrediction.structuredFormat'
              },
              body: JSON.stringify({
                input: queryWithPadel,
                languageCode: 'id',
                regionCode: 'ID'
              })
            });

            if (!googleResponse.ok) {
              if (googleResponse.status === 403) {
                setGooglePlacesBlocked(true);
              }
              throw new Error(`Google Places failed: ${googleResponse.status}`);
            }

            const googleData = await googleResponse.json();
            const googleSuggestions: CourtSuggestion[] = (googleData?.suggestions || [])
              .map((item: any) => {
                const prediction = item?.placePrediction;
                const mainText = prediction?.structuredFormat?.mainText?.text || prediction?.text?.text || '';
                const secondaryText = prediction?.structuredFormat?.secondaryText?.text || '';
                const placeId = prediction?.placeId || '';
                return {
                  id: `google:${placeId}`,
                  name: mainText,
                  address: secondaryText,
                  lat: 0,
                  lon: 0,
                  type: ''
                };
              })
              .filter((item: CourtSuggestion) => item.name && item.id !== 'google:');

            suggestions = googleSuggestions.slice(0, 6);
            if (suggestions.length > 0) {
              setCourtSearchProvider('google');
            }
          } catch (googleErr) {
            console.warn('Google Places unavailable, fallback to OSM:', googleErr);
          }
        }

        try {
          if (suggestions.length > 0) {
            setCourtSuggestions(suggestions);
            return;
          }

          const photonResponse = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(queryWithPadel)}&lang=en&limit=8`);
          if (!photonResponse.ok) {
            throw new Error(`Photon failed: ${photonResponse.status}`);
          }
          const photonData = await photonResponse.json();
          const photonItems = (photonData?.features || []).map((feature: any) => {
            const props = feature?.properties || {};
            const coordinates = feature?.geometry?.coordinates || [];
            const addressParts = [props.city, props.state, props.country].filter(Boolean);
            return {
              id: `${props.osm_type || ''}:${props.osm_id || ''}:${coordinates[1]}:${coordinates[0]}`,
              name: props.name || props.street || '',
              address: addressParts.join(', '),
              lat: coordinates[1],
              lon: coordinates[0],
              type: props.type || ''
            };
          });
          suggestions = mapToCourtSuggestions(photonItems, queryLower);
          if (suggestions.length > 0) {
            setCourtSearchProvider('osm');
          }
        } catch (photonErr) {
          console.warn('Photon unavailable, fallback to Nominatim:', photonErr);
        }

        if (suggestions.length === 0) {
          const nominatimResponse = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=8&accept-language=id&countrycodes=id&q=${encodeURIComponent(queryWithPadel)}`);
          if (!nominatimResponse.ok) {
            throw new Error(`Nominatim failed: ${nominatimResponse.status}`);
          }
          const nominatimData = await nominatimResponse.json();
          const nominatimItems = (nominatimData || []).map((item: any) => ({
            id: `nominatim:${item.place_id || ''}:${item.lat}:${item.lon}`,
            name: item.name || (item.display_name ? String(item.display_name).split(',')[0] : ''),
            address: item.display_name || '',
            lat: item.lat,
            lon: item.lon,
            type: item.type || item.addresstype || ''
          }));
          suggestions = mapToCourtSuggestions(nominatimItems, queryLower);
          if (suggestions.length > 0) {
            setCourtSearchProvider('osm');
          }
        }

        setCourtSuggestions(suggestions);
      } catch (err) {
        console.error('Court autocomplete error:', err);
        setCourtSuggestions([]);
        setCourtSearchError('Pencarian lapangan sedang bermasalah. Coba lagi beberapa saat.');
        setCourtSearchProvider('none');
      } finally {
        setIsSearchingCourts(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [courtQuery]);

  const togglePlayer = (player: Player) => {
    if (!player) return;
    if (selectedPlayers.find(p => p && p.id === player.id)) {
      setSelectedPlayers(selectedPlayers.filter(p => p && p.id !== player.id));
    } else {
      setSelectedPlayers([...selectedPlayers, player]);
    }
  };

  const handleAddPlayer = (newPlayer: Player) => {
    setAllPlayers(prev => [newPlayer, ...prev]);
    setSelectedPlayers(prev => [newPlayer, ...prev]);
    onAddNotification('Pemain Baru!', `${newPlayer.name} telah ditambahkan ke daftar pemain.`, 'system');
  };

  const handleRemovePlayer = (e: React.MouseEvent, playerId: string) => {
    e.stopPropagation();
    setAllPlayers(prev => prev.filter(p => p.id !== playerId));
    setSelectedPlayers(prev => prev.filter(p => p.id !== playerId));
  };

  const handleGenerate = () => {
    const updatedTournament: Tournament = {
      ...tournament,
      name: gameName.trim() || tournament.name || 'Game Padel',
      format,
      criteria,
      scoringType,
      courts,
      totalPoints: points,
      players: selectedPlayers,
      numRounds,
      venueName: venueName.trim(),
      location: location.trim(),
      rounds: [] // Will be generated in the next step
    };
    onGenerate(updatedTournament);
  };

  const openCustomModal = (type: 'courts' | 'rounds' | 'points') => {
    setCustomModalType(type);
    if (type === 'courts') setCustomModalValue(String(courts));
    if (type === 'rounds') setCustomModalValue(String(numRounds));
    if (type === 'points') setCustomModalValue(String(points));
  };

  useEffect(() => {
    if (!customModalType) return;
    const t = setTimeout(() => {
      customInputRef.current?.focus();
      customInputRef.current?.select();
    }, 50);
    return () => clearTimeout(t);
  }, [customModalType]);

  const applyCustomModalValue = () => {
    if (!customModalType) return;
    const parsed = Number.parseInt(customModalValue, 10);
    if (Number.isNaN(parsed)) return;

    if (customModalType === 'courts') {
      setCourts(Math.max(1, Math.min(12, parsed)));
    } else if (customModalType === 'rounds') {
      setNumRounds(Math.max(1, Math.min(30, parsed)));
    } else {
      setPoints(Math.max(1, Math.min(99, parsed)));
    }
    setCustomModalType(null);
  };

  const handleSelectCourtSuggestion = async (suggestion: CourtSuggestion) => {
    setSelectedCourtId(suggestion.id);
    setCourtQuery(suggestion.name);
    setLocation(suggestion.name);
    setShowCourtSuggestions(false);
    setCourtSuggestions([]);
  };

  const formatChips: { value: MatchFormat, label: string, icon: React.ElementType }[] = [
    { value: 'Match Play', label: 'Match Play', icon: Trophy },
    { value: 'Americano', label: 'Americano', icon: Users },
    { value: 'Mexicano', label: 'Mexicano', icon: RefreshCw }
  ];

  const circleChipClass = (active: boolean) => cn(
    "w-[58px] h-[58px] rounded-full border flex items-center justify-center text-center shrink-0 transition-all leading-tight",
    active
      ? "bg-primary text-white border-primary shadow-md shadow-primary/20"
      : "bg-white text-on-surface border-ios-gray/15"
  );

  return (
    <div className="pb-32 bg-white min-h-screen">
      <nav className="ios-blur sticky top-0 z-50 flex justify-between items-center w-full px-4 h-14 border-b border-ios-gray/10">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="tap-target p-2 -ml-2">
            <ChevronLeft size={24} className="text-primary" />
          </button>
          <h1 className="text-[17px] font-bold tracking-tight text-on-surface">Pengaturan Pertandingan</h1>
        </div>
        <button
          onClick={handleGenerate}
          disabled={!isReady}
          className={cn("font-bold tap-target px-2 transition-colors", !isReady ? "text-ios-gray/40" : "text-primary")}
        >
          Generate
        </button>
      </nav>

      <main className="max-w-md mx-auto px-4 py-6 space-y-8">
        <section className="space-y-3">
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-on-surface/60 px-1">Nama Game</h2>
          <div className="w-full bg-white border border-ios-gray/10 rounded-2xl p-4 shadow-sm">
            <input
              type="text"
              value={gameName}
              onChange={(e) => setGameName(e.target.value)}
              placeholder="Contoh: Friday Padel Match"
              className="w-full text-sm font-bold text-on-surface bg-transparent outline-none"
            />
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-on-surface/60 px-1">Nama Lapangan Padel</h2>
          <div className="w-full bg-white border border-ios-gray/10 rounded-2xl p-4 shadow-sm">
            <input
              type="text"
              value={venueName}
              onChange={(e) => setVenueName(e.target.value)}
              placeholder="Contoh: Star Padel Karawaci"
              className="w-full text-sm font-bold text-on-surface bg-transparent outline-none"
            />
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-on-surface/60 px-1">Kota Bermain</h2>
          <div className="relative">
            <div className="w-full bg-white border border-ios-gray/10 rounded-2xl p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <Building2 size={19} />
                </div>
                <div className="flex-1">
                  <p className="text-[11px] font-semibold text-ios-gray mb-1">
                    Masukkan kota tempat bermain
                  </p>
                  <input
                    type="text"
                    value={courtQuery}
                    onChange={(e) => {
                      setCourtQuery(e.target.value);
                      setSelectedCourtId(null);
                      setShowCourtSuggestions(true);
                    }}
                    onFocus={() => setShowCourtSuggestions(true)}
                    onBlur={() => {
                      setTimeout(() => setShowCourtSuggestions(false), 150);
                    }}
                    placeholder="Contoh: Tangerang"
                    className="w-full text-sm font-bold text-on-surface bg-transparent outline-none"
                  />
                  {courtSearchProvider !== 'none' && (
                    <p className="text-[10px] font-medium text-primary/80 mt-1">
                      Sumber: {courtSearchProvider === 'google' ? 'Google Maps' : 'OpenStreetMap'}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {showCourtSuggestions && (
              <div className="absolute z-30 mt-2 w-full bg-white border border-ios-gray/10 rounded-2xl shadow-lg overflow-hidden">
                {!isSearchingCourts && !courtSearchError && courtQuery.trim().length < 3 && (
                  <div className="px-4 py-3 text-[12px] text-ios-gray font-medium flex items-center gap-2">
                    <Search size={14} className="text-ios-gray/70" />
                    Mulai ketik nama kota untuk mencari...
                  </div>
                )}
                {isSearchingCourts && (
                  <div className="px-4 py-3 text-[12px] text-ios-gray font-medium flex items-center gap-2">
                    <RefreshCw size={14} className="animate-spin text-ios-gray/70" />
                    Mencari lapangan...
                  </div>
                )}
                {courtSearchError && (
                  <div className="px-4 py-3 text-[12px] text-error font-medium">{courtSearchError}</div>
                )}
                {!isSearchingCourts && !courtSearchError && courtSuggestions.length === 0 && courtQuery.trim().length >= 3 && (
                  <div className="px-4 py-3 text-[12px] text-ios-gray font-medium">Tidak ada lapangan yang cocok.</div>
                )}
                {!isSearchingCourts && !courtSearchError && courtSuggestions.map((suggestion) => (
                  <button
                    key={suggestion.id}
                    onClick={() => handleSelectCourtSuggestion(suggestion)}
                    className={cn(
                      "w-full text-left px-4 py-3 border-b last:border-b-0 border-ios-gray/10 hover:bg-surface transition-colors",
                      selectedCourtId === suggestion.id && "bg-primary/5"
                    )}
                  >
                    <p className="text-[13px] font-semibold text-on-surface truncate">{suggestion.name}</p>
                    {suggestion.address && (
                      <p className="text-[11px] text-ios-gray truncate">{suggestion.address}</p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-on-surface/60 px-1">Format Pertandingan</h2>
          <div className="grid grid-cols-3 gap-3">
            {formatChips.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => setFormat(value)}
                className={cn(
                  "p-4 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all tap-target",
                  format === value
                    ? "bg-white border-2 border-primary shadow-sm"
                    : "bg-white border-ios-gray/10 opacity-70"
                )}
              >
                <Icon size={22} className={format === value ? "text-primary" : "text-on-surface"} />
                <span className={cn("text-[11px] font-semibold text-center leading-tight", format === value && "text-primary font-bold")}>
                  {label}
                </span>
              </button>
            ))}
          </div>
          <div className="bg-primary/5 p-4 rounded-xl border border-primary/10">
            <p className="text-[12px] text-primary font-medium leading-relaxed">
              {format === 'Mexicano' ? "Mode Mexicano menyesuaikan lawan berdasarkan performa poin setiap set." :
                format === 'Americano' ? "Mode Americano mengacak pasangan pemain di setiap ronde." :
                  "Mode Match Play menggunakan format pertandingan padel tradisional (Set & Game)."}
            </p>
          </div>
        </section>

        {format === 'Match Play' && (
          <section className="space-y-4">
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-on-surface/60 px-1">Metode Skor (Deuce)</h2>
            <div className="bg-ios-gray/10 p-1 rounded-xl flex items-center h-11">
              {(['Golden Point', 'Advantage'] as ScoringType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setScoringType(t)}
                  className={cn(
                    "flex-1 h-full rounded-[10px] text-sm font-medium transition-all",
                    scoringType === t ? "bg-primary text-white font-bold shadow-sm" : "text-on-surface/60"
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-on-surface/70 font-medium text-center px-1">
              {scoringType === 'Golden Point' ? "Satu poin penentu saat skor 40-40 (Punto de Oro)" : "Pemain harus unggul 2 poin setelah skor 40-40 (Ad-In/Ad-Out)"}
            </p>
          </section>
        )}

        <section className="space-y-4">
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-on-surface/60 px-1">Kriteria Peringkat</h2>
          <div className="bg-ios-gray/10 p-1 rounded-xl flex items-center h-11">
            {(['Matches Won', 'Points Won'] as RankingCriteria[]).map((c) => (
              <button
                key={c}
                onClick={() => setCriteria(c)}
                className={cn(
                  "flex-1 h-full rounded-[10px] text-sm font-medium transition-all",
                  criteria === c ? "bg-primary text-white font-bold shadow-sm" : "text-on-surface/60"
                )}
              >
                {c}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-on-surface/70 font-medium text-center px-1">
            {criteria === 'Points Won' ? "Pemenang ditentukan dari total akumulasi poin yang diraih" : "Pemenang ditentukan dari jumlah pertandingan yang dimenangkan"}
          </p>
        </section>

        <section className="space-y-4">
          <div className="flex justify-between items-center px-1">
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-on-surface/60">Jumlah Lapangan</h2>
          </div>
          <div className="flex overflow-x-auto gap-3 pb-2 no-scrollbar">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => {
                  setCourts(n);
                }}
                className={cn(circleChipClass(courts === n), "tap-target")}
              >
                <span className="text-[18px] font-bold">{n}</span>
              </button>
            ))}
            <button
              onClick={() => openCustomModal('courts')}
              className={cn(circleChipClass(![1, 2, 3, 4, 5].includes(courts)), "tap-target")}
            >
              <span className="text-[10px] font-bold uppercase tracking-wide">Custom</span>
            </button>
          </div>
          {![1, 2, 3, 4, 5].includes(courts) && (
            <div className="bg-primary/8 border border-primary/15 rounded-xl p-3">
              <span className="text-[12px] font-semibold text-primary">Custom dipilih: {courts} lapangan</span>
            </div>
          )}
        </section>

        <section className="space-y-4">
          <div className="flex justify-between items-center px-1">
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-on-surface/60">Jumlah Ronde</h2>
          </div>
          <div className="flex overflow-x-auto gap-3 pb-2 no-scrollbar">
            {[3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
              <button
                key={n}
                onClick={() => {
                  setNumRounds(n);
                }}
                className={cn(circleChipClass(numRounds === n), "tap-target")}
              >
                <span className="text-[18px] font-bold">{n}</span>
              </button>
            ))}
            <button
              onClick={() => openCustomModal('rounds')}
              className={cn(circleChipClass(![3, 4, 5, 6, 7, 8, 9, 10].includes(numRounds)), "tap-target")}
            >
              <span className="text-[10px] font-bold uppercase tracking-wide">Custom</span>
            </button>
          </div>
          {![3, 4, 5, 6, 7, 8, 9, 10].includes(numRounds) && (
            <div className="bg-primary/8 border border-primary/15 rounded-xl p-3">
              <span className="text-[12px] font-semibold text-primary">Custom dipilih: {numRounds} ronde</span>
            </div>
          )}
        </section>

        <section className="space-y-4">
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-on-surface/60 px-1">Pengaturan Lanjutan</h2>
          <div className="bg-white rounded-xl overflow-hidden border border-ios-gray/10 shadow-sm p-4">
            <div className="flex justify-between items-center mb-4">
              <span className="text-[13px] font-semibold">Total Poin Set</span>
              <span className="text-[13px] font-bold text-primary">{points} Poin</span>
            </div>
            <div className="flex overflow-x-auto gap-3 pb-2 no-scrollbar">
              {[16, 21, 24, 32].map((p) => (
                <button
                  key={p}
                  onClick={() => {
                    setPoints(p);
                  }}
                  className={cn(circleChipClass(points === p), "tap-target")}
                >
                  <span className="text-[16px] font-bold">{p}</span>
                </button>
              ))}
              <button
                onClick={() => openCustomModal('points')}
                className={cn(circleChipClass(![16, 21, 24, 32].includes(points)), "tap-target")}
              >
                <span className="text-[10px] font-bold uppercase tracking-wide">Custom</span>
              </button>
            </div>
            {![16, 21, 24, 32].includes(points) && (
              <div className="mt-3 bg-primary/8 border border-primary/15 rounded-xl p-3">
                <span className="text-[12px] font-semibold text-primary">Custom dipilih: {points} poin</span>
              </div>
            )}
          </div>
        </section>

        <AnimatePresence>
          {customModalType && (
            <div className="fixed inset-0 z-[120] flex items-end justify-center p-4 sm:items-center">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/35"
                onClick={() => setCustomModalType(null)}
              />
              <motion.div
                initial={{ y: 24, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 24, opacity: 0 }}
                className="relative w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl"
              >
                <h3 className="text-[18px] font-bold tracking-tight mb-3">
                  {customModalType === 'courts' ? 'Custom Jumlah Lapangan' : customModalType === 'rounds' ? 'Custom Jumlah Ronde' : 'Custom Total Poin Set'}
                </h3>
                <input
                  ref={customInputRef}
                  type="number"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  min={customModalType === 'courts' ? 1 : 1}
                  max={customModalType === 'courts' ? 12 : customModalType === 'rounds' ? 30 : 99}
                  value={customModalValue}
                  onChange={(e) => setCustomModalValue(e.target.value.replace(/\D/g, ''))}
                  className="w-full h-12 rounded-xl border border-ios-gray/20 px-4 text-[16px] font-semibold outline-none focus:border-primary"
                  placeholder={customModalType === 'courts' ? '1 - 12' : customModalType === 'rounds' ? '1 - 30' : '1 - 99'}
                />
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => setCustomModalType(null)}
                    className="flex-1 h-11 rounded-xl border border-ios-gray/15 text-on-surface font-semibold tap-target"
                  >
                    Batal
                  </button>
                  <button
                    onClick={applyCustomModalValue}
                    className="flex-1 h-11 rounded-xl bg-primary text-white font-bold tap-target"
                  >
                    Terapkan
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Friends List for Quick Add */}
        {friends.length > 0 && (
          <div className="space-y-3 mb-6">
            <h3 className="text-[10px] font-black text-ios-gray uppercase tracking-widest ml-1">Tambah dari Teman</h3>
            <div className="flex overflow-x-auto gap-3 pb-2 no-scrollbar">
              {friends.map(friend => {
                const isSelected = selectedPlayers.some(p => p.id === friend.uid);
                return (
                  <button
                    key={friend.uid}
                    onClick={() => {
                      const playerObj: Player = {
                        id: friend.uid,
                        name: friend.displayName,
                        rating: friend.mmr,
                        avatar: friend.photoURL,
                        initials: friend.displayName.split(' ').map(n => n[0]).join('').toUpperCase(),
                        stats: { matches: 0, won: 0, lost: 0, draw: 0, diff: 0 }
                      };
                      togglePlayer(playerObj);
                    }}
                    className={cn(
                      "flex flex-col items-center gap-2 min-w-[70px] transition-all tap-target",
                      isSelected ? "opacity-100" : "opacity-40"
                    )}
                  >
                    <div className={cn(
                      "w-14 h-14 rounded-2xl overflow-hidden border-2 flex items-center justify-center bg-ios-gray/5",
                      isSelected ? "border-primary shadow-lg shadow-primary/20" : "border-transparent"
                    )}>
                      {friend.photoURL ? <img src={friend.photoURL} className="w-full h-full object-cover" /> : <User size={24} className="text-ios-gray/30" />}
                    </div>
                    <span className="text-[10px] font-bold truncate w-full text-center">{friend.displayName.split(' ')[0]}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <section className="space-y-4 pb-8">
          <div className="flex justify-between items-end px-1">
            <div className="space-y-1">
              <h2 className="text-[11px] font-bold uppercase tracking-wider text-on-surface/60">Daftar Pemain</h2>
              <div className="flex items-center gap-2">
                <span className={cn(
                  "text-2xl font-black tracking-tighter",
                  isReady ? "text-primary" : "text-error"
                )}>
                  {selectedPlayers.length}
                </span>
                <div className="flex flex-col -space-y-1">
                  <span className="text-[10px] font-black text-on-surface/40 uppercase tracking-widest">
                    Pemain
                  </span>
                  <span className="text-[10px] font-bold text-on-surface/20 uppercase tracking-widest">
                    Min. {minPlayersNeeded}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-1.5 bg-primary/10 text-primary px-5 py-2.5 rounded-full text-[12px] font-bold uppercase tracking-wider tap-target transition-all active:scale-95 shadow-sm shadow-primary/5"
            >
              <Plus size={16} strokeWidth={3} />
              <span>Tambah</span>
            </button>
          </div>

          <AnimatePresence mode="wait">
            {!isReady && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-error/5 border border-error/10 p-4 rounded-2xl flex items-center gap-4"
              >
                <div className="w-10 h-10 rounded-full bg-error/10 flex items-center justify-center shrink-0">
                  <Users size={20} className="text-error" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-[13px] text-error font-bold leading-tight">
                    Butuh {minPlayersNeeded - selectedPlayers.length} pemain lagi
                  </p>
                  <p className="text-[11px] text-error/60 font-medium leading-tight">
                    Minimal 4 pemain per lapangan ({courts} lapangan = {minPlayersNeeded} pemain)
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-3">
            {allPlayers.filter(p => !!p).map((player) => {
              const isSelected = selectedPlayers.find(p => p && p.id === player.id);
              return (
                <div key={player.id} className="relative group">
                  <div
                    onClick={() => togglePlayer(player)}
                    className={cn(
                      "w-full p-4 rounded-xl flex items-center justify-between border transition-all cursor-pointer",
                      isSelected ? "bg-white border-primary shadow-sm" : "bg-white border-ios-gray/10 opacity-60"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center font-bold overflow-hidden",
                        isSelected ? "bg-primary text-white" : "bg-ios-gray/10 text-ios-gray"
                      )}>
                        {player.avatar ? (
                          <img src={player.avatar} alt={player.name} className="w-full h-full object-cover" />
                        ) : (
                          player.initials
                        )}
                      </div>
                      <div className="text-left">
                        <span className="text-[14px] font-semibold block">{player.name}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={(e) => handleRemovePlayer(e, player.id)}
                        className="p-2 text-ios-gray/40 hover:text-error transition-colors tap-target"
                      >
                        <Trash2 size={18} />
                      </button>
                      {isSelected ? (
                        <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                          <Check size={14} className="text-white" />
                        </div>
                      ) : (
                        <div className="w-6 h-6 border-2 border-ios-gray/20 rounded-full" />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      <AnimatePresence>
        {isAddModalOpen && (
          <AddPlayerModal
            isOpen={isAddModalOpen}
            onClose={() => setIsAddModalOpen(false)}
            onAdd={handleAddPlayer}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const MatchPreviewScreen = ({ onBack, onConfirm, tournament }: {
  onBack: () => void,
  onConfirm: () => void,
  tournament: Tournament
}) => {
  const previewTheme =
    tournament.format === 'Americano'
      ? {
        page: 'bg-[linear-gradient(175deg,#f1fbf8_0%,#e8f7f2_48%,#f8fdfb_100%)]',
        lineA: 'border-[rgba(24,164,134,0.16)]',
        lineB: 'border-[rgba(24,164,134,0.12)]',
        accentText: 'text-[#12806A]',
        accentBg: 'bg-[#18A486]/10',
        accentBorder: 'border-[#18A486]/20',
        accentSolid: 'bg-[#18A486]',
        accentSoft: 'bg-[#18A486]/12',
      }
      : tournament.format === 'Mexicano'
        ? {
          page: 'bg-[linear-gradient(175deg,#fff7f1_0%,#ffefe4_48%,#fffaf5_100%)]',
          lineA: 'border-[rgba(230,94,20,0.16)]',
          lineB: 'border-[rgba(230,94,20,0.12)]',
          accentText: 'text-primary',
          accentBg: 'bg-primary/10',
          accentBorder: 'border-primary/20',
          accentSolid: 'bg-primary',
          accentSoft: 'bg-primary/12',
        }
        : {
          page: 'bg-[linear-gradient(175deg,#f3f7ff_0%,#eaf1ff_48%,#f8faff_100%)]',
          lineA: 'border-[rgba(47,111,228,0.16)]',
          lineB: 'border-[rgba(47,111,228,0.12)]',
          accentText: 'text-[#2F6FE4]',
          accentBg: 'bg-[#2F6FE4]/10',
          accentBorder: 'border-[#2F6FE4]/20',
          accentSolid: 'bg-[#2F6FE4]',
          accentSoft: 'bg-[#2F6FE4]/12',
        };
  const previewVenue = (tournament.venueName || '').trim();
  const previewCity = (tournament.location || '').trim();
  const previewPlace = previewVenue && previewCity
    ? `${previewVenue} | ${previewCity}`
    : (previewVenue || previewCity || 'Lokasi belum dipilih');

  return (
    <div className="relative min-h-screen overflow-hidden pb-10">
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className={cn('absolute inset-0', previewTheme.page)} />
        <div className={cn('absolute -left-24 -top-12 w-[560px] h-[250px] rounded-[999px] border-[16px] rotate-[10deg]', previewTheme.lineA)} />
        <div className={cn('absolute -right-28 bottom-6 w-[560px] h-[250px] rounded-[999px] border-[14px] -rotate-[8deg]', previewTheme.lineB)} />
      </div>

      <header className="ios-blur sticky top-0 w-full z-50 border-b border-ios-gray/10 bg-white/85">
        <div className="flex justify-between items-center px-4 h-14 w-full max-w-lg mx-auto">
          <div className="flex items-center gap-2">
            <button onClick={onBack} className="p-2 -ml-2 tap-target">
              <ChevronLeft size={24} className="text-primary" />
            </button>
            <h1 className="font-bold text-[17px] tracking-tight text-on-surface">Preview Pertandingan</h1>
          </div>
          <button
            onClick={onConfirm}
            className={cn("text-white px-5 py-2 rounded-full font-bold text-sm shadow-md tap-target", previewTheme.accentSolid)}
          >
            Mulai
          </button>
        </div>
      </header>

      <main className="relative z-10 pt-5 pb-10 max-w-lg mx-auto px-4 space-y-4">
        <section className="bg-white/92 backdrop-blur-sm rounded-2xl border border-white/70 shadow-[0_8px_24px_rgba(17,24,39,0.06)] p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-[18px] font-black tracking-tight text-on-surface truncate">{tournament.name || 'Game Padel'}</h2>
              <p className="mt-1 text-[11px] font-semibold text-ios-gray truncate">{previewPlace}</p>
            </div>
            <span className={cn("shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border", previewTheme.accentBg, previewTheme.accentText, previewTheme.accentBorder)}>
              Preview
            </span>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {[
              { label: 'Mode', value: tournament.format },
              { label: 'Pemain', value: tournament.players.length },
              { label: 'Lapangan', value: tournament.courts },
              { label: 'Ronde', value: tournament.rounds.length },
            ].map((item) => (
              <div key={item.label} className={cn("rounded-xl border p-2.5", previewTheme.accentSoft, previewTheme.accentBorder)}>
                <p className="text-[9px] font-bold uppercase tracking-wider text-ios-gray/75">{item.label}</p>
                <p className="text-[12px] font-bold text-on-surface truncate">{item.value}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="space-y-3">
          {tournament.rounds.map((round) => (
            <section key={round.id} className="bg-white/94 rounded-2xl p-4 shadow-sm border border-ios-gray/10 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center text-[12px] font-black", previewTheme.accentBg, previewTheme.accentText)}>
                    {round.id}
                  </div>
                  <h3 className="font-bold text-[16px] tracking-tight text-on-surface">Ronde {round.id}</h3>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-ios-gray/60">{round.matches.length} Match</span>
              </div>

              <div className="space-y-2.5">
                {round.matches.map((match) => (
                  <article key={match.id} className="rounded-xl border border-ios-gray/10 bg-white p-3 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className={cn("inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider", previewTheme.accentBg, previewTheme.accentText)}>
                        <Zap size={12} />
                        Lapangan {match.court}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-ios-gray/55">VS</span>
                    </div>
                    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                      <div className="min-w-0 flex flex-col items-center gap-1.5">
                        <div className="flex -space-x-2.5">
                          {match.teamA.players.map((p, i) => (
                            <div key={i} className="w-9 h-9 rounded-full border-2 border-white bg-ios-gray/15 overflow-hidden flex items-center justify-center text-[10px] font-bold text-on-surface">
                              {p.avatar ? <img src={p.avatar} alt={p.name} className="w-full h-full object-cover" /> : p.initials}
                            </div>
                          ))}
                        </div>
                        <span className="text-[11px] font-bold text-center leading-tight truncate w-full">
                          {match.teamA.players.map(p => p.name.split(' ')[0]).join(' / ')}
                        </span>
                      </div>
                      <div className="text-[12px] font-display font-black text-ios-gray/45 tabular-nums px-1">0-0</div>
                      <div className="min-w-0 flex flex-col items-center gap-1.5">
                        <div className="flex -space-x-2.5">
                          {match.teamB.players.map((p, i) => (
                            <div key={i} className="w-9 h-9 rounded-full border-2 border-white bg-ios-gray/15 overflow-hidden flex items-center justify-center text-[10px] font-bold text-on-surface">
                              {p.avatar ? <img src={p.avatar} alt={p.name} className="w-full h-full object-cover" /> : p.initials}
                            </div>
                          ))}
                        </div>
                        <span className="text-[11px] font-bold text-center leading-tight truncate w-full">
                          {match.teamB.players.map(p => p.name.split(' ')[0]).join(' / ')}
                        </span>
                      </div>
                    </div>
                  </article>
                ))}

                {round.playersBye.length > 0 && (
                  <div className="pt-2 border-t border-ios-gray/10">
                    <div className="flex items-center gap-2.5">
                      <Users size={14} className="text-ios-gray" />
                      <span className="text-[11px] font-semibold tracking-tight text-ios-gray">
                        Pemain Menunggu: <span className="text-on-surface font-medium">
                          {round.playersBye.map(p => p.name.split(' ')[0]).join(', ')}
                        </span>
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
};

const MatchActiveScreen = ({
  onBack,
  tournament,
  onUpdateScore,
  onNextRound,
  onOpenStandings,
  onSwapPlayer,
  onUpdateMatchPlayScore,
  onShareMatch,
  isReadOnly
}: {
  onBack: () => void,
  tournament: Tournament,
  onUpdateScore: (matchId: string, team: 'A' | 'B', score: number) => void,
  onNextRound: () => void,
  onOpenStandings: () => void,
  onSwapPlayer: (matchId: string, team: 'A' | 'B', playerIndex: number, newPlayer: Player) => void,
  onUpdateMatchPlayScore: (matchId: string, team: 'A' | 'B') => void,
  onShareMatch: () => void,
  isReadOnly: boolean
}) => {
  const [scoringMatchId, setScoringMatchId] = useState<string | null>(null);
  const [swappingPlayer, setSwappingPlayer] = useState<{ matchId: string, team: 'A' | 'B', playerIndex: number, currentPlayer: Player } | null>(null);
  const [collapsedRounds, setCollapsedRounds] = useState<Set<number>>(new Set());
  const [nowMs, setNowMs] = useState(Date.now());
  const [modalBottomOffset, setModalBottomOffset] = useState(88);

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const updateModalOffset = () => {
      const baseNavOffset = 88; // keep modal above bottom navbar
      const vv = window.visualViewport;
      if (!vv) {
        setModalBottomOffset(baseNavOffset);
        return;
      }
      const keyboardHeight = Math.max(0, window.innerHeight - (vv.height + vv.offsetTop));
      setModalBottomOffset(Math.max(baseNavOffset, keyboardHeight + 20));
    };

    updateModalOffset();
    window.addEventListener('resize', updateModalOffset);
    window.visualViewport?.addEventListener('resize', updateModalOffset);
    window.visualViewport?.addEventListener('scroll', updateModalOffset);
    return () => {
      window.removeEventListener('resize', updateModalOffset);
      window.visualViewport?.removeEventListener('resize', updateModalOffset);
      window.visualViewport?.removeEventListener('scroll', updateModalOffset);
    };
  }, []);

  const getMatchDuration = (match: Match) => {
    if (match.status === 'active' && match.startedAt) {
      return formatDurationFromMs(nowMs - match.startedAt);
    }
    return match.duration || '00:00';
  };

  // Get the actual match data from the tournament state
  const scoringMatch = useMemo(() => {
    if (!scoringMatchId) return null;
    for (const round of tournament.rounds) {
      const match = round.matches.find(m => m.id === scoringMatchId);
      if (match) return match;
    }
    return null;
  }, [scoringMatchId, tournament.rounds]);

  // Calculate match counts for all players in the tournament
  const playerMatchCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    tournament.players.forEach(p => counts[p.id] = 0);
    tournament.rounds.forEach(round => {
      round.matches.forEach(match => {
        [...match.teamA.players, ...match.teamB.players].forEach(p => {
          if (counts[p.id] !== undefined) counts[p.id]++;
        });
      });
    });
    return counts;
  }, [tournament]);

  const currentRoundIndex = tournament.rounds.findIndex(r => r.matches.some(m => m.status === 'active'));
  const hasActiveTournament = currentRoundIndex !== -1;
  const activeRound = currentRoundIndex !== -1 ? (tournament.rounds[currentRoundIndex] ?? null) : null;
  const activeRoundId = activeRound?.id ?? null;
  const isLastRound = currentRoundIndex !== -1 && currentRoundIndex === tournament.rounds.length - 1;
  const isTournamentEnded = tournament.rounds.length > 0 && tournament.rounds.every(r => r.matches.every(m => m.status === 'completed'));
  const totalElapsed = tournament.startedAt ? formatDurationFromMs(nowMs - tournament.startedAt) : '00:00';
  const fomPlayUrl = 'https://fomplay.com';
  const pageBgTheme =
    tournament.format === 'Americano'
      ? {
        base: 'bg-[linear-gradient(175deg,#e9faf6_0%,#d8f3eb_42%,#f5fffb_100%)]',
        curveA: 'border-[rgba(24,164,134,0.24)]',
        curveB: 'border-[rgba(24,164,134,0.18)]',
        glow: 'bg-[radial-gradient(circle_at_22%_18%,rgba(24,164,134,0.24),transparent_38%),radial-gradient(circle_at_80%_82%,rgba(24,164,134,0.16),transparent_34%)]'
      }
      : tournament.format === 'Mexicano'
        ? {
          base: 'bg-[linear-gradient(175deg,#fff3e7_0%,#ffe8d8_40%,#fff5ec_100%)]',
          curveA: 'border-[rgba(230,94,20,0.22)]',
          curveB: 'border-[rgba(230,94,20,0.18)]',
          glow: 'bg-[radial-gradient(circle_at_22%_18%,rgba(230,94,20,0.24),transparent_38%),radial-gradient(circle_at_80%_82%,rgba(230,94,20,0.16),transparent_34%)]'
        }
        : {
          base: 'bg-[linear-gradient(175deg,#edf3ff_0%,#dce9ff_42%,#f6f9ff_100%)]',
          curveA: 'border-[rgba(47,111,228,0.24)]',
          curveB: 'border-[rgba(47,111,228,0.18)]',
          glow: 'bg-[radial-gradient(circle_at_22%_18%,rgba(47,111,228,0.24),transparent_38%),radial-gradient(circle_at_80%_82%,rgba(47,111,228,0.16),transparent_34%)]'
        };
  const gameDateLabel = tournament.startedAt
    ? new Date(tournament.startedAt).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
    : '-';
  const venueLabel = (tournament.venueName || '').trim();
  const cityLabel = (tournament.location || '').trim();
  const placeLabel = venueLabel && cityLabel
    ? `${venueLabel} | ${cityLabel}`
    : (venueLabel || cityLabel || '-');
  const infoTheme =
    tournament.format === 'Americano'
      ? {
        bg: 'from-[#12806A] via-[#18A486] to-[#4FC3A1]',
        shadow: 'shadow-[0_14px_30px_rgba(18,128,106,0.32)]',
        ring: 'bg-[#0F2A2A]/18'
      }
      : tournament.format === 'Mexicano'
        ? {
          bg: 'from-[#E65E14] via-[#F26A2A] to-[#FF8A4C]',
          shadow: 'shadow-[0_14px_30px_rgba(230,94,20,0.35)]',
          ring: 'bg-[#1F2937]/18'
        }
        : {
          bg: 'from-[#2248B5] via-[#2F6FE4] to-[#56A3F7]',
          shadow: 'shadow-[0_14px_30px_rgba(34,72,181,0.32)]',
          ring: 'bg-[#0F1E3A]/18'
        };
  const accentTheme =
    tournament.format === 'Americano'
      ? {
        text: 'text-[#12806A]',
        textSoft: 'text-[#12806A]/65',
        bgSoft: 'bg-[#18A486]/12',
        bgSoftHover: 'hover:bg-[#18A486]/10',
        borderSoft: 'border-[#18A486]/25',
        solid: 'bg-[#18A486]',
        solidShadow: 'shadow-[0_10px_22px_rgba(24,164,134,0.26)]'
      }
      : tournament.format === 'Mexicano'
        ? {
          text: 'text-primary',
          textSoft: 'text-primary/65',
          bgSoft: 'bg-primary/12',
          bgSoftHover: 'hover:bg-primary/10',
          borderSoft: 'border-primary/25',
          solid: 'bg-primary',
          solidShadow: 'shadow-[0_10px_22px_rgba(230,94,20,0.24)]'
        }
        : {
          text: 'text-[#2F6FE4]',
          textSoft: 'text-[#2F6FE4]/65',
          bgSoft: 'bg-[#2F6FE4]/12',
          bgSoftHover: 'hover:bg-[#2F6FE4]/10',
          borderSoft: 'border-[#2F6FE4]/25',
          solid: 'bg-[#2F6FE4]',
          solidShadow: 'shadow-[0_10px_22px_rgba(47,111,228,0.26)]'
        };
  const topNavTheme =
    tournament.format === 'Americano'
      ? {
        bg: 'bg-[#12806A]/92 supports-[backdrop-filter]:bg-[#12806A]/82',
        border: 'border-[#0d5f4e]/35',
        shareBg: 'bg-white/18',
        shareText: 'text-white',
        shareBorder: 'border-white/35'
      }
      : tournament.format === 'Mexicano'
        ? {
          bg: 'bg-primary/92 supports-[backdrop-filter]:bg-primary/82',
          border: 'border-[#b8480f]/35',
          shareBg: 'bg-white/18',
          shareText: 'text-white',
          shareBorder: 'border-white/35'
        }
        : {
          bg: 'bg-[#2F6FE4]/92 supports-[backdrop-filter]:bg-[#2F6FE4]/82',
          border: 'border-[#1f4ca8]/35',
          shareBg: 'bg-white/18',
          shareText: 'text-white',
          shareBorder: 'border-white/35'
        };

  // Initialize collapsed rounds: collapse all except the active one
  useEffect(() => {
    if (!hasActiveTournament || activeRoundId === null) return;
    const collapsed = new Set<number>();
    tournament.rounds.forEach(r => {
      if (r.id !== activeRoundId) {
        collapsed.add(r.id);
      }
    });
    setCollapsedRounds(collapsed);
  }, [activeRoundId, hasActiveTournament, tournament.rounds]);

  const toggleRound = (roundId: number) => {
    setCollapsedRounds(prev => {
      const next = new Set(prev);
      if (next.has(roundId)) {
        next.delete(roundId);
      } else {
        next.add(roundId);
      }
      return next;
    });
  };

  const handleMatchPlayScoreUpdate = (team: 'A' | 'B') => {
    if (!scoringMatchId) return;
    onUpdateMatchPlayScore(scoringMatchId, team);
  };

  const handleScoreUpdate = (team: 'A' | 'B', delta: number) => {
    if (!scoringMatch) return;
    const currentScore = team === 'A' ? scoringMatch.teamA.score : scoringMatch.teamB.score;
    const newScore = Math.max(0, Math.min(tournament.totalPoints, currentScore + delta));
    const otherTeamScore = tournament.totalPoints - newScore;

    onUpdateScore(scoringMatch.id, team, newScore);
    onUpdateScore(scoringMatch.id, team === 'A' ? 'B' : 'A', otherTeamScore);

    setScoringMatchId(prev => {
      if (!prev) return null;
      return prev; // No need to update local state since we use useMemo now
    });
  };

  const setExactScore = (team: 'A' | 'B', score: number) => {
    if (!scoringMatch) return;
    const safeScore = Math.max(0, Math.min(tournament.totalPoints, score));
    const otherTeamScore = tournament.totalPoints - safeScore;

    onUpdateScore(scoringMatch.id, team, safeScore);
    onUpdateScore(scoringMatch.id, team === 'A' ? 'B' : 'A', otherTeamScore);

    setScoringMatchId(prev => {
      if (!prev) return null;
      return prev; // No need to update local state since we use useMemo now
    });
  };

  if (!hasActiveTournament) {
    return (
      <div className="min-h-screen bg-surface flex flex-col pb-24">
        <header className="ios-blur sticky top-0 w-full z-50 flex items-center px-4 h-14 border-b border-ios-gray/10">
          <div className="flex items-center gap-2">
            <button onClick={onBack} className="tap-target p-2 -ml-2">
              <ChevronLeft size={24} className="text-on-surface" />
            </button>
            <h1 className="text-[17px] font-bold tracking-tight text-on-surface">Pertandingan</h1>
          </div>
        </header>

        <main className="flex-1 flex flex-col items-center justify-center px-8 text-center">
          <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-6">
            <Trophy size={48} className="text-primary/40" />
          </div>
          <h2 className="text-2xl font-bold text-on-surface mb-2">Belum Ada Pertandingan</h2>
          <p className="text-ios-gray text-sm mb-8 leading-relaxed">
            Sepertinya belum ada turnamen yang aktif saat ini. Mulai pertandingan baru untuk mencatat skor dan melihat klasemen!
          </p>

          <div className="w-full bg-primary/5 rounded-2xl p-4 mb-10 border border-primary/10 flex items-start gap-3 text-left">
            <div className="p-2 bg-primary/10 rounded-lg shrink-0">
              <Zap size={18} className="text-primary" />
            </div>
            <div>
              <h4 className="text-[13px] font-bold text-primary uppercase tracking-wide mb-1">Tips Cepat</h4>
              <p className="text-[12px] text-ios-gray leading-snug font-medium">
                Ajak minimal 4 pemain untuk memulai turnamen format Americano. Kamu bisa mengatur jumlah lapangan sesuai ketersediaan.
              </p>
            </div>
          </div>

          <button
            onClick={onBack}
            className="w-full h-[56px] bg-primary text-white rounded-[16px] font-bold text-[17px] shadow-lg shadow-primary/20 tap-target flex items-center justify-center gap-2"
          >
            <PlusCircle size={20} />
            <span>Mulai Pertandingan Baru</span>
          </button>
        </main>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen pb-32 overflow-hidden bg-transparent z-0">
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className={cn('absolute inset-0', pageBgTheme.base)} />
        <div className={cn('absolute -left-36 -top-20 w-[760px] h-[380px] rounded-[999px] border-[22px] rotate-[10deg]', pageBgTheme.curveA)} />
        <div className={cn('absolute -right-44 bottom-4 w-[820px] h-[390px] rounded-[999px] border-[20px] -rotate-[8deg]', pageBgTheme.curveB)} />
        <div className={cn('absolute inset-0 opacity-[0.14]', pageBgTheme.glow)} />
      </div>

      <header className={cn("fixed top-0 inset-x-0 z-50 border-b backdrop-blur-2xl", topNavTheme.bg, topNavTheme.border)}>
        <div className="max-w-lg mx-auto h-16 px-4 grid grid-cols-[84px_1fr_auto] items-center gap-2">
          <div className="justify-self-start">
            <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white rounded-full", accentTheme.solid, accentTheme.solidShadow)}>
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-white/55 animate-ping" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-white" />
              </span>
              <span className="animate-pulse">Live</span>
            </span>
          </div>
          <div className="flex justify-center items-center">
            <img
              src="/fom-long-logotype-white.png"
              alt="Friends of Motion"
              className="h-8 w-auto object-contain"
            />
          </div>
          <div className="justify-self-end flex items-center gap-1.5">
            <InstallAppButton
              compact
              className={cn(topNavTheme.shareBg, topNavTheme.shareText, topNavTheme.shareBorder)}
            />
            {isReadOnly ? (
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/90">View Only</span>
            ) : (
              <button
                onClick={onShareMatch}
                className={cn("tap-target h-9 px-3 rounded-full inline-flex items-center gap-1.5 border", topNavTheme.shareBg, topNavTheme.shareText, topNavTheme.shareBorder)}
                aria-label="Share pertandingan"
              >
                <Share2 size={16} />
                <span className="text-[12px] font-semibold">Share</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="relative z-10 pt-[84px] px-5 space-y-6 max-w-lg mx-auto">
        {isReadOnly && (
          <section className={cn("rounded-xl p-3 border", accentTheme.bgSoft, accentTheme.borderSoft)}>
            <p className={cn("text-[12px] font-semibold", accentTheme.text)}>Mode penonton aktif. Halaman ini hanya untuk melihat skor.</p>
          </section>
        )}

        <section className={cn(
          "relative overflow-hidden rounded-2xl p-4 border border-white/25 bg-gradient-to-br",
          infoTheme.bg,
          infoTheme.shadow
        )}>
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -left-10 top-10 w-[160%] h-[2px] bg-white/75 rotate-[10deg]" />
            <div className="absolute right-8 -top-8 w-[2px] h-[155%] bg-white/75 rotate-[10deg]" />
            <div className="absolute inset-0 opacity-[0.14] bg-[repeating-linear-gradient(30deg,rgba(255,255,255,0.10)_0px,rgba(255,255,255,0.10)_1px,transparent_1px,transparent_5px)]" />
          </div>
          <div className="absolute -left-32 top-4 w-[680px] h-[240px] rounded-[999px] border-[14px] border-white/85 rotate-[8deg] pointer-events-none" />
          <div className={cn("absolute -right-14 -bottom-14 w-64 h-64 rounded-full pointer-events-none", infoTheme.ring)} />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_10%,rgba(255,255,255,0.30),transparent_32%)] pointer-events-none" />

          <div className="relative flex items-start justify-between gap-3 mb-3">
            <div className="min-w-0">
              <h2 className="text-[18px] font-black tracking-tight text-white truncate">{tournament.name || '-'}</h2>
              <p className="mt-1 text-[11px] text-white/85 truncate">
                {placeLabel + ' | ' + gameDateLabel}
              </p>
            </div>
            <div className="shrink-0 rounded-xl border border-white/40 bg-white/20 backdrop-blur-sm px-3 py-1.5 text-right">
              <span className="block text-[9px] font-bold uppercase tracking-wider text-white/85">Durasi</span>
              <span className="text-[14px] font-bold text-white leading-none">{totalElapsed}</span>
            </div>
          </div>

          <div className="relative grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-white/20 border border-white/35 px-2.5 py-2">
              <p className="text-[9px] font-bold uppercase tracking-wider text-white/80">Mode</p>
              <p className="text-[12px] font-semibold text-white truncate">{tournament.format}</p>
            </div>
            <div className="rounded-xl bg-white/20 border border-white/35 px-2.5 py-2">
              <p className="text-[9px] font-bold uppercase tracking-wider text-white/80">Player</p>
              <p className="text-[12px] font-semibold text-white">{tournament.players.length}</p>
            </div>
            <div className="rounded-xl bg-white/20 border border-white/35 px-2.5 py-2">
              <p className="text-[9px] font-bold uppercase tracking-wider text-white/80">Lapangan</p>
              <p className="text-[12px] font-semibold text-white">{tournament.courts}</p>
            </div>
          </div>

          <div className="relative mt-3 pt-2 flex items-center justify-between gap-2">
            <div className="absolute inset-x-0 top-0 h-px bg-white/30 pointer-events-none" />
            <p className="relative z-10 text-[11px] text-white/88 whitespace-nowrap">
              Hosted with <span className="font-bold text-white">FOM Play</span>
            </p>
            <button
              onClick={() => window.open(fomPlayUrl, '_blank', 'noopener,noreferrer')}
              className="relative z-10 shrink-0 h-7 px-2.5 rounded-full border border-white/70 bg-white/12 text-white text-[10px] font-bold inline-flex items-center gap-1 tap-target"
            >
              Coba
              <ArrowRight size={12} />
            </button>
          </div>
        </section>

        <section className="flex items-center justify-between gap-3">
          <button
            onClick={onOpenStandings}
            className={cn("tap-target flex-1 h-11 rounded-xl bg-white/78 backdrop-blur-sm inline-flex items-center justify-center gap-2 font-bold text-[13px] border", accentTheme.text, accentTheme.borderSoft)}
          >
            <Trophy size={16} />
            <span>{isTournamentEnded ? 'Lihat Klasemen Akhir' : 'Lihat Klasemen Sementara'}</span>
          </button>
        </section>

        {tournament.rounds.map((round) => {
          const isActive = activeRoundId !== null && round.id === activeRoundId;
          const isCollapsed = collapsedRounds.has(round.id);
          const isPast = activeRoundId !== null && round.id < activeRoundId;

          return (
            <div key={round.id} className="space-y-4">
              <button
                onClick={() => toggleRound(round.id)}
                className="w-full flex justify-between items-center group"
              >
                <div className="flex flex-col items-start">
                  <span className={cn(
                    "text-[12px] font-bold uppercase tracking-wide transition-colors",
                    isActive ? accentTheme.text : "text-ios-gray"
                  )}>
                    Ronde {round.id}
                  </span>
                  {isActive && <span className={cn("text-[10px] font-bold uppercase", accentTheme.textSoft)}>Sesi Aktif</span>}
                  {isPast && !isActive && <span className="text-[10px] font-bold text-ios-gray/40 uppercase">Selesai</span>}
                </div>
                <div className={cn(
                  "p-2 rounded-full transition-all",
                  isActive ? cn(accentTheme.bgSoft, accentTheme.text) : "bg-ios-gray/5 text-ios-gray",
                  !isCollapsed && "rotate-180"
                )}>
                  <ChevronRight size={18} />
                </div>
              </button>

              <AnimatePresence>
                {!isCollapsed && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-3 mb-4">
                      {round.matches.map((match, i) => (
                        <div key={match.id} className="bg-white p-5 rounded-[20px] shadow-sm border border-ios-gray/10">
                          <div className="flex justify-between items-start mb-4">
                            <div className="min-w-0 pr-2 flex items-center gap-2 flex-wrap">
                              <span className={cn("inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider leading-none", accentTheme.bgSoft, accentTheme.text)}>
                                Ronde {match.roundId}
                              </span>
                              <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-ios-gray/10 text-on-surface/75 text-[10px] font-bold uppercase tracking-wider leading-none">
                                Lapangan {match.court}
                              </span>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="block text-[10px] font-bold text-ios-gray uppercase tracking-wider">DURASI</span>
                              <span className={cn("text-sm font-semibold", accentTheme.text)}>{getMatchDuration(match)}</span>
                            </div>
                          </div>

                          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 mb-5">
                            <div className="flex flex-col items-center gap-1.5 min-w-0">
                              <div className="flex -space-x-3">
                                {match.teamA.players.map((p, idx) => (
                                  <div
                                    key={idx}
                                    onClick={() => isActive && !isReadOnly && setSwappingPlayer({ matchId: match.id, team: 'A', playerIndex: idx, currentPlayer: p })}
                                    className={cn(
                                      "w-9 h-9 rounded-full border-2 border-white bg-ios-gray/20 flex items-center justify-center text-[10px] font-bold",
                                      isActive && "cursor-pointer tap-target"
                                    )}
                                  >
                                    {p.initials}
                                  </div>
                                ))}
                              </div>
                              <button
                                type="button"
                                onClick={() => isActive && !isReadOnly && setSwappingPlayer({ matchId: match.id, team: 'A', playerIndex: 0, currentPlayer: match.teamA.players[0] })}
                                className={cn(
                                  "bg-transparent border-0 p-0 text-[11px] font-bold text-ios-gray uppercase text-center truncate w-full leading-none",
                                  isActive && !isReadOnly ? "cursor-pointer tap-target" : "cursor-default"
                                )}
                                disabled={!isActive || isReadOnly || !match.teamA.players[0]}
                              >
                                {match.teamA.players.map(p => p.name.split(' ')[0]).join(' & ')}
                              </button>
                            </div>
                            <button
                              type="button"
                              onClick={() => isActive && !isReadOnly && setScoringMatchId(match.id)}
                              disabled={!isActive || isReadOnly}
                              className={cn(
                                "flex flex-col items-center min-w-[84px] rounded-xl px-2 py-1 transition-colors",
                                isActive && !isReadOnly
                                  ? cn("cursor-pointer tap-target", accentTheme.bgSoftHover)
                                  : "cursor-default"
                              )}
                            >
                              <div className="text-[30px] leading-none font-display font-black italic tracking-tighter">
                                <span className={accentTheme.text}>{match.teamA.score}</span>
                                <span className="text-ios-gray/30 mx-1">-</span>
                                <span className="text-on-surface">{match.teamB.score}</span>
                              </div>
                              <span className="text-[10px] font-bold text-ios-gray tracking-wide">
                                SKOR
                                {tournament.format === 'Match Play' && (
                                  <span className="ml-1 normal-case tracking-normal text-[10px]">
                                    ({match.pointsA || '0'}-{match.pointsB || '0'})
                                  </span>
                                )}
                              </span>
                            </button>
                            <div className="flex flex-col items-center gap-1.5 min-w-0">
                              <div className="flex -space-x-3">
                                {match.teamB.players.map((p, idx) => (
                                  <div
                                    key={idx}
                                    onClick={() => isActive && !isReadOnly && setSwappingPlayer({ matchId: match.id, team: 'B', playerIndex: idx, currentPlayer: p })}
                                    className={cn(
                                      "w-9 h-9 rounded-full border-2 border-white bg-ios-gray/20 flex items-center justify-center text-[10px] font-bold",
                                      isActive && "cursor-pointer tap-target"
                                    )}
                                  >
                                    {p.initials}
                                  </div>
                                ))}
                              </div>
                              <button
                                type="button"
                                onClick={() => isActive && !isReadOnly && setSwappingPlayer({ matchId: match.id, team: 'B', playerIndex: 0, currentPlayer: match.teamB.players[0] })}
                                className={cn(
                                  "bg-transparent border-0 p-0 text-[11px] font-bold text-ios-gray uppercase text-center truncate w-full leading-none",
                                  isActive && !isReadOnly ? "cursor-pointer tap-target" : "cursor-default"
                                )}
                                disabled={!isActive || isReadOnly || !match.teamB.players[0]}
                              >
                                {match.teamB.players.map(p => p.name.split(' ')[0]).join(' & ')}
                              </button>
                            </div>
                          </div>

                        </div>
                      ))}
                    </div>

                    {round.playersBye.length > 0 && (
                      <section className="bg-white rounded-[20px] p-5 shadow-sm border border-ios-gray/10">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-[11px] font-bold text-ios-gray uppercase tracking-widest">PEMAIN BYE</h3>
                          <span className="text-[12px] font-medium text-ios-gray/40">{round.playersBye.length} Pemain</span>
                        </div>
                        <div className="text-[14px] leading-relaxed text-on-surface font-medium">
                          {round.playersBye.map(p => p.name).join(', ')}
                        </div>
                      </section>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}

        {!isReadOnly && (
          <div className="pt-4 pb-12">
            <p className={cn("mb-2 text-center text-[10px] font-bold uppercase tracking-[0.14em]", accentTheme.textSoft)}>
              {isLastRound ? 'Round terakhir siap diselesaikan' : 'Lanjutkan ke ronde berikutnya'}
            </p>
            <button
              onClick={onNextRound}
              className={cn("w-full h-[54px] rounded-[14px] text-white font-bold text-[16px] tap-target flex items-center justify-center gap-2", accentTheme.solid, accentTheme.solidShadow)}
            >
              <span>{isLastRound ? 'Selesaikan Turnamen' : 'Ronde Berikutnya'}</span>
              <Zap size={18} />
            </button>
          </div>
        )}
      </main>

      {/* Score Popup Modal */}
      <AnimatePresence>
        {swappingPlayer && (
          <div
            className="fixed inset-0 z-[110] flex items-end justify-center px-4 pt-4 sm:items-center"
            style={{ paddingBottom: `calc(${modalBottomOffset}px + env(safe-area-inset-bottom, 0px))` }}
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSwappingPlayer(null)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="relative w-full max-w-md bg-white rounded-[32px] shadow-2xl overflow-hidden flex flex-col"
              style={{ maxHeight: `calc(100dvh - ${modalBottomOffset + 28}px)` }}
            >
              <div className="p-6 border-b border-ios-gray/10">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-bold tracking-tight">Ganti Pemain</h3>
                    <p className="text-xs text-ios-gray font-medium">Ganti {swappingPlayer.currentPlayer.name}</p>
                  </div>
                  <button onClick={() => setSwappingPlayer(null)} className="p-2 bg-ios-gray/10 rounded-full tap-target">
                    <X size={20} className="text-on-surface" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                <h4 className="text-[11px] font-bold text-ios-gray uppercase tracking-widest px-2 mb-2">Pilih Pemain Pengganti</h4>
                {tournament.players
                  .filter(p => {
                    // Don't show players already in this match
                    const match = tournament.rounds.find(r => r.matches.some(m => m.id === swappingPlayer.matchId))?.matches.find(m => m.id === swappingPlayer.matchId);
                    if (!match) return true;
                    const playersInMatch = [...match.teamA.players, ...match.teamB.players];
                    return !playersInMatch.some(pm => pm.id === p.id);
                  })
                  .map(player => (
                    <button
                      key={player.id}
                      onClick={() => {
                        onSwapPlayer(swappingPlayer.matchId, swappingPlayer.team, swappingPlayer.playerIndex, player);
                        setSwappingPlayer(null);
                      }}
                      className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-ios-gray/5 active:bg-ios-gray/10 transition-colors tap-target"
                    >
                      <div className={cn("w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs", accentTheme.bgSoft, accentTheme.text)}>
                        {player.initials}
                      </div>
                      <div className="text-left">
                        <div className="font-bold text-sm">{player.name}</div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-ios-gray font-medium">Rating: {player.rating}</span>
                          <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-md", accentTheme.text, accentTheme.bgSoft)}>
                            {playerMatchCounts[player.id] || 0} Match
                          </span>
                        </div>
                      </div>
                      <div className="ml-auto">
                        <ChevronRight size={16} className="text-ios-gray/30" />
                      </div>
                    </button>
                  ))}
              </div>
            </motion.div>
          </div>
        )}

        {scoringMatch && (
          <div
            className="fixed inset-0 z-[100] flex items-end justify-center px-4 pt-4 sm:items-center"
            style={{ paddingBottom: `calc(${modalBottomOffset}px + env(safe-area-inset-bottom, 0px))` }}
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setScoringMatchId(null)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="relative w-full max-w-md bg-white rounded-[32px] shadow-2xl overflow-hidden"
              style={{ maxHeight: `calc(100dvh - ${modalBottomOffset + 28}px)`, overflowY: 'auto' }}
            >
              <div className="p-6">
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-lg font-bold tracking-tight">Update Skor Lapangan {scoringMatch.court}</h3>
                  <button onClick={() => setScoringMatchId(null)} className="p-2 bg-ios-gray/10 rounded-full tap-target">
                    <X size={20} className="text-on-surface" />
                  </button>
                </div>

                <div className="space-y-10">
                  {/* Team A Scoring */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className={cn("text-sm font-bold uppercase tracking-widest", accentTheme.text)}>Team A</span>
                      <span className="text-xs font-medium text-ios-gray truncate max-w-[200px]">
                        {scoringMatch.teamA.players.map(p => p.name.split(' ')[0]).join(' & ')}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className={cn("flex-1 flex items-center justify-between rounded-2xl p-2 border", accentTheme.bgSoft, accentTheme.borderSoft)}>
                        {tournament.format !== 'Match Play' ? (
                          <>
                            <button onClick={() => handleScoreUpdate('A', -1)} className="w-12 h-12 flex items-center justify-center bg-white rounded-xl shadow-sm tap-target active:scale-90 transition-transform">
                              <Minus size={20} className={accentTheme.text} />
                            </button>
                            <span className={cn("text-4xl font-display font-black", accentTheme.text)}>{scoringMatch.teamA.score}</span>
                            <button onClick={() => handleScoreUpdate('A', 1)} className={cn("w-12 h-12 flex items-center justify-center rounded-xl shadow-lg tap-target active:scale-90 transition-transform", accentTheme.solid, accentTheme.solidShadow)}>
                              <Plus size={20} className="text-white" />
                            </button>
                          </>
                        ) : (
                          <div className="w-full flex items-center justify-between px-4">
                            <div className="flex flex-col items-center">
                              <span className={cn("text-[10px] font-bold uppercase", accentTheme.textSoft)}>Games</span>
                              <span className={cn("text-3xl font-display font-black", accentTheme.text)}>{scoringMatch.teamA.score}</span>
                            </div>
                            <div className="flex flex-col items-center">
                              <span className={cn("text-[10px] font-bold uppercase", accentTheme.textSoft)}>Points</span>
                              <span className={cn("text-3xl font-black", accentTheme.text)}>{scoringMatch.pointsA || '0'}</span>
                            </div>
                            <button
                              onClick={() => handleMatchPlayScoreUpdate('A')}
                              className={cn("w-12 h-12 flex items-center justify-center rounded-xl shadow-lg tap-target active:scale-90 transition-transform", accentTheme.solid, accentTheme.solidShadow)}
                            >
                              <Plus size={20} className="text-white" />
                            </button>
                          </div>
                        )}
                      </div>
                      {tournament.format !== 'Match Play' && (
                        <div className="flex flex-col gap-2">
                          <button onClick={() => handleScoreUpdate('A', 5)} className={cn("px-3 py-2 text-xs font-black rounded-lg tap-target", accentTheme.bgSoft, accentTheme.text)}>+5</button>
                          <button onClick={() => setExactScore('A', tournament.totalPoints)} className={cn("px-3 py-2 text-xs font-black rounded-lg tap-target", accentTheme.bgSoft, accentTheme.text)}>MAX</button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* VS Divider */}
                  <div className="relative flex items-center justify-center">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-ios-gray/10"></div></div>
                    <span className="relative px-4 bg-white text-[10px] font-black text-ios-gray/30 tracking-[0.2em] uppercase">Versus</span>
                  </div>

                  {/* Team B Scoring */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold text-ios-gray uppercase tracking-widest">Team B</span>
                      <span className="text-xs font-medium text-ios-gray truncate max-w-[200px]">
                        {scoringMatch.teamB.players.map(p => p.name.split(' ')[0]).join(' & ')}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex-1 flex items-center justify-between bg-ios-gray/5 rounded-2xl p-2 border border-ios-gray/10">
                        {tournament.format !== 'Match Play' ? (
                          <>
                            <button onClick={() => handleScoreUpdate('B', -1)} className="w-12 h-12 flex items-center justify-center bg-white rounded-xl shadow-sm tap-target active:scale-90 transition-transform">
                              <Minus size={20} className="text-on-surface" />
                            </button>
                            <span className="text-4xl font-display font-black text-on-surface">{scoringMatch.teamB.score}</span>
                            <button onClick={() => handleScoreUpdate('B', 1)} className="w-12 h-12 flex items-center justify-center bg-on-surface rounded-xl shadow-lg shadow-on-surface/10 tap-target active:scale-90 transition-transform">
                              <Plus size={20} className="text-white" />
                            </button>
                          </>
                        ) : (
                          <div className="w-full flex items-center justify-between px-4">
                            <div className="flex flex-col items-center">
                              <span className="text-[10px] font-bold text-ios-gray/40 uppercase">Games</span>
                              <span className="text-3xl font-display font-black text-on-surface">{scoringMatch.teamB.score}</span>
                            </div>
                            <div className="flex flex-col items-center">
                              <span className="text-[10px] font-bold text-ios-gray/40 uppercase">Points</span>
                              <span className="text-3xl font-black text-on-surface">{scoringMatch.pointsB || '0'}</span>
                            </div>
                            <button
                              onClick={() => handleMatchPlayScoreUpdate('B')}
                              className="w-12 h-12 flex items-center justify-center bg-on-surface rounded-xl shadow-lg shadow-on-surface/10 tap-target active:scale-90 transition-transform"
                            >
                              <Plus size={20} className="text-white" />
                            </button>
                          </div>
                        )}
                      </div>
                      {tournament.format !== 'Match Play' && (
                        <div className="flex flex-col gap-2">
                          <button onClick={() => handleScoreUpdate('B', 5)} className="px-3 py-2 bg-ios-gray/10 text-ios-gray text-xs font-black rounded-lg tap-target">+5</button>
                          <button onClick={() => setExactScore('B', tournament.totalPoints)} className="px-3 py-2 bg-ios-gray/10 text-ios-gray text-xs font-black rounded-lg tap-target">MAX</button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-10 grid grid-cols-2 gap-3">
                  <button
                    onClick={() => {
                      setExactScore('A', 0);
                      setExactScore('B', 0);
                    }}
                    className="py-4 bg-ios-gray/5 text-ios-gray font-bold text-sm rounded-2xl tap-target active:bg-ios-gray/10 transition-colors"
                  >
                    Reset Skor
                  </button>
                  <button
                    onClick={() => setScoringMatchId(null)}
                    className={cn("py-4 text-white font-bold text-sm rounded-2xl shadow-xl tap-target active:scale-[0.98] transition-all", accentTheme.solid, accentTheme.solidShadow)}
                  >
                    Simpan & Tutup
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const KlasemenScreen = ({ tournament, onBack }: { tournament: Tournament | TournamentHistory, onBack: () => void }) => {
  const [showShareModal, setShowShareModal] = useState(false);
  const tournamentPlayers = tournament.players || [];
  const tournamentRounds = tournament.rounds || [];
  const configuredCourts = 'courts' in tournament ? tournament.courts : undefined;
  const detectedCourts = Math.max(1, ...tournamentRounds.flatMap(r => r.matches.map(m => m.court || 1)));
  const courtsCount = configuredCourts || detectedCourts;
  const completedRounds = tournamentRounds.filter(r => r.matches.every(m => m.status === 'completed')).length;
  const totalMatches = tournamentRounds.reduce((sum, round) => sum + round.matches.length, 0);
  const completedMatches = tournamentRounds.reduce((sum, round) => sum + round.matches.filter(m => m.status === 'completed').length, 0);
  const activeMatches = tournamentRounds.reduce((sum, round) => sum + round.matches.filter(m => m.status === 'active').length, 0);
  const isTournamentEnded = tournamentRounds.length > 0
    ? tournamentRounds.every(r => r.matches.every(m => m.status === 'completed'))
    : true;
  const completionPercent = totalMatches > 0 ? Math.min(100, Math.round((completedMatches / totalMatches) * 100)) : 0;
  const dateLabel = 'date' in tournament && tournament.date
    ? tournament.date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    : ('startedAt' in tournament && tournament.startedAt
      ? new Date(tournament.startedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
      : '-');
  const venueLabel = (tournament.venueName || '').trim();
  const locationLabel = (tournament.location || '').trim();
  const placeLabel = venueLabel && locationLabel
    ? `${venueLabel} | ${locationLabel}`
    : (venueLabel || locationLabel);
  const locationDateLabel = placeLabel ? `${placeLabel} | ${dateLabel}` : dateLabel;

  const infoTheme =
    tournament.format === 'Americano'
      ? {
        bg: 'from-[#12806A] via-[#18A486] to-[#4FC3A1]',
        shadow: 'shadow-[0_14px_30px_rgba(18,128,106,0.32)]',
        ring: 'bg-[#0F2A2A]/18',
        topBg: 'bg-[#12806A]/92 supports-[backdrop-filter]:bg-[#12806A]/82',
        topBorder: 'border-[#0d5f4e]/35',
        accent: 'text-[#12806A]',
        accentSoft: 'text-[#12806A]/65',
        accentBg: 'bg-[#18A486]/12',
        accentBorder: 'border-[#18A486]/25',
        accentSolid: 'bg-[#18A486]',
        accentSolidShadow: 'shadow-[0_10px_22px_rgba(24,164,134,0.26)]'
      }
      : tournament.format === 'Mexicano'
        ? {
          bg: 'from-[#E65E14] via-[#F26A2A] to-[#FF8A4C]',
          shadow: 'shadow-[0_14px_30px_rgba(230,94,20,0.35)]',
          ring: 'bg-[#1F2937]/18',
          topBg: 'bg-primary/92 supports-[backdrop-filter]:bg-primary/82',
          topBorder: 'border-[#b8480f]/35',
          accent: 'text-primary',
          accentSoft: 'text-primary/65',
          accentBg: 'bg-primary/12',
          accentBorder: 'border-primary/25',
          accentSolid: 'bg-primary',
          accentSolidShadow: 'shadow-[0_10px_22px_rgba(230,94,20,0.24)]'
        }
        : {
          bg: 'from-[#2248B5] via-[#2F6FE4] to-[#56A3F7]',
          shadow: 'shadow-[0_14px_30px_rgba(34,72,181,0.32)]',
          ring: 'bg-[#0F1E3A]/18',
          topBg: 'bg-[#2F6FE4]/92 supports-[backdrop-filter]:bg-[#2F6FE4]/82',
          topBorder: 'border-[#1f4ca8]/35',
          accent: 'text-[#2F6FE4]',
          accentSoft: 'text-[#2F6FE4]/65',
          accentBg: 'bg-[#2F6FE4]/12',
          accentBorder: 'border-[#2F6FE4]/25',
          accentSolid: 'bg-[#2F6FE4]',
          accentSolidShadow: 'shadow-[0_10px_22px_rgba(47,111,228,0.26)]'
        };

  const sortedPlayers = useMemo(() => {
    const playerRegistry = new Map<string, Player>();
    const registerPlayer = (player: Player | undefined) => {
      if (!player) return;
      const existing = playerRegistry.get(player.id);
      if (!existing) {
        playerRegistry.set(player.id, player);
        return;
      }
      const merged = {
        ...existing,
        ...player,
        avatar: player.avatar || existing.avatar,
        initials: player.initials || existing.initials
      };
      playerRegistry.set(player.id, merged);
    };

    tournamentPlayers.forEach(registerPlayer);
    tournamentRounds.forEach(round => {
      round.matches.forEach(match => {
        match.teamA.players.forEach(registerPlayer);
        match.teamB.players.forEach(registerPlayer);
      });
      (round.playersBye || []).forEach(registerPlayer);
    });

    const playerStatsMap: Record<string, {
      id: string,
      name: string,
      avatar?: string,
      initials: string,
      matches: number,
      w: number,
      l: number,
      d: number,
      pointsDiff: number,
      totalPoints: number
    }> = {};

    playerRegistry.forEach(player => {
      playerStatsMap[player.id] = {
        id: player.id,
        name: player.name,
        avatar: player.avatar,
        initials: player.initials || player.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase(),
        matches: 0,
        w: 0,
        l: 0,
        d: 0,
        pointsDiff: 0,
        totalPoints: 0
      };
    });

    tournamentRounds.forEach(round => {
      round.matches.forEach(match => {
        const scoreA = match.teamA.score || 0;
        const scoreB = match.teamB.score || 0;
        const hasLiveScore = scoreA > 0 || scoreB > 0;
        const shouldCountMatchAppearance = match.status !== 'pending';
        const shouldCountStandingScore = match.status === 'completed' || hasLiveScore;
        if (!shouldCountMatchAppearance && !shouldCountStandingScore) return;

        match.teamA.players.forEach(player => {
          const stats = playerStatsMap[player.id];
          if (!stats) return;
          if (shouldCountMatchAppearance) stats.matches += 1;
          if (shouldCountStandingScore) {
            stats.totalPoints += scoreA;
            stats.pointsDiff += (scoreA - scoreB);
          }
          if (match.status === 'completed') {
            if (scoreA > scoreB) stats.w += 1;
            else if (scoreA < scoreB) stats.l += 1;
            else stats.d += 1;
          }
        });
        match.teamB.players.forEach(player => {
          const stats = playerStatsMap[player.id];
          if (!stats) return;
          if (shouldCountMatchAppearance) stats.matches += 1;
          if (shouldCountStandingScore) {
            stats.totalPoints += scoreB;
            stats.pointsDiff += (scoreB - scoreA);
          }
          if (match.status === 'completed') {
            if (scoreB > scoreA) stats.w += 1;
            else if (scoreB < scoreA) stats.l += 1;
            else stats.d += 1;
          }
        });
      });
    });

    return Object.values(playerStatsMap).sort((a, b) => {
      if (b.w !== a.w) return b.w - a.w;
      if (b.pointsDiff !== a.pointsDiff) return b.pointsDiff - a.pointsDiff;
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
      return a.name.localeCompare(b.name, 'id-ID');
    });
  }, [tournamentPlayers, tournamentRounds]);

  const handleShare = async () => {
    const shareData = {
      title: `${isTournamentEnded ? 'Klasemen Final' : 'Klasemen Sementara'} - ${tournament.name}`,
      text: `Pantau klasemen ${tournament.name} di FOM Play`,
      url: window.location.href
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        setShowShareModal(true);
      }
    } else {
      setShowShareModal(true);
    }
  };

  return (
    <div className="relative min-h-screen pb-12 overflow-hidden bg-transparent z-0">
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className={cn('absolute inset-0', tournament.format === 'Americano'
          ? 'bg-[linear-gradient(175deg,#e9faf6_0%,#d8f3eb_42%,#f5fffb_100%)]'
          : tournament.format === 'Mexicano'
            ? 'bg-[linear-gradient(175deg,#fff3e7_0%,#ffe8d8_40%,#fff5ec_100%)]'
            : 'bg-[linear-gradient(175deg,#edf3ff_0%,#dce9ff_42%,#f6f9ff_100%)]')} />
        <div className={cn('absolute -left-36 -top-20 w-[760px] h-[380px] rounded-[999px] border-[22px] rotate-[10deg]',
          tournament.format === 'Americano' ? 'border-[rgba(24,164,134,0.24)]' : tournament.format === 'Mexicano' ? 'border-[rgba(230,94,20,0.22)]' : 'border-[rgba(47,111,228,0.24)]')} />
        <div className={cn('absolute -right-44 bottom-4 w-[820px] h-[390px] rounded-[999px] border-[20px] -rotate-[8deg]',
          tournament.format === 'Americano' ? 'border-[rgba(24,164,134,0.18)]' : tournament.format === 'Mexicano' ? 'border-[rgba(230,94,20,0.18)]' : 'border-[rgba(47,111,228,0.18)]')} />
      </div>

      <header
        className={cn('fixed top-0 inset-x-0 z-50 border-b backdrop-blur-2xl', infoTheme.topBg, infoTheme.topBorder)}
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <div className="max-w-lg mx-auto h-16 px-4 grid grid-cols-[84px_1fr_88px] items-center">
          <button onClick={onBack} className="justify-self-start tap-target h-9 px-3 rounded-full bg-white/16 text-white border border-white/30 inline-flex items-center gap-1.5">
            <ChevronLeft size={16} />
            <span className="text-[12px] font-semibold">Back</span>
          </button>
          <div className="flex justify-center items-center">
            <img src="/fom-long-logotype-white.png" alt="Friends of Motion" className="h-8 w-auto object-contain" />
          </div>
          <button onClick={handleShare} className="justify-self-end tap-target h-9 px-3 rounded-full bg-white/16 text-white border border-white/30 inline-flex items-center gap-1.5">
            <Share2 size={16} />
            <span className="text-[12px] font-semibold">Share</span>
          </button>
        </div>
      </header>

      <main
        className="relative z-10 px-4 space-y-4 max-w-lg mx-auto"
        style={{
          paddingTop: 'calc(env(safe-area-inset-top, 0px) + 88px)',
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)'
        }}
      >
        <section className={cn('relative overflow-hidden rounded-2xl p-4 border border-white/25 bg-gradient-to-br', infoTheme.bg, infoTheme.shadow)}>
          <div className="absolute -left-32 top-4 w-[680px] h-[240px] rounded-[999px] border-[14px] border-white/85 rotate-[8deg] pointer-events-none" />
          <div className={cn('absolute -right-14 -bottom-14 w-64 h-64 rounded-full pointer-events-none', infoTheme.ring)} />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_10%,rgba(255,255,255,0.30),transparent_32%)] pointer-events-none" />

          <div className="relative flex items-start justify-between gap-3 mb-3">
            <div className="min-w-0">
              <h2 className="text-[18px] font-black tracking-tight text-white truncate">{tournament.name || '-'}</h2>
              <p className="mt-1 text-[11px] text-white/85 truncate">{locationDateLabel}</p>
            </div>
            <div className="shrink-0 rounded-xl border border-white/40 bg-white/20 backdrop-blur-sm px-3 py-1.5 text-right">
              <span className="block text-[9px] font-bold uppercase tracking-wider text-white/85">Status</span>
              <span className="text-[14px] font-bold text-white leading-none">{isTournamentEnded ? 'Final' : 'Live'}</span>
            </div>
          </div>

          <div className="relative grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-white/20 border border-white/35 px-2.5 py-2">
              <p className="text-[9px] font-bold uppercase tracking-wider text-white/80">Mode</p>
              <p className="text-[12px] font-semibold text-white truncate">{tournament.format}</p>
            </div>
            <div className="rounded-xl bg-white/20 border border-white/35 px-2.5 py-2">
              <p className="text-[9px] font-bold uppercase tracking-wider text-white/80">Player</p>
              <p className="text-[12px] font-semibold text-white">{sortedPlayers.length}</p>
            </div>
            <div className="rounded-xl bg-white/20 border border-white/35 px-2.5 py-2">
              <p className="text-[9px] font-bold uppercase tracking-wider text-white/80">Lapangan</p>
              <p className="text-[12px] font-semibold text-white">{courtsCount}</p>
            </div>
          </div>

          <div className="relative mt-3 pt-2 border-t border-white/30 flex items-center justify-between">
            <p className="text-[11px] text-white/88">Ronde selesai: <span className="font-bold text-white">{completedRounds}/{tournamentRounds.length || 0}</span></p>
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/85">{isTournamentEnded ? 'Klasemen Akhir' : 'Klasemen Sementara'}</span>
          </div>
          <div className="relative mt-1 flex items-center justify-between text-[10px] font-semibold text-white/78 tabular-nums">
            <span>Match {completedMatches}/{totalMatches}</span>
            <span>Live {activeMatches}</span>
          </div>
          <div className="relative mt-2">
            <div className="h-1.5 rounded-full bg-white/25 overflow-hidden">
              <div className="h-full rounded-full bg-white/90 transition-all duration-300" style={{ width: `${completionPercent}%` }} />
            </div>
            <p className="mt-1 text-[10px] font-semibold text-white/80">Progress pertandingan {completionPercent}%</p>
          </div>
        </section>

        <section className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-[12px] font-bold uppercase tracking-wide text-ios-gray">Ranking Pemain</h3>
            <span className={cn('text-[10px] font-bold uppercase tracking-widest', infoTheme.accentSoft)}>{isTournamentEnded ? 'Final Result' : 'Live Update'}</span>
          </div>
          <p className="px-1 text-[10px] font-semibold text-ios-gray/70">Urutan: Menang (W) → Diff → Poin.</p>

          <div className="rounded-2xl bg-white/76 backdrop-blur-sm border border-white/70 p-2 shadow-[0_6px_20px_rgba(17,24,39,0.06)]">
            <div className="grid grid-cols-[1fr_48px_44px] gap-2 px-2 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-ios-gray/65">
              <span>Pemain</span>
              <span className="text-right">Diff</span>
              <span className="text-right">Poin</span>
            </div>
            <div className="space-y-1.5">
              {sortedPlayers.map((player, i) => (
                <div key={player.id} className="bg-white/95 p-3 rounded-[14px] border border-ios-gray/10 grid grid-cols-[1fr_48px_44px] gap-2 items-center">
                  <div className="min-w-0 flex items-center gap-2.5">
                    <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-black shrink-0', i < 3 ? cn(infoTheme.accentBg, infoTheme.accent) : 'bg-ios-gray/10 text-ios-gray')}>
                      {i + 1}
                    </div>
                    <div className="w-10 h-10 rounded-full bg-ios-gray/10 border border-ios-gray/10 overflow-hidden flex items-center justify-center shrink-0">
                      {player.avatar ? (
                        <img className="w-full h-full object-cover" src={player.avatar} alt={player.name} referrerPolicy="no-referrer" />
                      ) : (
                        <span className="text-[11px] font-bold text-ios-gray">{player.initials}</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-[13px] text-on-surface truncate">{player.name}</p>
                      <p className="mt-0.5 text-[10px] font-semibold text-ios-gray/85 truncate">
                        W {player.w} · L {player.l} · D {player.d} · M {player.matches}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={cn('text-[14px] font-display font-black leading-none tabular-nums', player.pointsDiff > 0 ? infoTheme.accent : player.pointsDiff < 0 ? 'text-error' : 'text-ios-gray')}>
                      {player.pointsDiff > 0 ? `+${player.pointsDiff}` : player.pointsDiff}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[13px] font-bold leading-none text-on-surface tabular-nums">{player.totalPoints}</p>
                  </div>
                </div>
              ))}
              {sortedPlayers.length === 0 && (
                <div className="bg-white/95 p-4 rounded-[14px] border border-ios-gray/10 text-center text-[12px] font-semibold text-ios-gray">
                  Data pemain belum tersedia.
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="pt-1 pb-8">
          <button onClick={handleShare} className={cn('w-full h-[50px] rounded-xl text-white font-bold text-[14px] tap-target inline-flex items-center justify-center gap-2', infoTheme.accentSolid, infoTheme.accentSolidShadow)}>
            <Share2 size={16} />
            Bagikan Klasemen
          </button>
        </section>
      </main>

      <AnimatePresence>
        {showShareModal && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowShareModal(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} className="relative w-full max-w-md bg-white rounded-[32px] p-8 shadow-2xl">
              <h3 className="text-xl font-bold mb-4">Salin Link Klasemen</h3>
              <div className="bg-ios-gray/5 p-4 rounded-2xl border border-ios-gray/10 flex items-center justify-between gap-4 mb-6">
                <span className="text-sm font-medium text-ios-gray truncate">{window.location.href}</span>
                <button onClick={() => { navigator.clipboard.writeText(window.location.href); setShowShareModal(false); }} className={cn('text-white px-4 py-2 rounded-xl text-xs font-bold shrink-0', infoTheme.accentSolid)}>
                  Salin
                </button>
              </div>
              <button onClick={() => setShowShareModal(false)} className="w-full py-4 bg-ios-gray/10 text-on-surface font-bold rounded-2xl">Tutup</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};


const NotificationsScreen = ({ notifications, onMarkAsRead, onClearAll, onBack }: {
  notifications: AppNotification[],
  onMarkAsRead: (id: string) => void,
  onClearAll: () => void,
  onBack: () => void
}) => {
  return (
    <div className="bg-white min-h-screen pb-32">
      <header className="ios-blur sticky top-0 z-50 flex justify-between items-center w-full px-4 h-14 border-b border-ios-gray/10">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="tap-target p-2 -ml-2">
            <ChevronLeft size={24} className="text-on-surface" />
          </button>
          <h1 className="text-[17px] font-bold tracking-tight text-on-surface">Notifikasi</h1>
        </div>
        <button
          onClick={onClearAll}
          className="text-[13px] font-bold text-primary tap-target px-2"
        >
          Hapus Semua
        </button>
      </header>

      <main className="max-w-md mx-auto py-4">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <div className="w-20 h-20 bg-ios-gray/5 rounded-full flex items-center justify-center mb-4">
              <Bell size={40} className="text-ios-gray/30" />
            </div>
            <h3 className="text-lg font-bold text-on-surface mb-1">Belum ada notifikasi</h3>
            <p className="text-sm text-on-surface/40 font-medium">
              Kami akan memberi tahu Anda saat ada pertandingan baru atau update turnamen.
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {notifications.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).map((notif) => (
              <button
                key={notif.id}
                onClick={() => onMarkAsRead(notif.id)}
                className={cn(
                  "w-full p-4 flex gap-4 text-left transition-colors border-b border-ios-gray/5",
                  !notif.read ? "bg-primary/5" : "bg-white"
                )}
              >
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0",
                  notif.type === 'match' ? "bg-blue-500/10 text-blue-500" :
                    notif.type === 'tournament' ? "bg-primary/10 text-primary" :
                      notif.type === 'achievement' ? "bg-yellow-500/10 text-yellow-500" :
                        "bg-ios-gray/10 text-ios-gray"
                )}>
                  {notif.type === 'match' ? <Trophy size={24} /> :
                    notif.type === 'tournament' ? <Zap size={24} /> :
                      notif.type === 'achievement' ? <Award size={24} /> :
                        <Bell size={24} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <h4 className={cn("text-[15px] truncate pr-2", !notif.read ? "font-bold text-on-surface" : "font-semibold text-on-surface/70")}>
                      {notif.title}
                    </h4>
                    <span className="text-[10px] font-bold text-ios-gray/50 whitespace-nowrap mt-1 uppercase tracking-wider">
                      {new Intl.RelativeTimeFormat('id', { style: 'short' }).format(
                        Math.round((notif.timestamp.getTime() - Date.now()) / 60000),
                        'minute'
                      )}
                    </span>
                  </div>
                  <p className={cn("text-[13px] leading-snug line-clamp-2", !notif.read ? "text-on-surface/80 font-medium" : "text-on-surface/40")}>
                    {notif.message}
                  </p>
                </div>
                {!notif.read && (
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 shrink-0" />
                )}
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};
const HistoryDetailScreen = ({ tournament, onBack, onViewFinalStandings }: { tournament: TournamentHistory, onBack: () => void, onViewFinalStandings: () => void }) => {
  const [collapsedRounds, setCollapsedRounds] = useState<Set<number>>(new Set());

  const toggleRound = (roundId: number) => {
    setCollapsedRounds(prev => {
      const next = new Set(prev);
      if (next.has(roundId)) {
        next.delete(roundId);
      } else {
        next.add(roundId);
      }
      return next;
    });
  };

  return (
    <div className="bg-white min-h-screen pb-32">
      <header className="ios-blur sticky top-0 w-full z-50 flex items-center justify-between px-4 h-14 border-b border-ios-gray/10">
        <button onClick={onBack} className="text-primary flex items-center -ml-2 tap-target p-2">
          <ChevronLeft size={24} />
        </button>
        <h1 className="font-bold text-[17px] tracking-tight">Detail Riwayat</h1>
        <div className="w-10" />
      </header>

      <main className="pt-6 px-5 space-y-8 max-w-lg mx-auto">
        <div className="bg-primary/5 p-6 rounded-[32px] border border-primary/10">
          <h2 className="text-2xl font-bold text-on-surface mb-1">{tournament.name}</h2>
          <div className="flex items-center gap-3 text-ios-gray font-medium text-sm">
            <Calendar size={14} />
            <span>{tournament.date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="bg-white/60 p-3 rounded-2xl border border-ios-gray/5">
              <span className="block text-[10px] font-bold text-ios-gray uppercase tracking-widest mb-1">Format</span>
              <span className="text-sm font-bold text-on-surface">{tournament.format}</span>
            </div>
            <div className="bg-white/60 p-3 rounded-2xl border border-ios-gray/5">
              <span className="block text-[10px] font-bold text-ios-gray uppercase tracking-widest mb-1">Pemain</span>
              <span className="text-sm font-bold text-on-surface">{tournament.numPlayers} Orang</span>
            </div>
          </div>
          <button
            onClick={onViewFinalStandings}
            className="mt-4 w-full h-11 rounded-xl border border-primary/20 bg-white/80 text-primary text-[13px] font-bold inline-flex items-center justify-center gap-2 tap-target"
          >
            <Trophy size={16} />
            Lihat Klasemen Akhir
          </button>
        </div>

        {tournament.rounds?.map((round) => {
          const isCollapsed = collapsedRounds.has(round.id);

          return (
            <div key={round.id} className="space-y-4">
              <button
                onClick={() => toggleRound(round.id)}
                className="w-full flex justify-between items-center group"
              >
                <div className="flex flex-col items-start">
                  <span className="text-[12px] font-bold uppercase tracking-wide text-ios-gray">
                    Ronde {round.id}
                  </span>
                </div>
                <div className={cn(
                  "p-2 rounded-full bg-ios-gray/5 text-ios-gray transition-all",
                  !isCollapsed && "rotate-180"
                )}>
                  <ChevronRight size={18} />
                </div>
              </button>

              <AnimatePresence>
                {!isCollapsed && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="bg-white rounded-[20px] shadow-sm overflow-hidden border border-ios-gray/10 mb-4">
                      {round.matches.map((match, i) => (
                        <div key={match.id} className={cn("p-5", i < round.matches.length - 1 && "border-b border-surface")}>
                          <div className="text-[11px] font-semibold text-ios-gray uppercase tracking-widest mb-4">LAPANGAN {match.court}</div>
                          <div className="grid grid-cols-[1fr_24px_1fr] items-center gap-4">
                            <div className="flex flex-col items-center gap-2">
                              <div className="flex -space-x-2">
                                {match.teamA.players.map((p, idx) => (
                                  <div key={idx} className="w-10 h-10 rounded-full ring-2 ring-white bg-ios-gray/20 flex items-center justify-center text-[10px] font-bold">
                                    {p.initials}
                                  </div>
                                ))}
                              </div>
                              <span className="text-[13px] font-bold text-center truncate w-full">
                                {match.teamA.players.map(p => p.name.split(' ')[0]).join(' / ')}
                              </span>
                              <div className="text-2xl font-display font-black text-primary">{match.teamA.score}</div>
                            </div>
                            <div className="text-[10px] font-black text-ios-gray/20">VS</div>
                            <div className="flex flex-col items-center gap-2">
                              <div className="flex -space-x-2">
                                {match.teamB.players.map((p, idx) => (
                                  <div key={idx} className="w-10 h-10 rounded-full ring-2 ring-white bg-ios-gray/20 flex items-center justify-center text-[10px] font-bold">
                                    {p.initials}
                                  </div>
                                ))}
                              </div>
                              <span className="text-[13px] font-bold text-ios-gray text-center truncate w-full">
                                {match.teamB.players.map(p => p.name.split(' ')[0]).join(' / ')}
                              </span>
                              <div className="text-2xl font-display font-black text-on-surface">{match.teamB.score}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </main>
    </div>
  );
};

const ProfileScreen = ({ onLogout, onRequestPermission, user, tournaments, setUser, onViewHistory, addNotification, onFriends }: {
  onLogout: () => void,
  onRequestPermission: () => void,
  user: any,
  tournaments: TournamentHistory[],
  setUser: React.Dispatch<React.SetStateAction<any>>,
  onViewHistory: (t: TournamentHistory) => void,
  addNotification: (title: string, message: string, type: AppNotification['type']) => void,
  onFriends: () => void
}) => {
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isRegionSelectorOpen, setIsRegionSelectorOpen] = useState(false);
  const [editData, setEditData] = useState({
    displayName: user?.displayName || '',
    username: user?.username || '',
    phoneNumber: user?.phoneNumber || '',
    homeBase: user?.homeBase || user?.region || 'Jakarta Selatan, DKI Jakarta'
  });

  const handleSaveProfile = async () => {
    try {
      await setDoc(doc(db, 'users', user.uid), editData, { merge: true });
      setUser(prev => ({ ...prev, ...editData }));
      setIsEditingProfile(false);
      addNotification('Profil Diperbarui', 'Informasi profil Anda telah berhasil disimpan.', 'system');
    } catch (err) {
      console.error('Save profile error:', err);
    }
  };
  const stats = {
    matches: tournaments.length,
    winRate: tournaments.length > 0 ? Math.round((Math.floor(tournaments.length * 0.7) / tournaments.length) * 100) : 0,
    points: tournaments.reduce((acc, curr) => acc + (curr.numPlayers * 10), 0),
    won: Math.floor(tournaments.length * 0.7),
    lost: Math.floor(tournaments.length * 0.2),
    draw: Math.floor(tournaments.length * 0.1)
  };

  const getTier = (matches: number) => {
    if (matches >= 10) return { label: 'Silver Tier', color: 'bg-slate-400/10 text-slate-600' };
    if (matches >= 1) return { label: 'Bronze Tier', color: 'bg-orange-400/10 text-orange-600' };
    return { label: 'Newcomer', color: 'bg-ios-gray/10 text-ios-gray' };
  };

  const getStatus = (winRate: number, matches: number) => {
    if (matches >= 10 && winRate >= 75) return { label: 'Pro Player', color: 'bg-primary/10 text-primary' };
    if (matches >= 5) return { label: 'Veteran', color: 'bg-blue-500/10 text-blue-600' };
    return { label: 'Challenger', color: 'bg-purple-500/10 text-purple-600' };
  };

  const tier = getTier(stats.matches);
  const status = getStatus(stats.winRate, stats.matches);

  return (
    <div className="pb-32 bg-white min-h-screen">
      <header className="ios-blur sticky top-0 w-full z-50 flex items-center justify-between px-4 h-14 border-b border-ios-gray/10">
        <h1 className="font-bold text-[17px] tracking-tight ml-2">Profil Saya</h1>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsEditingProfile(true)}
            className="tap-target p-2"
          >
            <Settings size={22} className="text-on-surface/70" />
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto">
        {/* Profile Header */}
        <section className="px-5 pt-8 pb-6 flex flex-col items-center text-center">
          <div className="relative mb-4">
            <div className="w-28 h-28 rounded-full bg-ios-gray/10 border-4 border-white shadow-xl overflow-hidden flex items-center justify-center">
              {user?.photoURL ? (
                <img src={user.photoURL} alt={user.displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <User size={60} className="text-ios-gray/30" />
              )}
            </div>
            <button
              onClick={() => {
                addNotification('Unggah Foto', 'Fitur ganti foto profil akan segera hadir!', 'system');
              }}
              className="absolute bottom-1 right-1 bg-primary text-white p-2 rounded-full shadow-lg border-2 border-white tap-target"
            >
              <Camera size={16} />
            </button>
          </div>
          <h2 className="text-2xl font-bold tracking-tight">{user?.displayName || 'Pemain Padel'}</h2>
          <p className="text-sm font-bold text-ios-gray mb-4">@{user?.username || 'user'}</p>

          <div className="flex flex-col items-center gap-2 mb-6">
            <div className="flex items-center gap-2 bg-ios-gray/5 px-3 py-1.5 rounded-full border border-ios-gray/10">
              <Home size={14} className="text-ios-gray" />
              <span className="text-[11px] font-bold text-ios-gray">Home: {user?.homeBase?.split(',')[0] || user?.region?.split(',')[0] || 'Jakarta'}</span>
            </div>
            <div className="flex items-center gap-2 bg-primary/5 px-3 py-1.5 rounded-full border border-primary/10">
              <Zap size={14} className="text-primary" />
              <span className="text-[11px] font-bold text-primary">Active Zone: {user?.region?.split(',')[0] || 'Jakarta'}</span>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={onFriends}
              className="px-6 py-2 bg-primary text-white rounded-full text-[12px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 tap-target flex items-center gap-2"
            >
              <Users size={16} />
              Teman
            </button>
            <button
              onClick={() => {
                addNotification('Bagikan Profil', 'Link profil Anda telah disalin!', 'system');
              }}
              className="px-6 py-2 bg-white border border-ios-gray/10 text-on-surface rounded-full text-[12px] font-black uppercase tracking-widest tap-target flex items-center gap-2"
            >
              <Share2 size={16} />
              Bagikan
            </button>
          </div>
          <div className="mt-4 flex flex-col items-center gap-3 w-full max-w-[240px]">
            <RankBadge mmr={user?.mmr || 0} size="lg" />

            {/* MMR Progress Bar */}
            {(() => {
              const rankInfo = getRankInfo(user?.mmr || 0);
              return (
                <div className="w-full space-y-1.5">
                  <div className="flex justify-between text-[10px] font-bold text-ios-gray uppercase tracking-widest">
                    <span>{user?.mmr || 0} MMR</span>
                    {rankInfo.nextRank && <span>{rankInfo.nextRank.min} MMR</span>}
                  </div>
                  <div className="h-2 w-full bg-ios-gray/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-500"
                      style={{ width: `${rankInfo.progress}%` }}
                    />
                  </div>
                  {rankInfo.nextRank && (
                    <p className="text-[9px] text-ios-gray font-medium text-center">
                      {Math.max(0, rankInfo.nextRank.min - (user?.mmr || 0))} MMR lagi menuju {rankInfo.nextRank.name}
                    </p>
                  )}
                </div>
              );
            })()}
          </div>
        </section>

        {/* Edit Profile Modal */}
        <AnimatePresence>
          {isEditingProfile && (
            <div className="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsEditingProfile(false)}
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              />
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                className="relative w-full max-w-md bg-white rounded-[32px] p-8 shadow-2xl"
              >
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold">Edit Profil</h3>
                  <button onClick={() => setIsEditingProfile(false)} className="p-2 bg-ios-gray/5 rounded-full tap-target">
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-4 mb-8">
                  <div>
                    <label className="block text-[10px] font-black text-ios-gray uppercase tracking-widest mb-1.5 ml-1">Nama Lengkap</label>
                    <input
                      type="text"
                      value={editData.displayName}
                      onChange={(e) => setEditData({ ...editData, displayName: e.target.value })}
                      className="w-full bg-ios-gray/5 border border-ios-gray/10 rounded-2xl p-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-ios-gray uppercase tracking-widest mb-1.5 ml-1">Username</label>
                    <input
                      type="text"
                      value={editData.username}
                      onChange={(e) => setEditData({ ...editData, username: e.target.value.toLowerCase().replace(/\s/g, '') })}
                      className="w-full bg-ios-gray/5 border border-ios-gray/10 rounded-2xl p-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-ios-gray uppercase tracking-widest mb-1.5 ml-1">Nomor Handphone</label>
                    <input
                      type="tel"
                      value={editData.phoneNumber}
                      onChange={(e) => setEditData({ ...editData, phoneNumber: e.target.value })}
                      className="w-full bg-ios-gray/5 border border-ios-gray/10 rounded-2xl p-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-ios-gray uppercase tracking-widest mb-1.5 ml-1">Domisili (Home Base)</label>
                    <button
                      onClick={() => setIsRegionSelectorOpen(true)}
                      className="w-full bg-ios-gray/5 border border-ios-gray/10 rounded-2xl p-4 text-left text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 flex items-center justify-between"
                    >
                      <span className={editData.homeBase ? "text-on-surface" : "text-ios-gray"}>
                        {editData.homeBase || 'Pilih Wilayah'}
                      </span>
                      <MapPin size={18} className="text-ios-gray" />
                    </button>
                  </div>
                </div>

                <button
                  onClick={handleSaveProfile}
                  className="w-full py-4 bg-primary text-white font-black rounded-2xl shadow-lg shadow-primary/20 tap-target"
                >
                  Simpan Perubahan
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <RegionSelector
          isOpen={isRegionSelectorOpen}
          onClose={() => setIsRegionSelectorOpen(false)}
          onSelect={(region) => setEditData({ ...editData, homeBase: region })}
          currentValue={editData.homeBase}
        />

        {/* Stats Grid */}
        <section className="px-5 mb-8">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white border border-ios-gray/10 rounded-2xl p-4 text-center shadow-sm">
              <span className="block text-[10px] font-bold text-ios-gray uppercase tracking-widest mb-1">Matches</span>
              <span className="text-xl font-display font-bold text-on-surface">{stats.matches}</span>
            </div>
            <div className="bg-white border border-ios-gray/10 rounded-2xl p-4 text-center shadow-sm">
              <span className="block text-[10px] font-bold text-ios-gray uppercase tracking-widest mb-1">Win Rate</span>
              <span className="text-xl font-display font-bold text-primary">{stats.winRate}%</span>
            </div>
            <div className="bg-white border border-ios-gray/10 rounded-2xl p-4 text-center shadow-sm">
              <span className="block text-[10px] font-bold text-ios-gray uppercase tracking-widest mb-1">Points</span>
              <span className="text-xl font-display font-bold text-on-surface">{stats.points}</span>
            </div>
          </div>
        </section>

        {/* Performance Visualization */}
        <section className="px-5 mb-8">
          <div className="bg-primary/5 border border-primary/10 rounded-3xl p-6 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                <Bell size={24} />
              </div>
              <div className="space-y-0.5">
                <h4 className="text-[15px] font-bold text-on-surface">Notifikasi Push</h4>
                <p className="text-[12px] text-on-surface/50 font-medium leading-tight">Dapatkan update skor real-time</p>
              </div>
            </div>
            <button
              onClick={onRequestPermission}
              className="bg-primary text-white px-5 py-2.5 rounded-full text-[13px] font-bold shadow-lg shadow-primary/20 tap-target"
            >
              Aktifkan
            </button>
          </div>
        </section>

        <section className="px-5 mb-10">
          <div className="bg-white border border-ios-gray/10 rounded-3xl p-6 shadow-sm">
            <div className="flex justify-between items-end mb-4">
              <div>
                <h3 className="text-sm font-bold text-ios-gray uppercase tracking-widest mb-1">Performa Musim Ini</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-display font-black text-on-surface">{stats.won}</span>
                  <span className="text-sm font-bold text-ios-gray">Kemenangan</span>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1 text-green-500 font-bold text-sm mb-1">
                  <TrendingUp size={16} />
                  <span>+12%</span>
                </div>
                <span className="text-[10px] font-bold text-ios-gray uppercase tracking-widest">vs Bulan Lalu</span>
              </div>
            </div>

            <div className="h-3 w-full bg-ios-gray/10 rounded-full overflow-hidden flex mb-4">
              <div
                className="h-full bg-primary"
                style={{ width: `${stats.matches > 0 ? (stats.won / stats.matches) * 100 : 0}%` }}
              />
              <div
                className="h-full bg-ios-gray/40"
                style={{ width: `${stats.matches > 0 ? (stats.draw / stats.matches) * 100 : 0}%` }}
              />
              <div
                className="h-full bg-ios-gray/20"
                style={{ width: `${stats.matches > 0 ? (stats.lost / stats.matches) * 100 : 0}%` }}
              />
            </div>

            <div className="flex justify-between text-[11px] font-bold uppercase tracking-tighter">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <span className="text-on-surface font-display">Win: {stats.won}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-ios-gray/40" />
                <span className="text-ios-gray font-display">Draw: {stats.draw}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-ios-gray/20" />
                <span className="text-ios-gray/40 font-display">Loss: {stats.lost}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Recent Matches */}
        <section className="mb-10">
          <div
            onClick={() => {
              if (tournaments.length > 0) {
                onViewHistory(tournaments[0]);
              } else {
                addNotification('Riwayat', 'Belum ada riwayat turnamen untuk ditampilkan.', 'system');
              }
            }}
            className="px-5 flex justify-between items-center mb-4 cursor-pointer group"
          >
            <h2 className="text-xl font-bold tracking-tight">Turnamen Terakhir</h2>
            <button
              className="text-primary text-sm font-semibold tap-target px-2 group-hover:underline"
            >
              Lihat Semua
            </button>
          </div>
          <div className="px-5 flex flex-col gap-4">
            {tournaments.length === 0 ? (
              <div className="bg-white border border-ios-gray/10 rounded-2xl p-8 text-center shadow-sm">
                <Trophy size={40} className="text-ios-gray/20 mx-auto mb-3" />
                <p className="text-ios-gray font-medium">Belum ada turnamen.</p>
              </div>
            ) : (
              tournaments.slice(0, 3).map((item) => (
                <button
                  key={item.id}
                  onClick={() => onViewHistory(item)}
                  className="w-full bg-white border border-ios-gray/10 rounded-2xl p-4 shadow-sm flex items-center justify-between tap-target text-left"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex flex-col items-center justify-center font-black text-xs shrink-0 bg-primary/10 text-primary"
                    )}>
                      <Award size={20} className="mb-0.5" />
                      <span>FINISH</span>
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] font-bold text-ios-gray uppercase tracking-wider mb-0.5 block">
                        {item.date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                      </span>
                      <h4 className="text-[15px] font-bold text-on-surface leading-tight truncate">{item.name}</h4>
                      <span className="text-[12px] font-medium text-ios-gray truncate block">{item.format} • {item.numPlayers} Pemain</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <ChevronRight size={20} className="text-ios-gray/30" />
                  </div>
                </button>
              ))
            )}
          </div>
        </section>

        {/* Logout Button */}
        <section className="px-5 pb-12">
          <button
            onClick={onLogout}
            className="w-full py-4 bg-ios-gray/5 text-error font-bold rounded-2xl flex items-center justify-center gap-2 tap-target border border-error/10"
          >
            <LogOut size={20} />
            <span>Keluar dari Akun</span>
          </button>
          <p className="text-center text-[10px] text-ios-gray/40 mt-6 font-medium">FOM Play VERSION 1.2.0 (BETA)</p>
        </section>
      </main>
    </div>
  );
};

const RankDiscoveryScreen = ({ onBack }: { onBack: () => void }) => {
  return (
    <div className="min-h-screen bg-surface pb-20">
      <header className="ios-blur sticky top-0 w-full z-50 flex items-center px-4 h-14 border-b border-ios-gray/10">
        <button onClick={onBack} className="tap-target p-2 -ml-2">
          <ChevronLeft size={24} />
        </button>
        <h1 className="font-bold text-[17px] tracking-tight ml-2">Sistem Ranking FOM</h1>
      </header>

      <main className="max-w-2xl mx-auto p-5">
        <section className="mb-8">
          <h2 className="text-xl font-bold mb-4">Urutan Peringkat</h2>
          <div className="space-y-3">
            {RANK_TIERS.map((rank, i) => (
              <div key={i} className="bg-white border border-ios-gray/10 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4">
                  <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", rank.color)}>
                    <rank.icon size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-on-surface">{rank.name}</h4>
                    <p className="text-xs font-display text-ios-gray font-medium">
                      {rank.min} - {rank.max === Infinity ? '∞' : rank.max} MMR
                    </p>
                  </div>
                </div>
                {rank.name === 'Hall of Fame' && (
                  <span className="px-2 py-1 bg-primary/10 text-primary text-[9px] font-black rounded-lg uppercase">Top 100 Only</span>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-bold mb-4">Perhitungan MMR</h2>
          <div className="bg-white border border-ios-gray/10 rounded-3xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-ios-gray/5 border-b border-ios-gray/10">
                <tr>
                  <th className="px-4 py-3 font-bold text-ios-gray uppercase text-[10px]">Skenario</th>
                  <th className="px-4 py-3 font-bold text-ios-gray uppercase text-[10px] text-right">MMR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ios-gray/5">
                <tr>
                  <td className="px-4 py-3 font-medium">Menang Biasa (Selisih 1-9)</td>
                  <td className="px-4 py-3 text-right font-display font-bold text-green-500">+25</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium">Menang Telak (Selisih ≥ 10)</td>
                  <td className="px-4 py-3 text-right font-display font-bold text-green-600">+40</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium">Kalah Biasa (Selisih 1-9)</td>
                  <td className="px-4 py-3 text-right font-display font-bold text-error">-20</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium">Kalah Telak (Selisih ≥ 10)</td>
                  <td className="px-4 py-3 text-right font-display font-bold text-red-700">-35</td>
                </tr>
                <tr className="bg-primary/5">
                  <td className="px-4 py-3 font-bold text-primary italic">Bonus Underdog (Lawan Rank Atas)</td>
                  <td className="px-4 py-3 text-right font-display font-bold text-primary">+15</td>
                </tr>
                <tr className="bg-error/5">
                  <td className="px-4 py-3 font-bold text-error italic">Penalti Favorit (Kalah Rank Bawah)</td>
                  <td className="px-4 py-3 text-right font-display font-bold text-error">-15</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-xs text-ios-gray font-medium leading-relaxed">
            * MMR akan diupdate secara otomatis setiap kali turnamen selesai berdasarkan performa individu Anda di dalam tim.
          </p>
        </section>
      </main>
    </div>
  );
};

const FriendsScreen = ({ currentUser, onBack, addNotification }: {
  currentUser: any,
  onBack: () => void,
  addNotification: (title: string, message: string, type: AppNotification['type']) => void
}) => {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const uid = currentUser?.uid;
    setFriends([]);
    setLoading(true);

    if (!uid) {
      setLoading(false);
      return;
    }

    const q = query(collection(db, 'users', uid, 'friends'), orderBy('displayName', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedFriends: Friend[] = [];
      snapshot.forEach((doc) => {
        fetchedFriends.push(doc.data() as Friend);
      });
      setFriends(fetchedFriends);
      setLoading(false);
    }, (error) => {
      console.error('Friends snapshot error:', error);
      setFriends([]);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [currentUser?.uid]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSearchResults([]);
    try {
      const searchVal = searchQuery.trim();
      const queries = [
        query(collection(db, 'users'), where('username', '==', searchVal)),
        query(collection(db, 'users'), where('email', '==', searchVal)),
        query(collection(db, 'users'), where('phoneNumber', '==', searchVal))
      ];

      const results: UserProfile[] = [];
      const seenUids = new Set();

      for (const q of queries) {
        const snapshot = await getDocs(q);
        snapshot.forEach(doc => {
          const data = doc.data() as UserProfile;
          if (data.uid !== currentUser.uid && !seenUids.has(data.uid)) {
            results.push(data);
            seenUids.add(data.uid);
          }
        });
      }
      setSearchResults(results);
      if (results.length === 0) {
        addNotification('Pencarian', 'User tidak ditemukan.', 'system');
      }
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setSearching(false);
    }
  };

  const addFriend = async (targetUser: UserProfile) => {
    try {
      const friendData = {
        uid: targetUser.uid,
        displayName: targetUser.displayName,
        photoURL: targetUser.photoURL || '',
        username: targetUser.username || '',
        mmr: targetUser.mmr || 0,
        addedAt: serverTimestamp()
      };
      await setDoc(doc(db, 'users', currentUser.uid, 'friends', targetUser.uid), friendData);
      addNotification('Teman Ditambahkan', `${targetUser.displayName} sekarang menjadi teman Anda.`, 'achievement');
      setSearchQuery('');
      setSearchResults([]);
    } catch (err) {
      console.error('Add friend error:', err);
    }
  };

  return (
    <div className="min-h-screen bg-surface pb-32">
      <header className="ios-blur sticky top-0 w-full z-50 flex items-center px-4 h-14 border-b border-ios-gray/10">
        <button onClick={onBack} className="tap-target p-2 -ml-2">
          <ChevronLeft size={24} />
        </button>
        <h1 className="font-bold text-[17px] tracking-tight ml-2">Teman</h1>
      </header>

      <main className="max-w-2xl mx-auto p-5">
        <section className="mb-8">
          <form onSubmit={handleSearch} className="relative">
            <input
              type="text"
              placeholder="Cari username, email, atau HP..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-ios-gray/10 rounded-2xl py-4 pl-12 pr-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-ios-gray" size={20} />
            <button
              type="submit"
              disabled={searching}
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-primary text-white text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg tap-target"
            >
              {searching ? '...' : 'Cari'}
            </button>
          </form>

          {searchResults.length > 0 && (
            <div className="mt-4 space-y-3">
              <h3 className="text-[11px] font-bold text-ios-gray uppercase tracking-widest px-1">Hasil Pencarian</h3>
              {searchResults.map(res => (
                <div key={res.uid} className="bg-white border border-primary/20 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-ios-gray/10 overflow-hidden flex items-center justify-center">
                      {res.photoURL ? <img src={res.photoURL} className="w-full h-full object-cover" /> : <User size={20} className="text-ios-gray/30" />}
                    </div>
                    <div>
                      <p className="font-bold text-sm">{res.displayName}</p>
                      <p className="text-[10px] text-ios-gray font-medium">@{res.username || 'user'}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => addFriend(res)}
                    disabled={friends.some(f => f.uid === res.uid)}
                    className={cn(
                      "px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest tap-target",
                      friends.some(f => f.uid === res.uid) ? "bg-ios-gray/10 text-ios-gray" : "bg-primary text-white"
                    )}
                  >
                    {friends.some(f => f.uid === res.uid) ? 'Berteman' : 'Tambah'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <div className="flex justify-between items-center mb-4 px-1">
            <h2 className="text-xl font-bold tracking-tight">Daftar Teman</h2>
            <span className="text-xs font-bold text-ios-gray bg-ios-gray/5 px-2 py-1 rounded-lg">{friends.length} Teman</span>
          </div>

          {loading ? (
            <div className="flex justify-center py-10">
              <RefreshCw className="animate-spin text-primary/20" size={32} />
            </div>
          ) : friends.length === 0 ? (
            <div className="bg-white border border-ios-gray/10 rounded-[32px] p-12 text-center shadow-sm">
              <div className="w-20 h-20 bg-ios-gray/5 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users size={40} className="text-ios-gray/20" />
              </div>
              <h3 className="text-lg font-bold mb-2">Belum ada teman</h3>
              <p className="text-sm text-ios-gray font-medium leading-relaxed">
                Cari teman Anda menggunakan username, email, atau nomor handphone untuk mulai bermain bersama.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {friends.map(friend => (
                <div key={friend.uid} className="bg-white border border-ios-gray/10 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-ios-gray/10 overflow-hidden flex items-center justify-center">
                      {friend.photoURL ? <img src={friend.photoURL} className="w-full h-full object-cover" /> : <User size={24} className="text-ios-gray/30" />}
                    </div>
                    <div>
                      <p className="font-bold text-on-surface">{friend.displayName}</p>
                      <div className="flex items-center gap-2">
                        <RankBadge mmr={friend.mmr} size="sm" />
                        <span className="text-[10px] text-ios-gray font-bold">@{friend.username || 'user'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

const LeaderboardScreen = ({ currentUser, onChallenge }: { currentUser: any, onChallenge: (user: any) => void }) => {
  const [region, setRegion] = useState('Semua Wilayah');
  const [isRegionSelectorOpen, setIsRegionSelectorOpen] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const q = query(collection(db, 'users'), orderBy('mmr', 'desc'));
        const querySnapshot = await getDocs(q);
        const fetchedUsers: any[] = [];
        querySnapshot.forEach((doc) => {
          fetchedUsers.push(doc.data());
        });
        setUsers(fetchedUsers);
      } catch (err) {
        console.error('Error fetching leaderboard:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const filteredUsers = region === 'Semua Wilayah'
    ? users
    : users.filter(u => u.region === region);

  return (
    <div className="min-h-screen bg-surface pb-32">
      <header className="ios-blur sticky top-0 w-full z-50 px-4 h-14 border-b border-ios-gray/10 flex items-center justify-between">
        <div className="flex items-center justify-between w-full">
          <h1 className="text-[17px] font-bold tracking-tight text-on-surface">Leaderboard</h1>
          <button
            onClick={() => setIsRegionSelectorOpen(true)}
            className="bg-primary/10 text-primary px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 tap-target"
          >
            <MapPin size={14} />
            {region === 'Semua Wilayah' ? 'Filter' : region.split(',')[0]}
          </button>
        </div>
      </header>

      <RegionSelector
        isOpen={isRegionSelectorOpen}
        onClose={() => setIsRegionSelectorOpen(false)}
        onSelect={(r) => setRegion(r)}
        currentValue={region}
      />

      <main className="max-w-2xl mx-auto p-4">
        {region !== 'Semua Wilayah' && (
          <div className="flex items-center justify-between bg-primary/5 px-4 py-2 rounded-2xl mb-4 border border-primary/10">
            <div className="flex items-center gap-2">
              <MapPin size={14} className="text-primary" />
              <span className="text-xs font-bold text-primary">{region}</span>
            </div>
            <button
              onClick={() => setRegion('Semua Wilayah')}
              className="text-[10px] font-black text-primary uppercase tracking-widest bg-white px-2 py-1 rounded-lg border border-primary/20"
            >
              Reset
            </button>
          </div>
        )}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <RefreshCw className="animate-spin text-primary" size={32} />
            <p className="text-ios-gray font-bold text-sm">Memuat Peringkat...</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredUsers.map((user, index) => {
              if (!user) return null;
              return (
                <div
                  key={user.uid}
                  className={cn(
                    "bg-white border border-ios-gray/10 rounded-2xl p-4 flex items-center justify-between shadow-sm transition-all",
                    user.uid === currentUser?.uid && "ring-2 ring-primary border-transparent"
                  )}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-8 text-center font-display font-black italic text-ios-gray/40 text-lg">
                      #{index + 1}
                    </div>
                    <div className="relative">
                      <div className="w-12 h-12 rounded-xl bg-ios-gray/10 overflow-hidden flex items-center justify-center">
                        {user.photoURL ? (
                          <img src={user.photoURL} alt={user.displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <User size={24} className="text-ios-gray/30" />
                        )}
                      </div>
                      {index < 3 && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                          <Star size={10} className="text-white fill-current" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-on-surface truncate flex items-center gap-2">
                        {user.displayName}
                        {user.uid === currentUser?.uid && <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded uppercase">Anda</span>}
                      </h4>
                      <div className="flex items-center gap-2">
                        <RankBadge mmr={user.mmr || 0} size="sm" />
                        <span className="text-[10px] text-ios-gray font-bold">{user.region?.split(',')[0] || 'Jakarta'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <div className="text-right">
                      <span className="text-lg font-display font-black italic tracking-tighter text-on-surface">{(user.mmr || 0).toLocaleString()}</span>
                      <span className="text-[9px] font-bold text-ios-gray uppercase block leading-none">MMR</span>
                    </div>
                    {user.uid !== currentUser?.uid && (
                      <button
                        onClick={() => onChallenge(user)}
                        className="bg-primary/5 text-primary p-1.5 rounded-lg tap-target hover:bg-primary/10 transition-colors"
                      >
                        <MessageCircle size={18} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [screen, setScreen] = useState<Screen>('login');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [sharedMatchId, setSharedMatchId] = useState<string | null>(null);
  const [isSharedViewer, setIsSharedViewer] = useState(false);
  const [tournament, setTournament] = useState<Tournament>(INITIAL_TOURNAMENT);
  const [allPlayers, setAllPlayers] = useState<Player[]>(INITIAL_PLAYERS);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [tournaments, setTournaments] = useState<TournamentHistory[]>([]);
  const [selectedHistory, setSelectedHistory] = useState<TournamentHistory | null>(null);
  const [selectedKlasemenTournament, setSelectedKlasemenTournament] = useState<Tournament | TournamentHistory | null>(null);
  const [klasemenBackScreen, setKlasemenBackScreen] = useState<'dashboard' | 'active' | 'history-detail'>('dashboard');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shared = params.get('shared');
    if (shared) {
      setSharedMatchId(shared);
      setIsSharedViewer(true);
      setScreen('active');
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const savedPlayers = localStorage.getItem(getPlayersStorageKey(firebaseUser.uid));
        setAllPlayers(savedPlayers ? JSON.parse(savedPlayers) : INITIAL_PLAYERS);

        if (!isSharedViewer) {
          const savedTournament = localStorage.getItem(getTournamentStorageKey(firebaseUser.uid));
          setTournament(savedTournament ? JSON.parse(savedTournament) : INITIAL_TOURNAMENT);
        }

        setUser(firebaseUser);
        setIsLoggedIn(true);
        if (!isSharedViewer) {
          setScreen('dashboard');
        }

        // Fetch user data from Firestore
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUser({ ...firebaseUser, ...userData });
        } else {
          // Initialize user if not exists
          const initialData = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName || 'Pemain Padel',
            username: firebaseUser.email?.split('@')[0].replace(/[^a-zA-Z0-9]/g, '') || 'user' + Math.floor(Math.random() * 1000),
            photoURL: firebaseUser.photoURL,
            phoneNumber: '',
            mmr: 500, // Starting MMR
            region: 'Jakarta Selatan, DKI Jakarta',
            homeBase: 'Jakarta Selatan, DKI Jakarta',
            locationActivity: { 'Jakarta Selatan, DKI Jakarta': 0 },
            createdAt: serverTimestamp(),
          };
          await setDoc(userDocRef, initialData);
          setUser({ ...firebaseUser, ...initialData });
        }

        // Fetch tournaments
        try {
          const q = query(
            collection(db, 'tournaments'),
            where('userId', '==', firebaseUser.uid),
            orderBy('date', 'desc')
          );
          const querySnapshot = await getDocs(q);
          const fetchedTournaments: TournamentHistory[] = [];
          querySnapshot.forEach((doc) => {
            const data = doc.data();
            fetchedTournaments.push({
              ...data,
              id: doc.id,
              date: data.date.toDate()
            } as TournamentHistory);
          });
          setTournaments(fetchedTournaments);
        } catch (err) {
          console.error('Error fetching tournaments:', err);
        }
      } else {
        setUser(null);
        setIsLoggedIn(false);
        setAllPlayers(INITIAL_PLAYERS);
        if (!isSharedViewer) {
          setTournament(INITIAL_TOURNAMENT);
        }
        if (!isSharedViewer) {
          setScreen('login');
        } else {
          setScreen('active');
        }
        setTournaments([]);
      }
    });

    return () => unsubscribe();
  }, [isSharedViewer]);

  useEffect(() => {
    if (!sharedMatchId || !isSharedViewer) return;
    const sharedRef = doc(db, 'sharedMatches', sharedMatchId);
    const unsub = onSnapshot(sharedRef, (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      if (data?.tournament) {
        setTournament(data.tournament as Tournament);
        setScreen('active');
      }
    }, (err) => {
      console.error('Shared match subscribe error:', err);
    });
    return () => unsub();
  }, [sharedMatchId, isSharedViewer]);

  useEffect(() => {
    if (!sharedMatchId || isSharedViewer) return;
    if (!user?.uid) return;
    const sharedRef = doc(db, 'sharedMatches', sharedMatchId);
    setDoc(sharedRef, {
      tournament,
      hostUid: user.uid,
      updatedAt: serverTimestamp()
    }, { merge: true }).catch((err) => {
      console.error('Shared match sync error:', err, {
        authUid: auth.currentUser?.uid || null,
        userUid: user?.uid || null,
        sharedMatchId
      });
    });
  }, [tournament, sharedMatchId, isSharedViewer, user?.uid]);

  useEffect(() => {
    if (!user?.uid || isSharedViewer) return;
    localStorage.setItem(getPlayersStorageKey(user.uid), JSON.stringify(allPlayers));
  }, [allPlayers, user?.uid, isSharedViewer]);

  useEffect(() => {
    if (!user?.uid || isSharedViewer) return;
    localStorage.setItem(getTournamentStorageKey(user.uid), JSON.stringify(tournament));
  }, [tournament, user?.uid, isSharedViewer]);

  const addNotification = (title: string, message: string, type: AppNotification['type']) => {
    const newNotif: AppNotification = {
      id: Math.random().toString(36).substr(2, 9),
      title,
      message,
      timestamp: new Date(),
      type,
      read: false
    };
    setNotifications(prev => [newNotif, ...prev]);

    // Browser Notification
    if (Notification.permission === 'granted') {
      new Notification(title, { body: message });
    }
  };

  const handleMarkAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const handleClearAll = () => {
    setNotifications([]);
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        addNotification('Notifikasi Aktif!', 'Anda akan menerima update pertandingan di sini.', 'system');
      }
    }
  };

  const handleLogin = () => {
    setIsLoggedIn(true);
    setScreen('dashboard');
  };

  const handleOpenLiveStandings = () => {
    setSelectedKlasemenTournament(tournament);
    setKlasemenBackScreen('active');
    setScreen('klasemen');
  };

  const handleOpenHistoryFinalStandings = () => {
    if (!selectedHistory) return;
    setSelectedKlasemenTournament(selectedHistory);
    setKlasemenBackScreen('history-detail');
    setScreen('klasemen');
  };

  const handleShareCurrentMatch = async () => {
    try {
      if (!user?.uid) {
        addNotification('Perlu Login', 'Silakan login dulu untuk membagikan pertandingan.', 'system');
        return;
      }

      // Always use a fresh share id to avoid collisions with legacy/invalid docs.
      const shareId = Math.random().toString(36).slice(2, 10);
      await setDoc(doc(db, 'sharedMatches', shareId), {
        tournament,
        hostUid: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: false });
      setSharedMatchId(shareId);

      const shareUrl = new URL(window.location.href);
      shareUrl.searchParams.set('shared', shareId);
      const isLocalHost = ['localhost', '127.0.0.1'].includes(shareUrl.hostname);
      const envNetworkHost = (import.meta as any).env?.VITE_SHARE_NETWORK_HOST as string | undefined;
      const savedNetworkHost = localStorage.getItem('fom_share_network_host') || '';
      let networkHost = (envNetworkHost || savedNetworkHost).trim();

      if (isLocalHost && !networkHost) {
        const input = window.prompt(
          'Masukkan IP network agar link bisa dibuka di HP (contoh: 192.168.1.27)',
          savedNetworkHost || ''
        );
        if (input && input.trim()) {
          networkHost = input.trim();
          localStorage.setItem('fom_share_network_host', networkHost);
        }
      }

      if (isLocalHost && networkHost) {
        shareUrl.hostname = networkHost;
        shareUrl.protocol = 'http:';
      }

      const finalUrl = shareUrl.toString();

      const tryCopyToClipboard = async (text: string) => {
        try {
          if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(text);
            return true;
          }
        } catch {
          // fallback below
        }

        try {
          const ta = document.createElement('textarea');
          ta.value = text;
          ta.setAttribute('readonly', '');
          ta.style.position = 'fixed';
          ta.style.opacity = '0';
          ta.style.pointerEvents = 'none';
          document.body.appendChild(ta);
          ta.focus();
          ta.select();
          const copied = document.execCommand('copy');
          document.body.removeChild(ta);
          return copied;
        } catch {
          return false;
        }
      };

      if (navigator.share) {
        try {
          await navigator.share({
            title: `Live Match - ${tournament.name || 'FOM Play'}`,
            text: 'Pantau pertandingan ini secara live (view only).',
            url: finalUrl
          });
        } catch {
          // fallback clipboard
        }
      }

      const copied = await tryCopyToClipboard(finalUrl);
      if (copied) {
        addNotification('Link Share Siap', 'Link pertandingan berhasil disalin. Bagikan ke pemain lain.', 'system');
      } else {
        window.prompt('Copy link pertandingan ini:', finalUrl);
        addNotification('Link Share Siap', 'Clipboard diblokir browser. Link ditampilkan agar bisa disalin manual.', 'system');
      }
    } catch (err) {
      console.error('Share current match error:', err, {
        authUid: auth.currentUser?.uid || null,
        userUid: user?.uid || null
      });
      addNotification('Gagal Share', 'Tidak dapat membuat link share saat ini. Coba lagi.', 'system');
    }
  };

  const handleGenerateTournament = (settings: Tournament) => {
    const now = Date.now();
    const players = [...settings.players].filter(p => !!p);
    const rounds: Round[] = [];
    const numRounds = settings.numRounds;
    const playersPerMatch = 4;
    const maxMatchesPerRound = settings.courts;

    if (settings.format === 'Americano') {
      // Pre-generate all rounds for Americano
      // We'll use a randomized approach that tries to balance matches and partners
      const playerMatchCounts: Record<string, number> = {};
      const partnerHistory: Record<string, Set<string>> = {};
      players.forEach(p => {
        if (p && p.id) {
          playerMatchCounts[p.id] = 0;
          partnerHistory[p.id] = new Set();
        }
      });

      for (let r = 1; r <= numRounds; r++) {
        // Sort players by match count to prioritize those who played less
        const sortedPlayers = [...players].sort((a, b) => {
          if (!a || !b) return 0;
          return (playerMatchCounts[a.id] || 0) - (playerMatchCounts[b.id] || 0);
        });
        const roundMatches: Match[] = [];
        const playersNeeded = Math.min(Math.floor(players.length / 4) * 4, maxMatchesPerRound * 4);
        const playersInRound = sortedPlayers.slice(0, playersNeeded);
        const playersBye = sortedPlayers.slice(playersNeeded);

        // Shuffle players in round to randomize pairings among those with same match count
        const shuffled = [...playersInRound].sort(() => Math.random() - 0.5);

        for (let m = 0; m < playersNeeded / 4; m++) {
          const p1 = shuffled[m * 4];
          const p2 = shuffled[m * 4 + 1];
          const p3 = shuffled[m * 4 + 2];
          const p4 = shuffled[m * 4 + 3];

          roundMatches.push({
            id: `r${r}-m${m + 1}`,
            court: m + 1,
            roundId: r,
            status: r === 1 ? 'active' : 'pending',
            startedAt: r === 1 ? now : undefined,
            teamA: { players: [p1, p2], score: 0 },
            teamB: { players: [p3, p4], score: 0 }
          });

          // Update history
          [p1, p2, p3, p4].forEach(p => {
            if (p && p.id) {
              playerMatchCounts[p.id]++;
            }
          });
          if (p1 && p2) { partnerHistory[p1.id].add(p2.id); partnerHistory[p2.id].add(p1.id); }
          if (p3 && p4) { partnerHistory[p3.id].add(p4.id); partnerHistory[p4.id].add(p3.id); }
        }

        rounds.push({
          id: r,
          matches: roundMatches,
          playersBye
        });
      }
    } else if (settings.format === 'Mexicano') {
      // Only generate the first round for Mexicano
      const shuffled = [...players].sort(() => Math.random() - 0.5);
      const roundMatches: Match[] = [];
      const playersNeeded = Math.min(Math.floor(players.length / 4) * 4, maxMatchesPerRound * 4);
      const playersInRound = shuffled.slice(0, playersNeeded);
      const playersBye = shuffled.slice(playersNeeded);

      for (let m = 0; m < playersNeeded / 4; m++) {
        roundMatches.push({
          id: `r1-m${m + 1}`,
          court: m + 1,
          roundId: 1,
          status: 'active',
          startedAt: now,
          teamA: { players: [playersInRound[m * 4], playersInRound[m * 4 + 1]], score: 0 },
          teamB: { players: [playersInRound[m * 4 + 2], playersInRound[m * 4 + 3]], score: 0 }
        });
      }

      rounds.push({
        id: 1,
        matches: roundMatches,
        playersBye
      });
    } else if (settings.format === 'Match Play') {
      // Match Play (Traditional Sets/Games)
      const shuffled = [...players].sort(() => Math.random() - 0.5);
      const roundMatches: Match[] = [];
      const playersNeeded = Math.min(Math.floor(players.length / 4) * 4, maxMatchesPerRound * 4);
      const playersInRound = shuffled.slice(0, playersNeeded);
      const playersBye = shuffled.slice(playersNeeded);

      for (let m = 0; m < playersNeeded / 4; m++) {
        roundMatches.push({
          id: `r1-m${m + 1}`,
          court: m + 1,
          roundId: 1,
          status: 'active',
          startedAt: now,
          teamA: { players: [playersInRound[m * 4], playersInRound[m * 4 + 1]], score: 0, sets: [0] },
          teamB: { players: [playersInRound[m * 4 + 2], playersInRound[m * 4 + 3]], score: 0, sets: [0] },
          currentSet: 0,
          pointsA: '0',
          pointsB: '0'
        });
      }

      rounds.push({
        id: 1,
        matches: roundMatches,
        playersBye
      });
    }

    setTournament({ ...settings, rounds, startedAt: now });
    addNotification('Turnamen Dimulai!', `Turnamen ${settings.name} telah dibuat dengan ${settings.players.length} pemain.`, 'tournament');

    // Send notifications to friends/players
    if (user) {
      settings.players.forEach(async (player) => {
        if (player.id !== user.uid) {
          try {
            const notifId = Math.random().toString(36).substr(2, 9);
            await setDoc(doc(db, 'users', player.id, 'notifications', notifId), {
              id: notifId,
              title: 'Undangan Pertandingan',
              message: `${user.displayName} mengundang Anda ke pertandingan "${settings.name}".`,
              timestamp: serverTimestamp(),
              type: 'tournament',
              read: false
            });
          } catch (err) {
            // Probably not a real user ID or permission denied
            console.log('Skipping notification for non-user player:', player.name);
          }
        }
      });
    }

    setScreen('preview');
  };

  const handleUpdateScore = (matchId: string, team: 'A' | 'B', score: number) => {
    setTournament(prev => {
      const newRounds = prev.rounds.map(round => ({
        ...round,
        matches: round.matches.map(match => {
          if (match.id === matchId) {
            return {
              ...match,
              teamA: { ...match.teamA, score: team === 'A' ? score : match.teamA.score },
              teamB: { ...match.teamB, score: team === 'B' ? score : match.teamB.score }
            };
          }
          return match;
        })
      }));
      return { ...prev, rounds: newRounds };
    });
  };

  const handleNextRound = () => {
    const now = Date.now();
    if (!tournament.rounds) return;
    const currentRoundIndex = tournament.rounds.findIndex(r => r && r.matches && r.matches.some(m => m && m.status === 'active'));
    const nextRoundId = currentRoundIndex + 2;

    if (currentRoundIndex === tournament.numRounds - 1) {
      // Tournament finished - mark last round as completed
      setTournament(prev => {
        const newRounds = prev.rounds.map((round, idx) => {
          if (idx === currentRoundIndex) {
            return {
              ...round,
              matches: round.matches.map(m => m ? ({
                ...m,
                status: 'completed' as const,
                duration: m.startedAt ? formatDurationFromMs(now - m.startedAt) : (m.duration || '00:00')
              }) : m)
            };
          }
          return round;
        });
        return { ...prev, rounds: newRounds };
      });
      addNotification('Turnamen Selesai!', `Selamat kepada para pemenang turnamen ${tournament.name}!`, 'achievement');

      // Save tournament to history
      if (user) {
        // Calculate MMR Change for the user
        const userInTournament = tournament.players?.find(p => p && p.name === user.displayName);
        let mmrChange = 0;

        if (userInTournament) {
          tournament.rounds.forEach(round => {
            if (!round || !round.matches) return;
            round.matches.forEach(match => {
              if (!match || !match.teamA || !match.teamB) return;
              const isTeamA = match.teamA.players?.some(p => p && p.id === userInTournament.id);
              const isTeamB = match.teamB.players?.some(p => p && p.id === userInTournament.id);

              if (isTeamA || isTeamB) {
                const userScore = isTeamA ? match.teamA.score : match.teamB.score;
                const opponentScore = isTeamA ? match.teamB.score : match.teamA.score;
                const isWin = userScore > opponentScore;
                const scoreDiff = Math.abs(userScore - opponentScore);

                // For now, assume neutral underdog/favorite status as we don't have other players' MMRs
                mmrChange += calculateMMRChange(isWin, scoreDiff, false, false);
              }
            });
          });

          // Update user MMR and Location Activity in Firestore
          const newMMR = Math.max(0, (user.mmr || 0) + mmrChange);

          // Dynamic Origin Logic
          const locationActivity = { ...(user.locationActivity || {}) };
          if (tournament.location) {
            locationActivity[tournament.location] = (locationActivity[tournament.location] || 0) + 1;
          }

          // Find most frequent location
          let mostFrequentLocation = user.region || tournament.location || '';
          let maxCount = 0;
          Object.entries(locationActivity).forEach(([loc, count]) => {
            const c = count as number;
            if (c > maxCount) {
              maxCount = c;
              mostFrequentLocation = loc;
            }
          });

          // Update region if threshold met (e.g. 3 games) or if it's the first few games
          const newRegion = maxCount >= 3 ? mostFrequentLocation : (user.region || tournament.location || '');

          const updatedUserData = {
            mmr: newMMR,
            locationActivity,
            region: newRegion
          };

          setUser(prev => ({ ...prev, ...updatedUserData }));
          setDoc(doc(db, 'users', user.uid), updatedUserData, { merge: true })
            .catch(err => console.error('Error updating user stats:', err));

          addNotification(
            'Statistik Terupdate!',
            `MMR: ${newMMR} (${mmrChange >= 0 ? '+' : ''}${mmrChange}). Wilayah Aktif: ${newRegion.split(',')[0]}.`,
            'achievement'
          );
        }

        const historyItem: TournamentHistory = {
          id: Math.random().toString(36).substr(2, 9),
          userId: user.uid,
          name: tournament.name,
          format: tournament.format,
          date: new Date(),
          numRounds: tournament.numRounds,
          numPlayers: tournament.players.length,
          rounds: tournament.rounds,
          players: tournament.players,
          venueName: tournament.venueName,
          location: tournament.location
        };

        setTournaments(prev => [historyItem, ...prev]);

        setDoc(doc(db, 'tournaments', historyItem.id), {
          ...historyItem,
          date: serverTimestamp()
        }).catch(err => console.error('Error saving tournament:', err));
      }

      setSelectedKlasemenTournament({
        ...tournament,
        rounds: tournament.rounds.map((round, idx) => idx === currentRoundIndex ? {
          ...round,
          matches: round.matches.map(m => m ? ({
            ...m,
            status: 'completed' as const,
            duration: m.startedAt ? formatDurationFromMs(now - m.startedAt) : (m.duration || '00:00')
          }) : m)
        } : round)
      });
      setKlasemenBackScreen('dashboard');
      setScreen('klasemen');
      return;
    }

    if (tournament.format === 'Mexicano') {
      // Generate next round for Mexicano based on current standings
      // Calculate current leaderboard
      const playerStatsMap: Record<string, { id: string, w: number, pointsDiff: number, totalPoints: number, matchCount: number }> = {};
      tournament.players.forEach(p => {
        playerStatsMap[p.id] = { id: p.id, w: 0, pointsDiff: 0, totalPoints: 0, matchCount: 0 };
      });

      tournament.rounds.forEach(round => {
        round.matches.forEach(match => {
          // Include the current round which is about to be marked as completed
          const isCurrentRound = match.roundId === currentRoundIndex + 1;
          if (match.status === 'completed' || isCurrentRound) {
            const scoreA = match.teamA.score;
            const scoreB = match.teamB.score;
            match.teamA.players.forEach(p => {
              const s = playerStatsMap[p.id];
              s.totalPoints += scoreA;
              s.pointsDiff += (scoreA - scoreB);
              if (scoreA > scoreB) s.w++;
              s.matchCount++;
            });
            match.teamB.players.forEach(p => {
              const s = playerStatsMap[p.id];
              s.totalPoints += scoreB;
              s.pointsDiff += (scoreB - scoreA);
              if (scoreB > scoreA) s.w++;
              s.matchCount++;
            });
          }
        });
      });

      const sortedPlayers = [...tournament.players].sort((a, b) => {
        const statsA = playerStatsMap[a.id];
        const statsB = playerStatsMap[b.id];
        if (tournament.criteria === 'Matches Won') {
          if (statsB.w !== statsA.w) return statsB.w - statsA.w;
        } else {
          if (statsB.totalPoints !== statsA.totalPoints) return statsB.totalPoints - statsA.totalPoints;
        }
        return statsB.pointsDiff - statsA.pointsDiff;
      });

      const roundMatches: Match[] = [];
      const playersNeeded = Math.min(Math.floor(sortedPlayers.length / 4) * 4, tournament.courts * 4);
      const playersInRound = sortedPlayers.slice(0, playersNeeded);
      const playersBye = sortedPlayers.slice(playersNeeded);

      for (let m = 0; m < playersNeeded / 4; m++) {
        // Mexicano pairing: 1&4 vs 2&3 within each group of 4
        const p1 = playersInRound[m * 4];
        const p2 = playersInRound[m * 4 + 1];
        const p3 = playersInRound[m * 4 + 2];
        const p4 = playersInRound[m * 4 + 3];

        roundMatches.push({
          id: `r${nextRoundId}-m${m + 1}`,
          court: m + 1,
          roundId: nextRoundId,
          status: 'active',
          startedAt: now,
          teamA: { players: [p1, p4], score: 0, sets: [0] },
          teamB: { players: [p2, p3], score: 0, sets: [0] },
          currentSet: 0,
          pointsA: '0',
          pointsB: '0'
        });
      }

      setTournament(prev => {
        const newRounds = prev.rounds.map((round, idx) => {
          if (idx === currentRoundIndex) {
            return {
              ...round,
              matches: round.matches.map(m => ({
                ...m,
                status: 'completed' as const,
                duration: m.startedAt ? formatDurationFromMs(now - m.startedAt) : (m.duration || '00:00')
              }))
            };
          }
          return round;
        });
        newRounds.push({
          id: nextRoundId,
          matches: roundMatches,
          playersBye
        });
        return { ...prev, rounds: newRounds };
      });
    } else if (tournament.format === 'Match Play') {
      // Generate next round for Match Play (randomized like Americano but with tennis scoring)
      const shuffled = [...tournament.players].sort(() => Math.random() - 0.5);
      const roundMatches: Match[] = [];
      const playersNeeded = Math.min(Math.floor(shuffled.length / 4) * 4, tournament.courts * 4);
      const playersInRound = shuffled.slice(0, playersNeeded);
      const playersBye = shuffled.slice(playersNeeded);

      for (let m = 0; m < playersNeeded / 4; m++) {
        roundMatches.push({
          id: `r${nextRoundId}-m${m + 1}`,
          court: m + 1,
          roundId: nextRoundId,
          status: 'active',
          startedAt: now,
          teamA: { players: [playersInRound[m * 4], playersInRound[m * 4 + 1]], score: 0, sets: [0] },
          teamB: { players: [playersInRound[m * 4 + 2], playersInRound[m * 4 + 3]], score: 0, sets: [0] },
          currentSet: 0,
          pointsA: '0',
          pointsB: '0'
        });
      }

      setTournament(prev => {
        const newRounds = prev.rounds.map((round, idx) => {
          if (idx === currentRoundIndex) {
            return {
              ...round,
              matches: round.matches.map(m => ({
                ...m,
                status: 'completed' as const,
                duration: m.startedAt ? formatDurationFromMs(now - m.startedAt) : (m.duration || '00:00')
              }))
            };
          }
          return round;
        });
        newRounds.push({
          id: nextRoundId,
          matches: roundMatches,
          playersBye
        });
        return { ...prev, rounds: newRounds };
      });
    } else {
      // Americano or Match Play (pre-generated or simple next)
      setTournament(prev => {
        const newRounds = prev.rounds.map((round, idx) => {
          if (idx === currentRoundIndex) {
            return {
              ...round,
              matches: round.matches.map(m => ({
                ...m,
                status: 'completed' as const,
                duration: m.startedAt ? formatDurationFromMs(now - m.startedAt) : (m.duration || '00:00')
              }))
            };
          }
          if (idx === currentRoundIndex + 1) {
            return { ...round, matches: round.matches.map(m => ({ ...m, status: 'active' as const, startedAt: m.startedAt || now })) };
          }
          return round;
        });
        return { ...prev, rounds: newRounds };
      });
    }
    addNotification('Ronde Baru!', `Ronde ${nextRoundId} telah dimulai. Cek jadwal pertandingan Anda.`, 'match');
  };

  const handleUpdateMatchPlayScore = (matchId: string, team: 'A' | 'B') => {
    setTournament(prev => {
      const newRounds = prev.rounds.map(round => {
        const isMatchInRound = round.matches.some(m => m.id === matchId);
        if (!isMatchInRound) return round;

        const newMatches = round.matches.map(match => {
          if (match.id === matchId) {
            const scoringType = prev.scoringType || 'Golden Point';
            let pA = match.pointsA || '0';
            let pB = match.pointsB || '0';
            let gamesA = [...(match.teamA.sets || [0])];
            let gamesB = [...(match.teamB.sets || [0])];
            let currentSet = match.currentSet || 0;

            const tennisPoints = ['0', '15', '30', '40', 'Game'];

            if (team === 'A') {
              if (pA === '0') pA = '15';
              else if (pA === '15') pA = '30';
              else if (pA === '30') pA = '40';
              else if (pA === '40') {
                if (pB === '40') {
                  if (scoringType === 'Golden Point') {
                    pA = 'Game';
                  } else {
                    pA = 'Ad';
                  }
                } else if (pB === 'Ad') {
                  pB = '40';
                } else {
                  pA = 'Game';
                }
              } else if (pA === 'Ad') {
                pA = 'Game';
              }
            } else {
              if (pB === '0') pB = '15';
              else if (pB === '15') pB = '30';
              else if (pB === '30') pB = '40';
              else if (pB === '40') {
                if (pA === '40') {
                  if (scoringType === 'Golden Point') {
                    pB = 'Game';
                  } else {
                    pB = 'Ad';
                  }
                } else if (pA === 'Ad') {
                  pA = '40';
                } else {
                  pB = 'Game';
                }
              } else if (pB === 'Ad') {
                pB = 'Game';
              }
            }

            // Check if game won
            if (pA === 'Game') {
              gamesA[currentSet]++;
              pA = '0';
              pB = '0';
            } else if (pB === 'Game') {
              gamesB[currentSet]++;
              pA = '0';
              pB = '0';
            }

            // Check if set won (simplified: first to 6 games)
            if (gamesA[currentSet] >= 6 && gamesA[currentSet] - gamesB[currentSet] >= 2) {
              addNotification('Set Selesai!', `Team A memenangkan set ${currentSet + 1} dengan skor ${gamesA[currentSet]} - ${gamesB[currentSet]}`, 'achievement');
              // For now, we just keep it in one set or could start a new one
            } else if (gamesB[currentSet] >= 6 && gamesB[currentSet] - gamesA[currentSet] >= 2) {
              addNotification('Set Selesai!', `Team B memenangkan set ${currentSet + 1} dengan skor ${gamesB[currentSet]} - ${gamesA[currentSet]}`, 'achievement');
            } else if (gamesA[currentSet] === 6 && gamesB[currentSet] === 6) {
              // Tie-break logic could go here, but let's keep it simple for now
            }

            return {
              ...match,
              pointsA: pA,
              pointsB: pB,
              teamA: { ...match.teamA, sets: gamesA, score: gamesA.reduce((a, b) => a + b, 0) },
              teamB: { ...match.teamB, sets: gamesB, score: gamesB.reduce((a, b) => a + b, 0) }
            };
          }
          return match;
        });
        return { ...round, matches: newMatches };
      });
      return { ...prev, rounds: newRounds };
    });
  };

  const handleSwapPlayer = (matchId: string, team: 'A' | 'B', playerIndex: number, newPlayer: Player) => {
    setTournament(prev => {
      const newRounds = prev.rounds.map(round => {
        const isMatchInRound = round.matches.some(m => m.id === matchId);
        if (!isMatchInRound) return round;

        let oldPlayer: Player | null = null;
        const newMatches = round.matches.map(match => {
          if (match.id === matchId) {
            const players = team === 'A' ? [...match.teamA.players] : [...match.teamB.players];
            oldPlayer = players[playerIndex];
            players[playerIndex] = newPlayer;
            return {
              ...match,
              teamA: team === 'A' ? { ...match.teamA, players } : match.teamA,
              teamB: team === 'B' ? { ...match.teamB, players } : match.teamB
            };
          }
          return match;
        });

        // If the new player was in the bye list, swap them with the old player
        const newPlayersBye = round.playersBye.map(p => p.id === newPlayer.id ? oldPlayer! : p);

        return { ...round, matches: newMatches, playersBye: newPlayersBye };
      });
      return { ...prev, rounds: newRounds };
    });
    addNotification('Pemain Diganti', `Pemain telah diganti di lapangan pertandingan.`, 'system');
  };

  return (
    <div className="min-h-screen bg-white">
      <div>
        {screen === 'login' && <LoginScreen onLogin={handleLogin} />}
        {screen === 'dashboard' && (
          <DashboardScreen
            onStartMatch={() => setScreen('settings')}
            onViewRank={() => setScreen('rank-discovery')}
            tournament={tournament}
            onContinueMatch={() => setScreen('active')}
            onNotifications={() => setScreen('notifications')}
            onViewHistory={(t) => {
              setSelectedHistory(t);
              setScreen('history-detail');
            }}
            unreadCount={notifications.filter(n => !n.read).length}
            tournaments={tournaments}
            user={user}
            addNotification={addNotification}
          />
        )}
        {screen === 'leaderboard' && (
          <LeaderboardScreen
            currentUser={user}
            onChallenge={(targetUser) => {
              addNotification(
                'Tantangan Terkirim!',
                `Anda telah mengajak ${targetUser.displayName} untuk sparing. Tunggu konfirmasi mereka.`,
                'system'
              );
            }}
          />
        )}
        {screen === 'rank-discovery' && (
          <RankDiscoveryScreen onBack={() => setScreen('dashboard')} />
        )}
        {screen === 'history-detail' && selectedHistory && (
          <HistoryDetailScreen
            tournament={selectedHistory}
            onBack={() => setScreen('dashboard')}
            onViewFinalStandings={handleOpenHistoryFinalStandings}
          />
        )}
        {screen === 'settings' && (
          <MatchSettingsScreen
            onBack={() => setScreen('dashboard')}
            onGenerate={handleGenerateTournament}
            tournament={tournament}
            setTournament={setTournament}
            allPlayers={allPlayers}
            setAllPlayers={setAllPlayers}
            onAddNotification={addNotification}
            currentUser={user}
          />
        )}
        {screen === 'preview' && (
          <MatchPreviewScreen
            onBack={() => setScreen('settings')}
            onConfirm={() => setScreen('active')}
            tournament={tournament}
          />
        )}
        {screen === 'active' && (
          <MatchActiveScreen
            onBack={() => setScreen('dashboard')}
            tournament={tournament}
            onUpdateScore={handleUpdateScore}
            onNextRound={handleNextRound}
            onOpenStandings={handleOpenLiveStandings}
            onSwapPlayer={handleSwapPlayer}
            onUpdateMatchPlayScore={handleUpdateMatchPlayScore}
            onShareMatch={handleShareCurrentMatch}
            isReadOnly={isSharedViewer}
          />
        )}
        {screen === 'klasemen' && (
          <KlasemenScreen
            tournament={klasemenBackScreen === 'active' ? tournament : (selectedKlasemenTournament || tournament)}
            onBack={() => setScreen(klasemenBackScreen)}
          />
        )}
        {screen === 'notifications' && (
          <NotificationsScreen
            notifications={notifications}
            onMarkAsRead={handleMarkAsRead}
            onClearAll={handleClearAll}
            onBack={() => setScreen('dashboard')}
          />
        )}
        {screen === 'profile' && (
          <ProfileScreen
            onLogout={async () => {
              try {
                await signOut(auth);
              } catch (err) {
                console.error('Logout error:', err);
              }
            }}
            onRequestPermission={requestNotificationPermission}
            user={user}
            tournaments={tournaments}
            setUser={setUser}
            onViewHistory={(t) => {
              setSelectedHistory(t);
              setScreen('history-detail');
            }}
            addNotification={addNotification}
            onFriends={() => setScreen('friends')}
          />
        )}
        {screen === 'friends' && (
          <FriendsScreen
            currentUser={user}
            onBack={() => setScreen('profile')}
            addNotification={addNotification}
          />
        )}
      </div>

      {isLoggedIn && !isSharedViewer && screen !== 'login' && screen !== 'settings' && screen !== 'preview' && screen !== 'history-detail' && screen !== 'rank-discovery' && screen !== 'klasemen' && (
        <BottomNav
          currentScreen={screen}
          setScreen={setScreen}
          unreadCount={notifications.filter(n => !n.read).length}
          currentFormat={tournament.format}
          hasActiveGame={Boolean(tournament.rounds?.some(r => r.matches?.some(m => m.status === 'active')))}
        />
      )}
    </div>
  );
}
