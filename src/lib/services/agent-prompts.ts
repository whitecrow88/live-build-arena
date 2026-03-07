/**
 * Specialist agent definitions and prompt builder.
 * Each category maps to tailored intake questions + a specialist system prompt.
 */

export type QuestionType = "text" | "textarea" | "select" | "multiselect" | "boolean";

export interface Question {
  id: string;
  label: string;
  type: QuestionType;
  placeholder?: string;
  options?: string[];
  required?: boolean;
}

export interface AgentCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  questions: Question[];
  systemPromptHint: string;
}

export const AGENT_CATEGORIES: AgentCategory[] = [
  {
    id: "streamer_site",
    name: "Streamer / Creator Page",
    description: "Personal site for a streamer or content creator",
    icon: "🎮",
    questions: [
      { id: "platform", label: "Which platform do you stream on?", type: "select", options: ["Twitch", "Kick", "YouTube", "TikTok", "Multiple"], required: true },
      { id: "username", label: "Your streaming username", type: "text", placeholder: "e.g. streamcoderlive", required: true },
      { id: "sections", label: "What sections do you need?", type: "multiselect", options: ["Stream embed", "About me", "Schedule", "Social links", "Merch", "Latest clips", "Discord invite", "Donations"] },
      { id: "vibe", label: "Describe the vibe / aesthetic", type: "text", placeholder: "e.g. dark cyberpunk, pastel gamer, minimalist", required: true },
      { id: "colors", label: "Brand colours (hex codes or descriptions)", type: "text", placeholder: "e.g. #6EE7B7 green on dark background" },
      { id: "extra", label: "Anything else? Special features?", type: "textarea", placeholder: "Animated panels, follower counter, chat overlay..." },
    ],
    systemPromptHint: "You are building a streamer/creator personal website. Focus on visual impact, stream embed integration, social proof, and brand identity. Use bold hero sections, animated elements, and platform-specific colours.",
  },
  {
    id: "ecommerce",
    name: "E-Commerce Store",
    description: "Online store to sell products or services",
    icon: "🛒",
    questions: [
      { id: "products", label: "What are you selling?", type: "textarea", placeholder: "Describe your products or services", required: true },
      { id: "product_count", label: "Approximately how many products?", type: "select", options: ["1–5", "6–20", "20+"], required: true },
      { id: "payment", label: "Need payment processing (Stripe)?", type: "boolean" },
      { id: "features", label: "Which features do you need?", type: "multiselect", options: ["Product grid", "Shopping cart", "Wishlist", "Product search", "Filters", "Reviews", "Inventory display"] },
      { id: "style", label: "Store style / aesthetic", type: "text", placeholder: "e.g. luxury minimal, streetwear bold, artisan handmade" },
      { id: "brand_colors", label: "Brand colours", type: "text", placeholder: "e.g. black and gold" },
    ],
    systemPromptHint: "You are building an e-commerce store. Focus on product presentation, clear CTAs, cart UX, and conversion. Use clean product cards, high-contrast buy buttons, and mobile-first layouts.",
  },
  {
    id: "dashboard",
    name: "Dashboard / Admin Tool",
    description: "Internal tool, data visualisation, or admin panel",
    icon: "📊",
    questions: [
      { id: "purpose", label: "What data are you managing or displaying?", type: "textarea", placeholder: "e.g. sales figures, user analytics, inventory levels", required: true },
      { id: "audience", label: "Who uses this?", type: "select", options: ["Just me", "Small team", "Public users"], required: true },
      { id: "charts", label: "What visualisations do you need?", type: "multiselect", options: ["Line chart", "Bar chart", "Pie chart", "Data table", "Stat cards", "Calendar", "Map"] },
      { id: "auth", label: "Login / authentication required?", type: "boolean" },
      { id: "data_source", label: "Where does the data come from?", type: "text", placeholder: "e.g. mock data, CSV upload, REST API, Supabase" },
      { id: "extra", label: "Extra features?", type: "textarea", placeholder: "Export to CSV, notifications, filters..." },
    ],
    systemPromptHint: "You are building a dashboard or admin tool. Focus on data clarity, scannable layouts, and actionable metrics. Use sidebar navigation, stat cards, responsive tables, and chart components.",
  },
  {
    id: "tool",
    name: "Utility / Tool",
    description: "A focused tool that solves one specific problem",
    icon: "🔧",
    questions: [
      { id: "input", label: "What does the user put in / provide?", type: "textarea", placeholder: "e.g. a text file, a URL, a number, an image", required: true },
      { id: "output", label: "What does it produce or do?", type: "textarea", placeholder: "e.g. generates a report, converts the file, calculates a result", required: true },
      { id: "audience", label: "Who is this for?", type: "text", placeholder: "e.g. developers, designers, marketers, everyone" },
      { id: "integrations", label: "Any APIs or external services?", type: "text", placeholder: "e.g. OpenAI, Google Maps, weather API" },
      { id: "extra", label: "Any specific requirements?", type: "textarea", placeholder: "Must work offline, mobile-friendly, save history..." },
    ],
    systemPromptHint: "You are building a focused utility tool. Keep the UI minimal and task-oriented. One clear input, one clear action, one clear output. Optimise for speed and simplicity.",
  },
  {
    id: "game",
    name: "Browser Game",
    description: "A playable game that runs in the browser",
    icon: "🎯",
    questions: [
      { id: "genre", label: "Game genre?", type: "select", options: ["Puzzle", "Platformer", "Shooter", "Card game", "Word game", "Clicker", "Strategy", "Other"], required: true },
      { id: "mechanics", label: "Describe the core gameplay mechanic", type: "textarea", placeholder: "e.g. match 3 coloured tiles, dodge obstacles, guess the word in 6 tries", required: true },
      { id: "multiplayer", label: "Single player or multiplayer?", type: "select", options: ["Single player", "Local multiplayer (same screen)", "Online multiplayer"] },
      { id: "device", label: "Target device?", type: "select", options: ["Desktop", "Mobile", "Both"] },
      { id: "style", label: "Visual style?", type: "text", placeholder: "e.g. pixel art, minimalist, neon, cute" },
    ],
    systemPromptHint: "You are building a browser game. Use HTML5 Canvas or simple DOM/CSS animation. Focus on the core game loop, clear controls, score tracking, and instant playability. Keep it fun and responsive.",
  },
  {
    id: "portfolio",
    name: "Portfolio / Landing Page",
    description: "Personal portfolio, resume site, or product landing page",
    icon: "💼",
    questions: [
      { id: "type", label: "What are you showcasing?", type: "select", options: ["Developer portfolio", "Designer/artist portfolio", "Startup / product landing page", "Personal brand", "Resume / CV"], required: true },
      { id: "name", label: "Your name or brand name", type: "text", placeholder: "e.g. Jane Smith or AcmeCorp", required: true },
      { id: "sections", label: "Sections needed?", type: "multiselect", options: ["Hero / intro", "About me", "Work / projects", "Skills", "Experience", "Testimonials", "Blog", "Contact form"] },
      { id: "style", label: "Design style?", type: "select", options: ["Minimal / clean", "Bold / creative", "Corporate / professional", "Playful / fun", "Dark mode sleek"] },
      { id: "tagline", label: "Your tagline or one-line pitch", type: "text", placeholder: "e.g. Full-stack dev who ships fast" },
    ],
    systemPromptHint: "You are building a portfolio or landing page. Focus on first impressions, clear value proposition, and compelling presentation of work. Use smooth scroll, subtle animations, and strong typography.",
  },
  {
    id: "other",
    name: "Something Else",
    description: "Describe it yourself — anything goes",
    icon: "✨",
    questions: [
      { id: "description", label: "Describe what you want in detail", type: "textarea", placeholder: "Be as specific as possible — the more detail, the better the build", required: true },
      { id: "tech", label: "Any specific tech requirements?", type: "text", placeholder: "e.g. must use React, needs a backend, vanilla JS only" },
      { id: "inspiration", label: "Any sites or apps that inspire you?", type: "text", placeholder: "e.g. linear.app for the UI style" },
      { id: "constraints", label: "Any constraints or things to avoid?", type: "text", placeholder: "e.g. no login required, must be one page" },
    ],
    systemPromptHint: "You are building a custom web application. Read the requirements carefully and build exactly what is described. Use Next.js with TypeScript and Tailwind unless specified otherwise.",
  },
];

