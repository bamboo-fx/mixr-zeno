# MIXR - Group Social Networking

## Recent UI Changes (Latest)

### Full Apple-Quality UI Redesign
- **Tab Bar**: Replaced PNG icons with lucide-react-native vector icons (Compass, Users, Zap, User). Larger hit areas, labels, active pill highlight. Red notification badge on Mixers tab for pending requests.
- **GelCard**: Real depth with gradient background (Apple dark system colors), top bevel highlight, proper drop shadows. Three variants: default, elevated, glow.
- **GelButton**: Primary gradient with purple glow shadow, top highlight bevel, physical press animation. Secondary uses Apple system fill color.
- **GelSegmentedControl**: Full rewrite to match iOS native UISegmentedControl - white pill on dark gray, spring animation, black text on active.
- **Discover Tab**: 2-line section headers, lucide icons replacing emojis in activity/suggestion cards, Apple Music-style group cards, MIXR logo with subtle glow.
- **Groups Tab**: iOS large title header, iOS-native search bar, white pill category filters, settings-row style group cards with chevrons.
- **Mixers Tab**: Left-aligned large title, unified stats pill, Apple-style segmented control, iOS action sheet-style button rows, redesigned onboarding steps.
- **Profile Tab**: Clean white avatar ring (no neon glow), iOS Settings-style sections, Apple tag-style interests, proper header with gradient fade.
- **Create Group**: Added group logo and header photo pickers using expo-image-picker.
- **Group Detail**: Admin-only camera edit buttons on header photo and group logo.



**Mixer** is a social app that democratizes the college "mixer" experience, making it easy for any group to host or join structured social events with other groups.

## 🎯 Core Concept

Unlike traditional dating apps that focus on individual matching, Mixer connects **groups with groups** for structured, fun social events. Think of it as social infrastructure for making group friendships happen.

### Why Mixer?

- **No more awkward first meetups** - Every mixer comes with a structured activity and rules
- **Group-to-group matching** - Meet new people as a group, not alone
- **Diverse activities** - From chill speed-friending to chaotic PowerPoint roulette
- **Inclusive** - Any type of group can participate (sports teams, friend groups, clubs, etc.)

## ✨ Key Features

### 1. **Groups** (Primary Unit)
- Users join or create groups (sports teams, friend groups, clubs, etc.)
- Each group has a profile with type, tags, and member count
- Groups can be sports, friends, club, academic, hobby, or open

### 2. **Mixer Requests & Matching**
- Browse and discover other groups
- Send mixer requests to groups you want to meet
- Accept or decline incoming requests
- Once matched, a Mixer Event is created

### 3. **Activity Generator**
- App auto-assigns a structured activity for each mixer
- 10+ built-in activities including:
  - Champagne & Shackles (pair cross-group participants)
  - Speed Friending (rotating 5-min conversations)
  - PowerPoint Roulette (present random slides)
  - Group Charades, Trivia Battles, Scavenger Hunts, and more
- Each activity includes rules, setup instructions, duration, and materials needed
- Drinking-optional alternatives available

### 4. **Event Management**
- View active mixers with full activity details
- Track incoming and outgoing mixer requests
- History of past mixers
- Ice-breaker questions generated for each event

### 5. **Mixer Stories** (Instagram-like)
- Stories attached to **live mixers** (not individual users)
- Visible to **everyone in the same college**
- Only mixer **participants** can post
- Posting window: mixer must be **live**, from scheduled start until **2:00 AM next day**
- Stories expire after **24 hours**
- Instant capture & upload - no captions
- Delete/edit after posting
- Discover CTA - social chairs can request mixers from story view
- **Story Reactions** - React with fire, party, or love emojis

### 5b. **Global Stories** (College-wide)
- Stories visible to **everyone in the same college** (not tied to mixers)
- Any authenticated user can post global stories
- Stories appear on the Discover/Home page in a horizontal story row
- **Your Story** - If you have a story, shows your avatar with dashed purple outline and + badge
- Tap your story to view it, long press to add another story
- **Delete Stories** - Users can delete their own stories via trash icon in viewer
- **View Profile** - Tap "View Profile" button to navigate directly to story poster's profile
- Stories expire after **24 hours**

