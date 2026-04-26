'use client';

import { useState, useRef, useEffect } from 'react';
import { Building2, Check, Sparkles } from 'lucide-react';
import { Tenant } from '@/types/navigation';
import { cn } from '@/lib/utils';

interface TenantSelectorProps {
  tenants: Tenant[];
  currentTenantId: string;
  collapsed: boolean;
  onTenantChange: (tenantId: string) => void;
}

export function TenantSelector({
  tenants,
  currentTenantId,
  collapsed,
  onTenantChange
}: TenantSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const currentTenant = tenants.find((t) => t.id === currentTenantId);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleTenantSelect = (tenantId: string) => {
    onTenantChange(tenantId);
    setIsOpen(false);
  };

  if (collapsed) {
    return null;
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'w-full group relative overflow-hidden',
          'bg-gradient-to-br from-blue-50 via-sky-50 to-blue-50',
          'border border-blue-200/60 rounded-xl',
          'p-3 transition-all duration-300',
          'hover:shadow-lg hover:shadow-blue-200/50',
          'hover:border-blue-300',
          'focus:outline-none focus:ring-2 focus:ring-blue-500/30',
          isOpen && 'ring-2 ring-blue-500/30 shadow-lg shadow-blue-200/50 border-blue-300'
        )}
      >
        {/* Animated shimmer effect */}
        <div
          className={cn(
            'absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700',
            'bg-gradient-to-r from-transparent via-white/40 to-transparent',
            'animate-shimmer'
          )}
          style={{
            backgroundSize: '200% 100%',
          }}
        />

        <div className="relative flex items-center gap-3">
          {/* Logo/Icon with glow effect */}
          <div
            className={cn(
              'relative w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0',
              'bg-gradient-to-br from-blue-600 to-indigo-600',
              'shadow-lg shadow-blue-500/30',
              'transition-all duration-300',
              'group-hover:shadow-xl group-hover:shadow-blue-500/40',
              'group-hover:scale-110',
              isOpen && 'scale-110 shadow-xl shadow-blue-500/40'
            )}
          >
            {currentTenant?.logo ? (
              <img
                src={currentTenant.logo}
                alt={currentTenant.name}
                className="w-5 h-5 object-contain"
              />
            ) : (
              <Building2 className="w-5 h-5 text-white" />
            )}

            {/* Sparkle effect */}
            <Sparkles
              className={cn(
                'absolute -top-1 -right-1 w-3 h-3 text-yellow-400',
                'transition-all duration-300',
                'opacity-0 scale-0',
                'group-hover:opacity-100 group-hover:scale-100'
              )}
            />
          </div>

          {/* Tenant Name */}
          <div className="flex-1 text-left min-w-0">
            <p className="text-sm font-bold text-slate-800 truncate leading-tight">
              {currentTenant?.name || 'Select Workspace'}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              {tenants.length} workspace{tenants.length !== 1 ? 's' : ''} available
            </p>
          </div>

          {/* Animated indicator */}
          <div
            className={cn(
              'flex flex-col gap-0.5 transition-transform duration-300',
              isOpen && 'rotate-180'
            )}
          >
            <div className="w-1 h-1 rounded-full bg-blue-400" />
            <div className="w-1 h-1 rounded-full bg-blue-500" />
            <div className="w-1 h-1 rounded-full bg-blue-600" />
          </div>
        </div>
      </button>

      {/* Dropdown Menu */}
      <div
        className={cn(
          'absolute top-full left-0 right-0 mt-2 z-50',
          'transition-all duration-300 origin-top',
          isOpen
            ? 'opacity-100 scale-y-100 translate-y-0'
            : 'opacity-0 scale-y-95 -translate-y-2 pointer-events-none'
        )}
      >
        <div className="bg-white rounded-xl border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden backdrop-blur-xl">
          {/* Header */}
          <div className="px-4 py-3 bg-gradient-to-r from-slate-50 to-slate-100/50 border-b border-slate-200">
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
              Switch Workspace
            </p>
          </div>

          {/* Tenant List */}
          <div className="p-1.5 max-h-64 overflow-y-auto">
            {tenants.map((tenant, index) => {
              const isSelected = tenant.id === currentTenantId;

              return (
                <button
                  key={tenant.id}
                  onClick={() => handleTenantSelect(tenant.id)}
                  className={cn(
                    'w-full group/item relative overflow-hidden',
                    'rounded-lg px-3 py-2.5',
                    'transition-all duration-200',
                    'hover:bg-gradient-to-br hover:from-blue-50 hover:to-sky-50',
                    isSelected && 'bg-gradient-to-br from-blue-50 to-sky-50 shadow-sm',
                    index !== tenants.length - 1 && 'mb-1'
                  )}
                  style={{
                    transitionDelay: isOpen ? `${index * 40}ms` : '0ms',
                  }}
                >
                  {/* Hover glow */}
                  <div
                    className={cn(
                      'absolute inset-0 opacity-0 group-hover/item:opacity-100 transition-opacity duration-300',
                      'bg-gradient-to-r from-blue-500/5 to-sky-500/5'
                    )}
                  />

                  <div className="relative flex items-center gap-3">
                    {/* Logo */}
                    <div
                      className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                        'transition-all duration-200',
                        isSelected
                          ? 'bg-gradient-to-br from-blue-600 to-indigo-600 shadow-md shadow-blue-500/30'
                          : 'bg-slate-100 group-hover/item:bg-gradient-to-br group-hover/item:from-blue-600 group-hover/item:to-indigo-600'
                      )}
                    >
                      {tenant.logo ? (
                        <img
                          src={tenant.logo}
                          alt={tenant.name}
                          className={cn(
                            'w-4 h-4 object-contain transition-all',
                            isSelected && 'brightness-0 invert'
                          )}
                        />
                      ) : (
                        <Building2
                          className={cn(
                            'w-4 h-4 transition-colors',
                            isSelected
                              ? 'text-white'
                              : 'text-slate-600 group-hover/item:text-white'
                          )}
                        />
                      )}
                    </div>

                    {/* Name */}
                    <span
                      className={cn(
                        'flex-1 text-sm font-medium text-left truncate transition-colors',
                        isSelected
                          ? 'text-slate-900'
                          : 'text-slate-700 group-hover/item:text-slate-900'
                      )}
                    >
                      {tenant.name}
                    </span>

                    {/* Check indicator */}
                    {isSelected && (
                      <div className="flex items-center gap-1">
                        <Check className="w-4 h-4 text-blue-600" />
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Custom shimmer animation */}
      <style jsx>{`
        @keyframes shimmer {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }
        .animate-shimmer {
          animation: shimmer 3s infinite;
        }
      `}</style>
    </div>
  );
}
