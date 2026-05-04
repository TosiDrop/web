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
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm text-slate-200">Theme</p>
        <p className="mt-0.5 text-[11px] text-slate-500">
          Light mode rolls out with the next design pass.
        </p>
      </div>
      <div className="inline-flex rounded-lg border border-border-subtle bg-surface-inset/80 p-0.5">
        {OPTIONS.map(({ value, label, Icon }) => {
          const active = theme === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => setTheme(value)}
              className={
                'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs transition-all duration-200 ' +
                (active
                  ? 'bg-surface-overlay text-white shadow-[0_0_0_1px_rgba(34,211,238,0.25),0_0_18px_-8px_rgba(34,211,238,0.55)]'
                  : 'text-slate-500 hover:text-slate-200')
              }
              aria-pressed={active}
            >
              <Icon size={13} stroke={1.6} />
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
