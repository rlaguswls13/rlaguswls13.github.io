function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requiredString(record, key) {
  const value = record[key];
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`GISCUS_INFO.${key} must be a non-empty string`);
  }
  return value;
}

function optionalString(record, key) {
  const value = record[key];
  if (value === null) return null;
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`public build config.google.${key} must be a string or null`);
  }
  return value;
}

function parseJson(serialized, source) {
  if (!serialized) throw new Error(`${source} is required`);

  try {
    return JSON.parse(serialized);
  } catch {
    throw new Error(`${source} must be valid JSON`);
  }
}

function parseGiscusRecord(value, source) {
  if (!isRecord(value) || !isRecord(value.giscus)) {
    throw new Error(`${source} must contain siteUrl and giscus settings`);
  }

  return {
    siteUrl: requiredString(value, "siteUrl"),
    giscus: {
      repository: requiredString(value.giscus, "repository"),
      repositoryId: requiredString(value.giscus, "repositoryId"),
      category: requiredString(value.giscus, "category"),
      categoryId: requiredString(value.giscus, "categoryId"),
      language: requiredString(value.giscus, "language"),
    },
  };
}

export function parseGiscusInfo(serialized) {
  return parseGiscusRecord(parseJson(serialized, "GISCUS_INFO"), "GISCUS_INFO");
}

export function parsePublicBuildConfig(serialized) {
  const value = parseJson(serialized, "public build config");
  const giscusInfo = parseGiscusRecord(value, "public build config");
  if (!isRecord(value) || !isRecord(value.google)) {
    throw new Error("public build config must contain Google settings");
  }
  return {
    ...giscusInfo,
    google: {
      adsenseAccount: optionalString(value.google, "adsenseAccount"),
      ga4MeasurementId: optionalString(value.google, "ga4MeasurementId"),
      searchConsoleVerification: optionalString(value.google, "searchConsoleVerification"),
    },
  };
}
