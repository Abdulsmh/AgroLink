
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { supabase } from '../config/supabaseClient';

const AuthContext = createContext(null);

/*
 * Only these fields can be changed through the local profile helper.
 * Role and verification status are deliberately excluded.
 */
const EDITABLE_PROFILE_FIELDS = [
  'full_name',
  'phone_number',
  'lga_location',
  'business_name',
  'farm_location',
];

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  /*
   * Protect against stale authentication/profile requests.
   */
  const authRequestId = useRef(0);

  /*
   * Keep track of the currently authenticated user without requiring
   * every callback to depend on React state.
   */
  const currentUserId = useRef(null);

  /*
   * Read the latest profile directly from Supabase.
   */
  const loadUserProfile = useCallback(async (userId) => {
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
  }, []);

  /*
   * Synchronise authentication state and its associated profile.
   */
  const syncAuthState = useCallback(async (session) => {
    const requestId = ++authRequestId.current;
    const sessionUser = session?.user ?? null;

    if (!sessionUser) {
      currentUserId.current = null;

      setUser(null);
      setUserProfile(null);
      setUserRole(null);
      setIsLoading(false);

      return;
    }

    currentUserId.current = sessionUser.id;
    setUser(sessionUser);
    setIsLoading(true);

    const profile = await loadUserProfile(sessionUser.id);

    /*
     * Ignore responses from an outdated authentication request.
     */
    if (
      requestId !== authRequestId.current ||
      currentUserId.current !== sessionUser.id
    ) {
      return;
    }

    setUserProfile(profile);
    setUserRole(profile?.role ?? null);
    setIsLoading(false);
  }, [loadUserProfile]);

  /*
   * Manually refresh the signed-in user's profile.
   * Useful after saving profile information or completing an
   * account-related workflow.
   */
  const refreshUserProfile = useCallback(async () => {
    const userId = currentUserId.current;

    if (!userId) {
      setUserProfile(null);
      setUserRole(null);
      return null;
    }

    const requestId = authRequestId.current;
    const profile = await loadUserProfile(userId);

    if (
      requestId !== authRequestId.current ||
      currentUserId.current !== userId
    ) {
      return null;
    }

    if (profile) {
      setUserProfile(profile);
      setUserRole(profile.role ?? null);
    }

    return profile;
  }, [loadUserProfile]);

  /*
   * Apply an already-persisted profile update to local context
   * immediately, without waiting for a Realtime event.
   *
   * Pass the updated row returned by Supabase when possible.
   * Role and verification status are never changed by this helper.
   */
  const updateUserProfile = useCallback((updatedProfile) => {
    if (!updatedProfile || typeof updatedProfile !== 'object') {
      return;
    }

    const activeUserId = currentUserId.current;

    if (
      !activeUserId ||
      updatedProfile.id !== activeUserId
    ) {
      return;
    }

    setUserProfile((currentProfile) => {
      if (!currentProfile || currentProfile.id !== activeUserId) {
        return currentProfile;
      }

      const safeUpdates = {};

      EDITABLE_PROFILE_FIELDS.forEach((field) => {
        if (
          Object.prototype.hasOwnProperty.call(updatedProfile, field)
        ) {
          safeUpdates[field] = updatedProfile[field];
        }
      });

      return {
        ...currentProfile,
        ...safeUpdates,
      };
    });
  }, []);

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
     * The auth-state listener loads the profile automatically.
     */
    return data;
  };

  /*
   * Initialise authentication and listen for sign-in/sign-out events.
   *
   * Supabase auth callbacks should not await additional Supabase
   * queries directly. The profile sync is deferred outside the
   * callback to avoid auth-lock deadlocks.
   */
  useEffect(() => {
    let isMounted = true;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;

      /*
       * Token refreshes do not require reloading the profile.
       */
      if (
        event === 'TOKEN_REFRESHED' &&
        session?.user?.id === currentUserId.current
      ) {
        setUser(session.user);
        return;
      }

      /*
       * Defer the async profile query until after the auth callback.
       */
      Promise.resolve().then(() => {
        if (isMounted) {
          void syncAuthState(session);
        }
      });
    });

    /*
     * Also check the existing session. Request IDs prevent duplicate
     * initialization/listener requests from overwriting newer state.
     */
    const initializeAuth = async () => {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (!isMounted) return;

      if (error) {
        console.error('Could not restore auth session:', error.message);
        setIsLoading(false);
        return;
      }

      /*
       * Do not replace a newer session already processed by the listener.
       */
      if (
        session?.user?.id &&
        currentUserId.current === session.user.id
      ) {
        return;
      }

      await syncAuthState(session);
    };

    void initializeAuth();

    return () => {
      isMounted = false;
      authRequestId.current += 1;
      subscription?.unsubscribe();
    };
  }, [syncAuthState]);

  /*
   * Subscribe to changes to the signed-in user's profile.
   *
   * The profile is re-read after a change so the context receives a
   * complete row, not just the fields present in a Realtime payload.
   */
  useEffect(() => {
    if (!user?.id) return undefined;

    const subscribedUserId = user.id;
    let active = true;

    const refreshFromRealtime = async () => {
      if (
        !active ||
        currentUserId.current !== subscribedUserId
      ) {
        return;
      }

      const requestId = authRequestId.current;
      const profile = await loadUserProfile(subscribedUserId);

      if (
        !active ||
        requestId !== authRequestId.current ||
        currentUserId.current !== subscribedUserId ||
        !profile
      ) {
        return;
      }

      setUserProfile(profile);
      setUserRole(profile.role ?? null);
    };

    const channel = supabase
      .channel(`profile-sync-${subscribedUserId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${subscribedUserId}`,
        },
        () => {
          void refreshFromRealtime();
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.error(
            'Could not subscribe to profile Realtime updates.'
          );
        }
      });

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [user?.id, loadUserProfile]);

  /*
   * Logout immediately clears the UI and invalidates pending requests.
   */
  const logout = async () => {
    authRequestId.current += 1;
    currentUserId.current = null;

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

    refreshUserProfile,
    updateUserProfile,
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
