import React, { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { Eye, EyeOff, Lock, Mail, User } from 'lucide-react';
import {
  createUserWithEmailAndPassword,
  fetchSignInMethodsForEmail,
  sendPasswordResetEmail,
  signInWithPopup,
  signInWithEmailAndPassword,
  updateProfile,
  type AuthProvider
} from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db, appleProvider, googleProvider } from '../../firebase';
import { cn } from '../../lib/utils';
import { USERS_COLLECTION } from '../../services/firestoreCollections';
import {
  getPasswordResetActionSettings,
  getProviderLabel,
  getSocialAuthBrowserWarning,
  withTimeout
} from './authUtils';

export const LoginScreen = () => {
  const [mode, setMode] = useState<'masuk' | 'daftar' | 'forgot'>('masuk');
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);

  const changeMode = (nextMode: 'masuk' | 'daftar' | 'forgot') => {
    setMode(nextMode);
    setError('');
    setNotice('');
  };

  const handleAuthError = (err: any) => {
    console.error(err);
    if (err.code === 'auth/user-not-found') setError('This email is not registered.');
    else if (err.code === 'auth/wrong-password') setError('Incorrect password.');
    else if (err.code === 'auth/email-already-in-use') setError('This email is already in use.');
    else if (err.code === 'auth/invalid-email') setError('Please enter a valid email address.');
    else if (err.code === 'auth/weak-password') setError('Password is too weak.');
    else if (err.code === 'auth/operation-not-allowed') setError('This login method is not enabled in Firebase Console.');
    else if (err.code === 'auth/network-request-failed') setError('Network issue detected. Please try again.');
    else if (err.code === 'auth/too-many-requests') setError('Too many attempts. Please wait and try again.');
    else if (err.code === 'auth/popup-blocked') setError('Login popup was blocked. Please allow popups and try again.');
    else if (err.code === 'auth/popup-closed-by-user') setError('Login was canceled before completion.');
    else if (err.code === 'auth/missing-initial-state') setError('Social login could not be completed because this browser lost the temporary login state. If you opened FOM Play from an installed app or in-app browser, reopen it in Chrome or Safari, or use email login.');
    else if (err.code === 'auth/unauthorized-domain') setError('This domain is not authorized in Firebase Authentication.');
    else if (err.code === 'auth/account-exists-with-different-credential') setError('This email is linked to another sign-in method.');
    else if (err.message?.includes('timed out')) setError('Authentication is taking too long. Please check your connection and try again.');
    else setError('Something went wrong. Please try again.');
  };

  const handleLogin = async () => {
    const sanitizedEmail = email.trim().toLowerCase();
    if (!sanitizedEmail || !password) {
      setError('Email and password are required.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      await withTimeout(
        signInWithEmailAndPassword(auth, sanitizedEmail, password),
        15000,
        'Email login'
      );
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
      setError('Full name is required.');
      return;
    }
    if (!sanitizedEmail) {
      setError('Email is required.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const userCredential = await withTimeout(
        createUserWithEmailAndPassword(auth, sanitizedEmail, password),
        15000,
        'Email registration'
      );
      await updateProfile(userCredential.user, { displayName: sanitizedName });

      try {
        await withTimeout(setDoc(doc(db, USERS_COLLECTION, userCredential.user.uid), {
          uid: userCredential.user.uid,
          email: userCredential.user.email || sanitizedEmail,
          displayName: sanitizedName,
          mmr: 0,
          totalMatches: 0,
          region: 'Jakarta Selatan, DKI Jakarta',
          homeBase: 'Jakarta Selatan, DKI Jakarta',
          locationActivity: { 'Jakarta Selatan, DKI Jakarta': 0 },
          createdAt: serverTimestamp(),
        }, { merge: true }), 8000, 'Register profile sync');
      } catch (profileErr) {
        console.error('Register profile sync error:', profileErr);
      }
    } catch (err) {
      handleAuthError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSocialAuth = async (provider: AuthProvider, providerName: 'Google' | 'Apple') => {
    setError('');
    setLoading(true);
    try {
      const browserWarning = socialAuthWarning;
      if (browserWarning) {
        setError(browserWarning);
        return;
      }

      await withTimeout(
        signInWithPopup(auth, provider),
        15000,
        `${providerName} login`
      );
    } catch (err) {
      const authCode = (err as { code?: string })?.code;
      if (
        authCode === 'auth/popup-blocked' ||
        authCode === 'auth/cancelled-popup-request' ||
        authCode === 'auth/operation-not-supported-in-this-environment'
      ) {
        setError(`${providerName} login could not open in this browser. Please open FOM Play in Chrome or Safari, or use email login.`);
        return;
      }

      handleAuthError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => handleSocialAuth(googleProvider, 'Google');
  const handleAppleLogin = async () => handleSocialAuth(appleProvider, 'Apple');

  const handleForgotPassword = async () => {
    const sanitizedEmail = email.trim().toLowerCase();
    if (!sanitizedEmail) {
      setError('Please enter your email first.');
      return;
    }
    setNotice('');
    setError('');
    setLoading(true);
    try {
      const signInMethods = await fetchSignInMethodsForEmail(auth, sanitizedEmail).catch(() => []);
      if (signInMethods.length > 0 && !signInMethods.includes('password')) {
        setError(`This account uses ${getProviderLabel(signInMethods[0])}. Please sign in with that method instead.`);
        return;
      }

      await withTimeout(
        sendPasswordResetEmail(auth, sanitizedEmail, getPasswordResetActionSettings()),
        15000,
        'Password reset'
      );
      setMode('masuk');
      setNotice(`We sent a reset link to ${sanitizedEmail}. Please check your inbox, spam, or promotions.`);
    } catch (err) {
      handleAuthError(err);
    } finally {
      setLoading(false);
    }
  };

  const showAppleLogin = useMemo(() => {
    if (typeof navigator === 'undefined') return false;
    const ua = navigator.userAgent.toLowerCase();
    const platform = (navigator.platform || '').toLowerCase();
    const vendor = (navigator.vendor || '').toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(ua) || ['iphone', 'ipad', 'ipod'].includes(platform);
    if (isIOS) return false;
    return /macintosh|mac os x/.test(ua) || platform.includes('mac') || vendor.includes('apple');
  }, []);
  const socialAuthWarning = useMemo(() => getSocialAuthBrowserWarning(), []);

  const socialCta = mode === 'daftar' ? 'Sign up with' : 'Continue with';
  const isLoginMode = mode === 'masuk';
  const authHeading = mode === 'daftar'
    ? 'Create your account'
    : mode === 'forgot'
      ? 'Reset your password'
      : 'Make every match count.\nBuild your MMR with every win.';
  const authSubtitle = mode === 'daftar'
    ? 'Build your player profile and start climbing the leaderboard.'
    : mode === 'forgot'
      ? 'Use the email tied to your account. If you signed in with Google or Apple, continue with that provider instead.'
      : '';
  const modePrompt = mode === 'daftar'
    ? 'Already have an account?'
    : "Don't have an account?";
  const modePromptAction = mode === 'daftar' ? 'Sign in' : 'Sign up';
  const inputBaseClass = 'w-full h-[68px] rounded-full border border-black/16 bg-white px-16 pr-5 text-[15px] font-medium tracking-[-0.015em] text-on-surface shadow-[0_1px_2px_rgba(15,23,42,0.04)] outline-none transition-all placeholder:font-normal placeholder:text-on-surface/40 focus:border-primary/45 focus:ring-2 focus:ring-primary/12';
  const passwordFieldClass = `${inputBaseClass} pr-16`;
  const fieldIconClass = 'pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-ios-gray/80';
  const sectionWidthClass = 'mx-auto w-full max-w-[360px]';

  useLayoutEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const root = document.getElementById('root');
    html.classList.remove('app-loading');
    body.classList.remove('app-loading');
    root?.classList.remove('app-loading');
    html.style.backgroundColor = '#ffffff';
    body.style.backgroundColor = '#ffffff';
  }, []);

  useEffect(() => {
    if (!error && !notice) return;
    const timer = window.setTimeout(() => {
      setError('');
      setNotice('');
    }, 12000);
    return () => window.clearTimeout(timer);
  }, [error, notice]);

  return (
    <div
      className="relative min-h-screen overflow-hidden bg-white px-6"
      style={{
        paddingTop: 'calc(var(--app-safe-top, 0px) + 16px)',
        paddingBottom: 'calc(var(--app-safe-bottom, 0px) + 16px)'
      }}
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-white" />

      <div className="relative mx-auto flex min-h-[calc(100dvh-var(--app-safe-top,0px)-var(--app-safe-bottom,0px)-32px)] w-full max-w-sm flex-col">
        <main className="flex flex-1 flex-col justify-center py-8">
          <header className={cn(sectionWidthClass, 'text-center', isLoginMode ? 'space-y-5' : 'space-y-3')}>
            <img
              src="/assets/fom-play-logo-light-cropped.png"
              alt="FOM Play"
              className={cn('mx-auto object-contain', isLoginMode ? 'h-14 w-[228px]' : 'h-12 w-[196px]')}
              loading="eager"
              decoding="async"
            />
            {isLoginMode && (
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-primary/82">
                Welcome Back
              </p>
            )}
            <h1 className={cn(
              'font-display tracking-tight text-on-surface whitespace-pre-line',
              isLoginMode ? 'mx-auto max-w-[332px] text-[20px] font-bold leading-[1.46] text-on-surface' : 'text-[30px] leading-[1.08] font-extrabold'
            )}>
              {authHeading}
            </h1>
            {authSubtitle ? (
              <p className="mx-auto max-w-[300px] text-[14px] font-medium leading-[1.6] text-ios-gray">
                {authSubtitle}
              </p>
            ) : null}
          </header>

          <section className={cn(sectionWidthClass, 'space-y-4', isLoginMode ? 'mt-12' : 'mt-8')}>
            {notice && (
              <div className="rounded-[24px] border border-primary/14 bg-primary/8 px-4 py-3 text-center text-[12px] font-semibold text-primary shadow-[0_10px_30px_rgba(230,94,20,0.08)]">
                {notice}
              </div>
            )}
            {error && (
              <div className="rounded-[24px] border border-error/20 bg-error/10 px-4 py-3 text-center text-[12px] font-semibold text-error shadow-[0_10px_30px_rgba(255,59,48,0.08)]">
                {error}
              </div>
            )}

            <div className="space-y-4">
              {mode === 'daftar' && (
                <div className="relative">
                  <User size={22} className={fieldIconClass} />
                  <input
                    value={name}
                    onChange={(event) => {
                      setName(event.target.value);
                      if (error) setError('');
                      if (notice) setNotice('');
                    }}
                    className={inputBaseClass}
                    placeholder="Full name"
                    type="text"
                  />
                </div>
              )}

              <div className="relative">
                <Mail size={22} className={fieldIconClass} />
                <input
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    if (error) setError('');
                    if (notice) setNotice('');
                  }}
                  className={inputBaseClass}
                  placeholder="Email"
                  type="email"
                />
              </div>

              {(mode === 'masuk' || mode === 'daftar') && (
                <div className="relative">
                  <Lock size={22} className={fieldIconClass} />
                  <input
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value);
                      if (error) setError('');
                      if (notice) setNotice('');
                    }}
                    className={passwordFieldClass}
                    placeholder="Password"
                    type={showPassword ? 'text' : 'password'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-5 top-1/2 -translate-y-1/2 text-ios-gray/80 transition-colors hover:text-on-surface"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={22} /> : <Eye size={22} />}
                  </button>
                </div>
              )}

              <div className="pt-2">
                <button
                  onClick={mode === 'masuk' ? handleLogin : mode === 'daftar' ? handleRegister : handleForgotPassword}
                  disabled={loading}
                  className="w-full rounded-full bg-primary px-6 py-[18px] text-[17px] font-bold tracking-tight text-white shadow-[0_8px_18px_rgba(230,94,20,0.24)] transition-all active:scale-[0.985] disabled:opacity-60 disabled:active:scale-100"
                >
                  {loading ? 'Please wait...' : mode === 'masuk' ? 'Login' : mode === 'daftar' ? 'Sign up' : 'Send reset link'}
                </button>
              </div>

              {mode === 'masuk' && (
                <div className="flex justify-center pt-2">
                  <button
                    onClick={() => changeMode('forgot')}
                    className="text-[14px] font-semibold tracking-tight text-primary transition-colors hover:text-primary/80"
                  >
                    Forgot Password?
                  </button>
                </div>
              )}

              {(mode === 'masuk' || mode === 'daftar') && (
                <div className="space-y-4 pt-4">
                  <div className="flex items-center gap-4">
                    <div className="h-px flex-1 bg-black/8" />
                    <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-ios-gray/60">
                      OR
                    </p>
                    <div className="h-px flex-1 bg-black/8" />
                  </div>
                  <div className="space-y-3">
                    <button
                      onClick={handleGoogleLogin}
                      disabled={loading || Boolean(socialAuthWarning)}
                      aria-label={`${socialCta} Google`}
                      className="flex h-[62px] w-full items-center justify-center gap-3 rounded-full border border-black/8 bg-white px-6 text-[15px] font-semibold tracking-tight text-on-surface shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all active:scale-[0.985] disabled:opacity-45"
                    >
                      <img src="https://www.google.com/favicon.ico" alt="Google" className="h-6 w-6" />
                      <span>{socialCta} Google</span>
                    </button>
                    {showAppleLogin && (
                      <button
                        onClick={handleAppleLogin}
                        disabled={loading || Boolean(socialAuthWarning)}
                        aria-label={`${socialCta} Apple`}
                        className="flex h-[62px] w-full items-center justify-center gap-3 rounded-full border border-black/8 bg-white px-6 text-[15px] font-semibold tracking-tight text-on-surface shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all active:scale-[0.985] disabled:opacity-45"
                      >
                        <svg viewBox="0 0 24 24" className="h-6 w-6 text-[#111827]" aria-hidden="true" fill="currentColor">
                          <path d="M16.365 12.03c.017 1.86 1.63 2.48 1.647 2.488-.014.044-.257.87-.848 1.723-.512.739-1.044 1.476-1.88 1.491-.823.016-1.087-.49-2.03-.49-.943 0-1.237.474-2.015.506-.809.03-1.427-.81-1.943-1.546-1.054-1.522-1.86-4.294-.777-6.176.538-.933 1.5-1.524 2.544-1.539.794-.015 1.544.538 2.03.538.486 0 1.398-.665 2.356-.567.401.017 1.527.161 2.248 1.216-.058.036-1.34.782-1.332 2.356Zm-1.958-4.27c.43-.52.72-1.244.64-1.968-.619.026-1.366.413-1.81.932-.398.457-.747 1.189-.652 1.89.69.054 1.392-.35 1.822-.854Z" />
                        </svg>
                        <span>{socialCta} Apple</span>
                      </button>
                    )}
                  </div>
                  {socialAuthWarning && (
                    <p className="px-4 text-center text-[12px] font-medium leading-relaxed text-on-surface/58">
                      {socialAuthWarning}
                    </p>
                  )}
                </div>
              )}
            </div>
          </section>

          {mode !== 'forgot' && (
            <div className={cn(sectionWidthClass, 'pt-8 text-center')}>
              <p className="text-[14px] font-medium text-ios-gray">
                {modePrompt}{' '}
                <button
                  onClick={() => changeMode(mode === 'daftar' ? 'masuk' : 'daftar')}
                  className="font-semibold text-primary underline underline-offset-2"
                >
                  {modePromptAction}
                </button>
              </p>
            </div>
          )}
        </main>

        <div className={cn(sectionWidthClass, 'space-y-4 pb-2 pt-4')}>
          <div className="px-1 text-center">
            {mode === 'forgot' && (
              <p className="text-[13px] font-medium text-ios-gray">
                Remember your password?{' '}
                <button
                  onClick={() => changeMode('masuk')}
                  className="text-primary font-semibold underline underline-offset-2"
                >
                  Back to login
                </button>
              </p>
            )}
          </div>

          <footer className="px-2 text-center">
            <p className="text-[12px] font-medium leading-relaxed text-ios-gray">
              By continuing, you agree to FOM Play&apos;s <button className="text-primary underline underline-offset-2">Terms of Service</button> and <button className="text-primary underline underline-offset-2">Privacy Policy</button>.
            </p>
          </footer>
        </div>
      </div>
    </div>
  );
};
