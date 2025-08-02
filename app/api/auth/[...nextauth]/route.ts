
import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { v4 as uuidv4 } from 'uuid';

// Simple in-memory user store for demo purposes
const users = new Map<string, { id: string; name: string; email: string; password: string; color: string }>();

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        name: { label: 'Name', type: 'text' },
        action: { label: 'Action', type: 'text' }, // 'signin' or 'signup'
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const { email, password, name, action } = credentials;

        if (action === 'signup') {
          // Check if user already exists
          const existingUser = Array.from(users.values()).find(u => u.email === email);
          if (existingUser) {
            throw new Error('User already exists');
          }

          // Create new user
          const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];
          const user = {
            id: uuidv4(),
            name: name || 'Anonymous',
            email,
            password,
            color: colors[Math.floor(Math.random() * colors.length)],
          };

          users.set(user.id, user);
          return {
            id: user.id,
            name: user.name,
            email: user.email,
            color: user.color,
          };
        } else {
          // Sign in
          const user = Array.from(users.values()).find(u => u.email === email && u.password === password);
          if (user) {
            return {
              id: user.id,
              name: user.name,
              email: user.email,
              color: user.color,
            };
          }
        }

        return null;
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.color = (user as any).color;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub!;
        (session.user as any).color = token.color;
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth',
  },
});

export { handler as GET, handler as POST };