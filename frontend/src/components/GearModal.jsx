// src/components/GearModal.jsx

import React, { useState } from "react";
import { storage } from "../firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

export default function GearModal({
  modalRef,
  gear,
  onClose,
  onSave,
  team = [],
  projects = [],
  categories = [],
  statuses = [],
  fields = [],
  isAdminOrManager = false,
}) {
  const [values, setValues] = useState(() => {
    const obj = {};
    fields.forEach(f => {
      obj[f.name] = gear?.[f.name] ?? "";
    });
    return obj;
  });
  const [imageUploading, setImageUploading] = useState(false);
  const [imageError, setImageError] = useState("");

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setValues((v) => ({
      ...v,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleImageChange = async (e) => {
    setImageError("");
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setImageError("File must be an image");
      return;
    }
    setImageUploading(true);
    try {
      const fileName = gear?.id
        ? `gear/${gear.id}/${Date.now()}_${file.name}`
        : `gear/temp/${Date.now()}_${file.name}`;
      const storageRef = ref(storage, fileName);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setValues(v => ({ ...v, imageUrl: url }));
    } catch (err) {
      setImageError("Upload failed");
    }
    setImageUploading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const final = {
      ...values,
      dateAdded: gear?.dateAdded || new Date().toISOString(),
    };
    onSave(final, gear?.id);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 z-40 flex items-center justify-center">
      <div ref={modalRef} className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md">
        <h3 className="font-semibold text-xl mb-4">
          {gear ? "Edit Gear" : "Add Equipment"}
        </h3>
        <form
          onSubmit={handleSubmit}
          className="space-y-4 overflow-y-auto"
          style={{ maxHeight: "65vh" }}
        >
          {/* IMAGE UPLOAD */}
          <div className="mb-2 flex items-center gap-4">
            <img
              src={values.imageUrl || "/gear-placeholder.png"}
              alt="Gear preview"
              className="w-16 h-16 object-cover rounded-full bg-gray-100 border"
            />
            <div className="flex flex-col">
              <label className="text-sm font-medium">Image</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                disabled={imageUploading}
                className="mt-1"
              />
              {imageUploading && (
                <div className="text-xs text-blue-500">Uploading...</div>
              )}
              {imageError && (
                <div className="text-xs text-red-600">{imageError}</div>
              )}
            </div>
          </div>
          {/* FIELDS */}
          {fields.map((f) => (
            <div key={f.name}>
              <label className="block mb-1 font-medium">
                {f.label}
                {f.required && <span className="text-red-600 ml-1">*</span>}
              </label>
              {f.type === "text" && (
                <input
                  name={f.name}
                  value={values[f.name]}
                  onChange={handleChange}
                  required={f.required}
                  className="border rounded w-full px-3 py-2"
                />
              )}
              {f.type === "textarea" && (
                <textarea
                  name={f.name}
                  value={values[f.name]}
                  onChange={handleChange}
                  required={f.required}
                  className="border rounded w-full px-3 py-2"
                />
              )}
              {f.type === "select" && (
                <select
                  name={f.name}
                  value={values[f.name]}
                  onChange={handleChange}
                  required={f.required}
                  className="border rounded w-full px-3 py-2"
                >
                  <option value="">Select...</option>
                  {f.name === "category" &&
                    categories.map((cat) => <option key={cat}>{cat}</option>)}
                  {f.name === "status" &&
                    statuses.map((s) => <option key={s}>{s}</option>)}
                  {f.name === "assignedTo" &&
                    team.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  {f.name === "assignedProject" &&
                    projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                </select>
              )}
              {f.type === "date" && (
                <input
                  name={f.name}
                  type="date"
                  value={values[f.name]}
                  onChange={handleChange}
                  required={f.required}
                  className="border rounded w-full px-3 py-2"
                />
              )}
              {f.type === "number" && (
                <input
                  name={f.name}
                  type="number"
                  value={values[f.name]}
                  onChange={handleChange}
                  required={f.required}
                  className="border rounded w-full px-3 py-2"
                />
              )}
              {f.type === "checkbox" && (
                <input
                  name={f.name}
                  type="checkbox"
                  checked={!!values[f.name]}
                  onChange={handleChange}
                  className="mr-2"
                />
              )}
            </div>
          ))}
          <div className="flex justify-end gap-2 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              disabled={imageUploading}
            >
              {gear ? "Save" : "Add"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
