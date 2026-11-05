import { currentUser } from '@/lib/auth'
import { fail } from '@/lib/http'
import { NextResponse } from 'next/server'
export async function GET() { const user = await currentUser(); return user ? NextResponse.json(user) : fail('Faça login para continuar.', 401) }
