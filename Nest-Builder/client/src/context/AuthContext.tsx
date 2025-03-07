import {
  createContext,
  useContext,
  ReactNode,
  useEffect,
  useState,
} from "react";
import React from "react";
import {
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
} from "firebase/auth";
import { auth } from "../firebase.config";
import User from "../models/UserModel";

type AuthContextType = {
  user: User | null;
  loading: boolean;
  googleSignIn: () => Promise<void>;
  logOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

interface AuthContextProviderProps {
  children: ReactNode;
}

export const AuthContextProvider = ({ children }: AuthContextProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const { displayName, email, uid, photoURL, metadata } = user;

        setUser({
          id: uid,
          name: displayName || "",
          email: email || "",
          photoURL: photoURL || "",
          createdAt: new Date(metadata.creationTime || ""),
          lastLogin: new Date(metadata.lastSignInTime || ""),
          homeAddress: "",
          workAddress: "",
          birthday: null,
          gender: "",
        });

        // Store accessToken in localStorage for persistence
        try {
          const token = (await user.getIdToken()) || "";
          localStorage.setItem("accessToken", token);
        } catch (error) {
          console.error("Error storing accessToken in localStorage: ", error);
        }
      } else {
        setUser(null);
        try {
          localStorage.removeItem("accessToken");
        } catch (error) {
          console.error("Error removing accessToken from localStorage: ", error);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const storeGoogleToken = async () => {
    try {
      const result = await getRedirectResult(auth);
      if (!result) return;

      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken;

      if (token) {
        try {
          localStorage.setItem("accessToken", token);
          console.log("Token stored successfully!");
        } catch (error) {
          console.error("Error storing token in localStorage: ", error);
        }
      }
    } catch (error) {
      console.error("Error getting redirect result: ", error);
    }
  };

  const googleSignIn = async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope("https://www.googleapis.com/auth/user.birthday.read");
      provider.addScope("https://www.googleapis.com/auth/user.gender.read");
      provider.addScope("https://www.googleapis.com/auth/drive");

      console.log("Trying sign-in with popup...");
      try {
        const result = await signInWithPopup(auth, provider);
        const credential = GoogleAuthProvider.credentialFromResult(result);
        const token = credential?.accessToken;

        if (token) {
          try {
            localStorage.setItem("accessToken", token);
          } catch (error) {
            console.error("Error storing token in localStorage: ", error);
          }
        }
      } catch (popupError) {
        console.warn("Popup failed, trying redirect...");
        await signInWithRedirect(auth, provider);
      }
    } catch (error) {
      console.error("Error signing in with Google: ", error);
    } finally {
      setLoading(false);
    }
  };

  const logOut = async () => {
    setLoading(true);
    try {
      try {
        localStorage.removeItem("accessToken");
      } catch (error) {
        console.error("Error removing accessToken from localStorage: ", error);
      }
      await signOut(auth);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, googleSignIn, logOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const UserAuth = () => {
  return useContext(AuthContext);
};
