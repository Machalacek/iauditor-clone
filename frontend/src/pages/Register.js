// src/pages/Register.js
import React, { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import {
  createUserWithEmailAndPassword,
} from "firebase/auth";
import {
  doc, setDoc, getDocs, query, collection, where, updateDoc
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";

export default function Register() {
  const [invite, setInvite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState({
    street: "",
    city: "",
    province: "",
    postalCode: "",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  // Load invite info from token in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("invite");
    if (!token) {
      setError("Invalid or missing invite link.");
      setLoading(false);
      return;
    }
    // Fetch invite from Firestore
    const fetchInvite = async () => {
      const q = query(collection(db, "invites"), where("token", "==", token));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const data = snap.docs[0].data();
        if (data.accepted) {
          setError("This invite has already been used.");
        } else {
          setInvite({ ...data, id: snap.docs[0].id });
        }
      } else {
        setError("Invite not found or already used.");
      }
      setLoading(false);
    };
    fetchInvite();
  }, []);

  const isValid =
    !!invite &&
    !!password &&
    !!phone &&
    !!address.suite &&
    !!address.street &&
    !!address.city &&
    !!address.province &&
    !!address.postalCode;

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    if (!isValid) {
      setError("Please fill all required fields.");
      setSubmitting(false);
      return;
    }
    try {
      // 1. Create Firebase Auth user
      const userCred = await createUserWithEmailAndPassword(auth, invite.email, password);
      // 2. Create Firestore user profile
      await setDoc(doc(db, "users", userCred.user.uid), {
        uid: userCred.user.uid,
        email: invite.email,
        name: invite.name,
        role: invite.role,
        team: invite.position || "Rope Access Technician", // use position from invite
        phone,
        address,
        createdAt: new Date(),
        active: true,
        status: "active",
      });
      // 3. Mark invite as accepted
      await updateDoc(doc(db, "invites", invite.id), {
        accepted: true,
        acceptedAt: new Date().toISOString(),
      });
      // 4. Redirect to login (or dashboard)
      navigate("/login?registered=1");
    } catch (err) {
      setError(err.message);
    }
    setSubmitting(false);
  };

  if (loading) return <div className="p-8">Loading...</div>;
  if (error) return <div className="p-8 text-red-600">{error}</div>;

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 px-4">
      <div className="w-full max-w-sm bg-white p-6 shadow-md rounded-md max-h-[95vh] overflow-y-auto">
        <h2 className="text-2xl font-bold text-center mb-4">
          Complete Your Registration
        </h2>
        <form onSubmit={handleRegister}>
          <input
            type="text"
            className="w-full p-2 mb-3 border rounded bg-gray-100"
            value={invite.name}
            disabled
          />
          <input
            type="email"
            className="w-full p-2 mb-3 border rounded bg-gray-100"
            value={invite.email}
            disabled
          />
          <input
            type="text"
            className="w-full p-2 mb-3 border rounded bg-gray-100"
            value={invite.position || ""}
            placeholder="Position"
            disabled
          />
          <input
            type="tel"
            placeholder="Phone Number"
            className="w-full p-2 mb-3 border rounded"
            value={phone}
            onChange={e => {
                const digitsOnly = e.target.value.replace(/\D/g, "");
                setPhone(digitsOnly);
            }}
            pattern="\d*"
            maxLength={15}
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
            type="password"
            placeholder="Set Password"
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
            disabled={!isValid || submitting}
          >
            {submitting ? "Registering..." : "Register"}
          </button>
        </form>
      </div>
    </div>
  );
}
