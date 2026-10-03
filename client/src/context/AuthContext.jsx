import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

// Pre-configured Demo Accounts matching seed.sql
export const DEMO_USERS = {
  citizen: {
    id: '00000000-0000-0000-0000-000000000005',
    email: 'arif.hyd@example.com',
    full_name: 'Mohammed Arif',
    phone: '+91-9849033331',
    role: 'citizen',
    agency_name: null,
    token: 'demo-token-citizen',
  },
  responder: {
    id: '00000000-0000-0000-0000-000000000002',
    email: 'vikram.ndrf@resq.gov.in',
    full_name: 'Inspector K. Vikram',
    phone: '+91-9849022221',
    role: 'responder',
    agency_name: '10th Battalion NDRF (Inflatable Boat Rescue)',
    token: 'demo-token-responder',
  },
  admin: {
    id: '00000000-0000-0000-0000-000000000001',
    email: 'admin@resq.gov.in',
    full_name: 'Suresh Reddy',
    phone: '+91-9849011111',
    role: 'admin',
    agency_name: 'Telangana State Disaster Management Authority (TSDMA)',
    token: 'demo-token-admin',
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize session on mount
  useEffect(() => {
    let mounted = true;

    async function initSession() {
      // 1. Check local demo session first
      const savedToken = localStorage.getItem('floodwatch_auth_token');
      const savedProfile = localStorage.getItem('floodwatch_auth_profile');

      if (savedToken && savedProfile) {
        try {
          const parsed = JSON.parse(savedProfile);
          if (mounted) {
            setUser({ id: parsed.id, email: parsed.email });
            setProfile(parsed);
            setRole(parsed.role);
            setLoading(false);
            return;
          }
        } catch (e) {
          localStorage.removeItem('floodwatch_auth_token');
          localStorage.removeItem('floodwatch_auth_profile');
        }
      }

      // 2. Check Supabase session
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user && mounted) {
          setUser(session.user);
          // Fetch profile row from DB
          const { data: prof } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          const resolvedRole = prof?.role || session.user.user_metadata?.role || 'citizen';
          setProfile(prof || {
            id: session.user.id,
            email: session.user.email,
            full_name: session.user.user_metadata?.full_name || session.user.email.split('@')[0],
            role: resolvedRole
          });
          setRole(resolvedRole);
        }
      } catch (err) {
        console.warn('[AuthContext] Session init note:', err.message);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    initSession();

    // Listen for Supabase auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user);
        const { data: prof } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        const resolvedRole = prof?.role || session.user.user_metadata?.role || 'citizen';
        setProfile(prof || {
          id: session.user.id,
          email: session.user.email,
          full_name: session.user.user_metadata?.full_name || session.user.email.split('@')[0],
          role: resolvedRole
        });
        setRole(resolvedRole);
      } else if (!localStorage.getItem('floodwatch_auth_token')) {
        setUser(null);
        setProfile(null);
        setRole(null);
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      authListener?.subscription?.unsubscribe?.();
    };
  }, []);

  /**
   * Sign In with Email & Password
   * Supports live Supabase Auth and seed demo accounts.
   */
  const signIn = async (email, password, portalRole = null) => {
    setLoading(true);
    try {
      const cleanEmail = email.trim().toLowerCase();

      // Check if it's one of the seed demo accounts
      const matchedDemoKey = Object.keys(DEMO_USERS).find(
        k => DEMO_USERS[k].email.toLowerCase() === cleanEmail
      );

      if (matchedDemoKey) {
        const demo = DEMO_USERS[matchedDemoKey];
        if (portalRole && demo.role !== portalRole) {
          throw new Error(`Access Denied: This account has the '${demo.role}' role and cannot log into the ${portalRole} portal.`);
        }
        localStorage.setItem('floodwatch_auth_token', demo.token);
        localStorage.setItem('floodwatch_auth_profile', JSON.stringify(demo));
        setUser({ id: demo.id, email: demo.email });
        setProfile(demo);
        setRole(demo.role);
        setLoading(false);
        return { user: { id: demo.id, email: demo.email }, profile: demo, role: demo.role };
      }

      // Try live Supabase Auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        // If Supabase is not reachable or credentials fail
        throw error;
      }

      const authUser = data.user;
      let userProfile = null;
      try {
        const { data: prof } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .single();
        userProfile = prof;
      } catch (err) {
        // fallback
      }

      const resolvedRole = userProfile?.role || authUser.user_metadata?.role || 'citizen';

      if (portalRole && resolvedRole !== portalRole) {
        await supabase.auth.signOut();
        throw new Error(`Access Denied: Your account role is '${resolvedRole}', which cannot log into the ${portalRole} portal.`);
      }

      const finalProfile = userProfile || {
        id: authUser.id,
        email: authUser.email,
        full_name: authUser.user_metadata?.full_name || authUser.email.split('@')[0],
        role: resolvedRole,
      };

      setUser(authUser);
      setProfile(finalProfile);
      setRole(resolvedRole);
      return { user: authUser, profile: finalProfile, role: resolvedRole };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Citizen Registration (Citizens Only per Task 3)
   */
  const signUp = async (email, password, { full_name, phone = '' }) => {
    setLoading(true);
    try {
      const cleanEmail = email.trim().toLowerCase();

      // Check if trying to register an existing demo account
      const existingDemo = Object.values(DEMO_USERS).find(d => d.email.toLowerCase() === cleanEmail);
      if (existingDemo) {
        throw new Error('An account with this email address already exists. Please log in.');
      }

      // Supabase Auth Sign Up
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            full_name,
            phone,
            role: 'citizen', // Citizen only
          },
        },
      });

      if (error) {
        // Fallback for local demo drill if Supabase is offline
        const localCitizen = {
          id: `cit-${Date.now()}`,
          email: cleanEmail,
          full_name,
          phone,
          role: 'citizen',
          token: `demo-token-citizen-${Date.now()}`
        };
        localStorage.setItem('floodwatch_auth_token', localCitizen.token);
        localStorage.setItem('floodwatch_auth_profile', JSON.stringify(localCitizen));
        setUser({ id: localCitizen.id, email: localCitizen.email });
        setProfile(localCitizen);
        setRole('citizen');
        return { user: localCitizen, profile: localCitizen, role: 'citizen' };
      }

      const registeredUser = data.user;
      const citizenProfile = {
        id: registeredUser.id,
        email: cleanEmail,
        full_name,
        phone,
        role: 'citizen',
      };

      setUser(registeredUser);
      setProfile(citizenProfile);
      setRole('citizen');
      return { user: registeredUser, profile: citizenProfile, role: 'citizen' };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Sign Out
   */
  const signOut = async () => {
    setLoading(true);
    try {
      localStorage.removeItem('floodwatch_auth_token');
      localStorage.removeItem('floodwatch_auth_profile');
      await supabase.auth.signOut().catch(() => {});
    } finally {
      setUser(null);
      setProfile(null);
      setRole(null);
      setLoading(false);
    }
  };

  /**
   * Helper: Instant login as seed demo role
   */
  const loginAsDemo = (demoRole) => {
    const demo = DEMO_USERS[demoRole];
    if (demo) {
      localStorage.setItem('floodwatch_auth_token', demo.token);
      localStorage.setItem('floodwatch_auth_profile', JSON.stringify(demo));
      setUser({ id: demo.id, email: demo.email });
      setProfile(demo);
      setRole(demo.role);
    }
  };

  const value = {
    user,
    profile,
    role,
    loading,
    signIn,
    signUp,
    signOut,
    loginAsDemo,
    isAuthenticated: !!user && !!role,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
