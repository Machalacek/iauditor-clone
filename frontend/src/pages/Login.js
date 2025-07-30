import React, { useState, useEffect } from 'react';
import { auth, db, msProvider } from '../firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
} from 'firebase/firestore';

export default function Login({ onLogin }) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState({
    street: '',
    city: '',
    province: '',
    postalCode: '',
  });
  const [team, setTeam] = useState(''); // position
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Prefill fields from invite link
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const inviteName = params.get('name');
    const invitePosition = params.get('position');
    if (inviteName) setName(inviteName);
    if (invitePosition) setTeam(invitePosition);
  }, []);

  // Validation for registration
  const registrationValid =
    !!name &&
    !!phone &&
    !!address.street &&
    !!address.city &&
    !!address.province &&
    !!address.postalCode &&
    !!email &&
    !!password;

  // Save to Firestore after account creation
  const createUserDoc = async (user) => {
    await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      email: user.email,
      name,
      phone,
      address,
      role: 'user',
      team: team || 'Rope Access Technician',
      createdAt: new Date(),
      active: true,
      status: 'active',
    });
  };

  // Handle registration and login
  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      let userCred;
      if (isRegistering) {
        if (!registrationValid) {
          setError('Please fill out all required fields.');
          setLoading(false);
          return;
        }
        userCred = await createUserWithEmailAndPassword(auth, email, password);
        await createUserDoc(userCred.user);
      } else {
        userCred = await signInWithEmailAndPassword(auth, email, password);
      }
      setLoading(false);
      onLogin('dashboard');
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        setError('This email is already registered. Please login instead.');
        setIsRegistering(false);
      } else {
        setError(err.message);
      }
      setLoading(false);
    }
  };

  // Microsoft login
  const handleMicrosoftLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, msProvider);
      // If user doesn't exist in Firestore, create them
      const userDoc = await getDoc(doc(db, 'users', result.user.uid));
      if (!userDoc.exists()) {
        await setDoc(doc(db, 'users', result.user.uid), {
          uid: result.user.uid,
          email: result.user.email,
          name: result.user.displayName || '',
          phone: '',
          address: {
            street: '',
            city: '',
            province: '',
            postalCode: '',
          },
          role: 'user',
          team: team || 'Rope Access Technician',
          createdAt: new Date(),
          active: true,
          status: 'active',
        });
      }
      setLoading(false);
      onLogin('dashboard');
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 px-4">
      <div className="w-full max-w-sm bg-white p-6 shadow-md rounded-md max-h-[95vh] overflow-y-auto">
        <h2 className="text-2xl font-bold text-center mb-4">
          {isRegistering ? 'Create Your Account' : 'Login'}
        </h2>

        <form onSubmit={handleAuth}>
          <input
            type="email"
            placeholder="Email"
            className="w-full p-2 mb-3 border rounded"
            value={email}
            onChange={e => setEmail(e.target.value)}
            autoFocus
            required
            disabled={isRegistering && !!window.location.search} // lock if from invite
          />

          {isRegistering && (
            <>
              <input
                type="text"
                placeholder="Full Name"
                className="w-full p-2 mb-3 border rounded"
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
              <input
                type="tel"
                placeholder="Phone Number"
                className="w-full p-2 mb-3 border rounded"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                required
              />
              <input
                type="text"
                placeholder="Street"
                className="w-full p-2 mb-3 border rounded"
                value={address.street}
                onChange={e => setAddress({ ...address, street: e.target.value })}
                required
              />
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="City"
                  className="w-full p-2 mb-3 border rounded"
                  value={address.city}
                  onChange={e => setAddress({ ...address, city: e.target.value })}
                  required
                />
                <input
                  type="text"
                  placeholder="Province"
                  className="w-full p-2 mb-3 border rounded"
                  value={address.province}
                  onChange={e => setAddress({ ...address, province: e.target.value })}
                  required
                />
              </div>
              <input
                type="text"
                placeholder="Postal Code"
                className="w-full p-2 mb-3 border rounded"
                value={address.postalCode}
                onChange={e => setAddress({ ...address, postalCode: e.target.value })}
                required
              />
              <input
                type="text"
                placeholder="Position"
                className="w-full p-2 mb-3 border rounded bg-gray-100"
                value={team}
                disabled
              />
            </>
          )}

          <input
            type="password"
            placeholder="Password"
            className="w-full p-2 mb-3 border rounded"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />

          {error && (
            <div className="text-red-500 text-sm mb-3">{error}</div>
          )}

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded mb-2"
            disabled={loading || (isRegistering && !registrationValid)}
          >
            {loading
              ? 'Please wait...'
              : isRegistering
              ? 'Register'
              : 'Login'}
          </button>
        </form>

        <button
          onClick={handleMicrosoftLogin}
          className="w-full bg-purple-600 text-white py-2 rounded"
          disabled={loading}
        >
          Login with Microsoft
        </button>

        <div className="text-center mt-4">
          <button
            onClick={() => setIsRegistering(!isRegistering)}
            className="text-sm text-blue-600 hover:underline"
            disabled={loading}
          >
            {isRegistering
              ? 'Already have an account? Login'
              : 'No account? Register'}
          </button>
        </div>
      </div>
    </div>
  );
}
