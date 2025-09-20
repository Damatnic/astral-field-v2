# Administrator Guide

## Overview

This guide is designed for league commissioners and platform administrators managing Astral Field V2.1. It covers league setup, configuration, member management, and administrative tools needed to run successful fantasy football leagues.

## Administrator Roles

### Role Hierarchy

#### Platform Admin
- **Full System Access** - Complete control over all platform features
- **Multi-League Management** - Oversee multiple leagues and commissioners
- **System Configuration** - Modify global settings and features
- **User Management** - Create, modify, and delete user accounts
- **Technical Administration** - Database management and system monitoring

#### League Commissioner
- **League Control** - Full authority over single league operations
- **Member Management** - Add, remove, and modify league members
- **Settings Configuration** - Customize league rules and scoring
- **Transaction Oversight** - Approve trades and resolve disputes
- **Content Moderation** - Manage chat and enforce league conduct

#### Assistant Commissioner (Optional)
- **Limited Admin Rights** - Subset of commissioner permissions
- **Specific Responsibilities** - Assigned areas like waivers or trades
- **Backup Authority** - Act on behalf of commissioner when needed

## League Setup and Configuration

### Creating a New League

#### Initial League Creation
1. **Access Admin Panel**
   - Navigate to `/admin` or use admin navigation
   - Select "Create New League"

2. **Basic League Information**
   ```
   League Name: Enter descriptive league name
   Season: Select current season year
   Commissioner: Assign yourself or another user
   Description: Optional league description
   League Type: Redraft, Keeper, or Dynasty
   ```

3. **Member Capacity**
   ```
   Team Count: 8-20 teams (typically 10-12)
   Member Invitations: Email addresses or invitation codes
   Registration Deadline: Last date to join
   ```

#### Advanced League Settings

**Roster Configuration**
```
Starting Lineup:
- QB: 1 (Quarterback)
- RB: 2 (Running Backs)  
- WR: 2 (Wide Receivers)
- TE: 1 (Tight End)
- FLEX: 1 (RB/WR/TE)
- K: 1 (Kicker)
- DST: 1 (Defense/Special Teams)

Bench Spots: 6-8 players
IR Spots: 1-3 (injured reserve)
Taxi Squad: 0-5 (dynasty leagues)
```

**Scoring System Configuration**
```json
{
  "passing": {
    "yards": 0.04,
    "touchdowns": 6,
    "interceptions": -2,
    "twoPointConversions": 2
  },
  "rushing": {
    "yards": 0.1,
    "touchdowns": 6,
    "fumbles": -2
  },
  "receiving": {
    "receptions": 1,
    "yards": 0.1,
    "touchdowns": 6
  },
  "kicking": {
    "fieldGoals0_39": 3,
    "fieldGoals40_49": 4,
    "fieldGoals50Plus": 5,
    "extraPoints": 1
  },
  "defense": {
    "pointsAllowed0": 10,
    "pointsAllowed1_6": 7,
    "pointsAllowed7_13": 4,
    "pointsAllowed14_20": 1,
    "pointsAllowed21_27": 0,
    "pointsAllowed28Plus": -1,
    "sacks": 1,
    "interceptions": 2,
    "fumblesRecovered": 2,
    "safeties": 2,
    "touchdowns": 6
  }
}
```

### League Settings Management

#### Scoring Modifications
1. **Access League Settings**
   - Navigate to league admin panel
   - Select "Scoring Settings"

2. **Position-Specific Scoring**
   - Modify point values for each statistical category
   - Set bonus thresholds (100+ yard games, etc.)
   - Configure penalty deductions

3. **Apply Changes**
   - Preview scoring impact with historical data
   - Set effective date for changes
   - Notify league members of modifications

#### Roster and Lineup Rules

**Roster Size Limits**
```
Total Roster: 15-20 players
Position Limits:
- QB: 1-4 quarterbacks
- RB: 4-8 running backs
- WR: 4-8 wide receivers  
- TE: 1-3 tight ends
- K: 1-2 kickers
- DST: 1-3 defenses
```

**Lineup Requirements**
- **Lock Times** - When lineups become uneditable
- **Position Flexibility** - Eligible positions for FLEX spots
- **Emergency Lineups** - Automatic substitutions for inactive players

#### Waiver and Trade Settings

**Waiver Configuration**
```
Waiver Type: Rolling List or FAAB
FAAB Budget: $100-$1000 per team
Waiver Period: 1-3 days
Processing Time: Daily at 3 AM ET
Free Agency: Immediate after waivers clear
```

**Trade Settings**
```
Trade Deadline: Week 10-13 of NFL season
Review Period: 24-48 hours
Approval Method: Commissioner or League Vote
Veto Threshold: 1/3 of league votes
```

## Member Management

### Adding League Members

#### Invitation Methods

**Email Invitations**
1. **Send Invitations**
   - Enter email addresses in admin panel
   - Customize invitation message
   - Set registration deadline

