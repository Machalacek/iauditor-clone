// src/pages/ManageInvites.jsx

import React, { useEffect, useState } from 'react';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';

export default function ManageInvites() {
  const [invites, setInvites] = useState([]);

  useEffect(() => {
    const fetchInvites = async () => {
      const snap = await getDocs(collection(db, 'invites'));
      setInvites(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    };
    fetchInvites();
  }, []);

  const handleDelete = async (id) => {
    await deleteDoc(doc(db, 'invites', id));
    setInvites(invites => invites.filter(i => i.id !== id));
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Pending Invites</h2>
      <div>
        {invites.filter(i => !i.accepted).map(i => (
        <div
            key={i.id}
            className="grid grid-cols-1 md:grid-cols-[1fr_auto] items-center p-4 border-b w-full max-w-3xl"
        >
            <div>
            <div className="font-semibold">{i.name}</div>
            <div className="text-gray-500 text-sm">{i.email}</div>
            <div className="text-gray-500 text-sm">
                Role: {i.role} &middot; Position: {i.position}
            </div>
            <div className="text-xs text-gray-400 mt-1">
                {new Date(i.invitedAt).toLocaleString()}
            </div>
            </div>
            <div className="flex justify-end items-center h-full mt-3 md:mt-0">
            <button
                onClick={() => handleDelete(i.id)}
                className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded"
            >
                Cancel
            </button>
            </div>
        </div>
        ))}
        {invites.filter(i => !i.accepted).length === 0 && (
          <div className="text-gray-500 mt-6 text-center">No pending invites.</div>
        )}
      </div>
    </div>
  );
}
