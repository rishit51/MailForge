import React, { useState } from 'react';
import { useLogin, useSignup } from '../api/auth';
import { useNavigate } from 'react-router-dom';

export function LoginSignup() {
  const [isLogin, setIsLogin] = useState(true);
  const { mutate: login, isPending: isLoginPending } = useLogin();
  const { mutate: signup, isPending: isSignupPending } = useSignup();
  const navigate = useNavigate();

  const isPending = isLoginPending || isSignupPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    if (isLogin) {
      login({ email, password }, {
        onSuccess: () => navigate('/datasets')
      });
    } else {
      signup({ email, password }, {
        onSuccess: () => {
          // Auto-login upon successful signup
          login({ email, password }, {
            onSuccess: () => navigate('/datasets')
          });
        },
        onError: (err: any) => {
          console.error("Signup failed", err);
          alert("Failed to sign up. Please try again or use a different email.");
        }
      });
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-6 sm:p-12 relative overflow-hidden bg-surface text-on-surface font-body selection:bg-primary-fixed selection:text-on-primary-fixed">
      {/* Background Atmospheric Element */}
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-primary/5 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] rounded-full bg-tertiary/5 blur-[100px] pointer-events-none"></div>
      
      <div className="w-full max-w-[480px] relative z-10 animate-in fade-in duration-500">
        {/* Brand Identity */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-primary mb-6 rounded-xl">
            <span className="material-symbols-outlined text-white text-2xl">auto_awesome</span>
          </div>
          <h1 className="font-headline text-3xl font-black tracking-tight text-on-surface mb-2">The Editorial Analyst</h1>
          <p className="text-on-surface-variant font-medium text-sm">Automating precision in every workflow.</p>
        </div>
        
        {/* Main Auth Card */}
        <div className="bg-surface-container-lowest rounded-xl p-8 md:p-10 shadow-[0_12px_32px_rgba(18,74,240,0.06)] border border-outline-variant/10">
          
          {/* Toggle Navigation */}
          <div className="flex items-center justify-between mb-8 p-1 bg-surface-container-low rounded-lg">
            <button 
              type="button"
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2.5 px-4 rounded-md text-sm transition-all duration-200 ${isLogin ? 'font-semibold bg-surface-container-lowest text-primary shadow-sm' : 'font-medium text-on-surface-variant hover:text-on-surface'}`}
            >
              Login
            </button>
            <button 
              type="button"
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2.5 px-4 rounded-md text-sm transition-all duration-200 ${!isLogin ? 'font-semibold bg-surface-container-lowest text-primary shadow-sm' : 'font-medium text-on-surface-variant hover:text-on-surface'}`}
            >
              Sign Up
            </button>
          </div>

          {/* Form Section */}
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div className="group">
                <label className="block text-xs font-semibold text-on-surface-variant mb-1.5 ml-1" htmlFor="email">Email Address</label>
                <input 
                  className="w-full h-12 px-4 bg-surface-container-highest border-none rounded-lg text-sm text-on-surface placeholder:text-outline focus:ring-2 focus:ring-primary/20 transition-all outline-none" 
                  id="email" 
                  name="email"
                  placeholder="name@company.com" 
                  type="email"
                  required
                />
              </div>
              <div className="group">
                <div className="flex justify-between items-center mb-1.5 ml-1">
                  <label className="text-xs font-semibold text-on-surface-variant" htmlFor="password">Password</label>
                  {isLogin && <a className="text-[11px] font-bold text-primary hover:underline" href="#">Forgot Password?</a>}
                </div>
                <div className="relative">
                  <input 
                    className="w-full h-12 px-4 bg-surface-container-highest border-none rounded-lg text-sm text-on-surface placeholder:text-outline focus:ring-2 focus:ring-primary/20 transition-all outline-none" 
                    id="password" 
                    name="password"
                    placeholder="••••••••" 
                    type="password"
                    required
                  />
                  <button className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface-variant" type="button">
                    <span className="material-symbols-outlined text-lg">visibility</span>
                  </button>
                </div>
              </div>
            </div>

            {isLogin && (
              <div className="flex items-center space-x-2 ml-1">
                <input className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary/20 bg-surface-container-highest cursor-pointer" id="remember" type="checkbox"/>
                <label className="text-xs font-medium text-on-surface-variant cursor-pointer" htmlFor="remember">Keep me signed in for 30 days</label>
              </div>
            )}

            <button disabled={isPending} className="w-full h-12 signature-glow text-white font-bold rounded-lg shadow-md hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed" type="submit">
              {isPending ? 'Processing...' : isLogin ? 'Sign In' : 'Sign Up'}
            </button>
          </form>
        </div>

        {/* Footer Links */}
        <footer className="mt-8 text-center space-y-4">
          <p className="text-[11px] leading-relaxed text-on-surface-variant max-w-[320px] mx-auto">
            By continuing, you agree to our 
            <a className="text-on-surface font-bold hover:underline mx-1" href="#">Terms of Service</a> 
            and 
            <a className="text-on-surface font-bold hover:underline mx-1" href="#">Privacy Policy</a>.
          </p>
          <div className="pt-4 flex items-center justify-center gap-6">
            <a className="text-[11px] font-semibold text-outline hover:text-primary transition-colors uppercase tracking-widest" href="#">Support</a>
            <a className="text-[11px] font-semibold text-outline hover:text-primary transition-colors uppercase tracking-widest" href="#">Status</a>
            <a className="text-[11px] font-semibold text-outline hover:text-primary transition-colors uppercase tracking-widest" href="#">Docs</a>
          </div>
        </footer>
      </div>
    </main>
  );
}
