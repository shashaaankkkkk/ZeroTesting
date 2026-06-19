import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { RiUserAddLine } from 'react-icons/ri';
import { authApi } from '../api/auth';
import { useAuthStore } from '../stores/authStore';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [form, setForm] = useState({
    email: '', username: '', first_name: '', last_name: '',
    password: '', password_confirm: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);
    try {
      const res = await authApi.register(form);
      login(res.user, res.tokens.access, res.tokens.refresh);
      navigate('/');
    } catch (err: any) {
      const details = err.response?.data?.details || {};
      const fieldErrors: Record<string, string> = {};
      Object.keys(details).forEach((key) => {
        fieldErrors[key] = Array.isArray(details[key]) ? details[key][0] : details[key];
      });
      setErrors(fieldErrors);
    } finally {
      setLoading(false);
    }
  };

  const update = (field: string, value: string) => setForm({ ...form, [field]: value });

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-600 rounded-xl mb-4">
            <RiUserAddLine size={24} className="text-white" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Create your account</h1>
          <p className="text-sm text-gray-500 mt-1">Start automating your regression tests</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Input label="First Name" value={form.first_name} onChange={(e) => update('first_name', e.target.value)} error={errors.first_name} required />
              <Input label="Last Name" value={form.last_name} onChange={(e) => update('last_name', e.target.value)} error={errors.last_name} />
            </div>
            <Input label="Email" type="email" value={form.email} onChange={(e) => update('email', e.target.value)} error={errors.email} required />
            <Input label="Username" value={form.username} onChange={(e) => update('username', e.target.value)} error={errors.username} required />
            <Input label="Password" type="password" value={form.password} onChange={(e) => update('password', e.target.value)} error={errors.password} required />
            <Input label="Confirm Password" type="password" value={form.password_confirm} onChange={(e) => update('password_confirm', e.target.value)} error={errors.password_confirm} required />
            <Button type="submit" loading={loading} className="w-full">Create Account</Button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 mt-4">
          Already have an account?{' '}
          <Link to="/login" className="text-blue-600 hover:text-blue-700 font-medium">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