export function getCategoryById(id: string): AgentCategory | undefined {
  return AGENT_CATEGORIES.find((c) => c.id === id);
}

export interface IntakeData {
  category: string;
  answers: Record<string, string | string[]>;
  additional_notes?: string;
  reference_images?: string[];
}

/** Build a rich specialist prompt from intake data */
export function buildSpecialistPrompt(
  donorName: string,
  donorMessage: string,
  intakeData: IntakeData
): string {
  const category = getCategoryById(intakeData.category);
  const answers = intakeData.answers ?? {};

  const answerLines = Object.entries(answers)
    .map(([key, val]) => {
      const question = category?.questions.find((q) => q.id === key);
      const label = question?.label ?? key;
      const value = Array.isArray(val) ? val.join(", ") : val;
      return value ? `- **${label}**: ${value}` : null;
    })
    .filter(Boolean)
    .join("\n");

  const imageSection =
    intakeData.reference_images && intakeData.reference_images.length > 0
      ? `\n## Reference Images\nThe donor has provided ${intakeData.reference_images.length} reference image(s). Use these for style/layout inspiration:\n${intakeData.reference_images.map((url) => `- ${url}`).join("\n")}`
      : "";

  const notesSection = intakeData.additional_notes
    ? `\n## Additional Notes\n${intakeData.additional_notes}`
    : "";

  return `${category?.systemPromptHint ?? "You are building a web application as requested by a live stream donor."}

## Donor
${donorName}

## Original Request
${donorMessage}

## Project Type
${category?.name ?? intakeData.category}

## Detailed Requirements
${answerLines || "No detailed requirements provided — use the original request above."}
${imageSection}
${notesSection}

## Build Guidelines
- Build a functional MVP prototype
- Use Next.js with TypeScript and Tailwind CSS unless the request specifies otherwise
- Keep the code clean, well-commented, and deploy-ready
- Include a README.md explaining what was built and how to run it
- Prioritise working functionality over visual polish
- Mobile-responsive by default
- Do NOT include: production databases, real payment keys, or auth unless explicitly requested

## Delivery
GitHub repo + Vercel preview deployment. Time cap: 15 minutes.
`;
}

/** Fallback prompt when no intake was submitted */
export function buildFallbackPrompt(donorName: string, donorMessage: string): string {
  return `You are building a prototype web application as requested by a live stream donor.

## Donor Request
${donorMessage}

## Build Guidelines
- Build a functional MVP prototype
- Use Next.js with TypeScript and Tailwind CSS
- Keep the code clean, minimal, and well-commented
- Include a README.md explaining what was built and how to run it
- Prioritise working functionality over visual polish
- Do NOT include: payment processing, production databases, or authentication unless explicitly requested

## Delivery
GitHub repo + Vercel preview deployment.
Donor: ${donorName}
`;
}
