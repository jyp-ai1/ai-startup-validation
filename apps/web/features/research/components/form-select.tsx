'use client';

import { useState } from 'react';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

type FormSelectOption = {
  value: string;
  label: string;
};

type FormSelectProps = {
  name: string;
  options: FormSelectOption[];
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
  className?: string;
  'aria-invalid'?: boolean;
};

export function FormSelect({
  name,
  options,
  defaultValue = '',
  placeholder = 'Select...',
  required,
  className,
  'aria-invalid': ariaInvalid,
}: FormSelectProps) {
  const [value, setValue] = useState(defaultValue);

  return (
    <>
      <input type="hidden" name={name} value={value} required={required} />
      <Select value={value || undefined} onValueChange={setValue} required={required}>
        <SelectTrigger
          className={cn('w-full', className)}
          aria-invalid={ariaInvalid}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  );
}
