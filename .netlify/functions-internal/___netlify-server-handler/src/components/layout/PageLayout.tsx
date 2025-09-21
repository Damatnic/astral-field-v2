import React from 'react';
import { Container } from './Container';
import { Stack } from './Stack';

export interface PageLayoutProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  breadcrumbs?: React.ReactNode;
  sidebar?: React.ReactNode;
  fullWidth?: boolean;
  className?: string;
}

export interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  breadcrumbs?: React.ReactNode;
  className?: string;
}

export interface PageContentProps {
  children: React.ReactNode;
  className?: string;
}

export interface PageSidebarProps {
  children: React.ReactNode;
  position?: 'left' | 'right';
  width?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function PageLayout({
  children,
  title,
  description,
  actions,
  breadcrumbs,
  sidebar,
  fullWidth = false,
  className = ''
}: PageLayoutProps) {
  return (
    <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 ${className}`}>
      <Container size={fullWidth ? 'full' : 'xl'} padding="lg">
        <Stack spacing="xl">
          {/* Header */}
          {(title || breadcrumbs) && (
            <PageHeader
              title={title || ''}
              description={description}
              actions={actions}
              breadcrumbs={breadcrumbs}
            />
          )}

          {/* Main Content Area */}
          <div className={sidebar ? 'grid grid-cols-1 lg:grid-cols-4 gap-8' : ''}>
            {/* Sidebar */}
            {sidebar && (
              <div className="lg:col-span-1">
                {sidebar}
              </div>
            )}

            {/* Content */}
            <div className={sidebar ? 'lg:col-span-3' : ''}>
              {children}
            </div>
          </div>
        </Stack>
      </Container>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
  breadcrumbs,
  className = ''
}: PageHeaderProps) {
  return (
    <div className={`space-y-4 ${className}`}>
      {breadcrumbs && (
        <div className="text-sm">
          {breadcrumbs}
        </div>
      )}
      
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            {title}
          </h1>
          {description && (
            <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">
              {description}
            </p>
          )}
        </div>
        
        {actions && (
          <div className="flex-shrink-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}

export function PageContent({
  children,
  className = ''
}: PageContentProps) {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 ${className}`}>
      {children}
    </div>
  );
}

export function PageSidebar({
  children,
  width = 'md',
  className = ''
}: Omit<PageSidebarProps, 'position'>) {
  const widthClasses = {
    sm: 'w-64',
    md: 'w-80',
    lg: 'w-96'
  };

  return (
    <aside className={`${widthClasses[width]} ${className}`}>
      <div className="sticky top-8 space-y-6">
        {children}
      </div>
    </aside>
  );
}