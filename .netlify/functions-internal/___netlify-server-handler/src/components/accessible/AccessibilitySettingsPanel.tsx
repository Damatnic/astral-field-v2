'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAccessibility, AccessibleButton } from '@/utils/accessibility';
import {
  Settings,
  Eye,
  EyeOff,
  Type,
  Keyboard,
  Volume2,
  Contrast,
  MousePointer,
  Zap,
  CheckCircle,
  Info,
  RotateCcw
} from 'lucide-react';

// Accessibility Settings Panel Component
export function AccessibilitySettingsPanel() {
  const { settings, updateSettings, announceToScreenReader } = useAccessibility();
  const [isOpen, setIsOpen] = useState(false);

  const handleSettingChange = (setting: keyof typeof settings, value: boolean) => {
    updateSettings({ [setting]: value });
    
    // Announce the change to screen readers
    const settingNames = {
      highContrast: 'High contrast mode',
      reducedMotion: 'Reduced motion',
      largeText: 'Large text',
      keyboardNavigation: 'Keyboard navigation',
      screenReaderOptimized: 'Screen reader optimization',
      focusIndicators: 'Focus indicators'
    };
    
    const announcement = `${settingNames[setting]} ${value ? 'enabled' : 'disabled'}`;
    announceToScreenReader(announcement);
  };

  const resetToDefaults = () => {
    updateSettings({
      highContrast: false,
      reducedMotion: false,
      largeText: false,
      keyboardNavigation: true,
      screenReaderOptimized: false,
      focusIndicators: true
    });
    announceToScreenReader('Accessibility settings reset to defaults');
  };

  return (
    <>
      {/* Accessibility Settings Toggle Button */}
      <div className="fixed bottom-6 left-6 z-50">
        <AccessibleButton
          variant="primary"
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          aria-controls="accessibility-settings-panel"
          aria-label="Open accessibility settings"
          className="rounded-full p-4 shadow-lg"
        >
          <Settings className="w-6 h-6" />
        </AccessibleButton>
      </div>

      {/* Settings Panel */}
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, x: -300 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -300 }}
          className="fixed left-0 top-0 bottom-0 w-96 bg-white shadow-2xl border-r border-gray-200 z-50 overflow-y-auto"
          id="accessibility-settings-panel"
          role="dialog"
          aria-labelledby="accessibility-settings-title"
          aria-modal="true"
        >
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <h2 
                id="accessibility-settings-title"
                className="text-xl font-bold text-gray-900"
              >
                Accessibility Settings
              </h2>
              <AccessibleButton
                variant="ghost"
                onClick={() => setIsOpen(false)}
                aria-label="Close accessibility settings"
                className="p-2"
              >
                <EyeOff className="w-5 h-5" />
              </AccessibleButton>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              Customize your experience for better accessibility
            </p>
          </div>

          {/* Settings Content */}
          <div className="p-6 space-y-6">
            
            {/* Visual Settings */}
            <fieldset>
              <legend className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Eye className="w-5 h-5 mr-2" />
                Visual Settings
              </legend>
              
              <div className="space-y-4">
                <SettingToggle
                  id="high-contrast"
                  label="High Contrast Mode"
                  description="Increases color contrast for better visibility"
                  icon={Contrast}
                  checked={settings.highContrast}
                  onChange={(checked) => handleSettingChange('highContrast', checked)}
                />
                
                <SettingToggle
                  id="large-text"
                  label="Large Text"
                  description="Increases font size throughout the application"
                  icon={Type}
                  checked={settings.largeText}
                  onChange={(checked) => handleSettingChange('largeText', checked)}
                />
                
                <SettingToggle
                  id="focus-indicators"
                  label="Enhanced Focus Indicators"
                  description="Displays clear focus outlines for keyboard navigation"
                  icon={MousePointer}
                  checked={settings.focusIndicators}
                  onChange={(checked) => handleSettingChange('focusIndicators', checked)}
                />
              </div>
            </fieldset>

            {/* Motion Settings */}
            <fieldset>
              <legend className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Zap className="w-5 h-5 mr-2" />
                Motion Settings
              </legend>
              
              <div className="space-y-4">
                <SettingToggle
                  id="reduced-motion"
                  label="Reduce Motion"
                  description="Minimizes animations and transitions"
                  icon={Zap}
                  checked={settings.reducedMotion}
                  onChange={(checked) => handleSettingChange('reducedMotion', checked)}
                />
              </div>
            </fieldset>

            {/* Input Settings */}
            <fieldset>
              <legend className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Keyboard className="w-5 h-5 mr-2" />
                Input Settings
              </legend>
              
              <div className="space-y-4">
                <SettingToggle
                  id="keyboard-navigation"
                  label="Keyboard Navigation"
                  description="Enables full keyboard navigation support"
                  icon={Keyboard}
                  checked={settings.keyboardNavigation}
                  onChange={(checked) => handleSettingChange('keyboardNavigation', checked)}
                />
              </div>
            </fieldset>

            {/* Screen Reader Settings */}
            <fieldset>
              <legend className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Volume2 className="w-5 h-5 mr-2" />
                Screen Reader Settings
              </legend>
              
              <div className="space-y-4">
                <SettingToggle
                  id="screen-reader-optimized"
                  label="Screen Reader Optimization"
                  description="Provides enhanced announcements and descriptions"
                  icon={Volume2}
                  checked={settings.screenReaderOptimized}
                  onChange={(checked) => handleSettingChange('screenReaderOptimized', checked)}
                />
              </div>
            </fieldset>

            {/* Accessibility Information */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start">
                <Info className="w-5 h-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="text-sm font-semibold text-blue-900 mb-2">
                    Accessibility Features
                  </h3>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• WCAG 2.1 AA compliant</li>
                    <li>• Screen reader compatible</li>
                    <li>• Full keyboard navigation</li>
                    <li>• High contrast support</li>
                    <li>• Reduced motion options</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Reset Button */}
            <div className="pt-4 border-t border-gray-200">
              <AccessibleButton
                variant="secondary"
                onClick={resetToDefaults}
                className="w-full justify-center"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset to Defaults
              </AccessibleButton>
            </div>
          </div>
        </motion.div>
      )}

      {/* Overlay */}
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-25 z-40"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}
    </>
  );
}

