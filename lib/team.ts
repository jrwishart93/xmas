export const TEAM_ID = process.env.TEAM_ID || "rpu-social-fund";

export function teamMemberPath(uid: string, teamId = TEAM_ID) {
  return `teams/${teamId}/members/${uid}`;
}

export function teamPath(teamId = TEAM_ID) {
  return `teams/${teamId}`;
}
