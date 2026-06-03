{
  "product": {
    "name": "Content Studio (My Date Jar)",
    "type": "creator SaaS dashboard / content workspace",
    "brand_attributes": [
      "warm",
      "romantic",
      "playful-but-professional",
      "premium",
      "delightful",
      "editorial"
    ],
    "north_star": "A cozy, premium creative workspace that feels like planning a perfect date night—calm surfaces, warm accents, and confident AI assistance."
  },

  "visual_personality": {
    "style_fusion": [
      "Editorial workspace (Notion-like calm reading surfaces)",
      "Warm lifestyle brand (soft photography + caramel/rose accents)",
      "Bento dashboard layout (quick actions + progress + library)",
      "Soft glass accents (only for hero/headers, <=20% viewport)"
    ],
    "do_not": [
      "Cold dev-tool look",
      "Purple gradients",
      "Overly saturated neon",
      "Center-aligned app container",
      "Dense cramped spacing"
    ]
  },

  "design_tokens": {
    "css_custom_properties": {
      "notes": [
        "Implement by replacing :root tokens in /app/frontend/src/index.css.",
        "Primary theme is light; dark theme can remain but should be warmed later.",
        "All colors below are warm + premium; avoid harsh contrast except for text."
      ],
      "light": {
        "--background": "32 45% 98%",
        "--foreground": "24 22% 12%",

        "--card": "30 40% 99%",
        "--card-foreground": "24 22% 12%",

        "--popover": "30 40% 99%",
        "--popover-foreground": "24 22% 12%",

        "--primary": "22 55% 32%",
        "--primary-foreground": "30 40% 99%",

        "--secondary": "28 35% 94%",
        "--secondary-foreground": "24 22% 16%",

        "--muted": "28 30% 95%",
        "--muted-foreground": "24 10% 42%",

        "--accent": "10 55% 92%",
        "--accent-foreground": "22 55% 26%",

        "--destructive": "0 72% 52%",
        "--destructive-foreground": "30 40% 99%",

        "--border": "26 22% 88%",
        "--input": "26 22% 88%",
        "--ring": "22 55% 32%",

        "--chart-1": "22 55% 40%",
        "--chart-2": "168 35% 34%",
        "--chart-3": "10 55% 52%",
        "--chart-4": "42 65% 52%",
        "--chart-5": "200 45% 42%",

        "--radius": "0.9rem",

        "--shadow-sm": "0 1px 2px rgba(69, 46, 22, 0.06)",
        "--shadow-md": "0 10px 30px rgba(69, 46, 22, 0.10)",
        "--shadow-focus": "0 0 0 4px rgba(166, 110, 54, 0.18)",

        "--surface-noise": "url('data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22120%22 height=%22120%22%3E%3Cfilter id=%22n%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.9%22 numOctaves=%222%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22120%22 height=%22120%22 filter=%22url(%23n)%22 opacity=%220.08%22/%3E%3C/svg%3E')"
      },
      "hex_reference": {
        "cream": "#FCFAF7",
        "sand": "#F2E8DC",
        "latte": "#E7D6C3",
        "caramel": "#A66E36",
        "cocoa": "#452E16",
        "rose": "#F2C7C2",
        "sage": "#3F6F66",
        "ink": "#241A12"
      },
      "gradients": {
        "allowed_usage": [
          "Top header band behind page title (max ~140px height)",
          "Dashboard hero strip only",
          "Decorative blobs behind empty states"
        ],
        "recipes": {
          "warm_header_band": "bg-[radial-gradient(1200px_300px_at_20%_0%,rgba(242,199,194,0.55),transparent_60%),radial-gradient(900px_260px_at_80%_10%,rgba(231,214,195,0.65),transparent_55%)]",
          "soft_corner_glow": "bg-[radial-gradient(600px_240px_at_10%_10%,rgba(166,110,54,0.18),transparent_60%)]"
        }
      }
    },

    "spacing": {
      "philosophy": "Use 2–3x more whitespace than typical dashboards. Reading comfort > density.",
      "container": "max-w-[1200px] px-4 sm:px-6 lg:px-8",
      "section_gap": "space-y-6 sm:space-y-8",
      "card_padding": "p-4 sm:p-5",
      "editor_padding": "p-4 sm:p-6"
    },

    "radius": {
      "app": "rounded-2xl",
      "cards": "rounded-2xl",
      "inputs": "rounded-xl",
      "buttons": "rounded-xl",
      "chips": "rounded-full"
    },

    "shadows": {
      "cards": "shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)]",
      "floating_panels": "shadow-[0_18px_60px_rgba(69,46,22,0.14)]"
    }
  },

  "typography": {
    "font_pairing": {
      "headings": {
        "family": "Fraunces",
        "fallback": "ui-serif, Georgia, serif",
        "google_fonts_import": "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500,600,700&display=swap"
      },
      "body_ui": {
        "family": "Manrope",
        "fallback": "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
        "google_fonts_import": "https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap"
      },
      "mono": {
        "family": "IBM Plex Mono",
        "google_fonts_import": "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&display=swap"
      }
    },
    "tailwind_usage": {
      "notes": "Add font-family to body in index.css and create utility classes (or inline style) for headings.",
      "heading_class": "font-[Fraunces] tracking-[-0.02em]",
      "body_class": "font-[Manrope]"
    },
    "type_scale": {
      "h1": "text-4xl sm:text-5xl lg:text-6xl leading-[1.05]",
      "h2": "text-base md:text-lg text-muted-foreground",
      "section_title": "text-xl sm:text-2xl font-semibold",
      "body": "text-sm sm:text-base leading-7",
      "small": "text-xs sm:text-sm"
    },
    "reading": {
      "article_width": "max-w-[78ch]",
      "editor_line_height": "leading-7",
      "prose": "Use Tailwind typography plugin if available; otherwise implement a minimal .prose-like class for markdown rendering."
    }
  },

  "layout": {
    "grid_system": {
      "dashboard": "Mobile: single column. >=lg: 12-col grid with 8-col main + 4-col side rail.",
      "studio_pages": "Split layout: left prompt/composer rail (collapsible) + center editor + right inspector (quality/media/export). On mobile: tabs/accordion to switch rails.",
      "library_pages": "Toolbar + filters row, then responsive grid (2 cols sm, 3 cols lg, 4 cols xl) or table with sticky header."
    },
    "navigation": {
      "pattern": "Left sidebar (Sheet on mobile) + top command bar.",
      "sidebar_width": "w-[264px]",
      "topbar_height": "h-14",
      "key_items": [
        "Dashboard",
        "Blog Studio",
        "Newsletter Studio",
        "Content Library",
        "Media Library",
        "Knowledge Base"
      ]
    }
  },

  "components": {
    "component_path": {
      "shadcn_primary": "/app/frontend/src/components/ui",
      "use_these": {
        "buttons": "button.jsx",
        "inputs": "input.jsx, textarea.jsx",
        "tabs": "tabs.jsx",
        "dialogs": "dialog.jsx, alert-dialog.jsx",
        "sheet_drawer": "sheet.jsx, drawer.jsx",
        "table": "table.jsx",
        "select": "select.jsx",
        "popover_tooltip": "popover.jsx, tooltip.jsx",
        "progress": "progress.jsx",
        "badge": "badge.jsx",
        "calendar": "calendar.jsx",
        "scroll_area": "scroll-area.jsx",
        "skeleton": "skeleton.jsx",
        "sonner_toasts": "sonner.jsx"
      }
    },

    "key_custom_components_to_build": {
      "PromptComposer": {
        "purpose": "Prompt input + model picker + single/batch toggle + generate CTA.",
        "composition": [
          "Card",
          "Textarea",
          "Select",
          "Tabs (Single / Batch)",
          "Button",
          "Badge (token count / provider)"
        ],
        "micro_interactions": [
          "Generate button: hover lift (translate-y-[-1px]) + shadow-md",
          "Provider badge: subtle pulse while generating (prefers-reduced-motion respected)"
        ],
        "data_testids": [
          "prompt-composer-textarea",
          "prompt-composer-model-select",
          "prompt-composer-mode-tabs",
          "prompt-composer-generate-button"
        ]
      },

      "BatchGenerationQueue": {
        "purpose": "List of 5–10 items with per-item progress + status chips.",
        "composition": [
          "Card",
          "Progress",
          "Badge",
          "Skeleton"
        ],
        "states": [
          "queued",
          "generating",
          "complete",
          "failed"
        ],
        "data_testids": [
          "batch-queue-list",
          "batch-queue-item",
          "batch-queue-item-progress"
        ]
      },

      "QualityScorePanel": {
        "purpose": "0–100 score + rubric breakdown + suggestions.",
        "composition": [
          "Card",
          "Progress (as meter)",
          "Accordion (rubric sections)",
          "Badge (score tier)",
          "Button (Apply suggestions)"
        ],
        "visual": {
          "score_tiers": {
            "90_100": "sage",
            "70_89": "caramel",
            "0_69": "rose/destructive"
          },
          "meter_style": "Use Progress with custom indicator color via className; add small tick marks using CSS background on the track."
        },
        "data_testids": [
          "quality-score-panel",
          "quality-score-value",
          "quality-score-rubric-accordion",
          "quality-score-suggestions"
        ]
      },

      "RichContentEditorShell": {
        "purpose": "Comfortable writing surface for long-form content + media blocks.",
        "layout": "Center column max-w-[78ch] with sticky mini-toolbar.",
        "composition": [
          "Card (editor surface)",
          "ScrollArea",
          "Tabs (Write / Preview)",
          "Popover (insert media)",
          "Dialog (export)"
        ],
        "editor_surface_classes": "bg-card rounded-2xl border border-border shadow-[var(--shadow-sm)]",
        "data_testids": [
          "rich-editor",
          "rich-editor-write-tab",
          "rich-editor-preview-tab"
        ]
      },

      "MediaInsertDialog": {
        "purpose": "Insert media via Upload / URL / Generate (Nano Banana) / Giphy / YouTube embed.",
        "composition": [
          "Dialog",
          "Tabs",
          "Input",
          "Button",
          "AspectRatio",
          "Carousel (optional for recent assets)"
        ],
        "tabs": [
          "Upload",
          "From URL",
          "Generate",
          "Giphy",
          "YouTube"
        ],
        "data_testids": [
          "media-insert-dialog",
          "media-insert-tabs",
          "media-upload-input",
          "media-url-input",
          "media-generate-prompt-textarea",
          "media-generate-submit-button"
        ]
      },

      "ExportModal": {
        "purpose": "Choose export format + destination (WordPress / React subdomain) + copy/download.",
        "composition": [
          "Dialog",
          "RadioGroup",
          "Select",
          "Button",
          "Input (WP URL / credentials placeholder)",
          "Textarea (export preview)"
        ],
        "formats": [
          "HTML",
          "Markdown",
          "WordPress-ready",
          "CSV",
          "PDF",
          "TXT"
        ],
        "data_testids": [
          "export-modal",
          "export-format-radio-group",
          "export-confirm-button",
          "export-preview-textarea"
        ]
      },

      "KnowledgeBaseSources": {
        "purpose": "Add URLs + upload docs; show analyzed sources; select as reference set.",
        "composition": [
          "Tabs (URLs / Documents)",
          "Input",
          "Button",
          "Table",
          "Badge",
          "Checkbox"
        ],
        "data_testids": [
          "knowledge-base-tabs",
          "knowledge-base-add-url-input",
          "knowledge-base-add-url-button",
          "knowledge-base-sources-table"
        ]
      }
    },

    "buttons": {
      "variants": {
        "primary": {
          "intent": "Generate / Save / Export",
          "classes": "bg-primary text-primary-foreground hover:bg-[hsl(22_55%_28%)] shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] active:translate-y-[1px]",
          "focus": "focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]"
        },
        "secondary": {
          "intent": "Preview / Insert media",
          "classes": "bg-secondary text-secondary-foreground hover:bg-[hsl(28_35%_92%)]"
        },
        "ghost": {
          "intent": "Toolbar icons",
          "classes": "hover:bg-[hsl(28_30%_95%)]"
        }
      },
      "sizes": {
        "sm": "h-9 px-3 text-sm",
        "md": "h-10 px-4 text-sm",
        "lg": "h-11 px-5 text-base"
      }
    },

    "forms": {
      "inputs": {
        "classes": "rounded-xl bg-white/70 focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-offset-2",
        "helper_text": "Use muted-foreground; keep labels short and friendly."
      }
    },

    "tables_and_lists": {
      "content_library": {
        "pattern": "Table on desktop, card list on mobile.",
        "table": "Use shadcn Table with sticky header (position: sticky) inside ScrollArea.",
        "row_hover": "hover:bg-[hsl(28_30%_96%)]",
        "status_badges": {
          "draft": "bg-[hsl(28_35%_94%)] text-[hsl(22_55%_26%)]",
          "published": "bg-[hsl(168_35%_92%)] text-[hsl(168_35%_28%)]",
          "scheduled": "bg-[hsl(42_65%_92%)] text-[hsl(42_65%_28%)]"
        }
      }
    },

    "empty_states": {
      "tone": "Encouraging, romantic, action-oriented (e.g., 'Let’s plan your next post').",
      "visual": "Use a small warm illustration/photo tile + 1 primary CTA.",
      "classes": "rounded-2xl border border-dashed border-border bg-[hsl(28_30%_97%)]"
    }
  },

  "motion": {
    "library": {
      "recommended": "framer-motion",
      "install": "npm i framer-motion",
      "usage_notes": [
        "Use for page transitions, queue item entrance, and subtle hover lifts.",
        "Respect prefers-reduced-motion: reduce durations to 0 and disable parallax."
      ]
    },
    "principles": {
      "durations": {
        "fast": "120ms",
        "base": "180ms",
        "slow": "260ms"
      },
      "easing": "cubic-bezier(0.2, 0.8, 0.2, 1)",
      "patterns": [
        "Cards: hover translate-y-[-2px] + shadow-md",
        "Buttons: active translate-y-[1px]",
        "Batch items: slide/fade in from y=6",
        "Side panels: Sheet/Drawer with soft spring"
      ],
      "avoid": [
        "transition: all",
        "Large parallax on content-heavy pages"
      ]
    }
  },

  "accessibility": {
    "contrast": "Ensure text on cream backgrounds uses foreground ink; avoid low-contrast beige-on-beige.",
    "focus": "Use visible focus ring via --shadow-focus; never remove outline without replacement.",
    "keyboard": "All dialogs, menus, tabs must be keyboard navigable (shadcn defaults help).",
    "reduced_motion": "Provide reduced motion fallback for framer-motion animations.",
    "content": "Long-form editor: keep line length <= 78ch; provide clear headings and spacing."
  },

  "page_blueprints": {
    "Dashboard": {
      "header": "Warm header band (<=140px) with page title + quick actions.",
      "main": [
        "Quick Actions bento: New Blog, New Newsletter, Batch Generate",
        "Recent drafts list",
        "Generation activity (queue + progress)",
        "Quality insights mini card (avg score, top suggestions)"
      ],
      "side_rail": [
        "Upcoming newsletter issue",
        "Pinned knowledge sources",
        "Media uploads shortcut"
      ]
    },
    "BlogStudio": {
      "layout": "3-panel on desktop; stacked tabs on mobile.",
      "left": [
        "PromptComposer",
        "Knowledge reference selector (Popover + Checkbox list)"
      ],
      "center": [
        "RichContentEditorShell",
        "Inline media blocks"
      ],
      "right": [
        "QualityScorePanel",
        "Export CTA",
        "MediaInsertDialog trigger"
      ]
    },
    "NewsletterStudio": {
      "layout": "Similar to BlogStudio but with section blocks (Intro, Feature, CTA, Events).",
      "center": [
        "Section editor cards with drag handles (optional later)",
        "Preview mode (email-like)"
      ]
    },
    "MediaLibrary": {
      "toolbar": [
        "Search",
        "Filter (type: image/gif/video)",
        "Upload",
        "Generate"
      ],
      "grid": "Cards with AspectRatio thumbnails; hover reveals actions (Insert, Copy URL, Delete).",
      "details": "Right-side Drawer for metadata + usage history."
    },
    "KnowledgeBase": {
      "top": "Add URL + Upload doc",
      "list": "Table with status (analyzing/ready/failed), last updated, select checkbox",
      "detail": "Drawer with extracted summary + key topics"
    },
    "ContentLibrary": {
      "filters": "Status chips + type (blog/newsletter) + date range (Calendar)",
      "list": "Table with row actions (Edit, Export, Delete)"
    }
  },

  "images": {
    "image_urls": [
      {
        "category": "dashboard_header",
        "description": "Warm lifestyle workspace photo for subtle header/empty-state tile (use with overlay + blur, not full-bleed).",
        "url": "https://images.pexels.com/photos/28868217/pexels-photo-28868217.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"
      },
      {
        "category": "empty_state_tile",
        "description": "Cozy creative desk scene for empty states in Blog/Newsletter studio.",
        "url": "https://images.pexels.com/photos/36162359/pexels-photo-36162359.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"
      },
      {
        "category": "brand_lifestyle",
        "description": "Romantic date-night bokeh photo for marketing-like panels (sparingly, small tiles).",
        "url": "https://images.pexels.com/photos/20511996/pexels-photo-20511996.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"
      },
      {
        "category": "brand_lifestyle",
        "description": "Couple at bar with warm premium vibe; use for onboarding/auth later.",
        "url": "https://images.pexels.com/photos/4694282/pexels-photo-4694282.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"
      }
    ]
  },

  "instructions_to_main_agent": {
    "global_css_updates": [
      "Replace the default shadcn neutral tokens in /app/frontend/src/index.css :root with the HSL values above.",
      "Remove CRA demo styles in /app/frontend/src/App.css (App-header etc.) and keep App.css minimal (no text-align:center).",
      "Add Google Fonts imports (Fraunces + Manrope + IBM Plex Mono) in index.html or via CSS @import at top of index.css.",
      "Apply body font to Manrope; apply headings font via utility class or CSS for h1/h2 in page headers."
    ],
    "component_build_order": [
      "1) AppShell: Sidebar + Topbar + responsive Sheet",
      "2) Dashboard bento cards + Recent content list",
      "3) BlogStudio 3-panel layout + PromptComposer",
      "4) RichContentEditorShell (Write/Preview) + MediaInsertDialog",
      "5) QualityScorePanel + BatchGenerationQueue",
      "6) ContentLibrary table + filters",
      "7) MediaLibrary grid + Drawer details",
      "8) KnowledgeBase sources table + Drawer"
    ],
    "testing": {
      "data_testid_rule": "Every button/input/tab/row-action and key info (score value, status badge text) must include data-testid in kebab-case.",
      "examples": [
        "data-testid=\"sidebar-nav-dashboard\"",
        "data-testid=\"topbar-global-search\"",
        "data-testid=\"content-library-status-filter\"",
        "data-testid=\"media-library-upload-button\""
      ]
    },
    "iconography": {
      "library": "lucide-react",
      "style": "Use 1.75px stroke, rounded linecaps; keep icons small (16–18px) in toolbars."
    },
    "notes": [
      "Keep gradients decorative and limited to header bands; never behind long text blocks.",
      "Prefer cards with warm borders and subtle shadows; avoid heavy outlines.",
      "Use ScrollArea for long side panels (quality rubric, media details)."
    ]
  },

  "General UI UX Design Guidelines": "- You must **not** apply universal transition. Eg: `transition: all`. This results in breaking transforms. Always add transitions for specific interactive elements like button, input excluding transforms\n    - You must **not** center align the app container, ie do not add `.App { text-align: center; }` in the css file. This disrupts the human natural reading flow of text\n   - NEVER: use AI assistant Emoji characters like`🤖🧠💭💡🔮🎯📚🎭🎬🎪🎉🎊🎁🎀🎂🍰🎈🎨🎰💰💵💳🏦💎🪙💸🤑📊📈📉💹🔢🏆🥇 etc for icons. Always use **FontAwesome cdn** or **lucid-react** library already installed in the package.json\n\n **GRADIENT RESTRICTION RULE**\nNEVER use dark/saturated gradient combos (e.g., purple/pink) on any UI element.  Prohibited gradients: blue-500 to purple 600, purple 500 to pink-500, green-500 to blue-500, red to pink etc\nNEVER use dark gradients for logo, testimonial, footer etc\nNEVER let gradients cover more than 20% of the viewport.\nNEVER apply gradients to text-heavy content or reading areas.\nNEVER use gradients on small UI elements (<100px width).\nNEVER stack multiple gradient layers in the same viewport.\n\n**ENFORCEMENT RULE:**\n    • Id gradient area exceeds 20% of viewport OR affects readability, **THEN** use solid colors\n\n**How and where to use:**\n   • Section backgrounds (not content backgrounds)\n   • Hero section header content. Eg: dark to light to dark color\n   • Decorative overlays and accent elements only\n   • Hero section with 2-3 mild color\n   • Gradients creation can be done for any angle say horizontal, vertical or diagonal\n\n- For AI chat, voice application, **do not use purple color. Use color like light green, ocean blue, peach orange etc**\n\n</Font Guidelines>\n\n- Every interaction needs micro-animations - hover states, transitions, parallax effects, and entrance animations. Static = dead. \n   \n- Use 2-3x more spacing than feels comfortable. Cramped designs look cheap.\n\n- Subtle grain textures, noise overlays, custom cursors, selection states, and loading animations: separates good from extraordinary.\n   \n- Before generating UI, infer the visual style from the problem statement (palette, contrast, mood, motion) and immediately instantiate it by setting global design tokens (primary, secondary/accent, background, foreground, ring, state colors), rather than relying on any library defaults. Don't make the background dark as a default step, always understand problem first and define colors accordingly\n    Eg: - if it implies playful/energetic, choose a colorful scheme\n           - if it implies monochrome/minimal, choose a black–white/neutral scheme\n\n**Component Reuse:**\n\t- Prioritize using pre-existing components from src/components/ui when applicable\n\t- Create new components that match the style and conventions of existing components when needed\n\t- Examine existing components to understand the project's component patterns before creating new ones\n\n**IMPORTANT**: Do not use HTML based component like dropdown, calendar, toast etc. You **MUST** always use `/app/frontend/src/components/ui/ ` only as a primary components as these are modern and stylish component\n\n**Best Practices:**\n\t- Use Shadcn/UI as the primary component library for consistency and accessibility\n\t- Import path: ./components/[component-name]\n\n**Export Conventions:**\n\t- Components MUST use named exports (export const ComponentName = ...)\n\t- Pages MUST use default exports (export default function PageName() {...})\n\n**Toasts:**\n  - Use `sonner` for toasts\"\n  - Sonner component are located in `/app/src/components/ui/sonner.tsx`\n\nUse 2–4 color gradients, subtle textures/noise overlays, or CSS-based noise to avoid flat visuals."
}
