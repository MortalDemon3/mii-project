import { useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Save, LogOut, Trash2, Lock } from 'lucide-react';

interface ProfilePageProps {
  user: { id: string; email: string; username: string };
  onBack: () => void;
  onLogout: () => void;
  onUpdate: (updates: { username?: string; email?: string; currentPassword?: string; newPassword?: string }) => Promise<any>;
  onDelete: () => Promise<void>;
}

export default function ProfilePage({ user, onBack, onLogout, onUpdate, onDelete }: ProfilePageProps) {
  const { t } = useTranslation();
  const [username, setUsername] = useState(user.username);
  const [email, setEmail] = useState(user.email);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [savingPw, setSavingPw] = useState(false);
  const [error, setError] = useState('');
  const [pwError, setPwError] = useState('');
  const [success, setSuccess] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const errorMessages: Record<string, string> = {
    email_taken: t('auth.emailTaken'),
    username_too_short: t('auth.usernameTooShort'),
    password_too_short: t('auth.passwordTooShort'),
    wrong_current_password: t('profile.wrongCurrentPassword'),
  };

  const handleSaveProfile = async () => {
    setError(''); setSuccess('');
    setSaving(true);
    try {
      await onUpdate({ username, email });
      setSuccess(t('profile.saved'));
    } catch (err: any) {
      setError(errorMessages[err.error] || err.error || t('auth.error'));
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    setPwError(''); setPwSuccess('');
    setSavingPw(true);
    try {
      await onUpdate({ currentPassword, newPassword });
      setPwSuccess(t('profile.passwordChanged'));
      setCurrentPassword(''); setNewPassword('');
    } catch (err: any) {
      setPwError(errorMessages[err.error] || err.error || t('auth.error'));
    } finally {
      setSavingPw(false);
    }
  };

  const handleDelete = async () => {
    await onDelete();
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" onClick={onBack} className="text-muted-foreground">
          <ArrowLeft size={16} className="mr-2" /> {t('common.back')}
        </Button>
        <Button variant="ghost" onClick={onLogout} className="text-destructive">
          <LogOut size={16} className="mr-2" /> {t('profile.logout')}
        </Button>
      </div>

      {/* Profile info */}
      <div className="card-game rounded-2xl p-6 mb-6">
        <h2 className="font-display text-2xl font-bold text-foreground mb-4">{t('profile.title')}</h2>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">{t('profile.username')}</label>
            <Input value={username} onChange={e => setUsername(e.target.value)} className="bg-muted border-border text-foreground" maxLength={20} minLength={3} />
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">{t('auth.email')}</label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} className="bg-muted border-border text-foreground" />
          </div>
          {error && <p className="text-destructive text-sm">{error}</p>}
          {success && <p className="text-accent text-sm">{success}</p>}
          <Button onClick={handleSaveProfile} disabled={saving} className="btn-play">
            <Save size={16} className="mr-2" /> {saving ? t('common.saving') : t('common.save')}
          </Button>
        </div>
      </div>

      {/* Change password */}
      <div className="card-game rounded-2xl p-6 mb-6">
        <h3 className="font-display text-lg font-bold text-foreground mb-4 flex items-center gap-2">
          <Lock size={18} /> {t('profile.changePassword')}
        </h3>
        <div className="space-y-4">
          <Input
            type="password"
            placeholder={t('profile.currentPassword')}
            value={currentPassword}
            onChange={e => setCurrentPassword(e.target.value)}
            className="bg-muted border-border text-foreground placeholder:text-muted-foreground"
          />
          <Input
            type="password"
            placeholder={t('profile.newPassword')}
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            className="bg-muted border-border text-foreground placeholder:text-muted-foreground"
            minLength={8}
          />
          {pwError && <p className="text-destructive text-sm">{pwError}</p>}
          {pwSuccess && <p className="text-accent text-sm">{pwSuccess}</p>}
          <Button onClick={handleChangePassword} disabled={savingPw || !currentPassword || !newPassword} className="btn-play">
            <Save size={16} className="mr-2" /> {savingPw ? t('common.saving') : t('profile.updatePassword')}
          </Button>
        </div>
      </div>

      {/* Delete account */}
      <div className="card-game rounded-2xl p-6 border border-destructive/20">
        <h3 className="font-display text-lg font-bold text-destructive mb-2">{t('profile.dangerZone')}</h3>
        {!showDeleteConfirm ? (
          <Button variant="destructive" onClick={() => setShowDeleteConfirm(true)}>
            <Trash2 size={16} className="mr-2" /> {t('profile.deleteAccount')}
          </Button>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{t('profile.deleteConfirm')}</p>
            <div className="flex gap-3">
              <Button variant="destructive" onClick={handleDelete}>
                {t('profile.confirmDelete')}
              </Button>
              <Button variant="ghost" onClick={() => setShowDeleteConfirm(false)}>
                {t('common.cancel')}
              </Button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
