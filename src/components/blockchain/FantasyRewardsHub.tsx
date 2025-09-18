'use client';


import { handleComponentError } from '@/lib/error-handling';
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { 
  Coins, 
  Trophy,
  Zap,
  Star,
  Gift,
  TrendingUp,
  Wallet,
  Sparkles,
  Award,
  Crown,
  Gem,
  Target,
  Users,
  Calendar,
  BarChart3,
  ExternalLink,
  Copy,
  CheckCircle,
  AlertCircle,
  Loader
} from 'lucide-react';
import { Card } from '@/components/ui/card';

interface NFTReward {
  id: string;
  name: string;
  description: string;
  rarity: 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
  imageUrl?: string;
  mintDate: Date;
  attributes: Record<string, any>;
  marketValue?: number;
}

interface TokenBalance {
  symbol: string;
  balance: number;
  valueUSD: number;
  contractAddress: string;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  reward: {
    type: 'TOKEN' | 'NFT' | 'BOTH';
    amount?: number;
    nftId?: string;
  };
  unlocked: boolean;
  unlockedAt?: Date;
  progress: number;
  maxProgress: number;
}

interface BlockchainReward {
  id: string;
  type: 'WEEKLY_WIN' | 'TRADE_SUCCESS' | 'PERFECT_LINEUP' | 'SEASON_CHAMPION';
  tokens: number;
  nft?: NFTReward;
  timestamp: Date;
  transactionHash?: string;
}

interface FantasyRewardsHubProps {
  userId: string;
  leagueId: string;
  walletAddress?: string;
  onConnectWallet: () => void;
}

