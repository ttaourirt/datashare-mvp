/** Règles d'upload (US01), miroir de UploadPolicy côté back : validées des deux côtés. */
export const MAX_FILE_BYTES = 1_073_741_824; // 1 Go
export const MIN_FILE_PASSWORD = 6;

const BLOCKED_EXTENSIONS = ['exe', 'bat', 'cmd', 'com', 'cpl', 'msi', 'ps1', 'sh', 'vbs', 'js', 'jar', 'scr'];

export const EXPIRATION_OPTIONS = [
  { days: 1, label: 'Une journée' },
  { days: 2, label: 'Deux jours' },
  { days: 3, label: 'Trois jours' },
  { days: 4, label: 'Quatre jours' },
  { days: 5, label: 'Cinq jours' },
  { days: 6, label: 'Six jours' },
  { days: 7, label: 'Une semaine' },
];

export function fileError(file: File): string | null {
  if (file.size === 0) return 'Le fichier est vide.';
  if (file.size > MAX_FILE_BYTES) return 'La taille des fichiers est limitée à 1 Go';
  const dot = file.name.lastIndexOf('.');
  const ext = dot < 0 ? '' : file.name.slice(dot + 1).toLowerCase();
  if (BLOCKED_EXTENSIONS.includes(ext)) return `Les fichiers .${ext} ne sont pas autorisés`;
  return null;
}

export function durationLabel(days: number): string {
  return EXPIRATION_OPTIONS.find(o => o.days === days)?.label.toLowerCase() ?? `${days} jours`;
}
