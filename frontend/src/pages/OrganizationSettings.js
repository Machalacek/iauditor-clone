// src/pages/OrganizationSettings.js
import React, { useState, useEffect, useRef } from "react";
import { db, storage } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Building2 } from "lucide-react";

export default function OrganizationSettings() {
  const [org, setOrg] = useState({
    name: "",
    ownerEmail: "",
    phone: "",
    website: "",
    logoURL: "",
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const logoInputRef = useRef();

  useEffect(() => {
    const loadSettings = async () => {
      const snap = await getDoc(doc(db, "settings", "organization"));
      if (snap.exists()) {
        setOrg(snap.data());
      }
      setLoading(false);
    };
    loadSettings();
  }, []);

  const handleUploadLogo = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const storageRef = ref(storage, `branding/logo-${Date.now()}`);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    setOrg((prev) => ({ ...prev, logoURL: url }));
  };

  const handleSave = async () => {
    setSaving(true);
    await setDoc(doc(db, "settings", "organization"), org);
    setSaving(false);
    alert("Organization settings saved.");
  };

  if (loading)
    return (
      <div className="flex justify-center items-center min-h-[60vh] text-lg text-gray-500">
        Loading...
      </div>
    );

  return (
    <div className="min-h-screen bg-gradient-to-tr from-blue-50 via-white to-cyan-50 py-8 px-2">
      {/* Stretched card container */}
      <div className="w-full max-w-6xl mx-auto">
        {/* Page header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="bg-blue-100 rounded-2xl p-3 flex items-center justify-center">
            <Building2 size={32} className="text-blue-700" />
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900">
            Organization Settings
          </h1>
        </div>
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl border px-6 md:px-16 py-8 mb-12 w-full">
          <form
            className="grid grid-cols-1 md:grid-cols-2 gap-8"
            onSubmit={(e) => {
              e.preventDefault();
              handleSave();
            }}
            autoComplete="off"
          >
            {/* Logo Avatar */}
            <div className="md:col-span-2 flex flex-col items-center mb-2">
              <div
                className="relative group cursor-pointer w-28 h-28 mb-2"
                title="Upload new logo"
                onClick={() => logoInputRef.current.click()}
              >
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-100 to-cyan-100 shadow-lg flex items-center justify-center">
                  {org.logoURL ? (
                    <img
                      src={org.logoURL}
                      alt="Logo"
                      className="object-contain w-full h-full rounded-full border-4 border-white shadow"
                    />
                  ) : (
                    <Building2 size={44} className="text-blue-400" />
                  )}
                  <div className="absolute inset-0 rounded-full bg-black/10 group-hover:bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                    <span className="text-white font-semibold">Edit Logo</span>
                  </div>
                </div>
                <input
                  type="file"
                  ref={logoInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={handleUploadLogo}
                />
              </div>
              <button
                type="button"
                className="mt-1 text-xs text-blue-700 underline hover:text-blue-900"
                onClick={() => logoInputRef.current.click()}
              >
                {org.logoURL ? "Change Logo" : "Upload Logo"}
              </button>
            </div>
            {/* Org Name */}
            <div>
              <label className="block font-semibold mb-1 text-gray-700">
                Organization Name
              </label>
              <input
                className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-100 focus:border-blue-400 shadow-sm transition"
                value={org.name}
                onChange={(e) => setOrg({ ...org, name: e.target.value })}
                placeholder="e.g. Moravia Prime Contracting Inc."
                required
              />
            </div>
            {/* Owner Email */}
            <div>
              <label className="block font-semibold mb-1 text-gray-700">
                Owner Email
              </label>
              <input
                type="email"
                className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-100 focus:border-blue-400 shadow-sm transition"
                value={org.ownerEmail}
                onChange={(e) => setOrg({ ...org, ownerEmail: e.target.value })}
                placeholder="you@email.com"
                required
              />
            </div>
            {/* Phone */}
            <div>
              <label className="block font-semibold mb-1 text-gray-700">
                Phone
              </label>
              <input
                className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-100 focus:border-blue-400 shadow-sm transition"
                value={org.phone}
                onChange={(e) => setOrg({ ...org, phone: e.target.value })}
                placeholder="(555) 555-1234"
              />
            </div>
            {/* Website */}
            <div>
              <label className="block font-semibold mb-1 text-gray-700">
                Website
              </label>
              <input
                className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-100 focus:border-blue-400 shadow-sm transition"
                value={org.website}
                onChange={(e) => setOrg({ ...org, website: e.target.value })}
                placeholder="https://moraviaprime.ca"
              />
            </div>
          </form>
          {/* Save Button */}
          <div className="flex justify-end pt-8">
            <button
              onClick={handleSave}
              type="button"
              className="bg-blue-600 text-white px-7 py-2 rounded-xl shadow hover:bg-blue-700 transition font-semibold min-w-[160px] text-lg"
              disabled={saving}
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
