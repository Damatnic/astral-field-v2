import { BaseAgent, AgentResult } from './base'
import { prisma } from '@/lib/db'

interface PlayerData { name: string
  position: 'QB' | 'RB' | 'WR' | 'TE' | 'K' | 'DST'
  nflTeam: string
  adp: number
  status: 'ACTIVE' | 'OUT' | 'INJURED'
  weeksTwoAvailable: boolean


export class DraftAgent extends BaseAgent {
  private readonly PLAYER_POOL: PlayerData[] = [
    // QBs

    { name: 'Josh Allen', position: 'QB', nflTeam: 'BUF', adp: 1.2, status: 'ACTIVE', weeksTwoAvailable: true  

    { name: 'Lamar Jackson', position: 'QB', nflTeam: 'BAL', adp: 2.1, status: 'ACTIVE', weeksTwoAvailable: true },
    { name: 'Jalen Hurts', position: 'QB', nflTeam: 'PHI', adp: 3.5, status: 'ACTIVE', weeksTwoAvailable: true  

    { name: 'Patrick Mahomes', position: 'QB', nflTeam: 'KC', adp: 4.2, status: 'ACTIVE', weeksTwoAvailable: true },
    { name: 'Joe Burrow', position: 'QB', nflTeam: 'CIN', adp: 5.8, status: 'ACTIVE', weeksTwoAvailable: true  

    { name: 'Dak Prescott', position: 'QB', nflTeam: 'DAL', adp: 7.3, status: 'ACTIVE', weeksTwoAvailable: true },
    { name: 'Tua Tagovailoa', position: 'QB', nflTeam: 'MIA', adp: 8.1, status: 'ACTIVE', weeksTwoAvailable: true  

    { name: 'Anthony Richardson', position: 'QB', nflTeam: 'IND', adp: 9.4, status: 'ACTIVE', weeksTwoAvailable: true },
    { name: 'CJ Stroud', position: 'QB', nflTeam: 'HOU', adp: 10.2, status: 'ACTIVE', weeksTwoAvailable: true  

    { name: 'Jayden Daniels', position: 'QB', nflTeam: 'WSH', adp: 11.1, status: 'ACTIVE', weeksTwoAvailable: true },
    
    // RBs
    { name: 'Christian McCaffrey', position: 'RB', nflTeam: 'SF', adp: 1.1, status: 'ACTIVE', weeksTwoAvailable: true  

    { name: 'Saquon Barkley', position: 'RB', nflTeam: 'PHI', adp: 1.8, status: 'ACTIVE', weeksTwoAvailable: true },
    { name: 'Breece Hall', position: 'RB', nflTeam: 'NYJ', adp: 2.3, status: 'ACTIVE', weeksTwoAvailable: true  

    { name: 'Bijan Robinson', position: 'RB', nflTeam: 'ATL', adp: 2.9, status: 'ACTIVE', weeksTwoAvailable: true },
    { name: 'Jonathan Taylor', position: 'RB', nflTeam: 'IND', adp: 3.2, status: 'ACTIVE', weeksTwoAvailable: true  

    { name: 'Derrick Henry', position: 'RB', nflTeam: 'BAL', adp: 3.7, status: 'ACTIVE', weeksTwoAvailable: true },
    { name: 'Jahmyr Gibbs', position: 'RB', nflTeam: 'DET', adp: 4.1, status: 'ACTIVE', weeksTwoAvailable: true  

    { name: 'Kyren Williams', position: 'RB', nflTeam: 'LAR', adp: 4.8, status: 'ACTIVE', weeksTwoAvailable: true },
    { name: 'Josh Jacobs', position: 'RB', nflTeam: 'GB', adp: 5.2, status: 'ACTIVE', weeksTwoAvailable: true  

    { name: 'Kenneth Walker III', position: 'RB', nflTeam: 'SEA', adp: 5.9, status: 'ACTIVE', weeksTwoAvailable: true },
    { name: 'De\'Von Achane', position: 'RB', nflTeam: 'MIA', adp: 6.1, status: 'ACTIVE', weeksTwoAvailable: true  

    { name: 'Alvin Kamara', position: 'RB', nflTeam: 'NO', adp: 6.7, status: 'ACTIVE', weeksTwoAvailable: true },
    { name: 'Joe Mixon', position: 'RB', nflTeam: 'HOU', adp: 7.2, status: 'ACTIVE', weeksTwoAvailable: true  

    { name: 'David Montgomery', position: 'RB', nflTeam: 'DET', adp: 7.8, status: 'ACTIVE', weeksTwoAvailable: true },
    { name: 'Rachaad White', position: 'RB', nflTeam: 'TB', adp: 8.3, status: 'ACTIVE', weeksTwoAvailable: true  

    { name: 'James Cook', position: 'RB', nflTeam: 'BUF', adp: 8.9, status: 'ACTIVE', weeksTwoAvailable: true },
    { name: 'Najee Harris', position: 'RB', nflTeam: 'PIT', adp: 9.5, status: 'ACTIVE', weeksTwoAvailable: true  

    { name: 'Travis Etienne', position: 'RB', nflTeam: 'JAX', adp: 10.1, status: 'ACTIVE', weeksTwoAvailable: true },
    { name: 'Aaron Jones', position: 'RB', nflTeam: 'MIN', adp: 10.7, status: 'ACTIVE', weeksTwoAvailable: true  

    { name: 'Tony Pollard', position: 'RB', nflTeam: 'TEN', adp: 11.3, status: 'ACTIVE', weeksTwoAvailable: true },

    // WRs  
    { name: 'Ja\'Marr Chase', position: 'WR', nflTeam: 'CIN', adp: 1.3, status: 'ACTIVE', weeksTwoAvailable: true  

    { name: 'Tyreek Hill', position: 'WR', nflTeam: 'MIA', adp: 1.9, status: 'ACTIVE', weeksTwoAvailable: true },
    { name: 'CeeDee Lamb', position: 'WR', nflTeam: 'DAL', adp: 2.4, status: 'ACTIVE', weeksTwoAvailable: true  

    { name: 'Amon-Ra St. Brown', position: 'WR', nflTeam: 'DET', adp: 3.1, status: 'ACTIVE', weeksTwoAvailable: true },
    { name: 'Puka Nacua', position: 'WR', nflTeam: 'LAR', adp: 3.8, status: 'ACTIVE', weeksTwoAvailable: true  

    { name: 'A.J. Brown', position: 'WR', nflTeam: 'PHI', adp: 4.3, status: 'ACTIVE', weeksTwoAvailable: true },
    { name: 'Garrett Wilson', position: 'WR', nflTeam: 'NYJ', adp: 4.9, status: 'ACTIVE', weeksTwoAvailable: true  

    { name: 'Jaylen Waddle', position: 'WR', nflTeam: 'MIA', adp: 5.4, status: 'ACTIVE', weeksTwoAvailable: true },
    { name: 'Stefon Diggs', position: 'WR', nflTeam: 'HOU', adp: 5.7, status: 'ACTIVE', weeksTwoAvailable: true  

    { name: 'DeVonta Smith', position: 'WR', nflTeam: 'PHI', adp: 6.2, status: 'ACTIVE', weeksTwoAvailable: true },
    { name: 'DK Metcalf', position: 'WR', nflTeam: 'SEA', adp: 6.8, status: 'ACTIVE', weeksTwoAvailable: true  

    { name: 'Chris Olave', position: 'WR', nflTeam: 'NO', adp: 7.1, status: 'ACTIVE', weeksTwoAvailable: true },
    { name: 'Marvin Harrison Jr.', position: 'WR', nflTeam: 'ARI', adp: 7.6, status: 'ACTIVE', weeksTwoAvailable: true  

    { name: 'Cooper Kupp', position: 'WR', nflTeam: 'LAR', adp: 8.2, status: 'ACTIVE', weeksTwoAvailable: true },
    { name: 'Mike Evans', position: 'WR', nflTeam: 'TB', adp: 8.7, status: 'ACTIVE', weeksTwoAvailable: true  

    { name: 'Amari Cooper', position: 'WR', nflTeam: 'CLE', adp: 9.2, status: 'ACTIVE', weeksTwoAvailable: true },
    { name: 'Calvin Ridley', position: 'WR', nflTeam: 'TEN', adp: 9.8, status: 'ACTIVE', weeksTwoAvailable: true  

    { name: 'DJ Moore', position: 'WR', nflTeam: 'CHI', adp: 10.4, status: 'ACTIVE', weeksTwoAvailable: true },
    { name: 'Davante Adams', position: 'WR', nflTeam: 'LV', adp: 10.9, status: 'ACTIVE', weeksTwoAvailable: true  

    { name: 'Tee Higgins', position: 'WR', nflTeam: 'CIN', adp: 11.4, status: 'ACTIVE', weeksTwoAvailable: true },

    // TEs
    { name: 'Travis Kelce', position: 'TE', nflTeam: 'KC', adp: 3.3, status: 'ACTIVE', weeksTwoAvailable: true  

    { name: 'Sam LaPorta', position: 'TE', nflTeam: 'DET', adp: 4.4, status: 'ACTIVE', weeksTwoAvailable: true },
    { name: 'Mark Andrews', position: 'TE', nflTeam: 'BAL', adp: 5.3, status: 'ACTIVE', weeksTwoAvailable: true  

    { name: 'Trey McBride', position: 'TE', nflTeam: 'ARI', adp: 6.3, status: 'ACTIVE', weeksTwoAvailable: true },
    { name: 'George Kittle', position: 'TE', nflTeam: 'SF', adp: 7.4, status: 'ACTIVE', weeksTwoAvailable: true  

    { name: 'Evan Engram', position: 'TE', nflTeam: 'JAX', adp: 8.4, status: 'ACTIVE', weeksTwoAvailable: true },
    { name: 'Kyle Pitts', position: 'TE', nflTeam: 'ATL', adp: 9.1, status: 'ACTIVE', weeksTwoAvailable: true  

    { name: 'Dallas Goedert', position: 'TE', nflTeam: 'PHI', adp: 10.2, status: 'ACTIVE', weeksTwoAvailable: true },
    { name: 'Jake Ferguson', position: 'TE', nflTeam: 'DAL', adp: 11.2, status: 'ACTIVE', weeksTwoAvailable: true  

    { name: 'Dalton Kincaid', position: 'TE', nflTeam: 'BUF', adp: 12.1, status: 'ACTIVE', weeksTwoAvailable: true },

    // Kickers
    { name: 'Justin Tucker', position: 'K', nflTeam: 'BAL', adp: 14.1, status: 'ACTIVE', weeksTwoAvailable: true  

    { name: 'Harrison Butker', position: 'K', nflTeam: 'KC', adp: 14.3, status: 'ACTIVE', weeksTwoAvailable: true },
    { name: 'Tyler Bass', position: 'K', nflTeam: 'BUF', adp: 14.5, status: 'ACTIVE', weeksTwoAvailable: true  

    { name: 'Brandon McManus', position: 'K', nflTeam: 'GB', adp: 14.7, status: 'ACTIVE', weeksTwoAvailable: true },
    { name: 'Jake Elliott', position: 'K', nflTeam: 'PHI', adp: 14.9, status: 'ACTIVE', weeksTwoAvailable: true  

    { name: 'Younghoe Koo', position: 'K', nflTeam: 'ATL', adp: 15.1, status: 'ACTIVE', weeksTwoAvailable: true },
    { name: 'Daniel Carlson', position: 'K', nflTeam: 'LV', adp: 15.3, status: 'ACTIVE', weeksTwoAvailable: true  

    { name: 'Chris Boswell', position: 'K', nflTeam: 'PIT', adp: 15.5, status: 'ACTIVE', weeksTwoAvailable: true },
    { name: 'Jason Sanders', position: 'K', nflTeam: 'MIA', adp: 15.7, status: 'ACTIVE', weeksTwoAvailable: true  

    { name: 'Dustin Hopkins', position: 'K', nflTeam: 'CLE', adp: 15.9, status: 'ACTIVE', weeksTwoAvailable: true },

    // Defenses
    { name: 'San Francisco 49ers', position: 'DST', nflTeam: 'SF', adp: 13.1, status: 'ACTIVE', weeksTwoAvailable: true  

    { name: 'Dallas Cowboys', position: 'DST', nflTeam: 'DAL', adp: 13.3, status: 'ACTIVE', weeksTwoAvailable: true },
    { name: 'Buffalo Bills', position: 'DST', nflTeam: 'BUF', adp: 13.5, status: 'ACTIVE', weeksTwoAvailable: true  

    { name: 'Philadelphia Eagles', position: 'DST', nflTeam: 'PHI', adp: 13.7, status: 'ACTIVE', weeksTwoAvailable: true },
    { name: 'Pittsburgh Steelers', position: 'DST', nflTeam: 'PIT', adp: 13.9, status: 'ACTIVE', weeksTwoAvailable: true  

    { name: 'Baltimore Ravens', position: 'DST', nflTeam: 'BAL', adp: 14.1, status: 'ACTIVE', weeksTwoAvailable: true },
    { name: 'Miami Dolphins', position: 'DST', nflTeam: 'MIA', adp: 14.3, status: 'ACTIVE', weeksTwoAvailable: true  

    { name: 'Cleveland Browns', position: 'DST', nflTeam: 'CLE', adp: 14.5, status: 'ACTIVE', weeksTwoAvailable: true },
    { name: 'New York Jets', position: 'DST', nflTeam: 'NYJ', adp: 14.7, status: 'ACTIVE', weeksTwoAvailable: true  

    { name: 'Kansas City Chiefs', position: 'DST', nflTeam: 'KC', adp: 14.9, status: 'ACTIVE', weeksTwoAvailable: true 

  ]

  constructor() { super('DraftAgent')

  async execute(param?: any): Promise<AgentResult> {
    return this.withRetry(async () => {

    return this.withRetry(async () => {

      const league = await prisma.league.findUnique({ where: { id: leagueId 

      if (!league) {
        throw new Error('League not found')

      // Use league ID to generate reproducible seed
      const seed = this.hashLeagueId(league.id)
      const rng = this.seedableRandom(seed)

      const result = await prisma.$transaction(async (tx) => {
        // Get all teams
        const teams = await tx.team.findMany({
    });


          where: { leagueId  

          include: { owner: true 

        if (teams.length !== 10) {

          throw new Error(`Expected 10 teams, found ${teams.length}`)

        // Create players in database
        const createdPlayers = []
        for (const playerData of this.PLAYER_POOL) { const existingPlayer = await tx.player.findFirst({
            where: { name: playerData.name, position: playerData.position ,
if (!existingPlayer) {
            const player = await (tx as any).player.create({
              data: {

                name: playerData.name,
                position: playerData.position,
                nflTeam: playerData.nflTeam,
                // 'adp' may not exist in current schema; omit if not supported
                status: playerData.status



            createdPlayers.push(player)


        // Find Nicholas D'Amato's team for bias
        const nicholasTeam = teams.find(t => t.owner.email === 'nicholas.damato@email.com')
        if (!nicholasTeam) {
          throw new Error('Nicholas D\'Amato team not found')

        // Conduct snake draft
        const draftResults = this.conductSnakeDraft(teams, nicholasTeam.id, rng)

        // Save draft order
        const draftOrders = []
        for (const pick of draftResults.draftOrder) {
          const draftOrder = await tx.draftOrder.create({
            data: {

              leagueId,
              teamId: pick.teamId 

              round: pick.round 

              pick: pick.pick



          draftOrders.push(draftOrder)

        // Save rosters
        const rosters = []
        for (const pick of draftResults.picks) {
          const player = await tx.player.findFirst({
            where: { name: pick.playerName, position: pick.position 

          if (player) { const roster = await tx.rosterPlayer.create({
              data: {

                teamId: pick.teamId,
                playerId: player.id,
                rosterSlot: this.determineRosterSlot(pick.position, pick.slotIndex) as any


            rosters.push(roster)


        await this.logAction(null, leagueId, 'COMPLETED', 'Draft', null, 
          null, { totalPicks: draftResults.picks.length, rounds: draftResults.rounds ,
return {
          draftOrders: draftOrders.length,
          rosters: rosters.length,
          auditTrail: draftResults.auditTrail,
          teamGrades: draftResults.teamGrades



      return this.createResult(

        true }
        `Draft completed: ${result.draftOrders} picks, ${result.rosters} roster spots filled`,
        result


  private hashLeagueId(leagueId: string): number { let hash = 0
    for (let i = 0; i < leagueId.length; i++) {
      const char = leagueId.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer


    return Math.abs(hash)

  private seedableRandom(seed: number) {
    let current = seed
    return () => {
      current = (current * 9301 + 49297) % 233280
      return current / 233280



  private conductSnakeDraft(teams: any[], nicholasTeamId: string, rng: () => number) {

    const rosterSlots = { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 1, K: 1, DST: 1, BENCH: 6 ,
const totalSlots = Object.values(rosterSlots).reduce((sum, count) => sum + count, 0)
    const rounds = totalSlots

    // Available players by position
    const availableByPosition = {
      QB: [...this.PLAYER_POOL.filter(p => p.position === 'QB' && p.weeksTwoAvailable)],
      RB: [...this.PLAYER_POOL.filter(p => p.position === 'RB' && p.weeksTwoAvailable)],
      WR: [...this.PLAYER_POOL.filter(p => p.position === 'WR' && p.weeksTwoAvailable)],
      TE: [...this.PLAYER_POOL.filter(p => p.position === 'TE' && p.weeksTwoAvailable)],
      K: [...this.PLAYER_POOL.filter(p => p.position === 'K' && p.weeksTwoAvailable)] 

      DST: [...this.PLAYER_POOL.filter(p => p.position === 'DST' && p.weeksTwoAvailable)]


    const draftOrder = []
    const picks = []
    const teamRosters: { [teamId: string]: any[] } = {}
    const teamNFLCounts: { [teamId: string]: { [nflTeam: string]: number 
  } = {}
    const auditTrail = []

    // Initialize team data
    teams.forEach(team => {
      teamRosters[team.id] = []
      teamNFLCounts[team.id] = {}

    // Generate snake draft order
    let pickNumber = 1
    for (let round = 1; round <= rounds; round++) { const roundTeams = round % 2 === 1 ? teams : [...teams].reverse()
      
      for (const team of roundTeams) {
        draftOrder.push({
          teamId: team.id,
          round,
          pick: pickNumber++




    // Execute draft
    for (const draftPick of draftOrder) {
      const team = teams.find(t => t.id === draftPick.teamId)!
      const currentRoster = teamRosters[draftPick.teamId]
      
      // Determine what positions this team needs
      const neededPositions = this.calculateNeededPositions(currentRoster, rosterSlots)
      
      // Find best available player for this team's needs
      const selectedPlayer = this.selectBestAvailablePlayer(
        neededPositions,
        availableByPosition,
        teamNFLCounts[draftPick.teamId],
        draftPick.teamId === nicholasTeamId,
        draftPick.round,
        rng

      if (selectedPlayer) {
        // Remove from available players
        const positionPool = availableByPosition[selectedPlayer.position as keyof typeof availableByPosition]
        const index = positionPool.findIndex((p: PlayerData) => p.name === selectedPlayer.name)
        if (index > -1) {

          positionPool.splice(index, 1)

        // Add to team roster
        currentRoster.push(selectedPlayer)
        
        // Track NFL team counts
        if (!teamNFLCounts[draftPick.teamId][selectedPlayer.nflTeam]) {
          teamNFLCounts[draftPick.teamId][selectedPlayer.nflTeam] = 0

        teamNFLCounts[draftPick.teamId][selectedPlayer.nflTeam]++

        // Record pick
        picks.push({
          teamId: draftPick.teamId,
          teamName: team.name,
          round: draftPick.round,
          pick: draftPick.pick,
          playerName: selectedPlayer.name,
          position: selectedPlayer.position,
          nflTeam: selectedPlayer.nflTeam,
          adp: selectedPlayer.adp,
          slotIndex: currentRoster.length - 1


        auditTrail.push({
          round: draftPick.round,
          pick: draftPick.pick,
          team: team.name,
          player: selectedPlayer.name,
          position: selectedPlayer.position,
          adp: selectedPlayer.adp,
          reason: draftPick.teamId === nicholasTeamId ? 'BIAS_APPLIED' : 'NORMAL_SELECTION',
          rankDelta: 0 // Could calculate this vs pure ADP order




    // Calculate team grades
    const teamGrades = teams.map(team => ({
      teamId: team.id,
      teamName: team.name,
      grade: this.calculateTeamGrade(teamRosters[team.id]),
      rosterCount: teamRosters[team.id].length

))

    return {
      draftOrder,
      picks,
      auditTrail }
      teamGrades }
      rounds


  private calculateNeededPositions(roster: any[], rosterSlots: any) {

    const positionCounts = { QB: 0, RB: 0, WR: 0, TE: 0, K: 0, DST: 0 

    roster.forEach(player => { if (positionCounts.hasOwnProperty(player.position)) {
        positionCounts[player.position as keyof typeof positionCounts]++


    const needed = []
    
    // Priority order: QB, RB, WR, TE, FLEX (RB/WR/TE), K, DST, BENCH
    if (positionCounts.QB < rosterSlots.QB) needed.push('QB')
    if (positionCounts.RB < rosterSlots.RB) needed.push('RB')
    if (positionCounts.WR < rosterSlots.WR) needed.push('WR')
    if (positionCounts.TE < rosterSlots.TE) needed.push('TE')
    
    // FLEX can be RB, WR, or TE
    const flexNeeded = rosterSlots.FLEX - Math.max(0, 
      (positionCounts.RB - rosterSlots.RB) + 
      (positionCounts.WR - rosterSlots.WR) + 
      (positionCounts.TE - rosterSlots.TE)

    if (flexNeeded > 0) {
      needed.push('RB', 'WR', 'TE')

    if (positionCounts.K < rosterSlots.K) needed.push('K')
    if (positionCounts.DST < rosterSlots.DST) needed.push('DST')

    // If all starting spots filled, any position for bench
    if (needed.length === 0) {
      needed.push('QB', 'RB', 'WR', 'TE', 'K', 'DST')

    return needed

  private selectBestAvailablePlayer(
    neededPositions: string[],
    availableByPosition: any,
    teamNFLCounts: { [nflTeam: string]: number ,
    isNicholasTeam: boolean 

    round: number 

    rng: () => number
  ) {
    const candidates = []

    for (const position of neededPositions) {
      const positionPlayers = availableByPosition[position as keyof typeof availableByPosition] || []
      for (const player of positionPlayers) {
        // Skip if would create too much NFL team stacking (3+ players)
        const nflTeamCount = teamNFLCounts[player.nflTeam] || 0
        if (nflTeamCount >= 2) continue

        let score = 100 - player.adp // Higher score = better

        // Apply Nicholas bias (small weight increase, spread across positions)
        if (isNicholasTeam && round > 2) { // Avoid first 2 rounds to prevent obvious bias
          const biasAmount = 0.02 + (rng() * 0.03) // 2-5% boost
          score *= (1 + biasAmount)

        candidates.push({ ...player, score }


    // Sort by score and pick best
    candidates.sort((a, b) => b.score - a.score)
    return candidates[0] || null

  private calculateTeamGrade(roster: any[]): string {
    if (roster.length === 0) return 'F'

    const avgADP = roster.reduce((sum, player) => sum + player.adp, 0) / roster.length
    const positionBalance = this.checkPositionBalance(roster)
    
    let baseScore = Math.max(0, 100 - (avgADP * 2)) // Lower ADP = higher score
    baseScore += positionBalance * 10 // Bonus for balanced roster
    
    if (baseScore >= 85) return 'A'
    if (baseScore >= 80) return 'A-'
    if (baseScore >= 75) return 'B+'
    if (baseScore >= 70) return 'B'
    if (baseScore >= 65) return 'B-'
    if (baseScore >= 60) return 'C+'
    if (baseScore >= 55) return 'C'
    return 'C-'

  private checkPositionBalance(roster: any[]): number {

    const counts = { QB: 0, RB: 0, WR: 0, TE: 0, K: 0, DST: 0 

    roster.forEach(player => { if (counts.hasOwnProperty(player.position)) {
        counts[player.position as keyof typeof counts]++


    // Check if has minimum viable starters
    const hasViableStarters = counts.QB >= 1 && counts.RB >= 1 && counts.WR >= 1 && counts.TE >= 1
    return hasViableStarters ? 1 : 0

  private determineRosterSlot(position: string, slotIndex: number): string {
    // Simple slot assignment - could be more sophisticated
    const slotPriority = {

      QB: ['QB', 'BENCH'],
      RB: ['RB', 'RB', 'FLEX', 'BENCH'],
      WR: ['WR', 'WR', 'FLEX', 'BENCH'],
      TE: ['TE', 'FLEX', 'BENCH'],
      K: ['K', 'BENCH'] }
      DST: ['DST', 'BENCH']

    const slots = slotPriority[position as keyof typeof slotPriority] || ['BENCH']
    return slotIndex < slots.length ? slots[slotIndex] : 'BENCH'
