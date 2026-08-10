import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import useAuth from '../../../hooks/useAuth';
import { useWorkspace } from '../../../context/WorkspaceContext';
import workspaceService from '../../../services/workspace.service';
import Icon from '../../../components/UI/Icon';
import { WORKSPACE_COLORS } from '../components/WorkspaceCard';

const COLOR_OPTIONS = [
  { id: 'coral', label: 'Coral', hex: WORKSPACE_COLORS.coral || '#FF7A3D' },
  { id: 'blue', label: 'Blue', hex: WORKSPACE_COLORS.blue || '#3D8BFF' },
  { id: 'green', label: 'Green', hex: WORKSPACE_COLORS.green || '#3DDC97' },
  { id: 'violet', label: 'Violet', hex: WORKSPACE_COLORS.violet || '#B97DFF' },
  { id: 'amber', label: 'Amber', hex: WORKSPACE_COLORS.amber || '#FFB13D' },
  { id: 'pink', label: 'Pink', hex: WORKSPACE_COLORS.pink || '#FF5FA0' },
];

export const OnboardingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { workspaces, loading, refreshWorkspaces, setCurrentWorkspace } = useWorkspace();

  const [workspaceName, setWorkspaceName] = useState('');
  const [nameError, setNameError] = useState('');
  const [nameTouched, setNameTouched] = useState(false);
  const [selectedColor, setSelectedColor] = useState('coral');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!loading && workspaces.length >= 1 && !creating) {
      navigate('/workspace-select', { replace: true });
    }
  }, [loading, workspaces.length, creating, navigate]);

  const firstName = user?.fullName ? user.fullName.split(' ')[0] : 'there';

  const validateWorkspaceName = (value: string): string => {
    const trimmed = value.trim();
    if (!trimmed) return 'Workspace name is required.';
    if (trimmed.length < 3) return 'Workspace name must be at least 3 characters.';
    if (trimmed.length > 50) return 'Workspace name must be at most 50 characters.';
    return '';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Loading workspaces…</span>
      </div>
    );
  }

  const handleNameChange = (val: string) => {
    setWorkspaceName(val);
    if (nameTouched) {
      setNameError(validateWorkspaceName(val));
    }
  };

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    setNameTouched(true);
    const err = validateWorkspaceName(workspaceName);
    if (err) {
      setNameError(err);
      toast.error(err);
      return;
    }

    try {
      setCreating(true);

      // Create Workspace (do NOT create default board as requested)
      const createdWs = await workspaceService.createWorkspace({
        name: workspaceName.trim(),
        description: `Primary workspace for ${workspaceName.trim()}`,
        settings: { color: selectedColor },
      });

      const wsId = createdWs._id || createdWs.id || '';

      await refreshWorkspaces();
      setCurrentWorkspace(createdWs);
      toast.success(`Welcome to ${createdWs.name}! Workspace created successfully.`);
      navigate(`/workspaces/${wsId}`);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || 'Failed to create workspace');
    } finally {
      setCreating(false);
    }
  };

  const activeColorHex = COLOR_OPTIONS.find((c) => c.id === selectedColor)?.hex || '#FF7A3D';

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 flex flex-col justify-between p-6 relative overflow-hidden font-sans">
      {/* Dynamic Ambient Backlight Glow */}
      <div
        className="absolute -top-40 -left-40 w-96 h-96 rounded-full blur-3xl opacity-15 pointer-events-none transition-all duration-700"
        style={{ background: activeColorHex }}
      />
      <div
        className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full blur-3xl opacity-10 pointer-events-none transition-all duration-700"
        style={{ background: activeColorHex }}
      />

      {/* Header with official logo */}
      <header className="max-w-5xl mx-auto w-full flex items-center justify-between py-4 relative z-10">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="TaskFlow Logo" className="w-9 h-9 rounded-xl object-contain shadow-md" />
          <span className="text-xl font-bold tracking-tight font-display text-neutral-900 dark:text-white">TaskFlow</span>
        </div>
      </header>

      {/* Main Centered Form Content */}
      <main className="flex-1 flex flex-col items-center justify-center max-w-lg mx-auto w-full py-8 relative z-10">
        <div className="w-full space-y-6 animate-fade-in">
          <div className="text-center space-y-2">
            <h1 className="text-3xl sm:text-4xl font-extrabold font-display tracking-tight text-neutral-900 dark:text-white">
              Let's set up your workspace, {firstName}
            </h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-md mx-auto">
              Workspaces are where your team collaborates on boards, tasks, and roadmaps.
            </p>
          </div>

          <form
            onSubmit={handleCreateWorkspace}
            className="space-y-6 bg-white dark:bg-neutral-900/90 border border-neutral-200 dark:border-neutral-800 p-8 rounded-2xl shadow-xl backdrop-blur-xl"
          >
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-2">
                Workspace Name
              </label>
              <input
                type="text"
                maxLength={50}
                placeholder="e.g. Acme Corp, Engineering Team, My Projects"
                value={workspaceName}
                onChange={(e) => handleNameChange(e.target.value)}
                onBlur={() => {
                  setNameTouched(true);
                  setNameError(validateWorkspaceName(workspaceName));
                }}
                className={`w-full px-4 py-3 rounded-xl bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 text-sm outline-none transition border focus:ring-2 ${
                  nameError && nameTouched
                    ? 'border-rose-500 focus:ring-rose-500/20'
                    : 'border-neutral-200 dark:border-neutral-800 focus:border-orange-500 focus:ring-orange-500/20'
                }`}
                autoFocus
              />
              <div className="flex items-center justify-between mt-2 text-xs">
                {nameError && nameTouched ? (
                  <span className="text-rose-500 dark:text-rose-400 font-medium flex items-center gap-1">
                    <Icon name="alert-circle" size={13} />
                    {nameError}
                  </span>
                ) : (
                  <span className="text-neutral-400 dark:text-neutral-500">Must be between 3 and 50 characters</span>
                )}
                <span
                  className={`font-mono text-[11px] ${
                    workspaceName.length >= 45 ? 'text-amber-500 font-bold' : 'text-neutral-400 dark:text-neutral-500'
                  }`}
                >
                  {workspaceName.length}/50
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-2">
                Accent Color
              </label>
              <div className="flex items-center justify-between gap-3">
                {COLOR_OPTIONS.map((c) => {
                  const isSelected = selectedColor === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedColor(c.id)}
                      title={c.label}
                      className={`w-9 h-9 rounded-xl transition-all cursor-pointer flex items-center justify-center ${
                        isSelected
                          ? 'ring-2 ring-orange-500 dark:ring-white scale-110 shadow-lg'
                          : 'opacity-70 hover:opacity-100'
                      }`}
                      style={{ background: c.hex }}
                    >
                      {isSelected && <Icon name="check" size={16} className="text-white" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              disabled={creating || !workspaceName.trim()}
              className="w-full py-3.5 rounded-xl font-semibold text-sm transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg text-white disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: workspaceName.trim()
                  ? 'linear-gradient(135deg, #FF7A3D, #E8432E)'
                  : '#a3a3a3',
                boxShadow: workspaceName.trim() ? '0 8px 24px rgba(232, 67, 46, 0.3)' : 'none',
              }}
            >
              {creating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating Workspace…
                </>
              ) : (
                <>
                  <Icon name="sparkles" size={16} /> Launch Workspace
                </>
              )}
            </button>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-5xl mx-auto w-full text-center text-xs text-neutral-400 dark:text-neutral-500 py-4 relative z-10">
        TaskFlow Enterprise Platform · Inspired by Linear & Notion
      </footer>
    </div>
  );
};

export default OnboardingPage;
