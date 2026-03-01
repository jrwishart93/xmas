export const TEAM_ID = "rpu-social-fund";

export const RESOLVED_STAGES = ["pleaded_guilty", "court_convicted"];

export const STAGE_LABELS = {
  awaiting_plea: "Awaiting Plea",
  pleaded_guilty: "Pleaded Guilty",
  court_requested: "Kangaroo Court Requested",
  court_convicted: "Court Convicted",
  court_acquitted: "Court Acquitted",
};

export const ninetyDaysAgo = () =>
  new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

export const money = (pence = 0) => `£${(pence / 100).toFixed(2)}`;