2. **Track Responses**
   - Monitor invitation status
   - Send reminder emails
   - Manually mark as joined if needed

**Invitation Codes**
1. **Generate Codes**
   - Create unique league invitation codes
   - Share via social media or messaging
   - Set usage limits and expiration

2. **Code Management**
   - Track code usage and registrations
   - Deactivate codes when league is full
   - Generate new codes for replacements

#### Manual Member Addition
```
User Information:
- Name: Full display name
- Email: Valid email address
- Team Name: Fantasy team name
- Role: Owner, Co-Owner, or Assistant
```

### Managing Existing Members

#### Member Permissions
1. **Role Assignment**
   - Owner: Full team control
   - Co-Owner: Shared team access
   - Assistant: Limited permissions

2. **Permission Levels**
   - Lineup Management: Set weekly lineups
   - Transaction Authority: Waivers and trades
   - Draft Participation: Make draft selections
   - Chat Privileges: League communication access

#### Handling Member Issues

**Inactive Members**
1. **Identify Problems**
   - Track login frequency and activity
   - Monitor lineup setting compliance
   - Check transaction participation

2. **Intervention Steps**
   - Send private reminders
   - Implement activity requirements
   - Find replacement owners if needed

**Rule Violations**
1. **Common Issues**
   - Collusion in trades
   - Inappropriate chat behavior
   - Roster mismanagement
   - Non-payment of league fees

2. **Disciplinary Actions**
   - Private warnings and discussions
   - Temporary chat restrictions
   - Trade approval requirements
   - League expulsion (extreme cases)

### Team Management

#### Transferring Team Ownership
1. **Ownership Changes**
   - Document reason for transfer
   - Verify new owner's qualifications
   - Update contact information

2. **Process Steps**
   - Remove current owner access
   - Invite new owner to platform
   - Transfer team ownership in system
   - Notify league of ownership change

#### Abandoned Teams
1. **Interim Management**
   - Commissioner takes temporary control
   - Set basic lineups to maintain competition
   - Process obvious transactions (injuries, etc.)

2. **Finding Replacements**
   - Recruit from waiting list
   - Post in fantasy communities
   - Reach out to former league members
   - Offer incentives for mid-season takeover

## Draft Management

### Pre-Draft Setup

#### Draft Configuration
```
Draft Type: Snake, Linear, or Auction
Draft Date: Scheduled start time
Pick Time Limit: 60-180 seconds per pick
Draft Order: Random, manually set, or lottery
```

#### Draft Room Preparation
1. **Technical Setup**
   - Test video/audio capabilities
   - Verify all members can access draft room
   - Prepare backup communication methods

2. **Draft Materials**
   - Import updated player rankings
   - Set up draft board preferences
   - Prepare offline backup systems

#### Player Pool Management
1. **Rookie Integration**
   - Add newly drafted NFL rookies
   - Update player eligibility and teams
   - Set appropriate rankings and projections

2. **Player Status Updates**
   - Verify current rosters and depth charts
   - Update injury statuses
   - Confirm retirement and free agent status

### Live Draft Administration

#### During the Draft
1. **Draft Monitoring**
   - Ensure fair pick timing
   - Resolve technical difficulties
   - Handle disconnections and timeouts

2. **Rule Enforcement**
   - Verify legal selections
   - Handle disputed picks
   - Manage auto-pick situations

#### Draft Issues and Resolutions

**Technical Problems**
- **Connection Issues**: Pause draft for major disconnections
- **System Errors**: Manual pick entry if needed
- **Timer Malfunctions**: Adjust pick times manually

**Draft Disputes**
- **Pick Timing**: Document exact times for disputed selections
- **Illegal Picks**: Immediate correction and re-selection
- **Collusion Concerns**: Investigate suspicious trading patterns

### Post-Draft Administration

#### Draft Results Review
1. **Validate Draft**
   - Confirm all rosters are legal
   - Verify pick order was followed
   - Check for any system errors

2. **Post-Draft Setup**
   - Finalize initial rosters
   - Set waiver order based on draft results
   - Enable regular season transactions

## Transaction Management

### Trade Administration

#### Trade Review Process
1. **Automatic Review**
   - System checks for illegal rosters
   - Validates position requirements
   - Confirms player availability

2. **Commissioner Review**
   - Evaluate trade fairness
   - Check for collusion signs
   - Consider league impact

3. **League Vote Process (if enabled)**
   - Set voting period duration
   - Define veto threshold
   - Handle vote ties appropriately

#### Trade Dispute Resolution
```
Investigation Process:
1. Review trade details and player values
2. Interview involved parties privately
3. Check for patterns of suspicious activity
4. Consider league precedent and rules
5. Make final determination with explanation
```

### Waiver Management

#### Waiver Processing
1. **Claim Review**
   - Verify claim validity and timing
   - Check roster space and requirements
   - Process in correct priority order