// Setting Toggle Component
function SettingToggle({
  id,
  label,
  description,
  icon: Icon,
  checked,
  onChange
}: {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start space-x-3">
      <div className="flex items-center space-x-3 flex-1">
        <Icon className="w-5 h-5 text-gray-600 flex-shrink-0 mt-1" />
        <div className="flex-1">
          <label 
            htmlFor={id}
            className="text-sm font-medium text-gray-900 cursor-pointer block"
          >
            {label}
          </label>
          <p className="text-xs text-gray-600 mt-1">
            {description}
          </p>
        </div>
      </div>
      
      <div className="flex-shrink-0">
        <button
          id={id}
          type="button"
          role="switch"
          aria-checked={checked}
          onClick={() => onChange(!checked)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
            checked ? 'bg-blue-600' : 'bg-gray-200'
          }`}
          aria-describedby={`${id}-description`}
        >
          <span className="sr-only">{label}</span>
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              checked ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
          {checked && (
            <CheckCircle className="absolute right-1 w-3 h-3 text-white" />
          )}
        </button>
        <div id={`${id}-description`} className="sr-only">
          {description}
        </div>
      </div>
    </div>
  );
}

// Keyboard Shortcuts Help Modal
export function KeyboardShortcutsModal({ 
  isOpen, 
  onClose 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
}) {
  if (!isOpen) return null;

  const shortcuts = [
    { keys: 'Tab', description: 'Navigate forward through interactive elements' },
    { keys: 'Shift + Tab', description: 'Navigate backward through interactive elements' },
    { keys: 'Enter', description: 'Activate buttons and links' },
    { keys: 'Space', description: 'Activate buttons and checkboxes' },
    { keys: 'Arrow Keys', description: 'Navigate within lists and menus' },
    { keys: 'Escape', description: 'Close modals and menus' },
    { keys: 'Home', description: 'Go to first item in a list' },
    { keys: 'End', description: 'Go to last item in a list' },
    { keys: 'Ctrl + F', description: 'Open search' },
    { keys: '/', description: 'Focus search input (when available)' }
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-labelledby="shortcuts-title"
      aria-modal="true"
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
      >
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 id="shortcuts-title" className="text-xl font-bold text-gray-900">
              Keyboard Shortcuts
            </h2>
            <AccessibleButton
              variant="ghost"
              onClick={onClose}
              aria-label="Close keyboard shortcuts help"
            >
              <EyeOff className="w-5 h-5" />
            </AccessibleButton>
          </div>
        </div>
        
        <div className="p-6 overflow-y-auto">
          <div className="space-y-4">
            {shortcuts.map((shortcut, index) => (
              <div key={index} className="flex items-center justify-between py-2">
                <span className="text-sm text-gray-900">{shortcut.description}</span>
                <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-xs font-mono text-gray-800">
                  {shortcut.keys}
                </kbd>
              </div>
            ))}
          </div>
          
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">Additional Help</h3>
            <p className="text-sm text-blue-800">
              For screen reader users, this application provides comprehensive ARIA labels, 
              live regions for dynamic content updates, and semantic HTML structure.
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}