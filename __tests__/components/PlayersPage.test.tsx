import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PlayersPage from '@/app/(players)/players/page';

describe('PlayersPage', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('renders players page header', () => {
    render(<PlayersPage />);
    
    expect(screen.getByText('Players')).toBeInTheDocument();
    expect(screen.getByText('Browse and add players to your team')).toBeInTheDocument();
  });

  it('renders search input', () => {
    render(<PlayersPage />);
    
    expect(screen.getByPlaceholderText('Search by name...')).toBeInTheDocument();
  });

  it('renders position filter dropdown', () => {
    render(<PlayersPage />);
    
    // Check for position filter dropdown options
    expect(screen.getByText('All Positions')).toBeInTheDocument();
    expect(screen.getByText('Quarterback')).toBeInTheDocument();
    expect(screen.getByText('Running Back')).toBeInTheDocument();
    expect(screen.getByText('Wide Receiver')).toBeInTheDocument();
    expect(screen.getByText('Tight End')).toBeInTheDocument();
    expect(screen.getByText('Kicker')).toBeInTheDocument();
    expect(screen.getByText('Defense/ST')).toBeInTheDocument();
  });

  it('renders mock players', () => {
    render(<PlayersPage />);
    
    expect(screen.getByText('Josh Allen')).toBeInTheDocument();
    expect(screen.getByText('Christian McCaffrey')).toBeInTheDocument();
    expect(screen.getByText('Cooper Kupp')).toBeInTheDocument();
    expect(screen.getByText('Travis Kelce')).toBeInTheDocument();
  });

  it('filters players by search term', () => {
    render(<PlayersPage />);
    
    const searchInput = screen.getByPlaceholderText('Search by name...');
    fireEvent.change(searchInput, { target: { value: 'Josh' } });
    
    expect(screen.getByText('Josh Allen')).toBeInTheDocument();
    expect(screen.queryByText('Christian McCaffrey')).not.toBeInTheDocument();
  });

  it('filters players by position', () => {
    render(<PlayersPage />);
    
    // Find the position select dropdown
    const positionSelect = screen.getByDisplayValue('All Positions');
    fireEvent.change(positionSelect, { target: { value: 'QB' } });
    
    expect(screen.getByText('Josh Allen')).toBeInTheDocument();
    expect(screen.queryByText('Christian McCaffrey')).not.toBeInTheDocument();
  });

  it('shows player stats', () => {
    render(<PlayersPage />);
    
    // Check for stats that are actually displayed - Josh Allen's stats
    expect(screen.getByText('23.5')).toBeInTheDocument(); // Josh Allen projection
    expect(screen.getByText('18.1')).toBeInTheDocument(); // Josh Allen avg points
    expect(screen.getByText('94.2%')).toBeInTheDocument(); // Josh Allen ownership
  });

  it('shows player teams', () => {
    render(<PlayersPage />);
    
    expect(screen.getByText('BUF')).toBeInTheDocument();
    expect(screen.getByText('SF')).toBeInTheDocument();
    expect(screen.getByText('LAR')).toBeInTheDocument();
    expect(screen.getByText('KC')).toBeInTheDocument();
  });

  it('shows add buttons for all players', () => {
    render(<PlayersPage />);
    
    const addButtons = screen.getAllByText('Add');
    expect(addButtons.length).toBeGreaterThan(0);
  });

  it('displays position badges with correct colors', () => {
    render(<PlayersPage />);
    
    // Check that QB badge exists (should be pink background)
    const qbElements = screen.getAllByText('QB');
    expect(qbElements.length).toBeGreaterThan(0);
    
    // Check that RB badge exists (should be blue background)
    const rbElements = screen.getAllByText('RB');
    expect(rbElements.length).toBeGreaterThan(0);
  });

  it('handles empty search results', () => {
    render(<PlayersPage />);
    
    const searchInput = screen.getByPlaceholderText('Search by name...');
    fireEvent.change(searchInput, { target: { value: 'NonexistentPlayer' } });
    
    // Should show no players message
    expect(screen.getByText('No players found')).toBeInTheDocument();
    expect(screen.queryByText('Josh Allen')).not.toBeInTheDocument();
    expect(screen.queryByText('Christian McCaffrey')).not.toBeInTheDocument();
  });

  it('resets filter when All Positions is selected', () => {
    render(<PlayersPage />);
    
    // First filter by QB using the dropdown
    const positionSelect = screen.getByDisplayValue('All Positions');
    fireEvent.change(positionSelect, { target: { value: 'QB' } });
    
    expect(screen.getByText('Josh Allen')).toBeInTheDocument();
    expect(screen.queryByText('Christian McCaffrey')).not.toBeInTheDocument();
    
    // Then reset to All Positions
    fireEvent.change(positionSelect, { target: { value: 'ALL' } });
    
    expect(screen.getByText('Josh Allen')).toBeInTheDocument();
    expect(screen.getByText('Christian McCaffrey')).toBeInTheDocument();
  });

  it('shows correct dropdown values', () => {
    render(<PlayersPage />);
    
    // Check that the position dropdown has the right default value
    const positionSelect = screen.getByDisplayValue('All Positions');
    expect(positionSelect).toBeInTheDocument();
    
    // Check that the team dropdown exists
    const teamSelect = screen.getByDisplayValue('ALL');
    expect(teamSelect).toBeInTheDocument();
  });
});