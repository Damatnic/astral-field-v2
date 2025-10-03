/**
 * Analytics Dashboard Component Tests
 * 
 * Tests for analytics dashboard component
 */

import { render, screen, fireEvent, within } from '@testing-library/react'
import { AnalyticsDashboard } from '@/components/analytics/analytics-dashboard'

describe('AnalyticsDashboard Component', () => {
  const mockData = {
    teams: [
      {
        teamId: 'team-1',
        teamName: 'Team Alpha',
        leagueName: 'Test League',
        record: { wins: 3, losses: 1, ties: 0 },
        pointsFor: 450.5,
        pointsAgainst: 420.3,
        projectedPoints: 125.5,
        winPercentage: 75,
        averagePointsFor: 112.6,
        roster: [
          {
            player: {
              id: 'player-1',
              name: 'Patrick Mahomes',
              position: 'QB',
              nflTeam: 'KC',
              totalPoints: 95.5,
              averagePoints: 23.9,
              projection: 25.0
            },
            isStarter: true
          },
          {
            player: {
              id: 'player-2',
              name: 'Christian McCaffrey',
              position: 'RB',
              nflTeam: 'SF',
              totalPoints: 88.2,
              averagePoints: 22.1,
              projection: 20.5
            },
            isStarter: true
          }
        ]
      },
      {
        teamId: 'team-2',
        teamName: 'Team Beta',
        leagueName: 'Test League',
        record: { wins: 2, losses: 2, ties: 0 },
        pointsFor: 420.0,
        pointsAgainst: 430.5,
        projectedPoints: 115.0,
        winPercentage: 50,
        averagePointsFor: 105.0,
        roster: [
          {
            player: {
              id: 'player-3',
              name: 'Josh Allen',
              position: 'QB',
              nflTeam: 'BUF',
              totalPoints: 92.0,
              averagePoints: 23.0,
              projection: 24.0
            },
            isStarter: true
          }
        ]
      }
    ],
    summary: {
      totalTeams: 2,
      totalWins: 5,
      totalLosses: 3,
      totalPointsFor: 870.5,
      averageWinPercentage: 62.5
    }
  }

  const emptyData = {
    teams: [],
    summary: {
      totalTeams: 0,
      totalWins: 0,
      totalLosses: 0,
      totalPointsFor: 0,
      averageWinPercentage: 0
    }
  }

  describe('Rendering', () => {
    it('should render without crashing', () => {
      render(<AnalyticsDashboard data={mockData} />)
      expect(screen.getByText('Active Teams')).toBeInTheDocument()
    })

    it('should display summary stats', () => {
      render(<AnalyticsDashboard data={mockData} />)
      
      expect(screen.getByText('Active Teams')).toBeInTheDocument()
      expect(screen.getByText('Total Wins')).toBeInTheDocument()
      expect(screen.getByText('Win Rate')).toBeInTheDocument()
      expect(screen.getByText('Total Points')).toBeInTheDocument()
    })

    it('should display correct summary values', () => {
      render(<AnalyticsDashboard data={mockData} />)
      
      expect(screen.getByText('2')).toBeInTheDocument() // Total teams
      expect(screen.getByText('5')).toBeInTheDocument() // Total wins
      expect(screen.getByText('62.5%')).toBeInTheDocument() // Win rate
      expect(screen.getByText('870.5')).toBeInTheDocument() // Total points
    })
  })

  describe('Empty State', () => {
    it('should show empty state when no teams', () => {
      render(<AnalyticsDashboard data={emptyData} />)
      
      expect(screen.getByText('No Analytics Data')).toBeInTheDocument()
    })

    it('should show message to join league', () => {
      render(<AnalyticsDashboard data={emptyData} />)
      
      expect(screen.getByText(/Join a league/i)).toBeInTheDocument()
    })

    it('should not show tabs in empty state', () => {
      render(<AnalyticsDashboard data={emptyData} />)
      
      expect(screen.queryByText('Overview')).not.toBeInTheDocument()
    })
  })

  describe('Tab Navigation', () => {
    it('should display all tabs', () => {
      render(<AnalyticsDashboard data={mockData} />)
      
      expect(screen.getByText('Overview')).toBeInTheDocument()
      expect(screen.getByText('Teams')).toBeInTheDocument()
      expect(screen.getByText('Players')).toBeInTheDocument()
      expect(screen.getByText('Trends')).toBeInTheDocument()
    })

    it('should start with overview tab active', () => {
      render(<AnalyticsDashboard data={mockData} />)
      
      const overviewTab = screen.getByText('Overview').closest('button')
      expect(overviewTab).toHaveClass('border-blue-500')
    })

    it('should switch tabs on click', () => {
      render(<AnalyticsDashboard data={mockData} />)
      
      const teamsTab = screen.getByText('Teams').closest('button')
      fireEvent.click(teamsTab!)
      
      expect(teamsTab).toHaveClass('border-blue-500')
    })

    it('should show different content for each tab', () => {
      render(<AnalyticsDashboard data={mockData} />)
      
      // Overview tab
      expect(screen.getByText('Team Performance')).toBeInTheDocument()
      
      // Switch to Teams tab
      const teamsTab = screen.getByText('Teams').closest('button')
      fireEvent.click(teamsTab!)
      expect(screen.getByText('Team Stats')).toBeInTheDocument()
      
      // Switch to Players tab
      const playersTab = screen.getByText('Players').closest('button')
      fireEvent.click(playersTab!)
      expect(screen.getByText('All Players Performance')).toBeInTheDocument()
      
      // Switch to Trends tab
      const trendsTab = screen.getByText('Trends').closest('button')
      fireEvent.click(trendsTab!)
      expect(screen.getByText('Trends Coming Soon')).toBeInTheDocument()
    })
  })

  describe('Overview Tab', () => {
    it('should display team performance section', () => {
      render(<AnalyticsDashboard data={mockData} />)
      
      expect(screen.getByText('Team Performance')).toBeInTheDocument()
    })

    it('should list all teams', () => {
      render(<AnalyticsDashboard data={mockData} />)
      
      expect(screen.getByText('Team Alpha')).toBeInTheDocument()
      expect(screen.getByText('Team Beta')).toBeInTheDocument()
    })

    it('should display team records', () => {
      render(<AnalyticsDashboard data={mockData} />)
      
      expect(screen.getByText('3-1-0')).toBeInTheDocument()
      expect(screen.getByText('2-2-0')).toBeInTheDocument()
    })

    it('should display top performers section', () => {
      render(<AnalyticsDashboard data={mockData} />)
      
      expect(screen.getByText('Top Performers')).toBeInTheDocument()
    })

    it('should list top 5 players', () => {
      render(<AnalyticsDashboard data={mockData} />)
      
      expect(screen.getByText('Patrick Mahomes')).toBeInTheDocument()
      expect(screen.getByText('Christian McCaffrey')).toBeInTheDocument()
      expect(screen.getByText('Josh Allen')).toBeInTheDocument()
    })

    it('should display player positions', () => {
      render(<AnalyticsDashboard data={mockData} />)
      
      const positions = screen.getAllByText('QB')
      expect(positions.length).toBeGreaterThan(0)
    })

    it('should display player points', () => {
      render(<AnalyticsDashboard data={mockData} />)
      
      expect(screen.getByText('95.5')).toBeInTheDocument()
      expect(screen.getByText('88.2')).toBeInTheDocument()
    })
  })

  describe('Teams Tab', () => {
    beforeEach(() => {
      render(<AnalyticsDashboard data={mockData} />)
      const teamsTab = screen.getByText('Teams').closest('button')
      fireEvent.click(teamsTab!)
    })

    it('should display team selector when multiple teams', () => {
      expect(screen.getByText('Team Alpha')).toBeInTheDocument()
      expect(screen.getByText('Team Beta')).toBeInTheDocument()
    })

    it('should switch selected team', () => {
      const teamBetaButton = screen.getByText('Team Beta')
      fireEvent.click(teamBetaButton)
      
      expect(teamBetaButton).toHaveClass('bg-blue-600')
    })

    it('should display team stats', () => {
      expect(screen.getByText('Team Stats')).toBeInTheDocument()
      expect(screen.getByText('Record:')).toBeInTheDocument()
      expect(screen.getByText('Win %:')).toBeInTheDocument()
      expect(screen.getByText('Points For:')).toBeInTheDocument()
    })

    it('should display roster performance', () => {
      expect(screen.getByText('Roster Performance')).toBeInTheDocument()
    })

    it('should show starter/bench designation', () => {
      expect(screen.getByText(/Starter/)).toBeInTheDocument()
    })
  })

  describe('Players Tab', () => {
    beforeEach(() => {
      render(<AnalyticsDashboard data={mockData} />)
      const playersTab = screen.getByText('Players').closest('button')
      fireEvent.click(playersTab!)
    })

    it('should display all players performance', () => {
      expect(screen.getByText('All Players Performance')).toBeInTheDocument()
    })

    it('should rank players', () => {
      expect(screen.getByText('#1')).toBeInTheDocument()
      expect(screen.getByText('#2')).toBeInTheDocument()
    })

    it('should display player details', () => {
      expect(screen.getByText('Patrick Mahomes')).toBeInTheDocument()
      expect(screen.getByText(/KC/)).toBeInTheDocument()
    })
  })

  describe('Trends Tab', () => {
    beforeEach(() => {
      render(<AnalyticsDashboard data={mockData} />)
      const trendsTab = screen.getByText('Trends').closest('button')
      fireEvent.click(trendsTab!)
    })

    it('should display trends section', () => {
      expect(screen.getByText('Performance Trends')).toBeInTheDocument()
    })

    it('should show coming soon message', () => {
      expect(screen.getByText('Trends Coming Soon')).toBeInTheDocument()
    })
  })

  describe('Position Colors', () => {
    it('should apply different colors to positions', () => {
      render(<AnalyticsDashboard data={mockData} />)
      
      const qbBadges = screen.getAllByText('QB')
      const rbBadges = screen.getAllByText('RB')
      
      expect(qbBadges[0]).toHaveClass('text-red-400')
      expect(rbBadges[0]).toHaveClass('text-green-400')
    })
  })

  describe('Data Formatting', () => {
    it('should format points with one decimal', () => {
      render(<AnalyticsDashboard data={mockData} />)
      
      expect(screen.getByText('450.5')).toBeInTheDocument()
    })

    it('should format averages correctly', () => {
      render(<AnalyticsDashboard data={mockData} />)
      
      expect(screen.getByText('23.9 avg')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have accessible tab buttons', () => {
      render(<AnalyticsDashboard data={mockData} />)
      
      const tabs = screen.getAllByRole('button')
      expect(tabs.length).toBeGreaterThan(0)
    })

    it('should have proper heading hierarchy', () => {
      render(<AnalyticsDashboard data={mockData} />)
      
      const headings = screen.getAllByRole('heading', { hidden: true })
      expect(headings.length).toBeGreaterThan(0)
    })
  })

  describe('Edge Cases', () => {
    it('should handle single team', () => {
      const singleTeamData = {
        ...mockData,
        teams: [mockData.teams[0]],
        summary: { ...mockData.summary, totalTeams: 1 }
      }
      
      render(<AnalyticsDashboard data={singleTeamData} />)
      
      expect(screen.getByText('Team Alpha')).toBeInTheDocument()
    })

    it('should handle players without NFL team', () => {
      const dataWithoutTeam = {
        ...mockData,
        teams: [{
          ...mockData.teams[0],
          roster: [{
            player: {
              ...mockData.teams[0].roster[0].player,
              nflTeam: null
            },
            isStarter: true
          }]
        }]
      }
      
      render(<AnalyticsDashboard data={dataWithoutTeam} />)
      
      expect(screen.getByText('Patrick Mahomes')).toBeInTheDocument()
    })

    it('should handle zero points', () => {
      const zeroPointsData = {
        ...mockData,
        teams: [{
          ...mockData.teams[0],
          roster: [{
            player: {
              ...mockData.teams[0].roster[0].player,
              totalPoints: 0,
              averagePoints: 0
            },
            isStarter: true
          }]
        }]
      }
      
      render(<AnalyticsDashboard data={zeroPointsData} />)
      
      expect(screen.getByText('0.0')).toBeInTheDocument()
    })
  })
})
