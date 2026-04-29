import { IconMoon, IconSun } from '@tabler/icons-react';
import { useThemeStore, type Theme } from '@/store/theme-state';

const OPTIONS: { value: Theme; label: string; Icon: typeof IconSun }[] = [
  { value: 'dark', label: 'Dark', Icon: IconMoon },
  { value: 'light', label: 'Light', Icon: IconSun },
];

export function ThemeToggle() {
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);

  return (
    <div className="space-y-2">
      <label className="block text-xs text-slate-400">Theme</label>
      <div className="inline-flex rounded-lg border border-border-subtle bg-surface-inset p-0.5">
        {OPTIONS.map(({ value, label, Icon }) => {
          const active = theme === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => setTheme(value)}
              className={
                'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs transition ' +
                (active
                  ? 'bg-surface-raised text-white'
                  : 'text-slate-400 hover:text-slate-200')
              }
              aria-pressed={active}
            >
              <Icon size={14} stroke={1.5} />
              {label}
            </button>
          );
        })}
      </div>
      <p className="text-[11px] text-slate-500">Light mode styles roll out with the next design pass.</p>
    </div>
  );
}
