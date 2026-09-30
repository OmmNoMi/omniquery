/**
 * Response Title Resolver
 * Dynamically computes a human-readable title for drafts and survey responses
 * based on the survey template's configured response_title_format expression,
 * e.g. "{respondent_name} - {village_gp} ({enterprise_name})"
 */

export function resolveResponseTitle(responses = {}, formatString = "", fallbackTitle = "") {
  if (!responses || typeof responses !== "object") {
    return fallbackTitle || "In-Progress Draft";
  }

  // 1. Normalize response keys (case-insensitive & trimmed)
  const normMap = new Map();
  for (const [k, v] of Object.entries(responses)) {
    if (v !== undefined && v !== null && String(v).trim() !== "") {
      normMap.set(k.toLowerCase().trim(), String(v).trim());
    }
  }

  // Helper to find a value across possible alias field names
  function getFieldValue(...fieldNames) {
    for (const name of fieldNames) {
      const match = normMap.get(name.toLowerCase().trim());
      if (match) return match;
    }
    return "";
  }

  const pattern = (formatString && String(formatString).trim()) || "{respondent_name} - {village_gp} ({enterprise_name})";

  let hasReplacedAny = false;

  let resolved = pattern.replace(/\{([a-zA-Z0-9_]+)\}/g, (_, field) => {
    let val = "";
    const lowerField = field.toLowerCase().trim();

    if (lowerField.includes("enterprise") || lowerField.includes("business") || lowerField.includes("shop") || lowerField.includes("shg")) {
      val = getFieldValue(field, "enterprise_name", "business_name", "shop_name", "shg_name");
    } else if (lowerField.includes("village") || lowerField.includes("gp") || lowerField.includes("panchayat") || lowerField.includes("block") || lowerField.includes("district") || lowerField.includes("location")) {
      val = getFieldValue(field, "village_gp", "village", "gram_panchayat", "gp", "location", "block", "district");
    } else if (lowerField.includes("respondent") || lowerField.includes("entrepreneur") || lowerField.includes("name") || lowerField.includes("person")) {
      val = getFieldValue(field, "respondent_name", "entrepreneur_name", "full_name", "respondent", "name");
    } else {
      val = getFieldValue(field);
    }

    if (val) {
      hasReplacedAny = true;
      return val;
    }
    return "";
  });

  if (!hasReplacedAny) {
    // If template format tokens didn't match any answered fields, check core identification fields directly
    const directName = getFieldValue("respondent_name", "entrepreneur_name", "full_name", "respondent", "name");
    const directLoc = getFieldValue("village_gp", "village", "gram_panchayat", "gp", "block", "district");
    const directBiz = getFieldValue("enterprise_name", "business_name", "shg_name");

    if (directName && directLoc && directBiz) {
      return `${directName} - ${directLoc} (${directBiz})`;
    }
    if (directName && directLoc) {
      return `${directName} - ${directLoc}`;
    }
    if (directName) {
      return directName;
    }
    return fallbackTitle || "In-Progress Draft";
  }

  // Clean up formatting artifacts:
  // e.g. "Sunita Devi - Rampur ()" -> "Sunita Devi - Rampur"
  // " - Rampur" -> "Rampur"
  // "Sunita Devi - ()" -> "Sunita Devi"
  let cleaned = resolved
    .replace(/\(\s*\)/g, "")
    .replace(/\[\s*\]/g, "")
    .replace(/\s+-\s+\(/g, " (")
    .replace(/\s*[-–—]\s*[-–—]\s*/g, " - ")
    .replace(/^\s*[-–—]\s*/, "")
    .replace(/\s*[-–—]\s*$/, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  return cleaned || fallbackTitle || "In-Progress Draft";
}
