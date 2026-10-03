import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth, DEMO_USERS } from '../../context/AuthContext';
import { useLang } from '../../context/LangContext';
import { Card, Button, Badge } from '../../components/ui';
import { LanguageSelector } from '../../components/common/LanguageSelector';
import { AlertCircle, ArrowRight, LifeBuoy, UserCheck } from 'lucide-react';

export const CitizenLogin = () => {
  const { signIn, role, isAuthenticated } = useAuth();
  const { t } = useLang();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  // If already authenticated as citizen, redirect to /citizen/dashboard
  React.useEffect(() => {
    if (isAuthenticated) {
      if (role === 'citizen') navigate('/citizen/dashboard');
      else if (role === 'responder') navigate('/responder/dashboard');
      else if (role === 'admin') navigate('/admin/dashboard');
    }
  }, [isAuthenticated, role, navigate]);

  const validate = () => {
    const errs = {};
    if (!email.trim()) {
      errs.email = t('auth.emailRequired') || 'Email address is required.';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errs.email = t('auth.validEmailRequired') || 'Please enter a valid email address.';
    }
    if (!password) {
      errs.password = t('auth.passwordRequired') || 'Password is required.';
    } else if (password.length < 4) {
      errs.password = t('auth.passwordLength') || 'Password must be at least 4 characters.';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    if (!validate()) return;

    setLoading(true);
    try {
      await signIn(email, password, 'citizen');
      const from = location.state?.from?.pathname || '/citizen/dashboard';
      navigate(from, { replace: true });
    } catch (err) {
      setServerError(err.message || t('auth.invalidCredentials') || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemo = () => {
    setEmail(DEMO_USERS.citizen.email);
    setPassword('demo-password-123');
    setErrors({});
    setServerError('');
  };

  return (
    <div className="min-h-screen bg-app-bg text-navy-ink font-sans flex flex-col justify-between antialiased">
      {/* 1. LOGIN HERO */}
      <section className="bg-[linear-gradient(135deg,#0F2A3D_0%,#1F6F78_100%)] text-white px-6 py-10 md:py-14 text-center border-b border-[#0A1D2B]">
        <div className="max-w-2xl mx-auto flex flex-col items-center">
          <div className="w-12 h-12 rounded-md bg-white/10 border border-white/20 flex items-center justify-center mb-3">
            <LifeBuoy className="w-7 h-7 text-teal-light" />
          </div>
          <span className="text-2xl md:text-3xl font-bold tracking-tight text-white mb-2">
            {t('nav.appName') || 'FloodWatch'}
          </span>
          <h2 className="text-base md:text-lg font-medium text-teal-light mb-2">
            {t('auth.citizenLoginTitle') || 'Citizen Safety & Emergency Portal'}
          </h2>
          <p className="text-xs md:text-sm text-[#C4D9DF] max-w-lg leading-relaxed">
            {t('auth.citizenLoginSubtitle') || 'Access distress dispatch, shelter routing, and local advisories.'}
          </p>
        </div>
      </section>

      {/* 2. FORM CONTAINER */}
      <main className="max-w-md w-full mx-auto px-4 -mt-6 mb-12">
        <Card className="bg-surface border border-app-border rounded-md p-6">
          <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-app-border gap-2">
            <div>
              <h3 className="text-base font-semibold text-navy-ink leading-tight">
                {t('auth.signIn') || 'Sign In'}
              </h3>
              <p className="text-xs text-muted-text mt-0.5">
                {t('auth.citizenRole') || 'Citizen'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <LanguageSelector variant="auth" />
              <Badge variant="teal" size="sm">{t('auth.citizenRole') || 'Citizen'}</Badge>
            </div>
          </div>

          {serverError && (
            <div className="p-3 mb-4 rounded-md bg-[#FDF2F2] border border-[#F8D2D0] flex items-start gap-2.5 text-xs text-[#B42318]">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{serverError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div>
              <label className="block text-xs font-semibold text-navy-ink uppercase tracking-wider mb-1.5">
                {t('auth.email') || 'Email Address'}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="citizen@example.com"
                className={`w-full px-3 py-2 text-sm bg-surface border rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-teal-deep focus:border-teal-deep ${
                  errors.email ? 'border-[#B42318] bg-[#FDF2F2]/30' : 'border-app-border'
                }`}
              />
              {errors.email && (
                <p className="text-xs text-[#B42318] mt-1">{errors.email}</p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-xs font-semibold text-navy-ink uppercase tracking-wider mb-1.5">
                {t('auth.password') || 'Password'}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={`w-full px-3 py-2 text-sm bg-surface border rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-teal-deep focus:border-teal-deep ${
                  errors.password ? 'border-[#B42318] bg-[#FDF2F2]/30' : 'border-app-border'
                }`}
              />
              {errors.password && (
                <p className="text-xs text-[#B42318] mt-1">{errors.password}</p>
              )}
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              variant="primary"
              className="w-full mt-2"
              loading={loading}
              icon={ArrowRight}
            >
              {t('auth.signIn') || 'Sign In to Citizen Portal'}
            </Button>
          </form>

          {/* Quick Demo Autofill */}
          <div className="mt-5 pt-4 border-t border-app-border">
            <button
              type="button"
              onClick={handleFillDemo}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 text-xs font-medium text-teal-deep bg-teal-light border border-[#c4dcde] rounded-md hover:bg-[#d8e9eb] transition-colors"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>{t('auth.fillDemoCitizen') || 'Autofill Demo Citizen (Mohammed Arif)'}</span>
            </button>
          </div>

          {/* Registration Link (Citizens Only) */}
          <div className="mt-4 pt-4 border-t border-app-border text-center">
            <p className="text-xs text-muted-text">
              {t('auth.dontHaveAccount') || "Don't have a registered account?"}{' '}
              <Link to="/register" className="text-teal-deep font-semibold hover:underline">
                {t('auth.createAccount') || 'Create Citizen Account'}
              </Link>
            </p>
          </div>

          {/* Emergency SOS skip link */}
          <div className="mt-3 pt-3 border-t border-app-border text-center">
            <Link to="/citizen/sos" className="text-xs text-[#B42318] font-semibold hover:underline flex items-center justify-center gap-1">
              <span>{t('auth.skipToSos') || 'Emergency SOS does not require login · Skip to SOS'}</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {/* Cross-Portal Switcher Links */}
          <div className="mt-4 pt-3 border-t border-app-border flex justify-between text-[11px] text-muted-text">
            <Link to="/responder/login" className="hover:text-navy-ink underline">
              {t('auth.responderLoginTitle') || 'Responder Login'}
            </Link>
            <Link to="/admin/login" className="hover:text-navy-ink underline">
              {t('auth.adminLoginTitle') || 'Command Admin Login'}
            </Link>
          </div>
        </Card>
      </main>

      {/* Footer */}
      <footer className="text-center py-4 text-xs text-muted-text border-t border-app-border bg-surface">
        <span>{t('nav.appName') || 'FloodWatch'} • {t('nav.sector') || 'HYDERABAD SECTOR'} • {t('common.demoData') || 'Demo Drill'}</span>
      </footer>
    </div>
  );
};

export default CitizenLogin;
