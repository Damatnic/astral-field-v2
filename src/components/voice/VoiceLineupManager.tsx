'use client';


import { handleComponentError } from '@/lib/error-handling';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Square, 
  CheckCircle,
  AlertCircle,
  MessageSquare,
  User,
  Users
} from 'lucide-react';
import { Card } from '@/components/ui/card';

interface Player {
  playerId: string;
  playerName: string;
  position: string;
  team: string;
  projectedPoints: number;
  status: 'ACTIVE' | 'INJURED' | 'QUESTIONABLE' | 'OUT';
}

interface VoiceCommand {
  id: string;
  command: string;
  timestamp: Date;
  confidence: number;
  action: string;
  result: 'SUCCESS' | 'FAILED' | 'PENDING';
}

interface VoiceLineupManagerProps {
  roster: Player[];
  currentLineup: Player[];
  onLineupChange: (lineup: Player[]) => void;
  leagueId: string;
  userId: string;
}

const VoiceLineupManager: React.FC<VoiceLineupManagerProps> = ({
  roster,
  currentLineup,
  onLineupChange,
  leagueId,
  userId
}) => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [transcript, setTranscript] = useState('');
  const [commands, setCommands] = useState<VoiceCommand[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResponse, setLastResponse] = useState('');
  const [confidence, setConfidence] = useState(0);
  
  const recognitionRef = useRef<any>(null);
  const synthesisRef = useRef<SpeechSynthesisUtterance | null>(null);

  const speak = useCallback((text: string) => {
    if (!voiceEnabled || !('speechSynthesis' in window)) return;
    
    setIsSpeaking(true);
    setLastResponse(text);
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1.0;
    utterance.volume = 0.8;
    
    utterance.onend = () => {
      setIsSpeaking(false);
    };
    
    synthesisRef.current = utterance;
    speechSynthesis.speak(utterance);
  }, [voiceEnabled]);

  const processVoiceCommand = useCallback(async (command: string, confidence: number) => {
    setIsProcessing(true);
    
    const commandId = `cmd_${Date.now()}`;
    const newCommand: VoiceCommand = {
      id: commandId,
      command,
      timestamp: new Date(),
      confidence,
      action: 'Processing...',
      result: 'PENDING'
    };
    
    setCommands(prev => [newCommand, ...prev.slice(0, 9)]);
    
    try {
      const response = await fetch('/api/voice/process-command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command,
          confidence,
          roster,
          currentLineup,
          leagueId,
          userId
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Update lineup if command resulted in changes
        if (result.newLineup) {
          onLineupChange(result.newLineup);
        }
        
        // Update command with result
        setCommands(prev => prev.map(cmd => 
          cmd.id === commandId 
            ? { ...cmd, action: result.action, result: 'SUCCESS' }
            : cmd
        ));
        
        speak(result.response);
      } else {
        setCommands(prev => prev.map(cmd => 
          cmd.id === commandId 
            ? { ...cmd, action: result.error || 'Failed to process', result: 'FAILED' }
            : cmd
        ));
        
        speak(result.error || 'Sorry, I could not process that command');
      }
    } catch (error) {
      handleComponentError(error as Error, 'VoiceLineupManager');
      
      setCommands(prev => prev.map(cmd => 
        cmd.id === commandId 
          ? { ...cmd, action: 'Network error', result: 'FAILED' }
          : cmd
      ));
      
      speak('Sorry, there was an error processing your command');
    } finally {
      setIsProcessing(false);
    }
  }, [roster, currentLineup, leagueId, userId, onLineupChange, speak]);

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';
      
      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
            setConfidence(event.results[i][0].confidence);
          } else {
            interimTranscript += transcript;
          }
        }
        
        setTranscript(finalTranscript || interimTranscript);
        
        if (finalTranscript) {
          processVoiceCommand(finalTranscript, event.results[event.results.length - 1][0].confidence);
        }
      };
      
      recognitionRef.current.onerror = (event: any) => {
        handleComponentError(event.error as Error, 'VoiceLineupManager');
        setIsListening(false);
      };
      
      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, [processVoiceCommand]);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      if (recognitionRef.current) {
        setTranscript('');
        recognitionRef.current.start();
        setIsListening(true);
      }
    }
  };

  const toggleVoice = () => {
    setVoiceEnabled(!voiceEnabled);
    if (isSpeaking) {
      speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  const stopSpeaking = () => {
    speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  const commandExamples = [
    "Start Josh Jacobs at running back",
    "Bench Justin Jefferson",
    "Who should I start at quarterback?",
    "Optimize my lineup for highest points",
    "Trade analysis for my wide receivers",
    "Show injury report for my players",
    "What's the weather impact for Sunday's games?"
  ];

  return (
    <div className="w-full space-y-6">
      {/* Voice Control Header */}
      <Card className="p-6 bg-gradient-to-r from-indigo-900/20 to-purple-900/20 border-indigo-500/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-indigo-500/20 rounded-lg">
              <Mic className="w-8 h-8 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Voice Lineup Manager</h2>
              <p className="text-gray-400">Control your fantasy team with voice commands</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={toggleVoice}
              className={`p-3 rounded-lg transition-colors ${
                voiceEnabled 
                  ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' 
                  : 'bg-gray-500/20 text-gray-400 hover:bg-gray-500/30'
              }`}
            >
              {voiceEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>
            
            {isSpeaking && (
              <button
                onClick={stopSpeaking}
                className="p-3 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg transition-colors"
              >
                <Square className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Voice Input */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Voice Input</h3>
            {isProcessing && (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-blue-400">Processing...</span>
              </div>
            )}
          </div>
          
          {/* Microphone Button */}
          <div className="flex flex-col items-center space-y-4">
            <motion.button
              onClick={toggleListening}
              className={`relative p-8 rounded-full transition-all duration-300 ${
                isListening 
                  ? 'bg-red-500 shadow-lg shadow-red-500/50' 
                  : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {isListening ? (
                <MicOff className="w-12 h-12 text-white" />
              ) : (
                <Mic className="w-12 h-12 text-white" />
              )}
              
              {isListening && (
                <motion.div
                  className="absolute inset-0 rounded-full border-4 border-red-300"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                />
              )}
            </motion.button>
            
            <p className="text-center text-gray-400">
              {isListening ? 'Listening... Click to stop' : 'Click to start voice commands'}
            </p>
          </div>
          
          {/* Live Transcript */}
          {transcript && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-gray-800/50 rounded-lg"
            >
              <div className="flex items-center space-x-2 mb-2">
                <MessageSquare className="w-4 h-4 text-blue-400" />
                <span className="text-sm text-blue-400">Live Transcript</span>
                {confidence > 0 && (
                  <span className="text-xs text-gray-500">
                    ({Math.round(confidence * 100)}% confidence)
                  </span>
                )}
              </div>
              <p className="text-white">{transcript}</p>
            </motion.div>
          )}
          
          {/* Last Response */}
          {lastResponse && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-green-900/20 border border-green-500/30 rounded-lg"
            >
              <div className="flex items-center space-x-2 mb-2">
                <Volume2 className="w-4 h-4 text-green-400" />
                <span className="text-sm text-green-400">Assistant Response</span>
              </div>
              <p className="text-white">{lastResponse}</p>
            </motion.div>
          )}
        </Card>

        {/* Command Examples */}
        <Card className="p-6 space-y-4">
          <h3 className="text-lg font-semibold text-white">Voice Commands</h3>
          <p className="text-gray-400 text-sm">Try these example commands:</p>
          
          <div className="space-y-2">
            {commandExamples.map((example, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="p-3 bg-gray-800/30 rounded-lg border border-gray-700/50 hover:border-indigo-500/50 transition-colors cursor-pointer"
                onClick={() => setTranscript(example)}
              >
                <div className="flex items-center space-x-2">
                  <Mic className="w-4 h-4 text-indigo-400" />
                  <span className="text-gray-300 text-sm">&quot;{example}&quot;</span>
                </div>
              </motion.div>
            ))}
          </div>
        </Card>
      </div>

      {/* Command History */}
      {commands.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Command History</h3>
          
          <div className="space-y-3">
            {commands.map((command) => (
              <motion.div
                key={command.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-gray-800/30 rounded-lg border border-gray-700/50"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <User className="w-4 h-4 text-blue-400" />
                      <span className="text-blue-400 text-sm">Command</span>
                      <span className="text-xs text-gray-500">
                        {command.timestamp.toLocaleTimeString()}
                      </span>
                      <span className="text-xs text-gray-500">
                        ({Math.round(command.confidence * 100)}% confidence)
                      </span>
                    </div>
                    <p className="text-white mb-2">&quot;{command.command}&quot;</p>
                    
                    <div className="flex items-center space-x-2">
                      <Users className="w-4 h-4 text-green-400" />
                      <span className="text-green-400 text-sm">Action</span>
                    </div>
                    <p className="text-gray-300 text-sm">{command.action}</p>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {command.result === 'SUCCESS' && (
                      <CheckCircle className="w-5 h-5 text-green-400" />
                    )}
                    {command.result === 'FAILED' && (
                      <AlertCircle className="w-5 h-5 text-red-400" />
                    )}
                    {command.result === 'PENDING' && (
                      <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

export default VoiceLineupManager;