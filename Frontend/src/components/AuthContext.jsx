import { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

const AuthContext = createContext();

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setCurrentUser(user);

            if (user) {
                // Fetch user data from Firestore
                try {
                    const userDocRef = doc(db, 'users', user.uid);
                    const userDocSnap = await getDoc(userDocRef);

                    if (userDocSnap.exists()) {
                        setUserData(userDocSnap.data());
                    } else {
                        console.error('User document not found in Firestore');
                        setUserData(null);
                    }
                } catch (error) {
                    console.error('Error fetching user data:', error);
                    setUserData(null);
                }
            } else {
                setUserData(null);
            }

            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const value = {
        currentUser,
        userData
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
}
