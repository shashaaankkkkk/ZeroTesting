import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { RiUser3Line, RiLockPasswordLine } from 'react-icons/ri';
import { authApi } from '../api/auth';
import Button from '../components/ui/Button';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { useUIStore } from '../stores/uiStore';
import { useAuthStore } from '../stores/authStore';

export default function ProfilePage() {
  const queryClient = useQueryClient();
  const { addToast } = useUIStore();
  const { setUser } = useAuthStore();

  const [profileForm, setProfileForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
  });

  const [pwForm, setPwForm] = useState({
    old_password: '',
    new_password: '',
    confirm_password: '',
  });

  const { data: user, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: () => authApi.getProfile(),
  });

  useEffect(() => {
    if (user) {
      setProfileForm({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email,
      });
    }
  }, [user]);

  const updateProfileMutation = useMutation({
    mutationFn: (data: Partial<typeof profileForm>) => authApi.updateProfile(data),
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(['profile'], updatedUser);
      setUser(updatedUser);
      addToast('success', 'Profile updated successfully');
    },
    onError: (err: any) => {
      addToast('error', err.response?.data?.message || 'Failed to update profile');
    },
  });

  const changePwMutation = useMutation({
    mutationFn: (data: any) => authApi.changePassword(data),
    onSuccess: () => {
      setPwForm({ old_password: '', new_password: '', confirm_password: '' });
      addToast('success', 'Password changed successfully');
    },
    onError: (err: any) => {
      addToast('error', err.response?.data?.message || 'Failed to change password');
    },
  });

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile Details Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 mb-2">
            <RiUser3Line /> Profile Details
          </h3>
          <form
            onSubmit={(e: React.FormEvent) => {
              e.preventDefault();
              updateProfileMutation.mutate({
                first_name: profileForm.first_name,
                last_name: profileForm.last_name,
              });
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <input
                type="email"
                value={profileForm.email}
                disabled
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
              />
              <span className="text-[10px] text-gray-400 mt-1 block">Email cannot be changed.</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                <input
                  type="text"
                  value={profileForm.first_name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setProfileForm({ ...profileForm, first_name: e.target.value })}
                  required
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                <input
                  type="text"
                  value={profileForm.last_name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setProfileForm({ ...profileForm, last_name: e.target.value })}
                  required
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit" loading={updateProfileMutation.isPending}>
                Save Profile
              </Button>
            </div>
          </form>
        </div>

        {/* Change Password Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 mb-2">
            <RiLockPasswordLine /> Change Password
          </h3>
          <form
            onSubmit={(e: React.FormEvent) => {
              e.preventDefault();
              if (pwForm.new_password !== pwForm.confirm_password) {
                addToast('error', 'New passwords do not match');
                return;
              }
              changePwMutation.mutate({
                old_password: pwForm.old_password,
                new_password: pwForm.new_password,
              });
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
              <input
                type="password"
                value={pwForm.old_password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPwForm({ ...pwForm, old_password: e.target.value })}
                required
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
              <input
                type="password"
                value={pwForm.new_password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPwForm({ ...pwForm, new_password: e.target.value })}
                required
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
              <input
                type="password"
                value={pwForm.confirm_password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPwForm({ ...pwForm, confirm_password: e.target.value })}
                required
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex justify-end">
              <Button type="submit" loading={changePwMutation.isPending}>
                Change Password
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
