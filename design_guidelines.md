{
  "design_system_name": "My Date Jar — Content Studio Refresh (Modern Warm + High Contrast)",
  "visual_personality": {
    "brand_attributes": [
      "warm + romantic (My Date Jar)",
      "modern creator-tool clarity (crisp surfaces)",
      "playful but not childish (confident accents)",
      "high-contrast, scannable, color-coded"
    ],
    "style_fusion": {
      "layout_principle": "Modern creator dashboard (structured sidebar + bento cards + dense-but-breathable tables)",
      "surface_language": "Crisp light theme with warm ivory base + subtle noise + defined borders/shadows",
      "color_strategy": "Neutral foundation + 6–7 semantic accent colors mapped to categories (nav, content type, status, provider, export, score tier, media type)",
      "motion_strategy": "Micro-interactions on hover/press/focus + subtle entrance transitions; no universal transitions"
    }
  },
  "typography": {
    "fonts": {
      "display": {
        "family": "Fraunces",
        "usage": "Page titles, section headers, auth hero headline",
        "notes": "Keep letter-spacing slightly tight; avoid using for long paragraphs"
      },
      "body": {
        "family": "Manrope",
        "usage": "UI labels, body copy, tables, forms"
      },
      "mono": {
        "family": "IBM Plex Mono",
        "usage": "IDs, export snippets, model names in compact chips"
      }
    },
    "type_scale_tailwind": {
      "h1": "text-4xl sm:text-5xl lg:text-6xl font-display tracking-tight",
      "h2": "text-base md:text-lg font-medium text-muted-foreground",
      "section_title": "text-lg sm:text-xl font-display",
      "body": "text-sm sm:text-base",
      "small": "text-xs text-muted-foreground"
    }
  },
  "design_tokens": {
    "drop_in_replacement_index_css_root": {
      "instructions": "Replace ONLY the values inside @layer base :root in /app/frontend/src/index.css. Keep variable names identical to avoid breaking existing components. Then ADD the new semantic accent variables below.",
      "base_tokens_hsl": {
        "--background": {
          "hsl": "34 60% 98%",
          "hex_reference": "#FFFBF6",
          "why": "Warmer ivory base; still reads as modern white"
        },
        "--foreground": {
          "hsl": "24 28% 10%",
          "hex_reference": "#24170F",
          "why": "Stronger contrast for readability"
        },
        "--card": {
          "hsl": "0 0% 100%",
          "hex_reference": "#FFFFFF",
          "why": "Crisper surfaces so sections don’t blend into beige"
        },
        "--card-foreground": {
          "hsl": "24 28% 10%",
          "hex_reference": "#24170F"
        },
        "--popover": {
          "hsl": "0 0% 100%",
          "hex_reference": "#FFFFFF"
        },
        "--popover-foreground": {
          "hsl": "24 28% 10%",
          "hex_reference": "#24170F"
        },
        "--primary": {
          "hsl": "22 62% 30%",
          "hex_reference": "#7A3F1D",
          "why": "Deeper terracotta-brown for modern warmth + stronger CTA contrast"
        },
        "--primary-foreground": {
          "hsl": "34 60% 98%",
          "hex_reference": "#FFFBF6"
        },
        "--secondary": {
          "hsl": "30 35% 92%",
          "hex_reference": "#F2E7DC",
          "why": "Warm neutral for subtle fills (tabs/ghost areas)"
        },
        "--secondary-foreground": {
          "hsl": "24 25% 14%",
          "hex_reference": "#2F2017"
        },
        "--muted": {
          "hsl": "30 30% 94%",
          "hex_reference": "#F6EEE6"
        },
        "--muted-foreground": {
          "hsl": "24 12% 38%",
          "hex_reference": "#6B5A4E"
        },
        "--accent": {
          "hsl": "18 70% 92%",
          "hex_reference": "#FBE1D6",
          "why": "Warm peach accent background for subtle highlights"
        },
        "--accent-foreground": {
          "hsl": "22 62% 24%",
          "hex_reference": "#633016"
        },
        "--destructive": {
          "hsl": "0 74% 52%",
          "hex_reference": "#E5484D"
        },
        "--destructive-foreground": {
          "hsl": "0 0% 100%",
          "hex_reference": "#FFFFFF"
        },
        "--border": {
          "hsl": "24 18% 84%",
          "hex_reference": "#D9C9BC",
          "why": "More visible borders to separate beige-adjacent surfaces"
        },
        "--input": {
          "hsl": "24 18% 84%",
          "hex_reference": "#D9C9BC"
        },
        "--ring": {
          "hsl": "22 62% 30%",
          "hex_reference": "#7A3F1D",
          "why": "Focus ring matches primary; add shadow-focus below"
        },
        "--radius": {
          "value": "0.95rem",
          "why": "Slightly more modern + friendly"
        },
        "--shadow-sm": {
          "value": "0 1px 2px rgba(36, 23, 15, 0.06)",
          "why": "Neutral shadow (less muddy brown)"
        },
        "--shadow-md": {
          "value": "0 14px 40px rgba(36, 23, 15, 0.10)"
        },
        "--shadow-focus": {
          "value": "0 0 0 4px rgba(122, 63, 29, 0.18)",
          "why": "Visible focus halo on light surfaces"
        },
        "--chart-1": { "hsl": "22 62% 38%", "hex_reference": "#9A4E24" },
        "--chart-2": { "hsl": "174 52% 32%", "hex_reference": "#1F7A6B" },
        "--chart-3": { "hsl": "8 78% 56%", "hex_reference": "#F05A4F" },
        "--chart-4": { "hsl": "42 85% 52%", "hex_reference": "#F2B233" },
        "--chart-5": { "hsl": "206 62% 44%", "hex_reference": "#2F7DBA" }
      },
      "new_semantic_accent_tokens_additive": {
        "instructions": "Add these variables under the existing :root tokens (same block). Use them for color-coding chips/badges/nav indicators. Keep them as HSL triplets to match shadcn token style.",
        "accent_map": {
          "nav_sections": {
            "--accent-dashboard": { "hsl": "206 62% 44%", "hex_reference": "#2F7DBA", "label": "Dashboard / analytics" },
            "--accent-blog": { "hsl": "22 62% 38%", "hex_reference": "#9A4E24", "label": "Blog Studio" },
            "--accent-newsletter": { "hsl": "174 52% 32%", "hex_reference": "#1F7A6B", "label": "Newsletter Studio" },
            "--accent-content-library": { "hsl": "262 38% 52%", "hex_reference": "#7B6BB8", "label": "Content Library (soft violet — NOT gradient; safe single color)" },
            "--accent-media-library": { "hsl": "8 78% 56%", "hex_reference": "#F05A4F", "label": "Media Library" },
            "--accent-knowledge-base": { "hsl": "42 85% 52%", "hex_reference": "#F2B233", "label": "Knowledge Base" }
          },
          "status": {
            "--accent-draft": { "hsl": "24 12% 38%", "hex_reference": "#6B5A4E", "label": "Draft" },
            "--accent-published": { "hsl": "152 52% 34%", "hex_reference": "#2E8A5A", "label": "Published" },
            "--accent-queued": { "hsl": "206 62% 44%", "hex_reference": "#2F7DBA", "label": "Queued" },
            "--accent-generating": { "hsl": "42 85% 52%", "hex_reference": "#F2B233", "label": "Generating" },
            "--accent-complete": { "hsl": "152 52% 34%", "hex_reference": "#2E8A5A", "label": "Complete" },
            "--accent-failed": { "hsl": "0 74% 52%", "hex_reference": "#E5484D", "label": "Failed" }
          },
          "model_providers": {
            "--accent-openai": { "hsl": "174 52% 32%", "hex_reference": "#1F7A6B", "label": "OpenAI" },
            "--accent-anthropic": { "hsl": "22 62% 38%", "hex_reference": "#9A4E24", "label": "Anthropic" },
            "--accent-gemini": { "hsl": "206 62% 44%", "hex_reference": "#2F7DBA", "label": "Gemini" }
          },
          "quality_score_tiers": {
            "--accent-score-excellent": { "hsl": "152 52% 34%", "hex_reference": "#2E8A5A", "label": "Excellent" },
            "--accent-score-good": { "hsl": "42 85% 52%", "hex_reference": "#F2B233", "label": "Good" },
            "--accent-score-needs-work": { "hsl": "8 78% 56%", "hex_reference": "#F05A4F", "label": "Needs work" }
          },
          "export_formats": {
            "--accent-export-html": { "hsl": "206 62% 44%", "hex_reference": "#2F7DBA" },
            "--accent-export-markdown": { "hsl": "262 38% 52%", "hex_reference": "#7B6BB8" },
            "--accent-export-wordpress": { "hsl": "174 52% 32%", "hex_reference": "#1F7A6B" },
            "--accent-export-csv": { "hsl": "152 52% 34%", "hex_reference": "#2E8A5A" },
            "--accent-export-pdf": { "hsl": "0 74% 52%", "hex_reference": "#E5484D" },
            "--accent-export-txt": { "hsl": "24 12% 38%", "hex_reference": "#6B5A4E" }
          },
          "media_types": {
            "--accent-media-image": { "hsl": "22 62% 38%", "hex_reference": "#9A4E24" },
            "--accent-media-gif": { "hsl": "262 38% 52%", "hex_reference": "#7B6BB8" },
            "--accent-media-video": { "hsl": "206 62% 44%", "hex_reference": "#2F7DBA" }
          }
        },
        "helper_tokens": {
          "--surface-2": { "hsl": "30 35% 96%", "hex_reference": "#FAF2EA", "usage": "Page section background blocks" },
          "--surface-3": { "hsl": "30 35% 92%", "hex_reference": "#F2E7DC", "usage": "Selected row / subtle highlight" },
          "--focus": { "hsl": "206 62% 44%", "hex_reference": "#2F7DBA", "usage": "Optional alternate focus ring for non-primary contexts" }
        }
      },
      "texture_tokens": {
        "noise_overlay_css": "background-image: radial-gradient(circle at 1px 1px, rgba(36,23,15,0.06) 1px, transparent 0); background-size: 14px 14px;",
        "usage": "Apply only to large backgrounds (auth page, dashboard header band). Keep opacity <= 0.06."
      }
    }
  },
  "layout_and_grid": {
    "app_shell": {
      "sidebar_width": "w-[264px] lg:w-[288px]",
      "content_max_width": "max-w-[1200px] (for centered inner content blocks only; do not center entire app)",
      "page_padding": "px-4 sm:px-6 lg:px-8 py-6",
      "grid_patterns": {
        "dashboard_bento": "grid grid-cols-1 lg:grid-cols-12 gap-4",
        "dashboard_cards": [
          "KPI strip: lg:col-span-12",
          "Queue: lg:col-span-7",
          "Quality: lg:col-span-5",
          "Recent exports: lg:col-span-6",
          "Knowledge snippets: lg:col-span-6"
        ],
        "library_table": "Use full width; filters in a sticky top bar"
      }
    },
    "auth_pages": {
      "layout": "Split-screen on lg: left brand panel (visual + copy), right form card. On mobile: stacked with brand header above form.",
      "form_card": "max-w-md w-full",
      "brand_panel": "Use warm band background + subtle noise; keep gradients under 20% viewport"
    }
  },
  "component_styles": {
    "component_path": {
      "shadcn_primary": [
        "/app/frontend/src/components/ui/button.jsx",
        "/app/frontend/src/components/ui/card.jsx",
        "/app/frontend/src/components/ui/badge.jsx",
        "/app/frontend/src/components/ui/tabs.jsx",
        "/app/frontend/src/components/ui/select.jsx",
        "/app/frontend/src/components/ui/table.jsx",
        "/app/frontend/src/components/ui/progress.jsx",
        "/app/frontend/src/components/ui/tooltip.jsx",
        "/app/frontend/src/components/ui/sonner.jsx",
        "/app/frontend/src/components/ui/dialog.jsx",
        "/app/frontend/src/components/ui/drawer.jsx",
        "/app/frontend/src/components/ui/scroll-area.jsx",
        "/app/frontend/src/components/ui/separator.jsx",
        "/app/frontend/src/components/ui/skeleton.jsx"
      ],
      "flowbite_optional": [
        "Flowbite 'Sidebar with badges' pattern (implement using shadcn primitives; do not import HTML dropdowns)"
      ],
      "21st_dev_optional": [
        "Chip / pill filter patterns (recreate using shadcn ToggleGroup + Badge)"
      ]
    },
    "buttons": {
      "base": "inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background disabled:opacity-50 disabled:pointer-events-none",
      "primary": "bg-primary text-primary-foreground shadow-sm hover:brightness-[0.98] active:scale-[0.98] transition-[filter,box-shadow]",
      "secondary": "bg-secondary text-secondary-foreground border border-border hover:bg-[hsl(var(--surface-3))] active:scale-[0.98] transition-[background-color,border-color]",
      "ghost": "bg-transparent text-foreground hover:bg-[hsl(var(--surface-2))] active:scale-[0.98] transition-[background-color]",
      "danger": "bg-destructive text-destructive-foreground hover:brightness-[0.98] active:scale-[0.98] transition-[filter]",
      "icon": "h-9 w-9 rounded-xl",
      "sizes": {
        "sm": "h-9 px-3",
        "md": "h-10 px-4",
        "lg": "h-11 px-5"
      },
      "data_testid": {
        "examples": [
          "data-testid=\"auth-login-submit-button\"",
          "data-testid=\"blog-studio-generate-button\"",
          "data-testid=\"export-format-confirm-button\""
        ]
      }
    },
    "cards": {
      "base": "cs-card rounded-2xl bg-card text-card-foreground border border-border",
      "interactive": "hover:shadow-[var(--shadow-md)] transition-[box-shadow,border-color] hover:border-[hsl(var(--border))]",
      "header_row": "flex items-start justify-between gap-3",
      "section_divider": "border-t border-border/70"
    },
    "inputs": {
      "input": "h-11 rounded-xl bg-white border border-input shadow-[var(--shadow-sm)] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background transition-[box-shadow,border-color]",
      "textarea": "rounded-xl bg-white border border-input shadow-[var(--shadow-sm)] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background transition-[box-shadow,border-color]",
      "helper_text": "text-xs text-muted-foreground",
      "error_text": "text-xs text-destructive",
      "data_testid_examples": [
        "data-testid=\"auth-email-input\"",
        "data-testid=\"auth-password-input\"",
        "data-testid=\"newsletter-subject-input\""
      ]
    },
    "tabs": {
      "tabs_list": "bg-[hsl(var(--surface-2))] p-1 rounded-2xl border border-border",
      "tabs_trigger": "rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-[var(--shadow-sm)] data-[state=active]:text-foreground data-[state=active]:border data-[state=active]:border-border text-muted-foreground transition-[background-color,color,box-shadow]",
      "data_testid_examples": [
        "data-testid=\"blog-studio-mode-tabs\"",
        "data-testid=\"content-library-view-tabs\""
      ]
    },
    "badges_and_chips": {
      "badge_base": "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold border",
      "chip_interactive": "cursor-pointer select-none hover:brightness-[0.98] active:scale-[0.98] transition-[filter,transform]",
      "semantic_badge_classes": {
        "content_type": {
          "blog": "bg-[hsl(var(--accent-blog)/0.12)] text-[hsl(var(--accent-blog))] border-[hsl(var(--accent-blog)/0.25)]",
          "newsletter": "bg-[hsl(var(--accent-newsletter)/0.12)] text-[hsl(var(--accent-newsletter))] border-[hsl(var(--accent-newsletter)/0.25)]"
        },
        "status": {
          "draft": "bg-[hsl(var(--accent-draft)/0.10)] text-[hsl(var(--accent-draft))] border-[hsl(var(--accent-draft)/0.22)]",
          "published": "bg-[hsl(var(--accent-published)/0.12)] text-[hsl(var(--accent-published))] border-[hsl(var(--accent-published)/0.25)]",
          "queued": "bg-[hsl(var(--accent-queued)/0.12)] text-[hsl(var(--accent-queued))] border-[hsl(var(--accent-queued)/0.25)]",
          "generating": "bg-[hsl(var(--accent-generating)/0.14)] text-[hsl(var(--accent-generating))] border-[hsl(var(--accent-generating)/0.28)]",
          "complete": "bg-[hsl(var(--accent-complete)/0.12)] text-[hsl(var(--accent-complete))] border-[hsl(var(--accent-complete)/0.25)]",
          "failed": "bg-[hsl(var(--accent-failed)/0.12)] text-[hsl(var(--accent-failed))] border-[hsl(var(--accent-failed)/0.25)]"
        },
        "providers": {
          "openai": "bg-[hsl(var(--accent-openai)/0.12)] text-[hsl(var(--accent-openai))] border-[hsl(var(--accent-openai)/0.25)]",
          "anthropic": "bg-[hsl(var(--accent-anthropic)/0.12)] text-[hsl(var(--accent-anthropic))] border-[hsl(var(--accent-anthropic)/0.25)]",
          "gemini": "bg-[hsl(var(--accent-gemini)/0.12)] text-[hsl(var(--accent-gemini))] border-[hsl(var(--accent-gemini)/0.25)]"
        },
        "export_formats": {
          "html": "bg-[hsl(var(--accent-export-html)/0.12)] text-[hsl(var(--accent-export-html))] border-[hsl(var(--accent-export-html)/0.25)]",
          "markdown": "bg-[hsl(var(--accent-export-markdown)/0.12)] text-[hsl(var(--accent-export-markdown))] border-[hsl(var(--accent-export-markdown)/0.25)]",
          "wordpress": "bg-[hsl(var(--accent-export-wordpress)/0.12)] text-[hsl(var(--accent-export-wordpress))] border-[hsl(var(--accent-export-wordpress)/0.25)]",
          "csv": "bg-[hsl(var(--accent-export-csv)/0.12)] text-[hsl(var(--accent-export-csv))] border-[hsl(var(--accent-export-csv)/0.25)]",
          "pdf": "bg-[hsl(var(--accent-export-pdf)/0.12)] text-[hsl(var(--accent-export-pdf))] border-[hsl(var(--accent-export-pdf)/0.25)]",
          "txt": "bg-[hsl(var(--accent-export-txt)/0.12)] text-[hsl(var(--accent-export-txt))] border-[hsl(var(--accent-export-txt)/0.25)]"
        },
        "media_types": {
          "image": "bg-[hsl(var(--accent-media-image)/0.12)] text-[hsl(var(--accent-media-image))] border-[hsl(var(--accent-media-image)/0.25)]",
          "gif": "bg-[hsl(var(--accent-media-gif)/0.12)] text-[hsl(var(--accent-media-gif))] border-[hsl(var(--accent-media-gif)/0.25)]",
          "video": "bg-[hsl(var(--accent-media-video)/0.12)] text-[hsl(var(--accent-media-video))] border-[hsl(var(--accent-media-video)/0.25)]"
        }
      },
      "data_testid_examples": [
        "data-testid=\"content-type-badge\"",
        "data-testid=\"status-badge\"",
        "data-testid=\"model-provider-chip\"",
        "data-testid=\"export-format-chip\"",
        "data-testid=\"media-type-chip\""
      ]
    },
    "sidebar_nav": {
      "nav_item": "group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--surface-2))] transition-[background-color,color]",
      "nav_item_active": "bg-white text-foreground border border-border shadow-[var(--shadow-sm)]",
      "left_accent_bar": "relative before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-6 before:w-1 before:rounded-full",
      "accent_usage": {
        "dashboard": "before:bg-[hsl(var(--accent-dashboard))]",
        "blog": "before:bg-[hsl(var(--accent-blog))]",
        "newsletter": "before:bg-[hsl(var(--accent-newsletter))]",
        "content_library": "before:bg-[hsl(var(--accent-content-library))]",
        "media_library": "before:bg-[hsl(var(--accent-media-library))]",
        "knowledge_base": "before:bg-[hsl(var(--accent-knowledge-base))]"
      },
      "data_testid_examples": [
        "data-testid=\"sidebar-nav-dashboard\"",
        "data-testid=\"sidebar-nav-blog-studio\"",
        "data-testid=\"sidebar-nav-newsletter-studio\"",
        "data-testid=\"sidebar-nav-content-library\"",
        "data-testid=\"sidebar-nav-media-library\"",
        "data-testid=\"sidebar-nav-knowledge-base\""
      ]
    },
    "quality_score_gauge": {
      "component": "Use shadcn Progress + Badge tiers; optionally add a small radial gauge using SVG (no heavy libs).",
      "tier_logic": {
        "excellent": ">= 85",
        "good": "70–84",
        "needs_work": "< 70"
      },
      "progress_classes": {
        "track": "bg-[hsl(var(--surface-2))]",
        "indicator_excellent": "bg-[hsl(var(--accent-score-excellent))]",
        "indicator_good": "bg-[hsl(var(--accent-score-good))]",
        "indicator_needs_work": "bg-[hsl(var(--accent-score-needs-work))]"
      },
      "data_testid_examples": [
        "data-testid=\"quality-score-progress\"",
        "data-testid=\"quality-score-tier-badge\""
      ]
    },
    "tables": {
      "table_container": "rounded-2xl border border-border bg-card shadow-[var(--shadow-sm)] overflow-hidden",
      "header": "bg-[hsl(var(--surface-2))]",
      "row": "hover:bg-[hsl(var(--surface-2))] transition-[background-color]",
      "row_selected": "bg-[hsl(var(--surface-3))]",
      "data_testid_examples": [
        "data-testid=\"content-library-table\"",
        "data-testid=\"content-library-row\""
      ]
    }
  },
  "page_blueprints": {
    "login": {
      "structure": [
        "Top-left brand mark + 'Content Studio'",
        "Left panel (lg only): warm band background + 2 bullets (Blog Studio, Newsletter Studio) + small screenshot placeholder",
        "Right panel: Card with title 'Welcome back' + email/password + submit + 'Create account' link"
      ],
      "microcopy": {
        "headline": "Welcome back",
        "subhead": "Log in to keep your date-ideas content flowing.",
        "helper": "Use your My Date Jar workspace credentials."
      },
      "required_data_testids": [
        "auth-login-email-input",
        "auth-login-password-input",
        "auth-login-submit-button",
        "auth-login-signup-link",
        "auth-login-error-text"
      ]
    },
    "signup": {
      "structure": [
        "Same split layout for consistency",
        "Form fields: name (optional if supported), email, password, confirm password",
        "Checkbox: accept terms (if present)",
        "Submit button + 'Already have an account?' link"
      ],
      "microcopy": {
        "headline": "Create your workspace",
        "subhead": "Generate blogs, newsletters, and exports in one warm, organized studio."
      },
      "required_data_testids": [
        "auth-signup-email-input",
        "auth-signup-password-input",
        "auth-signup-confirm-password-input",
        "auth-signup-submit-button",
        "auth-signup-login-link",
        "auth-signup-error-text"
      ]
    }
  },
  "motion_and_microinteractions": {
    "principles": [
      "No transition:all; only transition specific properties",
      "Buttons: active scale 0.98; hover brightness slight",
      "Cards: hover shadow lift",
      "Sidebar: active item has border+shadow and left accent bar",
      "Chips: press scale 0.98; selected state uses stronger border"
    ],
    "framer_motion_optional": {
      "install": "npm i framer-motion",
      "use_cases": [
        "Auth page panel fade/slide in",
        "Queue item status change crossfade",
        "Drawer open/close polish"
      ],
      "reduced_motion": "Respect prefers-reduced-motion; keep durations <= 220ms"
    }
  },
  "accessibility": {
    "requirements": [
      "WCAG AA contrast for text on backgrounds",
      "Never rely on color alone: pair badges with text labels/icons",
      "Focus-visible rings must be clearly visible on all interactive elements",
      "Hit targets >= 40px height for primary controls",
      "Use aria-label for icon-only buttons"
    ]
  },
  "image_urls": {
    "auth_brand_panel": [
      {
        "url": "https://images.pexels.com/photos/5797906/pexels-photo-5797906.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
        "description": "Warm desk flatlay for login/signup left panel (use with overlay + blur to avoid distraction)",
        "category": "auth"
      },
      {
        "url": "https://images.pexels.com/photos/7091834/pexels-photo-7091834.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
        "description": "Lifestyle workspace image alternative for auth panel",
        "category": "auth"
      }
    ],
    "subtle_background_texture": [
      {
        "url": "https://images.pexels.com/photos/12008049/pexels-photo-12008049.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
        "description": "Soft pastel blur background for decorative header band (keep under 20% viewport)",
        "category": "decor"
      }
    ]
  },
  "instructions_to_main_agent": {
    "priority_changes": [
      "Update /app/frontend/src/index.css :root HSL tokens to the new higher-contrast values",
      "Add the new semantic accent variables (nav/content/status/provider/export/score/media) to :root",
      "Update sidebar nav items to include left accent bar + active state border/shadow",
      "Apply semantic badge/chip classes across content types, statuses, providers, export formats, media types",
      "Refresh auth pages to split layout with brand panel + form card; ensure all inputs/buttons/links have data-testid"
    ],
    "implementation_notes_js": [
      "Project uses .js (not .tsx): keep components in JS and use existing shadcn/ui components from /src/components/ui",
      "Do not introduce raw HTML dropdown/calendar/toast; use shadcn Select/Calendar/Sonner",
      "Keep gradients minimal and only as background decoration (<=20% viewport)"
    ],
    "do_not_do": [
      "Do not keep everything beige; cards must be white and borders visible",
      "Do not use prohibited dark/saturated gradients (purple/pink etc.)",
      "Do not remove existing data-testid attributes; add missing ones"
    ]
  },
  "appendix_general_ui_ux_design_guidelines": "<General UI UX Design Guidelines>\n    - You must **not** apply universal transition. Eg: `transition: all`. This results in breaking transforms. Always add transitions for specific interactive elements like button, input excluding transforms\n    - You must **not** center align the app container, ie do not add `.App { text-align: center; }` in the css file. This disrupts the human natural reading flow of text\n   - NEVER: use AI assistant Emoji characters like`🤖🧠💭💡🔮🎯📚🎭🎬🎪🎉🎊🎁🎀🎂🍰🎈🎨🎰💰💵💳🏦💎🪙💸🤑📊📈📉💹🔢🏆🥇 etc for icons. Always use **FontAwesome cdn** or **lucid-react** library already installed in the package.json\n\n **GRADIENT RESTRICTION RULE**\nNEVER use dark/saturated gradient combos (e.g., purple/pink) on any UI element.  Prohibited gradients: blue-500 to purple 600, purple 500 to pink-500, green-500 to blue-500, red to pink etc\nNEVER use dark gradients for logo, testimonial, footer etc\nNEVER let gradients cover more than 20% of the viewport.\nNEVER apply gradients to text-heavy content or reading areas.\nNEVER use gradients on small UI elements (<100px width).\nNEVER stack multiple gradient layers in the same viewport.\n\n**ENFORCEMENT RULE:**\n    • Id gradient area exceeds 20% of viewport OR affects readability, **THEN** use solid colors\n\n**How and where to use:**\n   • Section backgrounds (not content backgrounds)\n   • Hero section header content. Eg: dark to light to dark color\n   • Decorative overlays and accent elements only\n   • Hero section with 2-3 mild color\n   • Gradients creation can be done for any angle say horizontal, vertical or diagonal\n\n- For AI chat, voice application, **do not use purple color. Use color like light green, ocean blue, peach orange etc**\n\n</Font Guidelines>\n\n- Every interaction needs micro-animations - hover states, transitions, parallax effects, and entrance animations. Static = dead. \n   \n- Use 2-3x more spacing than feels comfortable. Cramped designs look cheap.\n\n- Subtle grain textures, noise overlays, custom cursors, selection states, and loading animations: separates good from extraordinary.\n   \n- Before generating UI, infer the visual style from the problem statement (palette, contrast, mood, motion) and immediately instantiate it by setting global design tokens (primary, secondary/accent, background, foreground, ring, state colors), rather than relying on any library defaults. Don't make the background dark as a default step, always understand problem first and define colors accordingly\n    Eg: - if it implies playful/energetic, choose a colorful scheme\n           - if it implies monochrome/minimal, choose a black–white/neutral scheme\n\n**Component Reuse:**\n\t- Prioritize using pre-existing components from src/components/ui when applicable\n\t- Create new components that match the style and conventions of existing components when needed\n\t- Examine existing components to understand the project's component patterns before creating new ones\n\n**IMPORTANT**: Do not use HTML based component like dropdown, calendar, toast etc. You **MUST** always use `/app/frontend/src/components/ui/ ` only as a primary components as these are modern and stylish component\n\n**Best Practices:**\n\t- Use Shadcn/UI as the primary component library for consistency and accessibility\n\t- Import path: ./components/[component-name]\n\n**Export Conventions:**\n\t- Components MUST use named exports (export const ComponentName = ...)\n\t- Pages MUST use default exports (export default function PageName() {...})\n\n**Toasts:**\n  - Use `sonner` for toasts\"\n  - Sonner component are located in `/app/src/components/ui/sonner.tsx`\n\nUse 2–4 color gradients, subtle textures/noise overlays, or CSS-based noise to avoid flat visuals.\n</General UI UX Design Guidelines>"
}
