// src/pages/Profile.js
import React, { useEffect, useState } from 'react';
import { auth, db } from '../firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      const user = auth.currentUser;
      const ref = doc(db, 'users', user.uid);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        setProfile(snap.data());
      }
      setLoading(false);
    };

    fetchProfile();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const ref = doc(db, 'users', auth.currentUser.uid);
    await updateDoc(ref, {
      name: profile.name,
      team: profile.team,
    });
    setSaving(false);
    alert('Profile updated');
  };

  if (loading) return <div className="p-6">Loading...</div>;
  if (!profile) return <div className="p-6">Profile not found.</div>;

  return (
    <div className="p-6 max-w-xl">
      <h1 className="text-2xl font-bold mb-4">My Profile</h1>

      <label className="block mb-2 font-medium">Name</label>
      <input
        className="w-full p-2 border rounded mb-4"
        value={profile.name}
        onChange={(e) => setProfile({ ...profile, name: e.target.value })}
      />

      <label className="block mb-2 font-medium">Team</label>
      <input
        className="w-full p-2 border rounded mb-4"
        value={profile.team}
        onChange={(e) => setProfile({ ...profile, team: e.target.value })}
      />

      <label className="block mb-2 font-medium">Role</label>
      <input
        className="w-full p-2 border rounded bg-gray-100 text-gray-600 mb-4"
        value={profile.role}
        disabled
      />

      <button
        className="bg-blue-600 text-white px-4 py-2 rounded"
        onClick={handleSave}
        disabled={saving}
      >
        {saving ? 'Saving...' : 'Save Changes'}
      </button>
    </div>
  );
}