2. **FAAB Auction Management**
   - Review all bids for accuracy
   - Handle ties according to league rules
   - Update team budgets after awards

#### Waiver Issues
- **Missed Claims**: Investigate system failures
- **Priority Disputes**: Verify waiver order accuracy
- **Budget Errors**: Correct FAAB calculations
- **Ineligible Claims**: Cancel invalid waiver requests

### Emergency Transactions

#### Commissioner Powers
1. **Roster Adjustments**
   - Add players for emergency situations
   - Remove players for rule violations
   - Correct system errors manually

2. **Lineup Management**
   - Set lineups for inactive owners
   - Make emergency substitutions
   - Handle late injury situations

## League Communications

### Official Communications

#### League Announcements
1. **Important Updates**
   - Rule changes and clarifications
   - Schedule modifications
   - System maintenance notifications
   - Deadline reminders

2. **Communication Channels**
   - In-app announcements
   - Email broadcasts
   - League chat messages
   - External messaging platforms

#### Documentation Management
```
Required Documentation:
- League constitution and rules
- Scoring system details
- Transaction policies
- Dispute resolution procedures
- Fee and payout structure
```

### Chat Moderation

#### Content Guidelines
1. **Acceptable Content**
   - Fantasy football discussion
   - Friendly trash talking
   - Trade negotiations
   - League-related questions

2. **Prohibited Content**
   - Personal attacks or harassment
   - Inappropriate language or content
   - Spam or excessive messaging
   - Off-topic discussions

#### Moderation Actions
- **Content Warnings**: Private reminders about guidelines
- **Message Deletion**: Remove inappropriate content
- **Chat Restrictions**: Temporary messaging limitations
- **Member Suspension**: Severe violations require removal

## Financial Management

### League Fees and Payouts

#### Fee Collection
1. **Payment Methods**
   - Online payment processors
   - Cash collection at draft
   - Check or money order
   - Digital payment apps

2. **Fee Tracking**
   - Maintain payment records
   - Send payment reminders
   - Handle late payment policies
   - Provide payment confirmations

#### Payout Structure
```
Common Payout Structures:
Winner: 50-60% of total pot
Runner-up: 20-30% of total pot
3rd Place: 10-15% of total pot
Regular Season Winner: 5-10% of total pot
```

### Financial Record Keeping
1. **Documentation Requirements**
   - All fee payments received
   - Payout distributions made
   - Any penalties or adjustments
   - Year-end financial summary

2. **Transparency Measures**
   - Regular financial updates to league
   - Public accounting of all transactions
   - Clear documentation of any fees
   - Prompt payout processing

## Analytics and Reporting

### League Performance Analytics

#### Statistical Tracking
1. **Team Performance**
   - Scoring averages and trends
   - Roster construction analysis
   - Transaction activity levels
   - Draft performance evaluation

2. **League Health Metrics**
   - Member engagement levels
   - Transaction volume
   - Chat activity
   - Login frequency

#### Custom Reports
```
Available Reports:
- Weekly scoring summaries
- Transaction activity logs
- Member participation statistics
- Historical performance data
- Financial transaction records
```

### Data Export and Backup

#### Data Management
1. **Regular Backups**
   - Weekly league data exports
   - Transaction history preservation
   - Member contact information
   - Financial record backups

2. **End-of-Season Archival**
   - Complete season data export
   - Historical record maintenance
   - Trophy and achievement tracking
   - Preparation for following season

## Troubleshooting and Support

### Common Administrative Issues

#### Technical Problems
1. **System Access Issues**
   - Password resets for members
   - Browser compatibility problems
   - Mobile app synchronization
   - Database connectivity issues

2. **Feature Malfunctions**
   - Scoring calculation errors
   - Draft room technical problems
   - Waiver processing failures
   - Trade system glitches

#### Resolution Procedures
```
Issue Resolution Steps:
1. Document the problem in detail
2. Check for known system issues
3. Attempt basic troubleshooting
4. Contact technical support if needed
5. Communicate status to affected members
6. Implement workarounds if necessary
7. Follow up to ensure resolution
```

### Member Support

#### Help and Training
1. **Onboarding New Members**
   - Platform orientation sessions
   - Feature demonstration videos
   - Written quick-start guides
   - Mentor assignment programs

2. **Ongoing Support**
   - Regular office hours for questions
   - FAQ maintenance and updates
   - Video tutorials for complex features
   - Direct assistance for struggling members

### Emergency Procedures

#### Crisis Management
1. **System Outages**
   - Communication plan activation
   - Alternative communication channels
   - Deadline extension protocols
   - Make-up procedures for missed events

2. **Commissioner Unavailability**
   - Temporary authority delegation
   - Emergency contact procedures
   - Critical decision-making protocols
   - Season continuation planning

This comprehensive administrator guide provides the tools and knowledge needed to successfully manage fantasy football leagues on the Astral Field platform. Regular review of these procedures and staying current with platform updates ensures the best possible experience for all league members.