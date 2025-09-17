'use client';

import { useState } from 'react';
import { CreateLeagueForm, WaiverMode } from '@/types/fantasy';

interface CreateLeagueModalProps {
  onClose: () => void;
  onSubmit: (data: CreateLeagueForm) => void;
}

export default function CreateLeagueModal({ onClose, onSubmit }: CreateLeagueModalProps) {
  const [formData, setFormData] = useState<CreateLeagueForm>({
    name: '',
    description: '',
    season: new Date().getFullYear(),
    teamCount: 10,
    rosterSettings: {
      QB: 1,
      RB: 2,
      WR: 2,
      TE: 1,
      FLEX: 1,
      K: 1,
      DST: 1,
      BENCH: 6,
      IR: 1
    },
    scoringSettings: {
      passing: {
        yards: 0.04,
        touchdowns: 4,
        interceptions: -2,
        twoPointConversions: 2
      },
      rushing: {
        yards: 0.1,
        touchdowns: 6,
        twoPointConversions: 2
      },
      receiving: {
        yards: 0.1,
        touchdowns: 6,
        receptions: 0.5,
        twoPointConversions: 2
      },
      kicking: {
        fieldGoals: {
          "0-39": 3,
          "40-49": 4,
          "50-59": 5,
          "60+": 6
        },
        extraPoints: 1
      },
      defense: {
        touchdowns: 6,
        interceptions: 2,
        fumbleRecoveries: 2,
        sacks: 1,
        safeties: 2,
        pointsAllowed: {
          "0": 10,
          "1-6": 7,
          "7-13": 4,
          "14-20": 1,
          "21-27": 0,
          "28-34": -1,
          "35+": -4
        }
      }
    },
    waiverMode: WaiverMode.ROLLING
  });

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Error creating league:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateFormData = (field: keyof CreateLeagueForm, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const updateRosterSettings = (position: string, value: number) => {
    setFormData(prev => ({
      ...prev,
      rosterSettings: {
        ...prev.rosterSettings,
        [position]: value
      }
    }));
  };

  const steps = [
    { id: 1, title: 'Basic Info', description: 'League name and settings' },
    { id: 2, title: 'Roster Setup', description: 'Configure roster positions' },
    { id: 3, title: 'Scoring', description: 'Set up scoring system' },
    { id: 4, title: 'Rules', description: 'Waiver and trade settings' }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900">Create New League</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Step indicator */}
          <div className="mt-4">
            <div className="flex items-center">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                    currentStep >= step.id 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    {step.id}
                  </div>
                  <div className="ml-2">
                    <p className={`text-sm font-medium ${
                      currentStep >= step.id ? 'text-blue-600' : 'text-gray-500'
                    }`}>
                      {step.title}
                    </p>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`w-12 h-0.5 mx-4 ${
                      currentStep > step.id ? 'bg-blue-600' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <div className="flex-1 overflow-y-auto p-6">
            {/* Step 1: Basic Info */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    League Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => updateFormData('name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter league name"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => updateFormData('description', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Describe your league (optional)"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Season *
                    </label>
                    <select
                      value={formData.season}
                      onChange={(e) => updateFormData('season', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value={2024}>2024</option>
                      <option value={2025}>2025</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Team Count *
                    </label>
                    <select
                      value={formData.teamCount}
                      onChange={(e) => updateFormData('teamCount', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    >
                      {[4, 6, 8, 10, 12, 14, 16].map(count => (
                        <option key={count} value={count}>{count} Teams</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Roster Setup */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-gray-900">Roster Configuration</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {Object.entries(formData.rosterSettings).map(([position, count]) => (
                    <div key={position}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {position}
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="10"
                        value={count}
                        onChange={(e) => updateRosterSettings(position, parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  ))}
                </div>
                
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    <strong>Total Roster Size:</strong> {Object.values(formData.rosterSettings).reduce((a, b) => a + b, 0)} players
                  </p>
                  <p className="text-sm text-blue-700 mt-1">
                    Recommended: 15-18 total roster spots for a balanced league
                  </p>
                </div>
              </div>
            )}

            {/* Step 3: Scoring */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-gray-900">Scoring System</h3>
                <div className="bg-yellow-50 rounded-lg p-4">
                  <p className="text-sm text-yellow-800">
                    Using standard PPR (Point Per Reception) scoring. You can customize these settings after creating the league.
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Passing</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Passing Yards</span>
                        <span>0.04 pts/yard</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Passing TDs</span>
                        <span>4 pts</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Interceptions</span>
                        <span>-2 pts</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Rushing/Receiving</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Rushing/Receiving Yards</span>
                        <span>0.1 pts/yard</span>
                      </div>
                      <div className="flex justify-between">
                        <span>TDs</span>
                        <span>6 pts</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Receptions</span>
                        <span>0.5 pts (PPR)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Rules */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-gray-900">League Rules</h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Waiver System
                  </label>
                  <select
                    value={formData.waiverMode}
                    onChange={(e) => updateFormData('waiverMode', e.target.value as WaiverMode)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value={WaiverMode.ROLLING}>Rolling Waivers</option>
                    <option value={WaiverMode.FAAB}>FAAB (Free Agent Acquisition Budget)</option>
                    <option value={WaiverMode.REVERSE_STANDINGS}>Reverse Standings</option>
                  </select>
                  <p className="text-sm text-gray-500 mt-1">
                    {formData.waiverMode === WaiverMode.ROLLING && "Waiver priority rotates after successful claims"}
                    {formData.waiverMode === WaiverMode.FAAB && "Teams bid on free agents using a budget"}
                    {formData.waiverMode === WaiverMode.REVERSE_STANDINGS && "Worst teams get waiver priority"}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Trade Deadline (Optional)
                  </label>
                  <input
                    type="date"
                    value={formData.tradeDeadline}
                    onChange={(e) => updateFormData('tradeDeadline', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Leave blank to allow trades throughout the season
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 flex justify-between">
            <div>
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={() => setCurrentStep(currentStep - 1)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Back
                </button>
              )}
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              
              {currentStep < steps.length ? (
                <button
                  type="button"
                  onClick={() => setCurrentStep(currentStep + 1)}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Next
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={loading || !formData.name}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create League'}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}