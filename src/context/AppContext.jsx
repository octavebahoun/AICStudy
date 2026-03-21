import { createContext, useContext, useReducer, useEffect } from "react";
import { supabase } from "../services/supabase";

export const AppContext = createContext(null);

const storageKey = "aicstudy_state";

const getInitialState = () => {
  const saved = localStorage.getItem(storageKey);
  const baseState = {
    user: null,
    lang: "fr",
    sidebarOpen: true,
    mobileSidebarOpen: false,
    notifications: [],
  };

  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      return { ...baseState, ...parsed, mobileSidebarOpen: false };
    } catch (e) {
      return baseState;
    }
  }
  return baseState;
};

function reducer(state, action) {
  switch (action.type) {
    case "LOGIN":
      return { ...state, user: action.payload };
    case "LOGOUT":
      localStorage.removeItem(storageKey);
      return { ...getInitialState(), user: null };
    case "SET_LANG":
      return { ...state, lang: action.payload };
    case "TOGGLE_SIDEBAR":
      return { ...state, sidebarOpen: !state.sidebarOpen };
    case "TOGGLE_MOBILE_SIDEBAR":
      return { ...state, mobileSidebarOpen: !state.mobileSidebarOpen };
    case "CLOSE_MOBILE_SIDEBAR":
      return { ...state, mobileSidebarOpen: false };
    case "MARK_NOTIFICATIONS_READ":
      return {
        ...state,
        notifications: state.notifications.map((n) => ({ ...n, read: true })),
      };
    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, getInitialState());

  useEffect(() => {
    // onAuthStateChange gère le cas initial (INITIAL_SESSION) + les changements
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        const user = {
          id: session.user.id,
          email: session.user.email,
          name:
            session.user.user_metadata?.name ||
            session.user.email.split("@")[0],
          role: session.user.user_metadata?.role || "student",
          avatar: session.user.user_metadata?.avatar || "?",
          status: "active",
        };
        dispatch({ type: "LOGIN", payload: user });
      } else {
        dispatch({ type: "LOGOUT" });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const { user, lang, sidebarOpen } = state;
    localStorage.setItem(
      storageKey,
      JSON.stringify({ user, lang, sidebarOpen }),
    );
  }, [state.user, state.lang, state.sidebarOpen]);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
