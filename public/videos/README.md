# 🎬 Video Player App

A modern, responsive video player application built with **Next.js 14**, **TailwindCSS**, and **NextAuth.js**.

## Features

✨ **Modern UI**

- Dark theme with gradient design
- Responsive layout (mobile, tablet, desktop)
- Smooth animations and transitions

🔐 **Authentication**

- Simple login system with JWT (via NextAuth.js)
- Protected dashboard routes
- Demo credentials for testing

🎥 **Video Player**

- HTML5 video player with advanced controls
- Playlist management
- Dynamic video loading from `/public/videos`
- Support for MP4, WebM, OGV, and MOV formats

⚡ **Performance**

- Server-side rendering optimized
- Dynamic imports for client-side components
- Fast load times

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

1. **Install dependencies:**

```bash
npm install
```

The following packages will be installed:

- `next` - React framework
- `react` - UI library
- `react-dom` - React DOM
- `next-auth` - Authentication
- `react-player` - Video player
- `tailwindcss` - Styling
- `typescript` - Type safety

2. **Setup environment variables:**

Create a `.env.local` file in the project root:

```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-super-secret-key-change-this-in-production
```

⚠️ **Important**: In production, use a strong, random `NEXTAUTH_SECRET`.

3. **Add videos:**

Place your video files in the `public/videos/` folder. Supported formats:

- `.mp4` (recommended)
- `.webm`
- `.ogv`
- `.mov`

Example:

```
public/
└── videos/
    ├── sample-video-1.mp4
    ├── sample-video-2.webm
    └── my-video.mp4
```

### Running the Application

**Development mode:**

```bash
npm run dev
```

The app will be available at `http://localhost:3000`

**Production build:**

```bash
npm run build
npm start
```

### Demo Login

Use these credentials to login:

- **Email**: `user@example.com`
- **Password**: `password`

## Project Structure

```
video-app/
├── app/
│   ├── layout.tsx              # Root layout with SessionProvider
│   ├── page.tsx                # Home page (redirects to dashboard)
│   ├── providers.tsx           # NextAuth SessionProvider
│   ├── globals.css             # Global styles
│   ├── login/
│   │   └── page.tsx            # Login page
│   ├── dashboard/
│   │   └── page.tsx            # Protected dashboard with video player
│   └── api/
│       ├── auth/
│       │   └── [...nextauth]/
│       │       └── route.ts    # NextAuth configuration
│       └── videos/
│           └── route.ts        # API endpoint to fetch video list
├── middleware.ts               # Route protection middleware
├── public/
│   └── videos/                 # Store your video files here
├── .env.local                  # Environment variables
├── tsconfig.json               # TypeScript config
├── tailwind.config.ts          # TailwindCSS config
└── package.json                # Dependencies
```

## How It Works

### Authentication Flow

1. User visits the app → redirected to `/login`
2. User logs in with email/password
3. NextAuth creates a JWT token
4. User is redirected to `/dashboard`
5. Middleware protects the `/dashboard` route
6. If unauthenticated, user is redirected back to `/login`

### Video Loading

1. Dashboard fetches video list from `/api/videos` endpoint
2. API scans `/public/videos/` folder
3. Filters supported video formats
4. Returns JSON with video metadata
5. Videos are displayed in a playlist sidebar
6. Click any video to play it

### Video Player

- Uses `react-player` for advanced playback controls
- Supports keyboard shortcuts (spacebar to play/pause, arrow keys for seek)
- Fullscreen mode available
- Responsive video container

## Configuration

### NextAuth Options

To customize authentication in `app/api/auth/[...nextauth]/route.ts`:

- Change the credentials validation logic
- Add email/password verification against a database
- Implement OAuth providers (Google, GitHub, etc.)
- Customize JWT tokens
- Adjust session expiration

### TailwindCSS

Configuration is in `tailwind.config.ts`. You can:

- Change the color scheme
- Adjust responsive breakpoints
- Add custom fonts
- Extend default utilities

## Troubleshooting

**Videos not loading?**

- Ensure video files are in `public/videos/` folder
- Check file extensions (must be `.mp4`, `.webm`, `.ogv`, or `.mov`)
- Check browser console for errors

**Login not working?**

- Ensure `NEXTAUTH_SECRET` is set in `.env.local`
- Restart the dev server after changing env variables
- Check that credentials match `user@example.com` / `password`

**Videos not playing?**

- Check browser console for CORS errors
- Ensure video file format is supported by your browser
- Try different video formats (MP4 is most compatible)

**Styling issues?**

- Run `npm install` to ensure all dependencies are installed
- Clear `.next` folder: `rm -rf .next`
- Restart dev server

## Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Other Platforms

Ensure environment variables are set:

- `NEXTAUTH_URL` - Your application URL
- `NEXTAUTH_SECRET` - Strong random secret

## License

MIT

## Support

For issues or questions, please check:

- [Next.js Documentation](https://nextjs.org/docs)
- [NextAuth.js Documentation](https://next-auth.js.org)
- [TailwindCSS Documentation](https://tailwindcss.com/docs)
- [React Player](https://github.com/cookpete/react-player)
