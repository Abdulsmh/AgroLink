import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
} from 'react';
import { supabase } from '../config/supabaseClient';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  /*
   * Prevents an older asynchronous profile request
   * from restoring stale user data after logout.
   */
  const authRequestId = useRef(0);

  const loadUserProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Profile query failed:', error.message);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Unhandled profile fetch exception:', error);
      return null;
    }
  };

  const syncAuthState = async (session) => {
    const requestId = ++authRequestId.current;

    if (!session?.user) {
      setUser(null);
      setUserProfile(null);
      setUserRole(null);
      setIsLoading(false);
      return;
    }

    setUser(session.user);
    setIsLoading(true);

    const profile = await loadUserProfile(session.user.id);

    /*
     * Ignore outdated profile requests.
     */
    if (requestId !== authRequestId.current) {
      return;
    }

    setUserProfile(profile);
    setUserRole(profile?.role || null);
    setIsLoading(false);
  };

  /*
   * Login function used by Login.jsx.
   */
  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw error;
    }

    /*
     * onAuthStateChange will load the user's profile
     * and role automatically.
     */
    return data;
  };

  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (isMounted) {
        await syncAuthState(session);
      }
    };

    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) {
        return;
      }

      syncAuthState(session);
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  const logout = async () => {
    /*
     * Invalidate previous profile-loading requests.
     */
    authRequestId.current += 1;

    setUser(null);
    setUserRole(null);
    setUserProfile(null);
    setIsLoading(false);

    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('Logout failed:', error.message);
      throw error;
    }
  };

  const value = {
    user,
    userRole,
    userProfile,
    isLoading,
    isAuthenticated: Boolean(user),
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider.');
  }

  return context;
};
