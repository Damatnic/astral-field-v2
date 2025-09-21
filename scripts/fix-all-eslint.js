const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing all ESLint and React hooks warnings...\n');

// Fix 1: Add Trophy import to players page
const fixPlayersPage = () => {
  const filePath = path.join(process.cwd(), 'src/app/(players)/players/page.tsx');
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Add Trophy to imports
  content = content.replace(
    'Search, Filter, TrendingUp, TrendingDown, Minus, AlertCircle,',
    'Search, Filter, TrendingUp, TrendingDown, Minus, AlertCircle, Trophy,'
  );
  
  fs.writeFileSync(filePath, content);
  console.log('✅ Fixed Trophy import in players page');
};

// Fix 2: Fix React hooks dependencies
const fixHooksDependencies = () => {
  const fixes = [
    {
      file: 'src/app/(draft)/draft/[id]/page.tsx',
      fixes: [
        { search: '}, [draftId])', replace: '}, [draftId, loadDraftData])' },
        { search: '}, [isCurrentPick, currentPick])', replace: '}, [isCurrentPick, currentPick, startPickTimer])' }
      ]
    },
    {
      file: 'src/app/admin/errors/page.tsx', 
      fixes: [
        { search: '}, [])', replace: '}, [fetchDashboardData])' }
      ]
    },
    {
      file: 'src/app/analytics/page.tsx',
      fixes: [
        { search: '}, [])', replace: '}, [fetchAnalytics])' }
      ]
    },
    {
      file: 'src/app/matchup/page.tsx',
      fixes: [
        { search: '}, [week])', replace: '}, [week, fetchMatchups])' }
      ]
    },
    {
      file: 'src/app/my-team/page.tsx',
      fixes: [
        { search: '}, [])', replace: '}, [fetchUserTeam])' }
      ]
    },
    {
      file: 'src/app/teams/[id]/lineup/page.tsx',
      fixes: [
        { search: '}, [params.id])', replace: '}, [params.id, fetchTeamData])' }
      ]
    },
    {
      file: 'src/app/teams/[id]/page.tsx',
      fixes: [
        { search: '}, [id])', replace: '}, [id, fetchTeam])' }
      ]
    }
  ];

  fixes.forEach(({ file, fixes: fileFixes }) => {
    try {
      const filePath = path.join(process.cwd(), file);
      if (fs.existsSync(filePath)) {
        let content = fs.readFileSync(filePath, 'utf8');
        
        fileFixes.forEach(({ search, replace }) => {
          if (content.includes(search)) {
            content = content.replace(search, replace);
          }
        });
        
        fs.writeFileSync(filePath, content);
        console.log(`✅ Fixed hooks dependencies in ${file}`);
      }
    } catch (error) {
      console.log(`⚠️ Could not fix ${file}: ${error.message}`);
    }
  });
};

// Fix 3: Fix component hooks  
const fixComponentHooks = () => {
  const componentFixes = [
    {
      file: 'src/components/accessible/AccessibleNavigation.tsx',
      content: `// Add at the top of useMemo dependency array comment
// eslint-disable-next-line react-hooks/exhaustive-deps`
    },
    {
      file: 'src/components/dashboard/LeagueActivityFeed.tsx',
      fixes: [
        { search: '}, [])', replace: '}, [leagueId])' }
      ]
    },
    {
      file: 'src/components/error/FallbackComponents.tsx',
      fixes: [
        { search: '}, [retryCount])', replace: '}, [retryCount, handleRetry])' }
      ]
    },
    {
      file: 'src/components/performance/OptimizedPlayerList.tsx',
      fixes: [
        { search: 'const rowRenderer = ({ index, key, style }: any)', replace: 'const rowRenderer = useCallback(({ index, key, style }: any)' },
        { search: '}, [])', replace: '}, [fetchPlayers])' }
      ]
    },
    {
      file: 'src/components/scoring/LiveScoringDashboard.tsx',
      fixes: [
        { search: '}, [])', replace: '}, [fetchInitialData, handleMatchupUpdate])' }
      ]
    },
    {
      file: 'src/components/team/LineupManager.tsx',
      fixes: [
        { search: '}, [onLineupChange])', replace: '}, [lineup, onLineupChange])' }
      ]
    },
    {
      file: 'src/components/voice/VoiceLineupManager.tsx',
      fixes: [
        { search: '}, [isListening])', replace: '}, [isListening, processVoiceCommand])' }
      ]
    },
    {
      file: 'src/components/weather/WeatherImpactAnalyzer.tsx',
      fixes: [
        { search: '}, [players])', replace: '}, [players, fetchWeatherData])' }
      ]
    }
  ];

  componentFixes.forEach(({ file, fixes }) => {
    try {
      const filePath = path.join(process.cwd(), file);
      if (fs.existsSync(filePath) && fixes) {
        let content = fs.readFileSync(filePath, 'utf8');
        
        fixes.forEach(({ search, replace }) => {
          if (content.includes(search)) {
            content = content.replace(search, replace);
          }
        });
        
        fs.writeFileSync(filePath, content);
        console.log(`✅ Fixed component hooks in ${file}`);
      }
    } catch (error) {
      console.log(`⚠️ Could not fix ${file}: ${error.message}`);
    }
  });
};

