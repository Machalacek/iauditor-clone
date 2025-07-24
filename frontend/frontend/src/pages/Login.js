import React, { useState } from 'react';
import { auth, msProvider, db } from '../firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

export default function Login({ onLogin }) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const saveUserToFirestore = async (user) => {
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      await setDoc(userRef, {
        uid: user.uid,
        email: user.email,
        name: user.displayName || '',
        role: 'user',
        team: '',
        createdAt: new Date(),
      });
    }
  };

  const handleEmailAuth = async () => {
    setError('');
    try {
      let userCred;
      if (isRegistering) {
        userCred = await createUserWithEmailAndPassword(auth, email, password);
      } else {
        userCred = await signInWithEmailAndPassword(auth, email, password);
      }

      await saveUserToFirestore(userCred.user);
      onLogin('dashboard'); // ✅ redirect after login
    } catch (err) {
      setError(err.message);
    }
  };

  const handleMicrosoftLogin = async () => {
    setError('');
    try {
      const result = await signInWithPopup(auth, msProvider);
      await saveUserToFirestore(result.user);
      onLogin('dashboard'); // ✅ redirect after login
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-gray-50 px-4">
      <div className="w-full max-w-sm bg-white p-6 shadow-md rounded-md">
        <h2 className="text-2xl font-bold text-center mb-4">
          {isRegistering ? 'Create Account' : 'Login'}
        </h2>

        <input
          type="email"
          placeholder="Email"
          className="w-full p-2 mb-3 border rounded"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          placeholder="Password"
          className="w-full p-2 mb-3 border rounded"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && <div className="text-red-500 text-sm mb-3">{error}</div>}

        <button
          onClick={handleEmailAuth}
          className="w-full bg-blue-600 text-white py-2 rounded mb-2"
        >
          {isRegistering ? 'Register' : 'Login'}
        </button>

        <button
          onClick={handleMicrosoftLogin}
          className="w-full bg-purple-600 text-white py-2 rounded"
        >
          Login with Microsoft
        </button>

        <div className="text-center mt-4">
          <button
            onClick={() => setIsRegistering(!isRegistering)}
            className="text-sm text-blue-600 hover:underline"
          >
            {isRegistering ? 'Already have an account? Login' : 'No account? Register'}
          </button>
        </div>
      </div>
    </div>
  );
}
