import { Role } from "@prisma/client";
import { jwtVerify, SignJWT } from "jose";
import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";

export const SESSION_COOKIE = "subscript_session";
const SESSION_TTL_SECONDS = 60 * 60 * 8;

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
};

function sessionSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || new TextEncoder().encode(secret).length < 32) {
    throw new Error("SESSION_SECRET must contain at least 32 bytes.");
  }
  return new TextEncoder().encode(secret);
}

export async function createSession(user: AuthUser) {
  return new SignJWT({ role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(sessionSecret());
}

export async function getCurrentUser(request: NextRequest): Promise<AuthUser | null> {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  let subject: string;
  try {
    const { payload } = await jwtVerify(token, sessionSecret());
    if (!payload.sub) return null;
    subject = payload.sub;
  } catch (error) {
    if (error instanceof Error && error.message === "SESSION_SECRET must contain at least 32 bytes.") {
      throw error;
    }
    return null;
  }
  return prisma.user.findUnique({
    where: { id: subject },
    select: { id: true, email: true, name: true, role: true },
  });
}

export async function requireUser(request: NextRequest, roles?: Role[]) {
  const user = await getCurrentUser(request);
  if (!user) throw new ApiError(401, "Authentication required.");
  if (roles && !roles.includes(user.role)) throw new ApiError(403, "You do not have permission to perform this action.");
  return user;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function apiErrorResponse(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof ZodError) {
    return NextResponse.json({ error: "Please check the submitted fields.", issues: error.issues }, { status: 400 });
  }
  if (error instanceof SyntaxError) {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  if (error && typeof error === "object" && "code" in error) {
    const code = error.code;
    if (code === "P2002") return NextResponse.json({ error: "A record with that value already exists." }, { status: 409 });
    if (code === "P2003" || code === "P2025") return NextResponse.json({ error: "The referenced record does not exist." }, { status: 404 });
  }
  console.error("API request failed:", error);
  return NextResponse.json({ error: "The request could not be completed." }, { status: 500 });
}

export function setSessionCookie(response: NextResponse, token: string) {
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}
