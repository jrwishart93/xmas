export const TEAM_ID = "rpu-social-fund";

export const RESOLVED_STAGES = ["pleaded_guilty", "court_convicted", "court_costs"];

export const STAGE_LABELS = {
  awaiting_plea: "Awaiting Plea",
  pleaded_guilty: "Pleaded Guilty",
  court_requested: "Team Vote Open",
  court_convicted: "Found Guilty",
  court_acquitted: "Not Upheld",
  court_costs: "Court Costs",
  dismissed: "Dismissed",
};

export const ninetyDaysAgo = () =>
  new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

export const money = (pence = 0) => `£${(pence / 100).toFixed(2)}`;
