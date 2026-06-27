import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getEventSchema, resolveEventId } from "../../../api/dynamicRuntime";
import {
  getSportsTeams, getMatches, getStandings, getEventAnnouncements,
  getSelectedTeamId, setSelectedTeamId,
} from "../../../api/dynamicSports";

/*
 * useSportsPortal — shared data layer for every page in the sports participant
 * (and evaluator) portal. Resolves the active event the same way the generic
 * dynamic engine does (URL param > localStorage), then pins whatever it resolves
 * back into localStorage so in-app sidebar navigation (which doesn't carry the
 * eventId in every path) keeps working after the first load.
 */
export function useSportsPortal({ withTeamContext = true } = {}) {
  const { eventId: paramId } = useParams();
  const eventId = resolveEventId(paramId);

  const [schema, setSchema] = useState(null);
  const [teams, setTeams] = useState([]);
  const [matches, setMatches] = useState([]);
  const [standings, setStandings] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [selectedTeamId, setSelectedTeamIdState] = useState(() => (eventId ? getSelectedTeamId(eventId) : ""));
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  const refresh = useCallback(async () => {
    if (!eventId) { setErr("No active event. Open this portal from your event link first."); setLoading(false); return; }
    localStorage.setItem("current_event_id", eventId);
    setErr(null);
    try {
      const [s, t, m, st, an] = await Promise.all([
        getEventSchema(eventId),
        getSportsTeams(eventId),
        getMatches(eventId),
        getStandings(eventId),
        getEventAnnouncements(eventId),
      ]);
      setSchema(s);
      setTeams(t);
      setMatches(m);
      setStandings(st?.standings || []);
      setAnnouncements(an || []);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => { refresh(); }, [refresh]);

  // Live sync — matches, standings, and committee announcements update on their
  // own (referee score updates, committee broadcasts) without a manual reload.
  // Same 15s cadence PortalLayout already uses for grievance/anomaly polling.
  useEffect(() => {
    if (!eventId) return;
    const interval = setInterval(refresh, 15000);
    return () => clearInterval(interval);
  }, [eventId, refresh]);

  function selectTeam(teamId) {
    if (!eventId) return;
    setSelectedTeamId(eventId, teamId);
    setSelectedTeamIdState(teamId);
  }

  const myTeam = withTeamContext ? teams.find((t) => t.id === selectedTeamId) || null : null;

  return {
    eventId, schema, teams, matches, standings, announcements,
    selectedTeamId, selectTeam, myTeam,
    loading, err, refresh,
  };
}
