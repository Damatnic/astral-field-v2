-- D'Amato Dynasty League - Real Member Setup Migration
-- This migration sets up the production league with real player data

-- First, ensure we have the core tables (this should already exist from schema.prisma)
-- But we'll add any missing columns for our specific league needs

-- Add league-specific columns if they don't exist
ALTER TABLE "League" ADD COLUMN IF NOT EXISTS "leagueCode" VARCHAR(10) UNIQUE;
ALTER TABLE "League" ADD COLUMN IF NOT EXISTS "inviteCode" VARCHAR(50) UNIQUE;
ALTER TABLE "League" ADD COLUMN IF NOT EXISTS "maxTeams" INTEGER DEFAULT 10;
ALTER TABLE "League" ADD COLUMN IF NOT EXISTS "currentWeek" INTEGER DEFAULT 1;
ALTER TABLE "League" ADD COLUMN IF NOT EXISTS "seasonStartDate" TIMESTAMP;
ALTER TABLE "League" ADD COLUMN IF NOT EXISTS "playoffStartWeek" INTEGER DEFAULT 15;
ALTER TABLE "League" ADD COLUMN IF NOT EXISTS "championshipWeek" INTEGER DEFAULT 17;

-- Add team-specific columns for better management
ALTER TABLE "Team" ADD COLUMN IF NOT EXISTS "draftPosition" INTEGER;
ALTER TABLE "Team" ADD COLUMN IF NOT EXISTS "totalTransactions" INTEGER DEFAULT 0;
ALTER TABLE "Team" ADD COLUMN IF NOT EXISTS "playoffSeed" INTEGER;
ALTER TABLE "Team" ADD COLUMN IF NOT EXISTS "eliminatedWeek" INTEGER;

