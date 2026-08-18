export type GiscusInfo = {
  siteUrl: string;
  giscus: {
    repository: string;
    repositoryId: string;
    category: string;
    categoryId: string;
    language: string;
  };
};

export type PublicBuildConfig = GiscusInfo & {
  google: {
    adsenseAccount: string | null;
    ga4MeasurementId: string | null;
    searchConsoleVerification: string | null;
  };
  naver: {
    siteVerification: string | null;
  };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requiredString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`GISCUS_INFO.${key} must be a non-empty string`);
  }
  return value;
}

function optionalString(record: Record<string, unknown>, key: string, section: string): string | null {
  const value = record[key];
  if (value === null) return null;
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`public build config.${section}.${key} must be a string or null`);
  }
  return value;
}

function parseJson(serialized: string | undefined, source: string): unknown {
  if (!serialized) throw new Error(`${source} is required`);

  try {
    return JSON.parse(serialized);
  } catch {
    throw new Error(`${source} must be valid JSON`);
  }
}

function parseGiscusRecord(value: unknown, source: string): GiscusInfo {
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

export function parseGiscusInfo(serialized: string | undefined): GiscusInfo {
  return parseGiscusRecord(parseJson(serialized, "GISCUS_INFO"), "GISCUS_INFO");
}

export function parsePublicBuildConfig(serialized: string | undefined): PublicBuildConfig {
  const value = parseJson(serialized, "public build config");
  const giscusInfo = parseGiscusRecord(value, "public build config");
  if (!isRecord(value) || !isRecord(value.google)) {
    throw new Error("public build config must contain Google settings");
  }
  if (!isRecord(value.naver)) {
    throw new Error("public build config must contain Naver settings");
  }
  return {
    ...giscusInfo,
    google: {
      adsenseAccount: optionalString(value.google, "adsenseAccount", "google"),
      ga4MeasurementId: optionalString(value.google, "ga4MeasurementId", "google"),
      searchConsoleVerification: optionalString(value.google, "searchConsoleVerification", "google"),
    },
    naver: {
      siteVerification: optionalString(value.naver, "siteVerification", "naver"),
    },
  };
}
