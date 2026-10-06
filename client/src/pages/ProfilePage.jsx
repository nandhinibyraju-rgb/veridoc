import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/api';
import { User, Stethoscope, Building, Award, CheckCircle2, Save, Sparkles, Shield } from 'lucide-react';

export default function ProfilePage() {
  const { user, updateUser } = useAuth();

  const [formData, setFormData] = useState({
    name: user?.name || 'Dr. Sarah Chen, MD',
    role: user?.role || 'doctor',
    specialty: user?.specialty || 'Cardiology',
    location: user?.location || 'Boston, MA',
    institution: user?.institution || 'Massachusetts General Hospital',
    career_stage: user?.career_stage || 'Attending Physician',
    preferred_specialties: user?.preferred_specialties || 'Cardiology, Nephrology, Endocrinology'
  });

  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        role: user.role || 'doctor',
        specialty: user.specialty || 'Cardiology',
        location: user.location || 'Boston, MA',
        institution: user.institution || 'Massachusetts General Hospital',
        career_stage: user.career_stage || 'Attending Physician',
        preferred_specialties: user.preferred_specialties || 'Cardiology, Nephrology, Endocrinology'
      });
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg('');
    setErrorMsg('');
    try {
      const res = await authService.updateProfile(formData);
      updateUser(res.user);
      setSuccessMsg('Profile updated successfully! Preferred specialties updated in live feeds.');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const initials = formData.name.replace(/^(Dr\.|MD)\s*/i, '').charAt(0) || 'D';

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
          {/* Large Avatar */}
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-[#0F766E] to-teal-500 text-white flex items-center justify-center font-bold text-2xl shadow-md border-2 border-white">
              {initials}
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center border-2 border-white shadow-2xs">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>

          <div className="text-center sm:text-left flex-1">
            <h1 className="text-xl font-bold text-slate-900">{formData.name}</h1>
            <p className="text-xs text-teal-700 font-semibold mt-0.5">
              {formData.specialty} • {formData.institution}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {formData.role === 'student' ? 'Medical Student / Clinical Trainee' : 'Attending Physician'} • {formData.location}
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs">
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider pb-3 border-b border-slate-100 flex items-center gap-2">
          <User className="w-4 h-4 text-[#0F766E]" />
          <span>Clinician Profile & Preferences</span>
        </h2>

        {successMsg && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Full Clinician Name
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:border-[#0F766E] focus:bg-white text-xs outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Clinical Role
              </label>
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:border-[#0F766E] focus:bg-white text-xs outline-none transition-all"
              >
                <option value="doctor">Doctor / Attending Physician</option>
                <option value="student">Medical Student / Resident</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Primary Specialty
              </label>
              <input
                type="text"
                name="specialty"
                value={formData.specialty}
                onChange={handleChange}
                placeholder="e.g. Cardiology, Critical Care"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:border-[#0F766E] focus:bg-white text-xs outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Hospital / Institution
              </label>
              <input
                type="text"
                name="institution"
                value={formData.institution}
                onChange={handleChange}
                placeholder="e.g. Massachusetts General Hospital"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:border-[#0F766E] focus:bg-white text-xs outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Career Stage
              </label>
              <select
                name="career_stage"
                value={formData.career_stage}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:border-[#0F766E] focus:bg-white text-xs outline-none transition-all"
              >
                <option value="Attending Physician">Attending Physician / Consultant</option>
                <option value="Fellow">Clinical Fellow</option>
                <option value="Resident">Resident Physician (PGY 1-3)</option>
                <option value="Medical Student">Medical Student (MS 1-4)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Practice Location
              </label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleChange}
                placeholder="e.g. Boston, MA"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:border-[#0F766E] focus:bg-white text-xs outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Preferred Specialties (Drives Evidence Feed & Trending Panel)
            </label>
            <input
              type="text"
              name="preferred_specialties"
              value={formData.preferred_specialties}
              onChange={handleChange}
              placeholder="e.g. Cardiology, Nephrology, Endocrinology"
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:border-[#0F766E] focus:bg-white text-xs outline-none transition-all"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Separate with commas. The Trending Clinical Evidence sidebar and specialty notifications retrieve PubMed papers matching these terms.
            </p>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-[#0F766E] hover:bg-[#0D655E] text-white text-xs font-bold shadow-xs hover:shadow-teal-700/20 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4 text-cyan-200" />
              <span>{saving ? 'Saving changes...' : 'Save Profile'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