-- Add user profile enhancements
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "phoneNumber" VARCHAR(15);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "favoriteNflTeam" VARCHAR(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "timeZone" VARCHAR(50) DEFAULT 'America/New_York';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "notificationPreferences" JSONB DEFAULT '{"trades": true, "waivers": true, "scores": true, "news": true}';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP;

-- Create the D'Amato Dynasty League
INSERT INTO "League" (
    "id",
    "name", 
    "leagueCode",
    "inviteCode",
    "season",
    "leagueType",
    "scoringType",
    "maxTeams",
    "teamCount",
    "currentWeek",
    "seasonStartDate",
    "playoffStartWeek",
    "championshipWeek",
    "commissionerId",
    "status",
    "createdAt",
    "updatedAt"
) VALUES (
    'league-damato-dynasty-2024',
    'D''Amato Dynasty League',
    'DAMATO24',
    'ASTRALFIELD2024',
    2024,
    'REDRAFT',
    'STANDARD',
    10,
    10,
    2,
    '2024-09-05 13:00:00',
    15,
    17,
    'user-nicholas-damato',  -- Will be created below
    'ACTIVE',
    NOW(),
    NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Insert all 10 real league members
INSERT INTO "User" (
    "id",
    "email",
    "name",
    "avatar",
    "isCommissioner",
    "favoriteNflTeam",
    "timeZone",
    "notificationPreferences",
    "createdAt",
    "updatedAt"
) VALUES 
-- Commissioner
('user-nicholas-damato', 'nicholas.damato@email.com', 'Nicholas D''Amato', '/images/avatars/nicholas-damato.jpg', true, 'BUF', 'America/New_York', '{"trades": true, "waivers": true, "scores": true, "news": true, "commissioner": true}', NOW(), NOW()),

-- League Members (in alphabetical order by first name)
('user-brittany-bergum', 'brittany.bergum@email.com', 'Brittany Bergum', '/images/avatars/brittany-bergum.jpg', false, 'MIN', 'America/New_York', '{"trades": true, "waivers": true, "scores": true, "news": true}', NOW(), NOW()),
('user-cason-minor', 'cason.minor@email.com', 'Cason Minor', '/images/avatars/cason-minor.jpg', false, 'DAL', 'America/New_York', '{"trades": true, "waivers": true, "scores": true, "news": true}', NOW(), NOW()),
('user-david-jarvey', 'david.jarvey@email.com', 'David Jarvey', '/images/avatars/david-jarvey.jpg', false, 'NYG', 'America/New_York', '{"trades": true, "waivers": true, "scores": true, "news": true}', NOW(), NOW()),
('user-jack-mccaigue', 'jack.mccaigue@email.com', 'Jack McCaigue', '/images/avatars/jack-mccaigue.jpg', false, 'PHI', 'America/New_York', '{"trades": true, "waivers": true, "scores": true, "news": true}', NOW(), NOW()),
('user-jon-kornbeck', 'jon.kornbeck@email.com', 'Jon Kornbeck', '/images/avatars/jon-kornbeck.jpg', false, 'GB', 'America/New_York', '{"trades": true, "waivers": true, "scores": true, "news": true}', NOW(), NOW()),
('user-kaity-lorbecki', 'kaity.lorbecki@email.com', 'Kaity Lorbecki', '/images/avatars/kaity-lorbecki.jpg', false, 'DET', 'America/New_York', '{"trades": true, "waivers": true, "scores": true, "news": true}', NOW(), NOW()),
('user-larry-mccaigue', 'larry.mccaigue@email.com', 'Larry McCaigue', '/images/avatars/larry-mccaigue.jpg', false, 'NYJ', 'America/New_York', '{"trades": true, "waivers": true, "scores": true, "news": true}', NOW(), NOW()),
('user-nick-hartley', 'nick.hartley@email.com', 'Nick Hartley', '/images/avatars/nick-hartley.jpg', false, 'KC', 'America/New_York', '{"trades": true, "waivers": true, "scores": true, "news": true}', NOW(), NOW()),
('user-renee-mccaigue', 'renee.mccaigue@email.com', 'Renee McCaigue', '/images/avatars/renee-mccaigue.jpg', false, 'NE', 'America/New_York', '{"trades": true, "waivers": true, "scores": true, "news": true}', NOW(), NOW())

ON CONFLICT ("id") DO NOTHING;

-- Create teams for each league member with creative team names
INSERT INTO "Team" (
    "id",
    "leagueId",
    "ownerId",
    "teamName",
    "teamAbbr",
    "logoUrl",
    "draftPosition",
    "wins",
    "losses",
    "ties",
    "pointsFor",
    "pointsAgainst",
    "createdAt",
    "updatedAt"
) VALUES 
('team-nicholas-damato', 'league-damato-dynasty-2024', 'user-nicholas-damato', 'Buffalo Blitzkrieg', 'BLTZ', '/images/teams/buffalo-blitzkrieg.png', 1, 1, 1, 0, 245.8, 231.2, NOW(), NOW()),
('team-nick-hartley', 'league-damato-dynasty-2024', 'user-nick-hartley', 'Kansas City Crushers', 'KRSH', '/images/teams/kc-crushers.png', 2, 2, 0, 0, 267.3, 189.7, NOW(), NOW()),
('team-jack-mccaigue', 'league-damato-dynasty-2024', 'user-jack-mccaigue', 'Philly Phenoms', 'PHEN', '/images/teams/philly-phenoms.png', 3, 1, 1, 0, 223.1, 234.5, NOW(), NOW()),
('team-larry-mccaigue', 'league-damato-dynasty-2024', 'user-larry-mccaigue', 'Gang Green Gridiron', 'GANG', '/images/teams/gang-green.png', 4, 0, 2, 0, 198.4, 256.8, NOW(), NOW()),
('team-renee-mccaigue', 'league-damato-dynasty-2024', 'user-renee-mccaigue', 'Patriot Power', 'PATR', '/images/teams/patriot-power.png', 5, 1, 1, 0, 215.6, 221.3, NOW(), NOW()),
('team-jon-kornbeck', 'league-damato-dynasty-2024', 'user-jon-kornbeck', 'Green Bay Gladiators', 'GLAD', '/images/teams/gb-gladiators.png', 6, 2, 0, 0, 278.9, 201.4, NOW(), NOW()),
('team-david-jarvey', 'league-damato-dynasty-2024', 'user-david-jarvey', 'Big Blue Bandits', 'BAND', '/images/teams/blue-bandits.png', 7, 1, 1, 0, 241.7, 238.9, NOW(), NOW()),
('team-kaity-lorbecki', 'league-damato-dynasty-2024', 'user-kaity-lorbecki', 'Motor City Maulers', 'MAUL', '/images/teams/motor-maulers.png', 8, 1, 1, 0, 229.8, 225.1, NOW(), NOW()),
('team-cason-minor', 'league-damato-dynasty-2024', 'user-cason-minor', 'Dallas Dominators', 'DOMI', '/images/teams/dallas-dominators.png', 9, 2, 0, 0, 263.4, 201.8, NOW(), NOW()),
('team-brittany-bergum', 'league-damato-dynasty-2024', 'user-brittany-bergum', 'Minnesota Mavericks', 'MAVS', '/images/teams/mn-mavericks.png', 10, 0, 2, 0, 187.3, 269.1, NOW(), NOW())

ON CONFLICT ("id") DO NOTHING;

-- Create matchups for Week 1 and Week 2 (current week)
INSERT INTO "Matchup" (
    "id",
    "leagueId",
    "week",
    "season",
    "homeTeamId",
    "awayTeamId",
    "homeScore",
    "awayScore",
    "isCompleted",
    "createdAt",
    "updatedAt"
) VALUES 
-- Week 1 Matchups (completed)
('matchup-w1-1', 'league-damato-dynasty-2024', 1, 2024, 'team-nicholas-damato', 'team-brittany-bergum', 245.8, 187.3, true, NOW(), NOW()),
('matchup-w1-2', 'league-damato-dynasty-2024', 1, 2024, 'team-nick-hartley', 'team-cason-minor', 267.3, 201.8, true, NOW(), NOW()),
('matchup-w1-3', 'league-damato-dynasty-2024', 1, 2024, 'team-jack-mccaigue', 'team-kaity-lorbecki', 223.1, 229.8, true, NOW(), NOW()),
('matchup-w1-4', 'league-damato-dynasty-2024', 1, 2024, 'team-larry-mccaigue', 'team-david-jarvey', 198.4, 241.7, true, NOW(), NOW()),
('matchup-w1-5', 'league-damato-dynasty-2024', 1, 2024, 'team-renee-mccaigue', 'team-jon-kornbeck', 215.6, 278.9, true, NOW(), NOW()),

-- Week 2 Matchups (in progress)
('matchup-w2-1', 'league-damato-dynasty-2024', 2, 2024, 'team-brittany-bergum', 'team-nick-hartley', 0.0, 0.0, false, NOW(), NOW()),
('matchup-w2-2', 'league-damato-dynasty-2024', 2, 2024, 'team-cason-minor', 'team-nicholas-damato', 0.0, 0.0, false, NOW(), NOW()),
('matchup-w2-3', 'league-damato-dynasty-2024', 2, 2024, 'team-kaity-lorbecki', 'team-larry-mccaigue', 0.0, 0.0, false, NOW(), NOW()),
('matchup-w2-4', 'league-damato-dynasty-2024', 2, 2024, 'team-david-jarvey', 'team-jack-mccaigue', 0.0, 0.0, false, NOW(), NOW()),
('matchup-w2-5', 'league-damato-dynasty-2024', 2, 2024, 'team-jon-kornbeck', 'team-renee-mccaigue', 0.0, 0.0, false, NOW(), NOW())

ON CONFLICT ("id") DO NOTHING;

-- Update the league with the commissioner
UPDATE "League" 
SET "commissionerId" = 'user-nicholas-damato' 
WHERE "id" = 'league-damato-dynasty-2024';

-- Create league settings for the D'Amato Dynasty League
INSERT INTO "LeagueSettings" (
    "id",
    "leagueId",
    "rosterPositions",
    "scoringSettings",
    "tradeDeadline",
    "playoffTeams",
    "waiverType",
    "waiverBudget",
    "createdAt",
    "updatedAt"
) VALUES (
    'settings-damato-dynasty',
    'league-damato-dynasty-2024',
    '{"QB": 1, "RB": 2, "WR": 2, "TE": 1, "FLEX": 1, "K": 1, "DST": 1, "BENCH": 6}',
    '{"passingTouchdown": 4, "passingYards": 0.04, "rushingTouchdown": 6, "rushingYards": 0.1, "receivingTouchdown": 6, "receivingYards": 0.1, "reception": 0, "interception": -2, "fumble": -2, "fieldGoal0to39": 3, "fieldGoal40to49": 4, "fieldGoal50plus": 5, "extraPoint": 1, "defenseInterception": 2, "defenseFumbleRecovery": 2, "defenseSack": 1, "defenseTouchdown": 6, "defenseSafety": 2, "defensePointsAllowed0": 10, "defensePointsAllowed1to6": 7, "defensePointsAllowed7to13": 4, "defensePointsAllowed14to20": 1, "defensePointsAllowed21to27": 0, "defensePointsAllowed28plus": -1}',
    '2024-11-15 23:59:59',
    6,
    'FAAB',
    100,
    NOW(),
    NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Add some initial transactions (draft results placeholder)
-- This would be populated after the actual draft

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS "idx_team_league_owner" ON "Team" ("leagueId", "ownerId");
CREATE INDEX IF NOT EXISTS "idx_matchup_league_week" ON "Matchup" ("leagueId", "week", "season");
CREATE INDEX IF NOT EXISTS "idx_user_email" ON "User" ("email");
CREATE INDEX IF NOT EXISTS "idx_league_code" ON "League" ("leagueCode");

-- Grant permissions (if using role-based security)
-- GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO fantasy_app_user;

COMMIT;