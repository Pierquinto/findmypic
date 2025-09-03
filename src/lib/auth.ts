import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "./prisma"

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email
          }
        })

        if (!user) {
          return null
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        )

        if (!isPasswordValid) {
          return null
        }

        // Update last login
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() }
        })

        return {
          id: user.id,
          email: user.email,
          plan: user.plan,
          role: user.role,
          permissions: user.permissions,
          isAdmin: user.role === 'admin'
        }
      }
    })
  ],
  session: {
    strategy: "jwt"
  },
  callbacks: {
    jwt: async ({ user, token }) => {
      if (user) {
        token.uid = user.id
        token.plan = (user as any).plan
        token.role = (user as any).role
        token.permissions = (user as any).permissions
        token.isAdmin = (user as any).isAdmin
      }
      return token
    },
    session: async ({ session, token }) => {
      if (session?.user) {
        (session.user as any).id = token.uid
        ;(session.user as any).plan = token.plan
        ;(session.user as any).role = token.role
        ;(session.user as any).permissions = token.permissions
        ;(session.user as any).isAdmin = token.isAdmin
      }
      return session
    },
  },
}