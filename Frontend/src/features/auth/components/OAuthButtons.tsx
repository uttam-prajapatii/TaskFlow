import React from 'react';

const OAuthButtons: React.FC = () => {
  const handleGoogleLogin = () => {
    console.log('Initiating Google OAuth login...');
  };

  const handleGitHubLogin = () => {
    console.log('Initiating GitHub OAuth login...');
  };

  return (
    <div className="flex gap-2.5 mb-[22px]">
      <button
        onClick={handleGoogleLogin}
        type="button"
        className="flex-1 flex items-center justify-center gap-2.5 py-[11px] rounded-lg border border-line bg-white font-sans font-semibold text-[13.5px] text-ink cursor-pointer hover:border-[#E8BBA6] hover:shadow-[0_6px_16px_-8px_rgba(190,60,20,0.35)] hover:-translate-y-[1px] active:translate-y-0 transition-all duration-200"
      >
        <svg className="w-[18px] h-[18px] shrink-0" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.3h6.47c-.28 1.5-1.13 2.78-2.4 3.63v3.02h3.89c2.28-2.1 3.53-5.2 3.53-8.68z"/>
          <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.92l-3.89-3.02c-1.08.72-2.46 1.15-4.04 1.15-3.1 0-5.73-2.09-6.67-4.9H1.32v3.08C3.29 21.3 7.32 24 12 24z"/>
          <path fill="#FBBC05" d="M5.33 14.31A7.2 7.2 0 0 1 4.96 12c0-.8.14-1.58.37-2.31V6.61H1.32A11.98 11.98 0 0 0 0 12c0 1.93.46 3.76 1.32 5.39l4.01-3.08z"/>
          <path fill="#EA4335" d="M12 4.77c1.76 0 3.35.61 4.6 1.8l3.45-3.45C17.94 1.19 15.24 0 12 0 7.32 0 3.29 2.7 1.32 6.61l4.01 3.08c.94-2.81 3.57-4.92 6.67-4.92z"/>
        </svg>
        Google
      </button>
      <button
        onClick={handleGitHubLogin}
        type="button"
        className="flex-1 flex items-center justify-center gap-2.5 py-[11px] rounded-lg border border-line bg-white font-sans font-semibold text-[13.5px] text-ink cursor-pointer hover:border-[#E8BBA6] hover:shadow-[0_6px_16px_-8px_rgba(190,60,20,0.35)] hover:-translate-y-[1px] active:translate-y-0 transition-all duration-200"
      >
        <svg className="w-[18px] h-[18px] shrink-0" viewBox="0 0 24 24">
          <path fill="#181717" d="M12 .3a12 12 0 0 0-3.79 23.4c.6.11.82-.26.82-.58v-2.02c-3.34.73-4.04-1.61-4.04-1.61-.55-1.4-1.34-1.77-1.34-1.77-1.09-.75.08-.73.08-.73 1.21.08 1.85 1.24 1.85 1.24 1.07 1.84 2.81 1.3 3.49 1 .11-.78.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.66.24 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.63-5.49 5.92.43.37.81 1.1.81 2.22v3.29c0 .32.22.7.83.58A12 12 0 0 0 12 .3z"/>
        </svg>
        GitHub
      </button>
    </div>
  );
};

export default OAuthButtons;
