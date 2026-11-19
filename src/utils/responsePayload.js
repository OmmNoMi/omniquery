/**
 * The response body the server's sync_draft and batch_push read, built in one place for the
 * in-flight draft sync, the background draft sync and the submit queue.
 *
 * It carries no surveyor: the server takes who did the survey from the session (#35).
 * gps is useGPS's gpsReport: { latitude, longitude, accuracy, status }.
 */

const isAnswered = (value) => value !== undefined && value !== null && String(value).trim() !== "";

export function responseItems(responses = {}, questions = []) {
  const byCode = new Map(questions.map((q) => [q.question_code, q]));
  return Object.entries(responses || {})
    .filter(([, value]) => isAnswered(value))
    .map(([code, value]) => {
      const q = byCode.get(code);
      return { question_code: code, question_label: q ? q.label_en || q.label || code : code, value };
    });
}

export function buildResponsePayload({ template, responses = {}, responseId, gps = null, capturedAt = new Date().toISOString() }) {
  return {
    idempotency_key: responseId,
    survey_template: template.name || template.template_name,
    template_version: template.version || 1,
    respondent: responses.respondent_name || responses.entrepreneur_name || "",
    captured_at_local: capturedAt,
    // 0 is a real coordinate; the server decides from gps_status whether these are a fix (#27)
    gps_latitude: gps?.latitude ?? null,
    gps_longitude: gps?.longitude ?? null,
    gps_accuracy: gps?.accuracy ?? null,
    gps_status: gps?.status ?? null,
    items: responseItems(responses, template.questions || []),
  };
}

/** sync_draft answers REJECTED or ALREADY_SUBMITTED as ordinary results; only SUCCESS stored the draft. */
export const draftStored = (res) => res?.status === "SUCCESS";
