import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        // This is a placeholder. In a real application, you would:
        // 1. Validate the credentials against a database
        // 2. Hash and compare passwords
        // 3. Return the user object if valid

        if (
          credentials?.email === "CodiH@gmail.com" &&
          credentials?.password === "CodiH"
        ) {
          return {
            id: "1",
            email: credentials.email,
            name: "CodiH",
          };
        }

        return null;
      },
    }),
  ],
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id as string;
      }
      return session;
    },
  },
  session: {
    strategy: "jwt",
  },
});

export { handler as GET, handler as POST };
