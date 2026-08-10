import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import useAuth from '../../../hooks/useAuth';
import { useWorkspace } from '../../../context/WorkspaceContext';
import workspaceService from '../../../services/workspace.service';
import boardService from '../../../services/board.service';
import Icon from '../../../components/UI/Icon';

const TEMPLATES = [
  {
    id: 'software',
    title: 'Software Development',
    desc: 'Sprint planning, bug tracking, and code reviews',
    icon: 'layout',
    color: '#FF7A3D',
    defaultBoard: 'Engineering Roadmap',
  },
  {
    id: 'product',
    title: 'Product Management',
    desc: 'Feature backlogs, user feedback, and releases',
    icon: 'target',
    color: '#3B82F6',
    defaultBoard: 'Product Backlog',
  },
  {
    id: 'marketing',
    title: 'Marketing & Design',
    desc: 'Content calendar, campaign tracking, and assets',
    icon: 'zap',
    color: '#8B5CF6',
    defaultBoard: 'Marketing Campaigns',
  },
  {
    id: 'general',
    title: 'General Project Management',
    desc: 'Simple task list, milestones, and team tasks',
    icon: 'check-square',
    color: '#10B981',
    defaultBoard: 'Team Tasks',
  },
];

export const OnboardingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { refreshWorkspaces, setCurrentWorkspace } = useWorkspace();

  const [step, setStep] = useState<1 | 2>(1);
  const [workspaceName, setWorkspaceName] = useState('');
  const [nameError, setNameError] = useState('');
  const [nameTouched, setNameTouched] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('software');
  const [selectedColor, setSelectedColor] = useState('#FF7A3D');
  const [creating, setCreating] = useState(false);

  const firstName = user?.fullName ? user.fullName.split(' ')[0] : 'there';

  const validateWorkspaceName = (value: string): string => {
    const trimmed = value.trim();
    if (!trimmed) return 'Workspace name is required.';
    if (trimmed.length < 3) return 'Workspace name must be at least 3 characters.';
    if (trimmed.length > 50) return 'Workspace name must be at most 50 characters.';
    return '';
  };

  const handleNameChange = (val: string) => {
    setWorkspaceName(val);
    if (nameTouched) {
      setNameError(validateWorkspaceName(val));
    }
  };

  const handleStep1Next = (e: React.FormEvent) => {
    e.preventDefault();
    setNameTouched(true);
    const err = validateWorkspaceName(workspaceName);
    setNameError(err);
    if (err) {
      toast.error(err);
      return;
    }
    setStep(2);
  };

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    setNameTouched(true);
    const err = validateWorkspaceName(workspaceName);
    if (err) {
      setNameError(err);
      toast.error(err);
      setStep(1);
      return;
    }

    try {
      setCreating(true);
      const template = TEMPLATES.find((t) => t.id === selectedTemplate) || TEMPLATES[0];

      // 1. Create Workspace
      const createdWs = await workspaceService.createWorkspace({
        name: workspaceName.trim(),
        description: `Primary workspace for ${template.title}`,
        settings: { color: selectedColor },
      });

      const wsId = createdWs._id || createdWs.id || '';

      // 2. Create Initial Default Board
      if (wsId) {
        try {
          await boardService.createBoard(wsId, {
            name: template.defaultBoard,
            title: template.defaultBoard,
            description: `Initial board created from ${template.title} template`,
            color: selectedColor,
          });
        } catch (err) {
          console.error('Failed to create default board during onboarding:', err);
        }
      }

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

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col justify-between p-6 relative overflow-hidden font-sans">
      {/* Dynamic Ambient Backlight Glow */}
      <div
        className="absolute -top-40 -left-40 w-96 h-96 rounded-full blur-3xl opacity-20 pointer-events-none transition-all duration-700"
        style={{ background: selectedColor }}
      />
      <div
        className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full blur-3xl opacity-15 pointer-events-none transition-all duration-700"
        style={{ background: selectedColor }}
      />

      {/* Header */}
      <header className="max-w-5xl mx-auto w-full flex items-center justify-between py-4 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
            <div className="w-3.5 h-3.5 bg-white rounded-xs" />
          </div>
          <span className="text-xl font-bold tracking-tight font-display">TaskFlow</span>
        </div>
        <div className="text-xs text-neutral-400 font-medium">
          Step {step} of 2
        </div>
      </header>

      {/* Main Form Content */}
      <main className="max-w-xl mx-auto w-full my-auto py-8 relative z-10">
        {step === 1 ? (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center space-y-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-orange-500/10 text-orange-400 border border-orange-500/20">
                🚀 Welcome to TaskFlow
              </span>
              <h1 className="text-3xl sm:text-4xl font-extrabold font-display tracking-tight text-white">
                Let's set up your workspace, {firstName}
              </h1>
              <p className="text-sm text-neutral-400 max-w-md mx-auto">
                Workspaces are where your team collaborates on boards, tasks, and roadmaps.
              </p>
            </div>

            <form onSubmit={handleStep1Next} className="space-y-5 bg-neutral-900/90 border border-neutral-800 p-7 rounded-2xl shadow-2xl backdrop-blur-xl">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-2">
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
                  className={`w-full px-4 py-3 rounded-xl bg-neutral-950 text-white placeholder-neutral-500 text-sm outline-none transition border focus:ring-2 ${
                    nameError && nameTouched
                      ? 'border-rose-500 focus:ring-rose-500/20'
                      : 'border-neutral-800 focus:border-orange-500 focus:ring-orange-500/20'
                  }`}
                  autoFocus
                />
                <div className="flex items-center justify-between mt-2 text-xs">
                  {nameError && nameTouched ? (
                    <span className="text-rose-400 font-medium flex items-center gap-1">
                      <Icon name="alert-circle" size={13} />
                      {nameError}
                    </span>
                  ) : (
                    <span className="text-neutral-500">Must be between 3 and 50 characters</span>
                  )}
                  <span className={`font-mono text-[11px] ${workspaceName.length >= 45 ? 'text-amber-400 font-bold' : 'text-neutral-500'}`}>
                    {workspaceName.length}/50
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-2">
                  Accent Color
                </label>
                <div className="flex gap-3">
                  {['#FF7A3D', '#3B82F6', '#8B5CF6', '#10B981', '#EC4899', '#F59E0B'].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setSelectedColor(c)}
                      className={`w-9 h-9 rounded-xl transition-all cursor-pointer flex items-center justify-center ${
                        selectedColor === c ? 'ring-2 ring-white scale-110 shadow-lg' : 'opacity-70 hover:opacity-100'
                      }`}
                      style={{ background: c }}
                    >
                      {selectedColor === c && <Icon name="check" size={16} className="text-white" />}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={!workspaceName.trim()}
                className="w-full py-3.5 rounded-xl font-semibold text-sm transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: workspaceName.trim()
                    ? 'linear-gradient(135deg, #FF7A3D, #E8432E)'
                    : '#333333',
                  color: '#ffffff',
                }}
              >
                Continue to Template Selection <Icon name="arrow-right" size={16} />
              </button>
            </form>
          </div>
        ) : (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center space-y-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-400 hover:text-neutral-200 transition-colors mb-1 cursor-pointer"
              >
                <Icon name="arrow-left" size={14} /> Back to name
              </button>
              <h1 className="text-3xl font-extrabold font-display tracking-tight text-white">
                Choose a workflow template
              </h1>
              <p className="text-sm text-neutral-400">
                We'll pre-configure your initial board for "{workspaceName}".
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {TEMPLATES.map((tmpl) => {
                const isSelected = selectedTemplate === tmpl.id;
                return (
                  <button
                    key={tmpl.id}
                    type="button"
                    onClick={() => setSelectedTemplate(tmpl.id)}
                    className={`p-4 rounded-2xl text-left border transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-neutral-900 border-orange-500 ring-1 ring-orange-500 shadow-xl'
                        : 'bg-neutral-900/60 border-neutral-800 hover:border-neutral-700 opacity-80 hover:opacity-100'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-white"
                        style={{ background: tmpl.color }}
                      >
                        <Icon name={tmpl.icon} size={18} />
                      </div>
                      {isSelected && (
                        <span className="w-5 h-5 rounded-full bg-orange-500 text-white flex items-center justify-center text-xs">
                          <Icon name="check" size={12} />
                        </span>
                      )}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white mb-1">{tmpl.title}</h3>
                      <p className="text-xs text-neutral-400 leading-snug">{tmpl.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={handleCreateWorkspace}
              disabled={creating}
              className="w-full py-3.5 rounded-xl font-semibold text-sm transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg text-white"
              style={{
                background: 'linear-gradient(135deg, #FF7A3D, #E8432E)',
                boxShadow: '0 8px 24px rgba(232, 67, 46, 0.3)',
              }}
            >
              {creating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating Workspace & Initial Board…
                </>
              ) : (
                <>
                  <Icon name="sparkles" size={16} /> Launch Workspace
                </>
              )}
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="max-w-5xl mx-auto w-full text-center text-xs text-neutral-500 py-4 relative z-10">
        TaskFlow Enterprise Platform · Inspired by Linear & Notion
      </footer>
    </div>
  );
};

export default OnboardingPage;
