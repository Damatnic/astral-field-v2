'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Camera, 
  Smartphone,
  Eye,
  EyeOff,
  RotateCcw,
  Maximize,
  Minimize,
  Zap,
  Star,
  TrendingUp,
  TrendingDown,
  Activity,
  Shield,
  Target,
  Award,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { Card } from '@/components/ui/card';

interface Player {
  playerId: string;
  playerName: string;
  position: string;
  team: string;
  projectedPoints: number;
  actualPoints?: number;
  status: 'ACTIVE' | 'INJURED' | 'QUESTIONABLE' | 'OUT';
  photoUrl?: string;
  stats?: {
    yards: number;
    touchdowns: number;
    receptions?: number;
    targets?: number;
    rushingAttempts?: number;
  };
  trends?: {
    lastFiveGames: number[];
    seasonAverage: number;
    trend: 'UP' | 'DOWN' | 'STABLE';
  };
}

interface ARPlayerCardsProps {
  players: Player[];
  selectedPlayer?: Player;
  onPlayerSelect: (player: Player) => void;
  layoutMode?: '3D' | '2D' | 'HOLOGRAM';
}

const ARPlayerCards: React.FC<ARPlayerCardsProps> = ({
  players,
  selectedPlayer,
  onPlayerSelect,
  layoutMode = '3D'
}) => {
  const [arSupported, setArSupported] = useState(false);
  const [arActive, setArActive] = useState(false);
  const [cameraPermission, setCameraPermission] = useState<'granted' | 'denied' | 'pending'>('pending');
  const [currentLayout, setCurrentLayout] = useState(layoutMode);
  const [rotation, setRotation] = useState({ x: 0, y: 0, z: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [animationSpeed, setAnimationSpeed] = useState(1);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Check AR support
  useEffect(() => {
    const checkARSupport = async () => {
      if ('xr' in navigator) {
        try {
          const isSupported = await (navigator as any).xr.isSessionSupported('immersive-ar');
          setArSupported(isSupported);
        } catch (error) {
          console.log('AR not supported:', error);
          setArSupported(false);
        }
      } else {
        setArSupported(false);
      }
    };

    checkARSupport();
  }, []);

  // Request camera permission
  const requestCameraPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      
      setCameraPermission('granted');
      return true;
    } catch (error) {
      console.error('Camera permission denied:', error);
      setCameraPermission('denied');
      return false;
    }
  };

  // Toggle AR mode
  const toggleAR = async () => {
    if (!arActive) {
      const hasPermission = await requestCameraPermission();
      if (hasPermission) {
        setArActive(true);
      }
    } else {
      setArActive(false);
      if (videoRef.current?.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach(track => track.stop());
      }
    }
  };

  // Auto-rotate cards
  useEffect(() => {
    if (currentLayout === '3D' && arActive) {
      const interval = setInterval(() => {
        setRotation(prev => ({
          x: prev.x + 0.5 * animationSpeed,
          y: prev.y + 1 * animationSpeed,
          z: prev.z + 0.3 * animationSpeed
        }));
      }, 50);

      return () => clearInterval(interval);
    }
  }, [currentLayout, arActive, animationSpeed]);

  const getPlayerCardStyle = (player: Player, index: number) => {
    const baseStyle: React.CSSProperties = {
      transformStyle: 'preserve-3d',
      transition: 'all 0.3s ease',
    };

    if (currentLayout === '3D') {
      const angle = (index * 360) / players.length;
      const radius = 200;
      const x = Math.cos((angle * Math.PI) / 180) * radius;
      const z = Math.sin((angle * Math.PI) / 180) * radius;

      return {
        ...baseStyle,
        transform: `
          translateX(${x}px) 
          translateZ(${z}px) 
          rotateX(${rotation.x}deg) 
          rotateY(${rotation.y + angle}deg) 
          rotateZ(${rotation.z}deg)
        `,
      };
    }

    if (currentLayout === 'HOLOGRAM') {
      return {
        ...baseStyle,
        transform: `
          translateY(${Math.sin(Date.now() * 0.001 + index) * 10}px)
          rotateY(${rotation.y}deg)
        `,
        filter: 'brightness(1.2) contrast(1.1) hue-rotate(180deg)',
        boxShadow: '0 0 30px rgba(0, 255, 255, 0.5)',
      };
    }

    return baseStyle;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'text-green-400';
      case 'QUESTIONABLE': return 'text-yellow-400';
      case 'INJURED': return 'text-orange-400';
      case 'OUT': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getTrendIcon = (trend?: string) => {
    switch (trend) {
      case 'UP': return <TrendingUp className="w-4 h-4 text-green-400" />;
      case 'DOWN': return <TrendingDown className="w-4 h-4 text-red-400" />;
      default: return <Activity className="w-4 h-4 text-gray-400" />;
    }
  };

  const renderPlayerCard = (player: Player, index: number) => (
    <motion.div
      key={player.playerId}
      className={`
        relative cursor-pointer group
        ${selectedPlayer?.playerId === player.playerId ? 'z-20 scale-110' : 'z-10'}
      `}
      style={getPlayerCardStyle(player, index)}
      onClick={() => onPlayerSelect(player)}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      layout
    >
      <Card className={`
        p-4 w-80 h-96 bg-gradient-to-br from-gray-900/90 to-gray-800/90 
        border-2 backdrop-blur-md
        ${selectedPlayer?.playerId === player.playerId 
          ? 'border-blue-500 shadow-lg shadow-blue-500/50' 
          : 'border-gray-600 hover:border-blue-400'
        }
        ${currentLayout === 'HOLOGRAM' ? 'bg-opacity-20 border-cyan-400' : ''}
      `}>
        {/* Player Photo */}
        <div className="relative mb-4">
          {player.photoUrl ? (
            <img
              src={player.photoUrl}
              alt={player.playerName}
              className="w-20 h-20 rounded-full mx-auto object-cover border-2 border-gray-600"
            />
          ) : (
            <div className="w-20 h-20 rounded-full mx-auto bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <span className="text-2xl font-bold text-white">
                {player.playerName.split(' ').map(n => n[0]).join('')}
              </span>
            </div>
          )}
          
          {/* Status indicator */}
          <div className={`absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center ${
            player.status === 'ACTIVE' ? 'bg-green-500' : 
            player.status === 'QUESTIONABLE' ? 'bg-yellow-500' :
            'bg-red-500'
          }`}>
            {player.status === 'ACTIVE' ? (
              <CheckCircle className="w-4 h-4 text-white" />
            ) : (
              <AlertCircle className="w-4 h-4 text-white" />
            )}
          </div>
        </div>

        {/* Player Info */}
        <div className="text-center mb-4">
          <h3 className="text-lg font-bold text-white mb-1">{player.playerName}</h3>
          <div className="flex items-center justify-center space-x-2 text-sm">
            <span className="text-blue-400">{player.position}</span>
            <span className="text-gray-400">•</span>
            <span className="text-gray-400">{player.team}</span>
          </div>
          <div className={`text-sm mt-1 ${getStatusColor(player.status)}`}>
            {player.status}
          </div>
        </div>

        {/* Stats */}
        <div className="space-y-3">
          {/* Projected Points */}
          <div className="flex items-center justify-between p-2 bg-gray-800/50 rounded-lg">
            <div className="flex items-center space-x-2">
              <Target className="w-4 h-4 text-blue-400" />
              <span className="text-sm text-gray-300">Projected</span>
            </div>
            <span className="text-lg font-bold text-white">
              {player.projectedPoints.toFixed(1)}
            </span>
          </div>

          {/* Actual Points (if available) */}
          {player.actualPoints !== undefined && (
            <div className="flex items-center justify-between p-2 bg-gray-800/50 rounded-lg">
              <div className="flex items-center space-x-2">
                <Star className="w-4 h-4 text-yellow-400" />
                <span className="text-sm text-gray-300">Actual</span>
              </div>
              <span className="text-lg font-bold text-white">
                {player.actualPoints.toFixed(1)}
              </span>
            </div>
          )}

          {/* Trend */}
          {player.trends && (
            <div className="flex items-center justify-between p-2 bg-gray-800/50 rounded-lg">
              <div className="flex items-center space-x-2">
                {getTrendIcon(player.trends.trend)}
                <span className="text-sm text-gray-300">Trend</span>
              </div>
              <span className="text-sm text-gray-300">
                {player.trends.seasonAverage.toFixed(1)} avg
              </span>
            </div>
          )}

          {/* Key Stats */}
          {player.stats && (
            <div className="space-y-2">
              {player.stats.yards > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Yards</span>
                  <span className="text-white">{player.stats.yards}</span>
                </div>
              )}
              {player.stats.touchdowns > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">TDs</span>
                  <span className="text-white">{player.stats.touchdowns}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* AR Effects Overlay */}
        {currentLayout === 'HOLOGRAM' && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-t from-cyan-500/10 to-transparent animate-pulse" />
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse" />
            <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse" />
          </div>
        )}
      </Card>
    </motion.div>
  );

  return (
    <div className="w-full space-y-6">
      {/* AR Controls */}
      <Card className="p-6 bg-gradient-to-r from-purple-900/20 to-blue-900/20 border-purple-500/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-purple-500/20 rounded-lg">
              <Eye className="w-8 h-8 text-purple-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">AR Player Cards</h2>
              <p className="text-gray-400">Immersive 3D player visualization</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Layout Mode */}
            <select
              value={currentLayout}
              onChange={(e) => setCurrentLayout(e.target.value as any)}
              className="bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-600"
            >
              <option value="2D">2D Grid</option>
              <option value="3D">3D Carousel</option>
              <option value="HOLOGRAM">Hologram</option>
            </select>

            {/* AR Toggle */}
            <button
              onClick={toggleAR}
              disabled={!arSupported && currentLayout !== '2D'}
              className={`p-3 rounded-lg transition-colors ${
                arActive 
                  ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' 
                  : 'bg-gray-500/20 text-gray-400 hover:bg-gray-500/30'
              } ${!arSupported && currentLayout !== '2D' ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {arActive ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>

            {/* Fullscreen */}
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-3 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-lg transition-colors"
            >
              {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* AR Status */}
        {!arSupported && currentLayout !== '2D' && (
          <div className="mt-4 p-3 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-yellow-400" />
              <span className="text-yellow-400">
                AR not supported on this device. Using enhanced 3D mode.
              </span>
            </div>
          </div>
        )}
      </Card>

      {/* AR/3D Container */}
      <div 
        ref={containerRef}
        className={`
          relative overflow-hidden rounded-lg border border-gray-700
          ${isFullscreen ? 'fixed inset-0 z-50 bg-black' : 'h-[600px]'}
          ${currentLayout === 'HOLOGRAM' ? 'bg-black' : 'bg-gradient-to-br from-gray-900 to-gray-800'}
        `}
        style={{ perspective: '1000px' }}
      >
        {/* Camera Feed (AR Mode) */}
        {arActive && (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}

        {/* 3D Scene Container */}
        <div 
          className="absolute inset-0 flex items-center justify-center"
          style={{ 
            transformStyle: 'preserve-3d',
            transform: currentLayout === '2D' ? 'none' : 'translateZ(0)'
          }}
        >
          {currentLayout === '2D' ? (
            /* 2D Grid Layout */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6 overflow-auto max-h-full">
              {players.map((player, index) => renderPlayerCard(player, index))}
            </div>
          ) : (
            /* 3D/Hologram Layout */
            <div className="relative w-full h-full flex items-center justify-center">
              {players.map((player, index) => renderPlayerCard(player, index))}
              
              {/* Center focal point */}
              <div className="absolute w-4 h-4 bg-blue-500 rounded-full opacity-50 animate-pulse" />
            </div>
          )}
        </div>

        {/* Controls Overlay */}
        {currentLayout !== '2D' && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
            <div className="flex items-center space-x-4 bg-black/50 backdrop-blur-md rounded-lg p-3">
              <button
                onClick={() => setRotation({ x: 0, y: 0, z: 0 })}
                className="p-2 bg-gray-700/50 text-white rounded-lg hover:bg-gray-600/50 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              
              <div className="flex items-center space-x-2">
                <span className="text-white text-sm">Speed:</span>
                <input
                  type="range"
                  min="0"
                  max="3"
                  step="0.5"
                  value={animationSpeed}
                  onChange={(e) => setAnimationSpeed(parseFloat(e.target.value))}
                  className="w-20"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Selected Player Details */}
      {selectedPlayer && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
        >
          <Card className="p-6 bg-gradient-to-r from-blue-900/20 to-purple-900/20 border-blue-500/30">
            <h3 className="text-xl font-bold text-white mb-4">
              Selected: {selectedPlayer.playerName}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-400">Position:</span>
                <span className="text-white ml-2">{selectedPlayer.position}</span>
              </div>
              <div>
                <span className="text-gray-400">Team:</span>
                <span className="text-white ml-2">{selectedPlayer.team}</span>
              </div>
              <div>
                <span className="text-gray-400">Status:</span>
                <span className={`ml-2 ${getStatusColor(selectedPlayer.status)}`}>
                  {selectedPlayer.status}
                </span>
              </div>
            </div>
          </Card>
        </motion.div>
      )}
    </div>
  );
};

export default ARPlayerCards;