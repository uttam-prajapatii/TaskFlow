/**
 * Reusable dynamic workspace accent color system.
 * Scoped strictly to workspace cards, avatars, and workspace-specific indicators.
 * The global theme remains TaskFlow's standard neutral/orange UI.
 */

export interface WorkspaceColorOption {
  id: string;
  label: string;
  hex: string;
}

export const WORKSPACE_COLOR_OPTIONS: WorkspaceColorOption[] = [
  { id: 'coral', label: 'Coral', hex: '#FF7A3D' },
  { id: 'blue', label: 'Blue', hex: '#3D8BFF' },
  { id: 'green', label: 'Green', hex: '#3DDC97' },
  { id: 'violet', label: 'Violet', hex: '#B97DFF' },
  { id: 'amber', label: 'Amber', hex: '#FFB13D' },
  { id: 'pink', label: 'Pink', hex: '#FF5FA0' },
];

export const WORKSPACE_COLOR_MAP: Record<string, string> = {
  coral: '#FF7A3D',
  orange: '#FF7A3D',
  blue: '#3D8BFF',
  green: '#3DDC97',
  violet: '#B97DFF',
  purple: '#B97DFF',
  amber: '#FFB13D',
  yellow: '#FFB13D',
  pink: '#FF5FA0',
};

export interface WorkspaceColorTokens {
  id: string;
  hex: string;
  softBg: string;
  badgeBg: string;
  border: string;
  borderHover: string;
  glow: string;
  gradient: string;
  avatarGradient: string;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('');
  }
  if (clean.length !== 6) {
    return { r: 255, g: 122, b: 61 }; // Default coral
  }
  const num = parseInt(clean, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

export function resolveWorkspaceColorHex(colorInput?: string): string {
  if (!colorInput) return WORKSPACE_COLOR_MAP.coral;
  const key = colorInput.toLowerCase().trim();
  return WORKSPACE_COLOR_MAP[key] || (key.startsWith('#') ? colorInput : `#${colorInput}`);
}

export function getWorkspaceColorTokens(colorInput?: string): WorkspaceColorTokens {
  const hex = resolveWorkspaceColorHex(colorInput);
  const { r, g, b } = hexToRgb(hex);

  // Darker shade for avatar gradient
  const rDark = Math.max(0, Math.floor(r * 0.8));
  const gDark = Math.max(0, Math.floor(g * 0.8));
  const bDark = Math.max(0, Math.floor(b * 0.8));
  const darkHex = `rgb(${rDark}, ${gDark}, ${bDark})`;

  return {
    id: colorInput || 'coral',
    hex,
    softBg: `rgba(${r}, ${g}, ${b}, 0.08)`,
    badgeBg: `rgba(${r}, ${g}, ${b}, 0.12)`,
    border: `rgba(${r}, ${g}, ${b}, 0.25)`,
    borderHover: `rgba(${r}, ${g}, ${b}, 0.45)`,
    glow: `0 3px 12px rgba(${r}, ${g}, ${b}, 0.22)`,
    gradient: `linear-gradient(135deg, ${hex}, ${hex}E6)`,
    avatarGradient: `linear-gradient(135deg, ${hex}, ${darkHex})`,
  };
}

export default getWorkspaceColorTokens;
