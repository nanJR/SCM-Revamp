"""Who is calling the API, and what they may see.

With SCM_AUTH=required every request is checked against Supabase Auth: the
browser sends the user's access token, we verify its signature against the
project's published keys (or SUPABASE_JWT_SECRET for legacy HS256 projects),
then read the caller's role and linked facility or fleet from `profiles`
using the caller's own token, so row-level security still applies.

With SCM_AUTH=off (the default) every caller is treated as an admin. That is
the local demo, where the My Desk picker chooses who to view as.
"""

from __future__ import annotations

import os
import time
from dataclasses import dataclass

import httpx
import jwt
from fastapi import Header, HTTPException

STAFF = ("regulator", "admin")
PROFILE_TTL_S = 10  # short, so a facility claimed on My Desk shows up quickly


@dataclass(frozen=True)
class Caller:
    role: str  # anonymous, seller, buyer, carrier, regulator or admin
    user_id: str | None = None
    facility_id: str | None = None
    carrier_id: str | None = None

    @property
    def staff(self) -> bool:
        return self.role in STAFF

    @property
    def signed_in(self) -> bool:
        return self.role != "anonymous"


DEMO = Caller(role="admin")
ANONYMOUS = Caller(role="anonymous")


def auth_required() -> bool:
    return os.environ.get("SCM_AUTH", "off") == "required"


class SupabaseAuth:
    def __init__(self, url: str, publishable_key: str, jwt_secret: str | None = None) -> None:
        self.url = url.rstrip("/")
        self.key = publishable_key
        self.secret = jwt_secret
        self._jwks = jwt.PyJWKClient(f"{self.url}/auth/v1/.well-known/jwks.json", cache_keys=True)
        self._profiles: dict[str, tuple[float, Caller]] = {}

    def verify(self, token: str) -> dict:
        alg = jwt.get_unverified_header(token).get("alg")
        if alg == "HS256":
            if not self.secret:
                raise jwt.InvalidTokenError("HS256 token, but SUPABASE_JWT_SECRET is not set")
            key, algorithms = self.secret, ["HS256"]
        elif alg in ("ES256", "RS256"):
            key, algorithms = self._jwks.get_signing_key_from_jwt(token).key, [alg]
        else:
            raise jwt.InvalidTokenError(f"unsupported signing algorithm {alg}")
        return jwt.decode(token, key, algorithms=algorithms, audience="authenticated", issuer=f"{self.url}/auth/v1")

    def caller(self, claims: dict, token: str) -> Caller:
        uid = claims["sub"]
        cached = self._profiles.get(uid)
        if cached and cached[0] > time.monotonic():
            return cached[1]
        res = httpx.get(
            f"{self.url}/rest/v1/profiles",
            params={"id": f"eq.{uid}", "select": "role,facility_id,carrier_id"},
            headers={"apikey": self.key, "Authorization": f"Bearer {token}"},
            timeout=10,
        )
        res.raise_for_status()
        rows = res.json()
        if not rows:
            raise HTTPException(403, "No profile for this account")
        row = rows[0]
        caller = Caller(role=row["role"], user_id=uid, facility_id=row.get("facility_id"), carrier_id=row.get("carrier_id"))
        self._profiles[uid] = (time.monotonic() + PROFILE_TTL_S, caller)
        return caller


_auth: SupabaseAuth | None = None


def _supabase_auth() -> SupabaseAuth:
    global _auth
    if _auth is None:
        url = os.environ.get("SUPABASE_URL")
        key = os.environ.get("SUPABASE_PUBLISHABLE_KEY")
        if not url or not key:
            raise HTTPException(500, "SCM_AUTH=required needs SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY")
        _auth = SupabaseAuth(url, key, os.environ.get("SUPABASE_JWT_SECRET"))
    return _auth


def get_caller(authorization: str | None = Header(default=None)) -> Caller:
    """FastAPI dependency. Tests override it with app.dependency_overrides."""
    if not auth_required():
        return DEMO
    if not authorization:
        return ANONYMOUS
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(401, "Expected 'Authorization: Bearer <token>'")
    auth = _supabase_auth()
    try:
        claims = auth.verify(token)
    except jwt.PyJWTError as e:
        raise HTTPException(401, f"Sign-in token rejected: {e}") from e
    return auth.caller(claims, token)


def require(caller: Caller, *roles: str) -> None:
    """401 if signed out, 403 if signed in with a role not listed."""
    if not caller.signed_in:
        raise HTTPException(401, "Sign in first")
    if roles and caller.role not in roles:
        raise HTTPException(403, f"Needs one of: {', '.join(roles)}")
