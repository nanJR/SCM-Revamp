export function formatMaterialTitleCase(mat: string): string {
  if (!mat) return '';
  return mat
    .replace(/_/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((word) => {
      const upper = word.toUpperCase();
      if (upper === 'RCA' || upper === 'C&D' || upper === 'PWM' || upper === 'CPCB') {
        return upper;
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

export function getMaterialBadgeStyles(mat: string): string {
  const norm = (mat || '').toLowerCase().replace(/[\s-]/g, '_');

  if (norm.includes('concrete') || norm.includes('aggregate') || norm.includes('rca')) {
    return 'bg-sky-100 text-sky-900 border border-sky-300 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800';
  }
  if (norm.includes('fly_ash') || norm.includes('ash')) {
    return 'bg-purple-100 text-purple-900 border border-purple-300 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800';
  }
  if (norm.includes('oil')) {
    return 'bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800';
  }
  if (norm.includes('chrome')) {
    return 'bg-rose-100 text-rose-900 border border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800';
  }
  if (norm.includes('steel') || norm.includes('slag')) {
    return 'bg-indigo-100 text-indigo-900 border border-indigo-300 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800';
  }
  if (norm.includes('plastic')) {
    return 'bg-teal-100 text-teal-900 border border-teal-300 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800';
  }
  if (norm.includes('metal')) {
    return 'bg-blue-100 text-blue-900 border border-blue-300 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800';
  }
  if (norm.includes('dye') || norm.includes('sludge')) {
    return 'bg-fuchsia-100 text-fuchsia-900 border border-fuchsia-300 dark:bg-fuchsia-950/40 dark:text-fuchsia-300 dark:border-fuchsia-800';
  }
  return 'bg-orange-100 text-orange-900 border border-orange-300 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800';
}

export function getVehicleBadgeStyles(vehicleType: string): string {
  const norm = (vehicleType || '').toLowerCase();

  if (norm.includes('mini truck')) {
    return 'bg-lime-100 text-lime-900 border border-lime-300 dark:bg-lime-950/40 dark:text-lime-300 dark:border-lime-800';
  }
  if (norm.includes('10-wheeler')) {
    return 'bg-blue-100 text-blue-900 border border-blue-300 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800';
  }
  if (norm.includes('tipper')) {
    return 'bg-indigo-100 text-indigo-900 border border-indigo-300 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800';
  }
  if (norm.includes('tanker')) {
    return 'bg-rose-100 text-rose-900 border border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800';
  }
  return 'bg-muted text-foreground border border-border';
}