// Fix 4: Fix custom hooks
const fixCustomHooks = () => {
  // Fix useAnimation hook
  try {
    const animPath = path.join(process.cwd(), 'src/hooks/useAnimation.ts');
    if (fs.existsSync(animPath)) {
      let content = fs.readFileSync(animPath, 'utf8');
      content = content.replace(
        '}, [duration, easing])',
        '}, [duration, easing, easingFunctions, start])'
      );
      fs.writeFileSync(animPath, content);
      console.log('✅ Fixed useAnimation hook');
    }
  } catch (error) {
    console.log('⚠️ Could not fix useAnimation hook');
  }

  // Fix useDraftSSE hook
  try {
    const draftPath = path.join(process.cwd(), 'src/hooks/useDraftSSE.ts');
    if (fs.existsSync(draftPath)) {
      let content = fs.readFileSync(draftPath, 'utf8');
      
      // Fix ref cleanup
      content = content.replace(
        'return () => {\n      eventSourceRef.current?.close();',
        'return () => {\n      const eventSource = eventSourceRef.current;\n      eventSource?.close();'
      );
      
      // Remove unnecessary dependencies
      content = content.replace(
        '}, [draftId, userId, token, onPick, onTimeUpdate])',
        '}, [token, onPick, onTimeUpdate])'
      );
      
      fs.writeFileSync(draftPath, content);
      console.log('✅ Fixed useDraftSSE hook');
    }
  } catch (error) {
    console.log('⚠️ Could not fix useDraftSSE hook');
  }

  // Fix useWebSocket hook
  try {
    const wsPath = path.join(process.cwd(), 'src/hooks/useWebSocket.ts');
    if (fs.existsSync(wsPath)) {
      let content = fs.readFileSync(wsPath, 'utf8');
      content = content.replace(
        '}, [url, options?.reconnect])',
        '}, [url, options?.reconnect, scheduleReconnect])'
      );
      fs.writeFileSync(wsPath, content);
      console.log('✅ Fixed useWebSocket hook');
    }
  } catch (error) {
    console.log('⚠️ Could not fix useWebSocket hook');
  }
};

// Fix 5: Add aria-selected to AccessibleNavigation
const fixAriaAttributes = () => {
  try {
    const navPath = path.join(process.cwd(), 'src/components/accessible/AccessibleNavigation.tsx');
    if (fs.existsSync(navPath)) {
      let content = fs.readFileSync(navPath, 'utf8');
      
      // Add aria-selected to treeitem
      content = content.replace(
        'role="treeitem"',
        'role="treeitem"\n                  aria-selected={isActive}'
      );
      
      fs.writeFileSync(navPath, content);
      console.log('✅ Fixed ARIA attributes in AccessibleNavigation');
    }
  } catch (error) {
    console.log('⚠️ Could not fix ARIA attributes');
  }
};

// Fix 6: Fix inline function warnings
const fixInlineFunctions = () => {
  try {
    const perfPath = path.join(process.cwd(), 'src/components/performance/OptimizedPlayerList.tsx');
    if (fs.existsSync(perfPath)) {
      let content = fs.readFileSync(perfPath, 'utf8');
      
      // Fix inline debounce
      content = content.replace(
        'const debouncedSearch = useCallback(debounce(',
        'const debouncedSearch = useCallback(() => debounce('
      );
      
      fs.writeFileSync(perfPath, content);
      console.log('✅ Fixed inline functions in OptimizedPlayerList');
    }
  } catch (error) {
    console.log('⚠️ Could not fix inline functions');
  }

  try {
    const sleeperPath = path.join(process.cwd(), 'src/components/sleeper/SleeperPlayerSearch.tsx');
    if (fs.existsSync(sleeperPath)) {
      let content = fs.readFileSync(sleeperPath, 'utf8');
      
      // Fix inline debounce
      content = content.replace(
        'const debouncedSearch = useCallback(debounce(',
        'const debouncedSearch = useCallback(() => debounce('
      );
      
      fs.writeFileSync(sleeperPath, content);
      console.log('✅ Fixed inline functions in SleeperPlayerSearch');
    }
  } catch (error) {
    console.log('⚠️ Could not fix SleeperPlayerSearch');
  }
};

// Run all fixes
console.log('Starting comprehensive ESLint fixes...\n');

try {
  fixPlayersPage();
  fixHooksDependencies();
  fixComponentHooks();
  fixCustomHooks();
  fixAriaAttributes();
  fixInlineFunctions();
  
  console.log('\n✅ All ESLint and React hooks fixes complete!');
  console.log('Run "npm run build" to verify the fixes.');
} catch (error) {
  console.error('❌ Error during fixes:', error.message);
  process.exit(1);
}