const FantasyRewardsHub: React.FC<FantasyRewardsHubProps> = ({
  userId,
  leagueId,
  walletAddress,
  onConnectWallet
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'nfts' | 'tokens' | 'achievements' | 'marketplace'>('overview');
  const [tokenBalances, setTokenBalances] = useState<TokenBalance[]>([]);
  const [nftCollection, setNftCollection] = useState<NFTReward[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [recentRewards, setRecentRewards] = useState<BlockchainReward[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [totalValue, setTotalValue] = useState(0);
  const [copiedAddress, setCopiedAddress] = useState(false);

  // Load blockchain data
  useEffect(() => {
    if (walletAddress) {
      loadBlockchainData();
    }
  }, [walletAddress]);

  const loadBlockchainData = async () => {
    setIsLoading(true);
    try {
      // Load token balances
      const tokenResponse = await fetch(`/api/blockchain/tokens/${walletAddress}`);
      const tokenData = await tokenResponse.json();
      setTokenBalances(tokenData.balances || []);

      // Load NFTs
      const nftResponse = await fetch(`/api/blockchain/nfts/${walletAddress}`);
      const nftData = await nftResponse.json();
      setNftCollection(nftData.nfts || []);

      // Load achievements
      const achievementResponse = await fetch(`/api/blockchain/achievements/${userId}`);
      const achievementData = await achievementResponse.json();
      setAchievements(achievementData.achievements || []);

      // Load recent rewards
      const rewardsResponse = await fetch(`/api/blockchain/rewards/${userId}`);
      const rewardsData = await rewardsResponse.json();
      setRecentRewards(rewardsData.rewards || []);

      // Calculate total value
      const totalTokenValue = tokenData.balances?.reduce((sum: number, token: TokenBalance) => sum + token.valueUSD, 0) || 0;
      const totalNFTValue = nftData.nfts?.reduce((sum: number, nft: NFTReward) => sum + (nft.marketValue || 0), 0) || 0;
      setTotalValue(totalTokenValue + totalNFTValue);

    } catch (error) {
      handleComponentError(error as Error, 'FantasyRewardsHub');
    } finally {
      setIsLoading(false);
    }
  };

  const copyWalletAddress = () => {
    if (walletAddress) {
      navigator.clipboard.writeText(walletAddress);
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
    }
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'LEGENDARY': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30';
      case 'EPIC': return 'text-purple-400 bg-purple-400/10 border-purple-400/30';
      case 'RARE': return 'text-blue-400 bg-blue-400/10 border-blue-400/30';
      default: return 'text-gray-400 bg-gray-400/10 border-gray-400/30';
    }
  };

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Portfolio Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 bg-gradient-to-r from-green-900/20 to-emerald-900/20 border-green-500/30">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-green-500/20 rounded-lg">
              <Wallet className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <p className="text-green-400 text-sm">Total Portfolio</p>
              <p className="text-2xl font-bold text-white">${totalValue.toFixed(2)}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-r from-blue-900/20 to-cyan-900/20 border-blue-500/30">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-blue-500/20 rounded-lg">
              <Gem className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <p className="text-blue-400 text-sm">NFTs Owned</p>
              <p className="text-2xl font-bold text-white">{nftCollection.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-r from-purple-900/20 to-pink-900/20 border-purple-500/30">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-purple-500/20 rounded-lg">
              <Trophy className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <p className="text-purple-400 text-sm">Achievements</p>
              <p className="text-2xl font-bold text-white">
                {achievements.filter(a => a.unlocked).length}/{achievements.length}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Rewards */}
      <Card className="p-6">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
          <Gift className="w-5 h-5 text-yellow-400" />
          <span>Recent Rewards</span>
        </h3>
        
        <div className="space-y-3">
          {recentRewards.slice(0, 5).map((reward) => (
            <motion.div
              key={reward.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center justify-between p-4 bg-gray-800/30 rounded-lg border border-gray-700/50"
            >
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-yellow-500/20 rounded-lg">
                  <Coins className="w-5 h-5 text-yellow-400" />
                </div>
                <div>
                  <p className="text-white font-medium">
                    {reward.type.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                  </p>
                  <p className="text-gray-400 text-sm">
                    {reward.timestamp.toLocaleDateString()}
                  </p>
                </div>
              </div>
              
              <div className="text-right">
                <p className="text-yellow-400 font-bold">+{reward.tokens} FTSY</p>
                {reward.nft && (
                  <p className="text-blue-400 text-sm">+ NFT Reward</p>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </Card>
    </div>
  );

  const renderNFTs = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-white">NFT Collection</h3>
        <div className="flex items-center space-x-2 text-sm text-gray-400">
          <Gem className="w-4 h-4" />
          <span>{nftCollection.length} items</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {nftCollection.map((nft) => (
          <motion.div
            key={nft.id}
            whileHover={{ scale: 1.02 }}
            className="group cursor-pointer"
          >
            <Card className={`p-4 ${getRarityColor(nft.rarity)} border-2`}>
              {/* NFT Image */}
              <div className="aspect-square bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg mb-4 flex items-center justify-center overflow-hidden">
                {nft.imageUrl ? (
                  <Image 
                    src={nft.imageUrl} 
                    alt={nft.name}
                    width={200}
                    height={200}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                ) : (
                  <div className="text-6xl">🏆</div>
                )}
              </div>

              {/* NFT Info */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-white font-bold">{nft.name}</h4>
                  <span className={`px-2 py-1 rounded text-xs font-medium border ${getRarityColor(nft.rarity)}`}>
                    {nft.rarity}
                  </span>
                </div>

                <p className="text-gray-400 text-sm">{nft.description}</p>

                {nft.marketValue && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Market Value</span>
                    <span className="text-green-400 font-medium">${nft.marketValue.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Minted {nft.mintDate.toLocaleDateString()}</span>
                  <ExternalLink className="w-4 h-4" />
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {nftCollection.length === 0 && (
        <Card className="p-12 text-center">
          <Gem className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h4 className="text-xl font-bold text-gray-400 mb-2">No NFTs Yet</h4>
          <p className="text-gray-500">Complete achievements to earn your first NFT rewards!</p>
        </Card>
      )}
    </div>
  );

  const renderTokens = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-white">Token Balances</h3>
        <button 
          onClick={loadBlockchainData}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
        >
          <TrendingUp className="w-4 h-4" />
          <span>Refresh</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {tokenBalances.map((token) => (
          <Card key={token.symbol} className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-full flex items-center justify-center">
                  <Coins className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h4 className="text-white font-bold">{token.symbol}</h4>
                  <p className="text-gray-400 text-sm">Fantasy Token</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Balance</span>
                <span className="text-white font-bold">{token.balance.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">USD Value</span>
                <span className="text-green-400 font-bold">${token.valueUSD.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Contract</span>
                <button 
                  onClick={() => navigator.clipboard.writeText(token.contractAddress)}
                  className="text-blue-400 hover:text-blue-300 flex items-center space-x-1"
                >
                  <span>{token.contractAddress.slice(0, 8)}...{token.contractAddress.slice(-6)}</span>
                  <Copy className="w-3 h-3" />
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Earning Opportunities */}
      <Card className="p-6 bg-gradient-to-r from-yellow-900/20 to-orange-900/20 border-yellow-500/30">
        <h4 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
          <Sparkles className="w-5 h-5 text-yellow-400" />
          <span>Earn More Tokens</span>
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-gray-800/30 rounded-lg">
            <Target className="w-8 h-8 text-blue-400 mb-2" />
            <h5 className="text-white font-medium mb-1">Weekly Wins</h5>
            <p className="text-gray-400 text-sm">Earn 100 FTSY for each weekly matchup victory</p>
          </div>

          <div className="p-4 bg-gray-800/30 rounded-lg">
            <TrendingUp className="w-8 h-8 text-green-400 mb-2" />
            <h5 className="text-white font-medium mb-1">Perfect Lineups</h5>
            <p className="text-gray-400 text-sm">Bonus 500 FTSY for optimal lineup decisions</p>
          </div>

          <div className="p-4 bg-gray-800/30 rounded-lg">
            <Users className="w-8 h-8 text-purple-400 mb-2" />
            <h5 className="text-white font-medium mb-1">Referrals</h5>
            <p className="text-gray-400 text-sm">Get 250 FTSY for each friend you refer</p>
          </div>
        </div>
      </Card>
    </div>
  );

  const renderAchievements = () => (
    <div className="space-y-6">
      <h3 className="text-xl font-bold text-white">Achievements</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {achievements.map((achievement) => (
          <motion.div
            key={achievement.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`group ${achievement.unlocked ? 'cursor-pointer' : ''}`}
          >
            <Card className={`p-6 transition-all duration-300 ${
              achievement.unlocked 
                ? 'bg-gradient-to-r from-green-900/20 to-emerald-900/20 border-green-500/30 hover:border-green-400/50' 
                : 'bg-gray-800/30 border-gray-700/50'
            }`}>
              <div className="flex items-start space-x-4">
                <div className={`p-3 rounded-lg ${
                  achievement.unlocked ? 'bg-green-500/20' : 'bg-gray-600/20'
                }`}>
                  {achievement.unlocked ? (
                    <CheckCircle className="w-8 h-8 text-green-400" />
                  ) : (
                    <Award className="w-8 h-8 text-gray-500" />
                  )}
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className={`font-bold ${achievement.unlocked ? 'text-white' : 'text-gray-400'}`}>
                      {achievement.name}
                    </h4>
                    {achievement.unlocked && achievement.unlockedAt && (
                      <span className="text-green-400 text-xs">
                        {achievement.unlockedAt.toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  <p className={`text-sm mb-3 ${achievement.unlocked ? 'text-gray-300' : 'text-gray-500'}`}>
                    {achievement.description}
                  </p>

                  {/* Progress Bar */}
                  {!achievement.unlocked && (
                    <div className="mb-3">
                      <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                        <span>Progress</span>
                        <span>{achievement.progress}/{achievement.maxProgress}</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${(achievement.progress / achievement.maxProgress) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Reward Info */}
                  <div className="flex items-center space-x-4 text-sm">
                    {achievement.reward.type === 'TOKEN' || achievement.reward.type === 'BOTH' && (
                      <div className="flex items-center space-x-1">
                        <Coins className="w-4 h-4 text-yellow-400" />
                        <span className="text-yellow-400">{achievement.reward.amount} FTSY</span>
                      </div>
                    )}
                    {achievement.reward.type === 'NFT' || achievement.reward.type === 'BOTH' && (
                      <div className="flex items-center space-x-1">
                        <Gem className="w-4 h-4 text-blue-400" />
                        <span className="text-blue-400">NFT Reward</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );

  if (!walletAddress) {
    return (
      <Card className="p-12 text-center">
        <Wallet className="w-16 h-16 text-gray-600 mx-auto mb-4" />
        <h3 className="text-2xl font-bold text-white mb-4">Connect Your Wallet</h3>
        <p className="text-gray-400 mb-6">
          Connect your crypto wallet to access blockchain rewards, NFTs, and achievements.
        </p>
        <button
          onClick={onConnectWallet}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
        >
          Connect Wallet
        </button>
      </Card>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <Card className="p-6 bg-gradient-to-r from-indigo-900/20 to-purple-900/20 border-indigo-500/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-indigo-500/20 rounded-lg">
              <Coins className="w-8 h-8 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Fantasy Rewards Hub</h2>
              <p className="text-gray-400">Blockchain-powered fantasy football rewards</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="text-right">
              <p className="text-gray-400 text-sm">Connected Wallet</p>
              <button
                onClick={copyWalletAddress}
                className="flex items-center space-x-2 text-blue-400 hover:text-blue-300 transition-colors"
              >
                <span className="font-mono">
                  {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                </span>
                {copiedAddress ? (
                  <CheckCircle className="w-4 h-4 text-green-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* Navigation Tabs */}
      <div className="flex space-x-1 bg-gray-800/50 rounded-lg p-1">
        {[
          { id: 'overview', label: 'Overview', icon: BarChart3 },
          { id: 'nfts', label: 'NFTs', icon: Gem },
          { id: 'tokens', label: 'Tokens', icon: Coins },
          { id: 'achievements', label: 'Achievements', icon: Trophy }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`
              flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors flex-1
              ${activeTab === tab.id 
                ? 'bg-blue-600 text-white' 
                : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
              }
            `}
          >
            <tab.icon className="w-4 h-4" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
        >
          {isLoading ? (
            <Card className="p-12 text-center">
              <Loader className="w-8 h-8 text-blue-400 mx-auto mb-4 animate-spin" />
              <p className="text-gray-400">Loading blockchain data...</p>
            </Card>
          ) : (
            <>
              {activeTab === 'overview' && renderOverview()}
              {activeTab === 'nfts' && renderNFTs()}
              {activeTab === 'tokens' && renderTokens()}
              {activeTab === 'achievements' && renderAchievements()}
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default FantasyRewardsHub;