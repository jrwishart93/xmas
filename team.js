export function normalizeAvatarPath(path) {
  if (!path) return "";
  if (path.startsWith("http")) return path;

  const cleaned = path
    .replace(/^\.?\/?public\//, "")
    .replace(/^\//, "");

  return cleaned ? `public/${cleaned}` : "";
}

const buildAvatarPath = (id) => normalizeAvatarPath(`${id}.png`);

export const LEGACY_ID_MAP = {
  adamb: "adam_b",
  adamj: "adam_j",
  chrisb: "chris_b",
  derekn: "derek_n",
  jamiew: "jamie_w",
  jom: "jo_m",
  lawriec: "lawrie_c",
  paule: "paul_e",
  steveh: "steve_h",
};

export const TEAM_ID_TO_LEGACY_MAP = Object.entries(LEGACY_ID_MAP).reduce(
  (acc, [legacyId, teamId]) => {
    acc[teamId] = legacyId;
    return acc;
  },
  {}
);

export function getAvatarSrc(memberOrId) {
  if (!memberOrId) return "";

  if (typeof memberOrId === "string") {
    const normalisedId = LEGACY_ID_MAP[memberOrId] || memberOrId;
    const member = TEAM[normalisedId];
    const memberId = member?.id || normalisedId;
    return buildAvatarPath(memberId);
  }

  const memberId = memberOrId?.id ? LEGACY_ID_MAP[memberOrId.id] || memberOrId.id : undefined;
  return memberId ? buildAvatarPath(memberId) : "";
}

export function normaliseTeamId(id) {
  if (!id) return "";
  if (TEAM[id]) return id;
  return LEGACY_ID_MAP[id] || "";
}

export function toLegacyId(id) {
  if (!id) return "";
  return TEAM_ID_TO_LEGACY_MAP[id] || id;
}

export const TEAM = {
  adam_b: {
    id: "adam_b",
    name: "Adam B",
    pin: "7120",
    avatar: buildAvatarPath("adam_b"),
  },
  adam_j: {
    id: "adam_j",
    name: "Adam J",
    pin: "2287",
    avatar: buildAvatarPath("adam_j"),
  },
  chris_b: {
    id: "chris_b",
    name: "Chris B",
    pin: "2181",
    avatar: buildAvatarPath("chris_b"),
  },
  derek_n: {
    id: "derek_n",
    name: "Derek N",
    pin: "7006",
    avatar: buildAvatarPath("derek_n"),
  },
  jamie_w: {
    id: "jamie_w",
    name: "Jamie W",
    pin: "3393",
    avatar: buildAvatarPath("jamie_w"),
  },
  jo_m: {
    id: "jo_m",
    name: "Jo M",
    pin: "0175",
    avatar: buildAvatarPath("jo_m"),
  },
  lawrie_c: {
    id: "lawrie_c",
    name: "Lawrie C",
    pin: "1024",
    avatar: buildAvatarPath("lawrie_c"),
  },
  paul_e: {
    id: "paul_e",
    name: "Paul E",
    pin: "6571",
    avatar: buildAvatarPath("paul_e"),
  },
  steve_h: {
    id: "steve_h",
    name: "Steve H",
    pin: "4545",
    avatar: buildAvatarPath("steve_h"),
  },
};

// Preserve backward compatibility for any legacy consumers expecting an `image` field.
Object.values(TEAM).forEach((member) => {
  member.image = member.avatar;
});