### 6. **Top Mixer of the Week**
- Weekly college-wide leaderboard
- Score based on story engagement, reactions, feedback ratings
- Chemistry score visualization
- Leaderboard with top 10 mixers
- Drives healthy competition between groups

### 7. **Group Highlights** (Permanent Story Archives)
- Social chairs can pin mixer stories as permanent highlights
- Highlights appear on group profiles
- Stories copied to permanent storage (don't expire)
- Great for showcasing group culture to prospective members

### 8. **Campus Heat Map**
- Privacy-safe venue-based activity visualization
- Shows which campus spots are active during mixers
- Requires 8+ participants for privacy threshold
- Hourly time buckets, last 3/6/12 hours filters
- Ranked list with heat intensity indicators

### 9. **Smart Pairing with Engagement**
- Pairing algorithm now considers story engagement
- Engagement similarity matching (active users paired together)
- High-energy pair bonus for high-energy activities
- Engagement mismatch penalty to avoid awkward pairs

### 10. **User Profiles**
- Personal info (name, age, school, interests, bio)
- Drinking preference (sober/light/flexible/heavy)
- Relationship status (single/taken/complicated)
- Vibe level slider (personality index 0-100)
- View group memberships
- Customizable profile photo and header image
- .edu email verification for verified badge
- Privacy & Safety settings

### 11. **Profile Management Features**
- **Edit Profile**: Update name, bio, year in school, drinking preference, relationship status, vibe level
- **Avatar Upload**: Take or choose profile photo with camera/library
- **Header Image**: Custom header/banner image support
- **Interests Selection**: Add/edit up to 12 interests from curated list
- **.edu Email Verification**: 6-digit code verification flow for college email
- **Settings Page**: Account settings, verification status, privacy controls
- **Privacy Settings**: Profile visibility controls, safety tips

## 🎨 Design Philosophy

MIXR uses a **Deep Purple Liquid Glass** design system inspired by the brand logo:

### Brand Colors
- **Background**: `#1A0A2E` (deep purple-black) / `#2D1B4E` (medium purple)
- **Tertiary**: `#4A1D8C` (vibrant purple) / `#6B21A8` (lighter purple)
- **Primary**: `#A855F7` (gel purple) / `#7C3AED` (deep purple)
- **Accents**: `#D8B4FE` (lavender) / `#FF7BD1` (pink sparkle)
- **Chrome**: `#9333EA` (bright purple) / `#D946EF` (fuchsia)

### Liquid Glass Material System
- Deep purple frosted glass surfaces with chrome rim lighting
- Metallic purple sheen and glow effects
- Animated atmospheric blobs for depth
- Vignettes for cinematic depth

### Component Library (`/src/components/gel/`)
- **GelBackground** - Deep purple atmospheric background with animated purple glow blobs
- **GelCard** - Liquid glass cards with purple chrome rim lighting
- **GelButton** - Gradient buttons with press animations
- **GelPill** - Purple accent pills and tags
- **GelSearchBar** - Liquid glass search input
- **GelSegmentedControl** - Animated purple segmented pills
- **StoryBubble** - Iridescent ring story avatars

### Assets
- **Default Group Logo** (`/assets/images/default-group-logo.png`) - Used as placeholder for groups without custom cover images

### Tab Bar
- Floating liquid glass design with dark purple backdrop
- Chrome purple glow effects
- Rounded corners with translucent purple fill

### Design Principles
- **Mobile-native design** optimized for touch interactions
- **Rich, atmospheric gradients** with purple depth
- **Haptic feedback** for delightful micro-interactions
- **Clean typography** with lavender text hierarchy
- **Dark mode** with vibrant purple accents

## 🏗️ Technical Stack

- **Expo SDK 53** / React Native 0.76.7
- **TypeScript** with strict mode
- **Zustand** for state management
- **NativeWind** (Tailwind CSS) for styling
- **React Native Reanimated** for animations
- **Expo Router** for file-based navigation
- **Lucide Icons** for consistent iconography

## 📱 App Structure

### Screens

1. **Onboarding** - 3-step user registration flow
2. **Groups Tab** - Browse and search groups with filters
3. **Mixers Tab** - View active mixers, requests, and history
4. **Profile Tab** - User profile and group memberships
5. **Group Detail** - View group info, join, or request mixer
6. **Mixer Detail** - Full activity details, rules, and setup instructions

### State Management

- **Auth Store** - User authentication and profile data
- **Groups Store** - All groups and membership management
- **Mixers Store** - Mixers and mixer requests

### Data Models

- **User** - Personal profile with preferences
- **Group** - Group profile with members and tags
- **Mixer** - Event connecting two groups with an activity
- **Activity** - Structured social game/event with rules
- **MixerRequest** - Request to mix sent between groups

## 🎮 User Flow

1. **Sign Up** → Complete onboarding with basic info
2. **Join/Create Groups** → Join existing groups or create your own
3. **Browse Groups** → Discover other groups with search and filters
4. **Send Mixer Request** → Request a mixer with another group
5. **Accept Request** → Other group accepts your request
6. **View Mixer Details** → Get full activity instructions, rules, and setup
7. **Host the Mixer!** → Meet IRL and have structured fun

## 🚀 MVP Features (Completed)

✅ User authentication and onboarding
✅ Create and join groups
✅ Group discovery with search and filters
✅ Mixer request system (send/accept/decline)
✅ Activity generator with 10+ built-in activities
✅ Mixer event pages with full details
✅ User profiles with group memberships
✅ Request management (incoming/outgoing)
✅ Mixer history
✅ **Mixer Stories** - Instagram-like stories for live mixers
✅ **Story Reactions** - Fire, party, love emoji reactions
✅ **Top Mixer of the Week** - Weekly leaderboard with chemistry scores
✅ **Group Highlights** - Permanent story archives on group profiles
✅ **Campus Heat Map** - Privacy-safe venue activity visualization
✅ **Smart Pairing v2** - Engagement-based pairing improvements

## 🆕 V2 Features (New)

✅ **Mixer Ratings (0-10 scale)** - Rate mixers after completion
✅ **Group Star Ratings** - Aggregated 0-5 star ratings on group profiles
✅ **Mixer Recaps** - 24-hour post-completion recap with stats and stories
✅ **Relationship Status** - Show your status on your profile (single, taken, etc.)
✅ **Multi-Group Mixer Support** - Foundation for mixers with more than 2 groups

## 🆕 Browse Groups Enhancements

✅ **Full Category Filters** - All 9 categories (Sports, Academic, Arts, Social, Greek, Faith, Service, Cultural, Other)
✅ **Sort Options** - Sort by Trending, Top Rated, Newest, Most Members
✅ **Pull-to-Refresh** - Refresh groups list with pull gesture
✅ **Active Filter Chips** - Clear filters with tappable chips
✅ **Results Count** - Show number of matching groups
✅ **Create Group Modal** - Gel-glass aesthetic with live preview card
✅ **Privacy Toggle** - Set groups as public or private (members need approval)
✅ **Group Detail Page** - Enhanced with upcoming/past mixers sections, gel-glass styling
✅ **Admin Management** - Manage join requests, view pending count

## 🆕 Direct Messaging (New)

✅ **Message Requests** - Anyone can send a message request to any user
✅ **Accept/Decline** - Recipients can accept or decline message requests
✅ **Direct Message Chat** - Full 1:1 messaging with real-time updates
✅ **Request Status** - See pending requests in Requests tab
✅ **Profile Integration** - Send message requests directly from user profiles
✅ **Accepted Conversations** - Accepted DMs appear in Messages tab alongside group chats

## 🆕 Multi-Group Mixer Requests

✅ **Multi-Group Invites** - Send mixer requests to multiple groups at once (no limit)
✅ **Multi-Select Group Picker** - Select multiple groups with search and chips
✅ **"Also Invited" Copy** - Incoming requests show: "{Requester} requested a mixer with you — Also invited: {Group1}, {Group2}..."
✅ **Per-Invite Accept/Decline** - Each invited group can independently accept or decline
✅ **Invite Status Tracking** - Outbound requests show status of each invited group (pending/accepted/declined)
✅ **Auto-Mixer Creation** - When first group accepts, mixer is created; remaining invites are auto-declined (MVP behavior)
✅ **Backend MixerRequestInvite Model** - New database model for tracking individual group invites

## 🆕 Hybrid Invite System (New)

✅ **In-App User Search** - Search for users by name or email to invite to groups
✅ **Direct Group Invites** - Send invites to existing users; they receive in-app notifications
✅ **Notifications Screen** - View all notifications including pending group invites
✅ **Accept/Decline Invites** - Respond to group invites directly from notifications
✅ **Native Share Sheet** - Share invite link via iMessage, WhatsApp, email, etc.
✅ **Copy Invite Code** - Quick copy of 6-character invite code to clipboard
✅ **Notification Bell** - Badge indicator on group pages showing unread notifications
✅ **Invite Management** - View pending invites sent from group management section

## 🆕 Discover Page Enhancements

✅ **Stories Row** - Instagram-like horizontal story feed at top of Discover page
✅ **Story Viewer** - Full-screen story viewing with progress bars, reactions, and navigation
✅ **Campus Vibe Stats** - Real metrics: total groups, mixers this week, live mixers count
✅ **Hot Groups Carousel** - Horizontal scrollable group cards with category colors
✅ **Top Mixer of the Week** - Hero card with chemistry score and leaderboard access
✅ **Campus Heat Map** - Tap to view venue activity heatmap
✅ **Activity Spotlight** - Featured activity card with energy level visualization
✅ **How Mixers Work** - Interactive step-by-step onboarding cards
✅ **Join/Create CTA** - Call-to-action section with browse and create buttons
✅ **Floating Camera Button** - Quick access to story posting when in a live mixer
✅ **Pull-to-Refresh** - Refresh all Discover page data with pull gesture
✅ **Post Story Screen** - Camera interface for posting mixer stories

## 🆕 In-App Messaging System (New)

✅ **Chat Rooms** - Group chat rooms for every group membership
✅ **Mixer Chat** - Social chair chat rooms for coordinating mixers between groups
✅ **Open Mixer Chat** - Group chats for open mixer events
✅ **Real-time Messages** - Send and receive messages with 3-second polling refresh
✅ **Message UI** - Modern chat bubbles with sender names, avatars, and timestamps
✅ **Inbox Screen** - Unified Messages and Requests tabs in notifications
✅ **Unread Indicators** - Badge counts and visual indicators for unread messages

## 🎯 Future Enhancements

- ~~Group chat for mixer coordination~~ ✅ **IMPLEMENTED**
- Location-based group discovery
- Custom activity creation
- Recommended groups based on interests
- Calendar integration for scheduling
- Push notifications for requests
- Mixy AI activity suggestions

## 🎨 Design Inspiration

The app draws inspiration from:
- iOS Human Interface Guidelines
- Instagram's visual polish
- Airbnb's clean layouts
- Coinbase's color usage
- Modern habit trackers' simplicity

## 📝 Non-Goals

This is NOT:
- ❌ A dating app
- ❌ Individual swiping/matching
- ❌ A public social feed
- ❌ Focused on influencers

Mixer is **social infrastructure**, not a dating platform.

## 🎉 Getting Started

The app is ready to use with mock data pre-loaded. Simply:

1. Complete the onboarding flow
2. Browse the pre-populated groups
3. Join some groups that interest you
4. Send mixer requests to other groups
5. Accept incoming requests
6. Explore mixer activities and details

---

**Built with love for bringing people together, one mixer at a time.**

## 🔒 Backend Security

The backend implements comprehensive security measures:

### Rate Limiting
- **Global API Rate Limit**: 100 requests per minute per IP
- **Strict Rate Limit**: 10 requests per 15 minutes for auth and verification endpoints
- Rate limit headers (X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset)

### Security Headers
- X-Frame-Options: DENY (prevents clickjacking)
- X-Content-Type-Options: nosniff (prevents MIME sniffing)
- X-XSS-Protection: 1; mode=block
- Referrer-Policy: strict-origin-when-cross-origin
- Content-Security-Policy: default-src 'none'
- Permissions-Policy: restrictive browser feature policy

### CORS
- Origin allowlist with regex validation
- Credentials enabled for session handling
- Supports localhost, vibecode.run, vibecodeapp.com, and vibecode.dev domains

### Request Handling
- 30-second request timeout
- Error sanitization (prevents internal error leakage in production)
- Input validation via Zod schemas

### Authentication
- Better Auth with session-based authentication
- Secure cookie configuration (SameSite=none, Secure, Partitioned)
- Session extraction on all routes
