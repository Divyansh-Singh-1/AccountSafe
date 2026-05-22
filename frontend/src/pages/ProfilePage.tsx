import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getUserProfile, updateUserProfile, checkUsername } from "../services/authService";
import { useProfile } from "../contexts/ProfileContext";
import { Input, Button, DotGrid, MagicCard } from "../components/ui";
import { User, Mail, Phone, Building2, Camera, ShieldCheck, ShieldAlert, Check, X, ArrowLeft, Save, Sparkles } from "lucide-react";

interface UserProfile {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  company_name: string;
  profile_picture_url: string | null;
  display_name: string;
  gender?: string;
}

const ProfilePage: React.FC = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [originalUsername, setOriginalUsername] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Username availability check states
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [isUsernameAvailable, setIsUsernameAvailable] = useState<boolean | null>(null);

  const { setProfilePicture: setGlobalProfilePicture, setDisplayName: setGlobalDisplayName } = useProfile();

  // Form state
  const [formData, setFormData] = useState({
    username: "",
    first_name: "",
    last_name: "",
    phone_number: "",
    email: "",
    company_name: "",
    gender: "",
  });
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const navigate = useNavigate();

  const fetchData = useCallback(async () => {
    try {
      const profileData = await getUserProfile();
      setProfile(profileData);
      setOriginalUsername(profileData.username || "");
      setFormData({
        username: profileData.username || "",
        first_name: profileData.first_name || "",
        last_name: profileData.last_name || "",
        phone_number: profileData.phone_number || "",
        email: profileData.email || "",
        company_name: profileData.company_name || "",
        gender: profileData.gender || "",
      });
      setGlobalProfilePicture(profileData.profile_picture_url);
      setGlobalDisplayName(profileData.display_name || profileData.username || 'User');
    } catch (err: unknown) {
      console.error("Profile fetch error:", err);
      const axiosError = err as { response?: { status?: number } };
      if (axiosError.response?.status === 404) {
        setError("Profile not found. Please contact support.");
      } else {
        setError("Failed to load profile data");
      }
    } finally {
      setIsLoading(false);
    }
  }, [setGlobalProfilePicture, setGlobalDisplayName]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Username availability check with debounce
  useEffect(() => {
    if (!formData.username || formData.username === originalUsername) {
      setIsUsernameAvailable(null);
      setIsCheckingUsername(false);
      return;
    }

    setIsCheckingUsername(true);
    const timerId = setTimeout(() => {
      checkUsername(formData.username).then((data) => {
        setIsUsernameAvailable(!data.exists);
        setIsCheckingUsername(false);
      }).catch(() => {
        setIsCheckingUsername(false);
        setIsUsernameAvailable(null);
      });
    }, 500);

    return () => clearTimeout(timerId);
  }, [formData.username, originalUsername]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setError(null);
    setSuccess(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError("Profile picture must be less than 5MB");
        return;
      }
      const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
      if (!allowedTypes.includes(file.type)) {
        setError("Please upload a valid image file (JPEG, PNG, GIF, or WebP)");
        return;
      }
      setProfilePicture(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.username.trim()) {
      setError("Username is required");
      return;
    }
    if (!formData.email.trim()) {
      setError("Email is required");
      return;
    }
    if (formData.username !== originalUsername && isUsernameAvailable === false) {
      setError("This username is already taken");
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const formDataToSend = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        formDataToSend.append(key, value.trim());
      });
      if (profilePicture) {
        formDataToSend.append("profile_picture", profilePicture);
      }
      const response = await updateUserProfile(formDataToSend);
      setSuccess("Profile updated successfully!");
      setProfile(response);
      setOriginalUsername(response.username || formData.username);
      setGlobalProfilePicture(response.profile_picture_url);
      setGlobalDisplayName(response.display_name || response.username || 'User');
      setProfilePicture(null);
      setPreviewUrl(null);
      setIsUsernameAvailable(null);
    } catch (err: unknown) {
      console.error("Profile update error:", err);
      const axiosError = err as { response?: { data?: { username?: string[]; email?: string[]; error?: string } } };
      const errorMessage =
        axiosError.response?.data?.username?.[0] ||
        axiosError.response?.data?.email?.[0] ||
        axiosError.response?.data?.error ||
        "Failed to update profile";
      setError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const renderUsernameFeedback = () => {
    if (!formData.username || formData.username === originalUsername) return null;
    
    if (isCheckingUsername) {
      return (
        <div className="flex items-center gap-1.5 mt-1 text-xs text-zinc-500">
          <span className="w-3 h-3 border border-zinc-500 border-t-transparent rounded-full animate-spin"></span>
          <span>Validating security domain availability...</span>
        </div>
      );
    }
    
    if (isUsernameAvailable === true) {
      return (
        <div className="flex items-center gap-1.5 mt-1 text-xs text-emerald-500">
          <Check className="w-3.5 h-3.5" />
          <span>Username domain is secure & available</span>
        </div>
      );
    }
    
    if (isUsernameAvailable === false) {
      return (
        <div className="flex items-center gap-1.5 mt-1 text-xs text-red-500">
          <X className="w-3.5 h-3.5" />
          <span>Username domain is already allocated</span>
        </div>
      );
    }
    
    return null;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center relative overflow-hidden">
        <DotGrid />
        <div className="text-center relative z-10">
          <div className="w-12 h-12 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto shadow-[0_0_15px_rgba(6,182,212,0.3)]"></div>
          <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">Retrieving Vault Profile...</p>
        </div>
      </div>
    );
  }

  const currentProfileImage =
    previewUrl ||
    profile?.profile_picture_url ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(
      profile?.display_name || "User"
    )}&size=120&background=06b6d4&color=fff`;

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 relative overflow-hidden pb-12">
      {/* Background Dot Grid Matrix */}
      <DotGrid />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        
        {/* Page Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-cyan-500/10 rounded-xl border border-cyan-500/20 text-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.15)]">
              <User className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                Profile Identity
                <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
              </h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Manage your cryptographic profile and personal safe fields</p>
            </div>
          </div>
          
          <Button 
            variant="outline" 
            size="sm" 
            leftIcon={<ArrowLeft className="w-4 h-4" />}
            onClick={() => navigate(-1)}
          >
            Back to Safe
          </Button>
        </div>

        {/* Feedback Messages */}
        {error && (
          <div className="flex items-center gap-2.5 p-3.5 bg-red-500/10 border border-red-500/20 text-red-500 dark:text-red-400 rounded-xl text-xs mb-6 font-semibold animate-bounce">
            <ShieldAlert className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2.5 p-3.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-xl text-xs mb-6 font-semibold">
            <ShieldCheck className="w-5 h-5 flex-shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Profile Header MagicCard */}
          <MagicCard className="p-6">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              {/* Profile Photo Upload */}
              <div className="relative group rounded-full overflow-hidden w-24 h-24 ring-4 ring-zinc-800 focus-within:ring-cyan-500 transition-all duration-300">
                <img
                  src={currentProfileImage}
                  alt="Profile"
                  className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-300"
                />
                <label className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                  <Camera className="w-5 h-5 text-white" />
                  <span className="text-[10px] uppercase font-semibold tracking-wider text-white mt-1">Change</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </div>
              
              {/* Profile Details */}
              <div className="text-center sm:text-left flex-1">
                <h2 className="text-xl font-bold text-white tracking-tight">
                  {profile?.display_name || "User"}
                </h2>
                <p className="text-xs font-mono text-zinc-500 mt-0.5">@{profile?.username}</p>
                {profile?.email && (
                  <p className="text-xs text-zinc-400 mt-1">{profile.email}</p>
                )}
                
                <div className="mt-3 flex justify-center sm:justify-start">
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-cyan-400 bg-cyan-500/10 rounded-xl hover:bg-cyan-500/20 transition-all cursor-pointer border border-cyan-500/25">
                    <Camera className="w-3.5 h-3.5" />
                    Upload Image
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>
          </MagicCard>

          {/* Account Credentials MagicCard */}
          <MagicCard className="p-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-4 flex items-center gap-2 border-b border-zinc-800 pb-3">
              <User className="w-4 h-4 text-cyan-400" />
              Vault Coordinates
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Username Input */}
              <div>
                <Input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  required
                  minLength={3}
                  leftIcon={<User className="w-4 h-4" />}
                  placeholder="Domain Username"
                  label="Unique Username"
                  className={
                    formData.username !== originalUsername && isUsernameAvailable === false
                      ? "border-red-500/40 focus:border-red-500/50"
                      : ""
                  }
                />
                {renderUsernameFeedback()}
              </div>

              {/* Email Input */}
              <div>
                <Input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  leftIcon={<Mail className="w-4 h-4" />}
                  placeholder="safe@domain.com"
                  label="Registered Email Address"
                />
              </div>
            </div>
          </MagicCard>

          {/* Personal Domain MagicCard */}
          <MagicCard className="p-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-4 flex items-center gap-2 border-b border-zinc-800 pb-3">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              Personal Attributes
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* First Name */}
              <div>
                <Input
                  type="text"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleInputChange}
                  placeholder="First Name"
                  label="First Name"
                />
              </div>

              {/* Last Name */}
              <div>
                <Input
                  type="text"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleInputChange}
                  placeholder="Last Name"
                  label="Last Name"
                />
              </div>

              {/* Gender */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">Gender Selection</label>
                <div className="relative rounded-xl overflow-hidden bg-zinc-950/60 border border-zinc-800/80 backdrop-blur-md">
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleInputChange}
                    className="w-full bg-transparent text-zinc-100 text-sm h-10 px-3 py-2 focus:outline-none appearance-none pr-10"
                  >
                    <option value="" className="bg-[#09090b] text-zinc-400">Select Gender</option>
                    <option value="male" className="bg-[#09090b]">Male</option>
                    <option value="female" className="bg-[#09090b]">Female</option>
                    <option value="other" className="bg-[#09090b]">Other</option>
                    <option value="prefer_not_to_say" className="bg-[#09090b]">Prefer not to say</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-zinc-500">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </MagicCard>

          {/* Contact Coordinates MagicCard */}
          <MagicCard className="p-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-4 flex items-center gap-2 border-b border-zinc-800 pb-3">
              <Building2 className="w-4 h-4 text-cyan-400" />
              Contact & Business Channels
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Phone */}
              <div>
                <Input
                  type="tel"
                  name="phone_number"
                  value={formData.phone_number}
                  onChange={handleInputChange}
                  leftIcon={<Phone className="w-4 h-4" />}
                  placeholder="+1 (555) 000-0000"
                  label="Contact Phone Number"
                />
              </div>

              {/* Company */}
              <div>
                <Input
                  type="text"
                  name="company_name"
                  value={formData.company_name}
                  onChange={handleInputChange}
                  leftIcon={<Building2 className="w-4 h-4" />}
                  placeholder="Enterprise LLC"
                  label="Organization Name"
                />
              </div>
            </div>
          </MagicCard>

          {/* Form Actions */}
          <div className="flex justify-end gap-4 border-t border-zinc-900 pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(-1)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              leftIcon={<Save className="w-4 h-4" />}
              isLoading={isSaving}
              disabled={formData.username !== originalUsername && isUsernameAvailable === false}
            >
              Save Credentials
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfilePage;
