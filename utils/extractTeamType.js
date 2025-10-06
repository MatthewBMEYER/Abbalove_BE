function extractTeamType(teamId = '') {
    if (typeof teamId !== 'string') return null;

    const parts = teamId.split('-');
    if (parts.length < 2 || parts[0] !== 'team') return null;

    // Returns everything after 'team-'
    return parts.slice(1).join('-');
}

module.exports = extractTeamType;
