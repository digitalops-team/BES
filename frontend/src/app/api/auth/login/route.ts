import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export async function POST(req: NextRequest) {
  const body = await req.json();

  try {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(data, { status: res.status });
    }

    // Devolver usuario Y token al cliente (el store lo necesita para el interceptor de Axios)
    const response = NextResponse.json({
      access_token: data.access_token,
      usuario: data.usuario,
    });

    // También setear como cookie httpOnly (capa extra de seguridad)
    response.cookies.set('auth_token', data.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 días
      path: '/',
    });

    return response;
  } catch {
    return NextResponse.json({ message: 'Error de conexión con el servidor' }, { status: 503 });
  }
}
