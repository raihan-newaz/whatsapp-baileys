'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

interface Option {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  label?: string;
  className?: string;
  triggerClassName?: string;
  disabled?: boolean;
  icon?: React.ReactNode;
}

export function CustomSelect({
  value,
  onChange,
  options,
  placeholder = 'Select an option',
  label,
  className = '',
  triggerClassName = '',
  disabled = false,
  icon
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`space-y-2 w-full ${className}`} ref={containerRef}>
      {label && <label className="text-[11px] font-medium text-muted-foreground ml-1">{label}</label>}
      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen(!isOpen)}
          className={`
            flex h-10 w-full rounded-xl border bg-background px-3 py-2 text-sm
            text-foreground transition-all focus-visible:outline-none items-center justify-between gap-x-2
            ${isOpen 
              ? 'border-[#085E4D] border-2 ring-2 ring-[#085E4D]/10' 
              : 'border-input'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            ${triggerClassName || ''}
          `}
        >
          <div className="flex items-center gap-2 truncate">
            {(selectedOption?.icon || icon) && (
              <span className="shrink-0 flex items-center">
                {selectedOption?.icon || icon}
              </span>
            )}
            <span className={`truncate ${!selectedOption ? 'text-muted-foreground font-normal' : ''}`}>
              {selectedOption ? selectedOption.label : placeholder}
            </span>
          </div>
          <ChevronDown className={`w-4 h-4 text-muted-foreground/50 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="
            absolute z-[100] mt-2 min-w-full max-h-[250px] overflow-y-auto
            bg-card border border-border shadow-2xl 
            rounded-2xl 
            animate-in fade-in zoom-in-95 duration-200
            p-2 space-y-1 scrollbar-thin scrollbar-thumb-muted-foreground/20
          ">
            {options.length === 0 ? (
              <div className="px-5 py-4 text-sm text-muted-foreground text-center">
                No options available
              </div>
            ) : (
              options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`
                    w-full flex items-center justify-start gap-x-3
                    px-4 py-2.5 rounded-xl text-sm font-medium transition-all
                    ${value === option.value 
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' 
                      : 'text-foreground hover:bg-muted/50'
                    }
                  `}
                >
                  <div className="w-5 flex items-center justify-center shrink-0">
                    {value === option.value && (
                      <Check className="w-4 h-4 text-emerald-600" />
                    )}
                  </div>
                  {option.icon && (
                    <span className="shrink-0 flex items-center">{option.icon}</span>
                  )}
                  <span className="inline-block truncate">{option.label}</span>
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
