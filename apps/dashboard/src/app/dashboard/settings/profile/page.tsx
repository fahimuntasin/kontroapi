'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, User } from 'lucide-react';
import { toast } from 'sonner';

interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  plan: string | null;
  created_at: string | null;
}

export default function ProfilePage() {
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const res = await fetch('/api/auth/me');
      if (!res.ok) return;
      const data = await res.json();
      if (!data.success) return;
      setUser({ id: data.data.id, email: data.data.email });
      setProfile(data.data);
      setFullName(data.data.full_name ?? '');
      setPhone(data.data.phone ?? '');
      setLoading(false);
    }
    load();
  }, []);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const res = await fetch('/api/profile/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ full_name: fullName, phone }),
    });
    const data = await res.json();
    if (!data.success) {
      toast.error('Failed to update profile');
    } else {
      toast.success('Profile updated!');
      setProfile((prev) => prev ? { ...prev, full_name: fullName, phone } : prev);
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
          <p className="mt-1 text-[14px] text-muted-foreground">Manage your account details.</p>
        </div>
        {profile?.plan && (
          <Badge className="rounded-full bg-[#3a3fd4]/10 text-[#3a3fd4] dark:bg-[#5c5ff5]/10 dark:text-[#5c5ff5] px-3 py-1 text-[12px] font-medium capitalize">
            {profile.plan}
          </Badge>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[15px]">
                <User className="h-4 w-4" />
                Account Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-muted-foreground">Full Name</label>
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-muted-foreground">Email</label>
                <Input value={user?.email ?? profile?.email ?? ''} readOnly className="opacity-60" />
                <p className="text-[11px] text-muted-foreground">Email cannot be changed</p>
              </div>
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-muted-foreground">Phone</label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="8801XXXXXXXXX"
                />
              </div>
              <Button onClick={handleSave} disabled={saving} className="gap-2 rounded-xl">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Changes
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="text-[15px]">Account Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-[13px]">
                <span className="text-muted-foreground">User ID</span>
                <code className="text-[12px] font-mono text-muted-foreground">{user?.id ?? profile?.id}</code>
              </div>
              <div className="flex justify-between text-[13px]">
                <span className="text-muted-foreground">Member since</span>
                <span className="text-muted-foreground">
                  {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="border-border/60">
            <CardContent className="flex flex-col items-center p-6 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#3a3fd4] to-[#5c5ff5] text-white text-2xl font-bold mb-3">
                {(fullName || user?.email || 'U').charAt(0).toUpperCase()}
              </div>
              <p className="text-[15px] font-medium">{fullName || user?.email || 'User'}</p>
              {profile?.plan && (
                <Badge className="mt-2 rounded-full bg-[#3a3fd4]/10 text-[#3a3fd4] dark:bg-[#5c5ff5]/10 dark:text-[#5c5ff5] text-[11px] capitalize">
                  {profile.plan} Plan
                </Badge>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
