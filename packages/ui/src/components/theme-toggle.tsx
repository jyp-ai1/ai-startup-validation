'use client';

import { Check, Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';

import { Button } from '@repo/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@repo/ui/components/dropdown-menu';
import { cn } from '@repo/ui/lib/utils';

const themes = [
  { value: 'light', icon: Sun },
  { value: 'dark', icon: Moon },
  { value: 'system', icon: Monitor },
] as const;

export function ThemeToggle({
  className,
  onThemeChange,
  tooltip,
  labels,
}: {
  className?: string;
  onThemeChange?: (theme: string) => void;
  tooltip?: string;
  labels?: { light: string; dark: string; system?: string };
}) {
  const { theme, setTheme } = useTheme();

  function handleChange(value: string) {
    setTheme(value);
    onThemeChange?.(value);
  }

  function labelFor(value: string) {
    if (!labels) return value;
    if (value === 'light') return labels.light;
    if (value === 'system') return labels.system ?? 'System';
    return labels.dark;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon-sm"
          className={cn('relative shrink-0', className)}
          aria-label={tooltip ?? 'Toggle theme'}
          title={tooltip}
        >
          <Sun className="size-4 scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
          <Moon className="absolute size-4 scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
          <span className="sr-only">{tooltip ?? 'Toggle theme'}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="z-[200] min-w-[9rem] border border-border bg-white shadow-xl dark:border-gray-800 dark:bg-gray-950"
      >
        {themes.map(({ value, icon: Icon }) => (
          <DropdownMenuItem
            key={value}
            onClick={() => handleChange(value)}
            title={labelFor(value)}
            aria-label={labelFor(value)}
            className="gap-2 px-3"
          >
            <Icon className="size-4" />
            <span className="text-sm">{labelFor(value)}</span>
            {theme === value ? <Check className="ml-auto size-3.5" /> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
