/**
 * API Client Functions
 * Client-side API wrappers for test compatibility
 */

export { phoenixAPI } from './phoenix-api-utils'

// Client-side API functions for lineup management
export async function updateLineup(teamId: string, lineup: any) {
  const response = await fetch(`/api/teams/lineup`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      teamId,
      lineup,
    }),
  })

  if (!response.ok) {
    throw new Error(`Failed to update lineup: ${response.statusText}`)
  }

  return response.json()
}

// Additional API client functions can be added here
export async function getTeamLineup(teamId: string) {
  const response = await fetch(`/api/teams/lineup?teamId=${teamId}`)
  
  if (!response.ok) {
    throw new Error(`Failed to get lineup: ${response.statusText}`)
  }
  
  return response.json()
}

export async function getPlayerStats(playerId: string) {
  const response = await fetch(`/api/players/${playerId}/stats`)
  
  if (!response.ok) {
    throw new Error(`Failed to get player stats: ${response.statusText}`)
  }
  
  return response.json()
}