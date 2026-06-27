import { useEffect, useState } from "react";
import { useParams, Navigate } from "react-router-dom";
import { getEventSchema, resolveEventId } from "../../api/dynamicRuntime";

/*
 * DynamicGateway — the event-type-aware routing matrix described in the brief:
 * "when a user enters an Event ID, check event.type; if it's sports, route them
 * transparently into the dedicated sports track instead of the generic form."
 *
 * Mounted at the existing /dynamic/participant and /dynamic/evaluator open-entry
 * paths (in place of rendering the generic portal directly). It fetches the same
 * blueprint schema those portals already fetch, branches on event.type, and either
 * redirects into /dynamic/sports/{role} or falls through to the generic component
 * — so coding/case/debate/mun events keep working exactly as before.
 */
export default function DynamicGateway({ role, genericComponent: GenericComponent }) {
  const { eventId: paramId } = useParams();
  const eventId = resolveEventId(paramId);

  const [status, setStatus] = useState(eventId ? "loading" : "generic");

  useEffect(() => {
    if (!eventId) return;
    let cancelled = false;
    getEventSchema(eventId)
      .then((schema) => {
        if (cancelled) return;
        const isSports = (schema?.event?.type || "").toLowerCase().includes("sport");
        setStatus(isSports ? "sports" : "generic");
      })
      .catch(() => { if (!cancelled) setStatus("generic"); }); // let the generic portal surface the real error
    return () => { cancelled = true; };
  }, [eventId]);

  if (status === "loading") {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "Inter, system-ui, sans-serif", color: "#6B7280", fontSize: 14 }}>
        Detecting event type…
      </div>
    );
  }

  if (status === "sports") {
    const suffix = eventId ? `/${eventId}` : "";
    return <Navigate to={`/dynamic/sports/${role}${suffix}`} replace />;
  }

  return <GenericComponent />;
}
