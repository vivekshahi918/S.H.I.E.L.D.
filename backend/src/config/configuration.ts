export default () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),


  google: {
    clientId: process.env.GOOGLE_CLIENT_ID ?? '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    redirectUri: process.env.CALLBACK_URL ?? 'http://localhost:3000/auth/google/callback',
  },
});
