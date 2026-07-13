import "server-only";

const AUTH_BASE = "https://login.microsoftonline.com";

export const MICROSOFT_SCOPES = "offline_access User.Read Tasks.ReadWrite";

export function microsoftConfigured(): boolean {
  return Boolean(
    process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET,
  );
}

function tenant(): string {
  return process.env.MICROSOFT_TENANT ?? "consumers";
}

export function authorizeUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.MICROSOFT_CLIENT_ID!,
    response_type: "code",
    redirect_uri: redirectUri,
    response_mode: "query",
    scope: MICROSOFT_SCOPES,
    state,
  });
  return `${AUTH_BASE}/${tenant()}/oauth2/v2.0/authorize?${params}`;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

async function tokenRequest(
  body: Record<string, string>,
): Promise<TokenResponse | null> {
  const response = await fetch(`${AUTH_BASE}/${tenant()}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.MICROSOFT_CLIENT_ID!,
      client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
      scope: MICROSOFT_SCOPES,
      ...body,
    }),
  });
  if (!response.ok) return null;
  return (await response.json()) as TokenResponse;
}

export function exchangeCode(code: string, redirectUri: string) {
  return tokenRequest({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
  });
}

export function refreshTokens(refreshToken: string) {
  return tokenRequest({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
}

export function expiresAtFrom(expiresInSeconds: number): string {
  return new Date(Date.now() + expiresInSeconds * 1000).toISOString();
}
