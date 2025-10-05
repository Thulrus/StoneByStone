# Color System Documentation

**Date**: October 5, 2025

## Overview

StoneByStone uses a centralized color system to make theme customization easy. All colors are defined in two places that must be kept in sync:

1. **`tailwind.config.cjs`** - For Tailwind utility classes (like `bg-cemetery-grass-light`)
2. **`src/lib/colors.ts`** - For direct use in JavaScript/TypeScript (SVG attributes, etc.)

## How to Change Colors

### Step 1: Update Tailwind Config

Edit `/tailwind.config.cjs` in the `theme.extend.colors` section:

```javascript
colors: {
  cemetery: {
    grass: {
      light: '#86a876',  // ← Change this for light theme grass color
      dark: '#4a5f3f',   // ← Change this for dark theme grass color
    },
    invalid: {
      DEFAULT: 'rgba(0, 0, 0, 0.8)',  // ← Black overlay for invalid cells
    },
  },
  // ... more colors
}
```

### Step 2: Update Color Constants

Edit `/src/lib/colors.ts` with the **same values**:

```typescript
export const colors = {
  cemetery: {
    grass: {
      light: '#86a876', // ← Must match Tailwind config
      dark: '#4a5f3f', // ← Must match Tailwind config
    },
    // ... more colors
  },
};
```

### Step 3: Rebuild

After changing colors, rebuild the application:

```bash
npm run build
```

## Available Color Categories

### 1. Cemetery Colors

**Purpose**: Colors for the cemetery map grid

| Color                  | Usage                       | Light Theme          | Dark Theme |
| ---------------------- | --------------------------- | -------------------- | ---------- |
| `cemetery-grass-light` | Valid cemetery cells        | `#86a876`            | -          |
| `cemetery-grass-dark`  | Valid cemetery cells        | -                    | `#4a5f3f`  |
| `cemetery-invalid`     | Invalid/out-of-bounds cells | `rgba(0, 0, 0, 0.8)` | Same       |

**Where used**:

- `MapGrid.tsx` - Background rectangles for valid cells
- `MapGrid.tsx` - Overlay for invalid cells

### 2. Highlight Colors

**Purpose**: Colors for highlighting graves and elements

#### Yellow Highlights (List Selection)

| Color                       | Usage                        | Value                     |
| --------------------------- | ---------------------------- | ------------------------- |
| `highlight-yellow-light`    | Floating label background    | `rgba(234, 179, 8, 0.95)` |
| `highlight-yellow-border`   | Floating label border        | `rgba(161, 98, 7, 0.8)`   |
| `highlight-yellow-ring`     | Pulsing ring animation       | `rgba(234, 179, 8, 0.8)`  |
| `highlight-yellow-bg-light` | List item background (light) | `#fef3c7`                 |
| `highlight-yellow-bg-dark`  | List item background (dark)  | `#78350f`                 |

**Where used**:

- `MapGrid.tsx` - Floating label when grave selected from list
- `GraveList.tsx` - Background highlight for hovered grave

#### Blue Highlights (Selection)

| Color                     | Usage                    | Light Theme | Dark Theme |
| ------------------------- | ------------------------ | ----------- | ---------- |
| `highlight-blue-bg-light` | Selected item background | `#dbeafe`   | -          |
| `highlight-blue-bg-dark`  | Selected item background | -           | `#1e3a8a`  |

**Where used**:

- `GraveList.tsx` - Background for currently selected grave

#### Other Highlights

| Color             | Usage                     | Value     |
| ----------------- | ------------------------- | --------- |
| `highlight-green` | Success/valid indicators  | `#10b981` |
| `highlight-red`   | Error/conflict indicators | `#ef4444` |

### 3. Text Colors

| Color        | Usage                     | Value     |
| ------------ | ------------------------- | --------- |
| `text-dark`  | Text on light backgrounds | `#1f2937` |
| `text-light` | Text on dark backgrounds  | `#f9fafb` |

**Where used**:

- `MapGrid.tsx` - Text in floating label
- Various components for themed text

### 4. Grid Colors

| Color             | Usage      | Light Theme | Dark Theme |
| ----------------- | ---------- | ----------- | ---------- |
| `grid-line-light` | Grid lines | `#9ca3af`   | -          |
| `grid-line-dark`  | Grid lines | -           | `#4b5563`  |

**Where used**:

- `MapGrid.tsx` - SVG grid lines (via Tailwind classes)

## Color Usage Patterns

### In Tailwind Classes (JSX)

Use Tailwind utility classes with the custom color names:

```tsx
<div className="bg-cemetery-grass-light dark:bg-cemetery-grass-dark">
  Cemetery cell
</div>

<div className="bg-highlight-blue-bg-light dark:bg-highlight-blue-bg-dark">
  Selected grave
</div>
```

### In SVG Attributes (Direct Values)

Import and use the `colors` object from `colors.ts`:

```tsx
import { colors } from '../lib/colors';

<rect
  fill={colors.cemetery.grass.light}
  // For theme-aware colors in SVG:
  className="fill-cemetery-grass-light dark:fill-cemetery-grass-dark"
/>

<circle
  stroke={colors.highlight.yellow.ring}
/>

<text
  fill={colors.text.dark}
/>
```

## Theme-Aware Color Selection

The `colors.ts` file provides helper functions:

```typescript
import { isDarkTheme, getThemeColor } from '../lib/colors';

// Check current theme
if (isDarkTheme()) {
  // Use dark colors
}

// Get theme-appropriate color
const grassColor = getThemeColor(
  colors.cemetery.grass.light,
  colors.cemetery.grass.dark
);
```

## Color Naming Convention

Colors follow this pattern:

```
{category}-{subcategory}-{variant}
```

Examples:

- `cemetery-grass-light` - Cemetery category, grass subcategory, light variant
- `highlight-yellow-border` - Highlight category, yellow subcategory, border variant
- `highlight-blue-bg-dark` - Highlight category, blue subcategory, background variant, dark mode

## Important Notes

### 1. Keep Both Files in Sync

Always update **both** `tailwind.config.cjs` and `src/lib/colors.ts` when changing colors. They must have identical values.

### 2. Rebuild After Changes

Tailwind generates CSS at build time, so you must rebuild after changing the config:

```bash
npm run build
# or
npm run dev  # for development with hot reload
```

### 3. Color Format Support

Tailwind supports various color formats:

- Hex: `#86a876`
- RGB: `rgb(134, 168, 118)`
- RGBA: `rgba(234, 179, 8, 0.95)`
- HSL: `hsl(95, 25%, 56%)`

Use the format that best fits your needs.

### 4. Dark Mode Classes

For theme-aware colors in HTML/JSX:

- Use `dark:` prefix: `bg-cemetery-grass-light dark:bg-cemetery-grass-dark`

For SVG elements:

- Use Tailwind classes when possible: `className="fill-cemetery-grass-light dark:fill-cemetery-grass-dark"`
- Use direct values from `colors.ts` when classes don't work

## Common Customizations

### Change Grass Color

Want a different shade of green for the cemetery?

1. Pick new colors (e.g., from a color picker)
2. Update both files:

```javascript
// tailwind.config.cjs
cemetery: {
  grass: {
    light: '#7fb069',  // New light green
    dark: '#3a5a40',   // New dark green
  },
}
```

```typescript
// src/lib/colors.ts
cemetery: {
  grass: {
    light: '#7fb069',  // Same value
    dark: '#3a5a40',   // Same value
  },
}
```

3. Rebuild: `npm run build`

### Change Highlight Colors

Want blue instead of yellow for list selection?

Update the yellow highlight colors:

```javascript
highlight: {
  yellow: {
    light: 'rgba(59, 130, 246, 0.95)',  // Blue instead of yellow
    border: 'rgba(29, 78, 216, 0.8)',
    ring: 'rgba(59, 130, 246, 0.8)',
    // ... etc
  },
}
```

Remember to update both files!

### Add New Colors

To add completely new colors:

1. Add to Tailwind config:

```javascript
theme: {
  extend: {
    colors: {
      myCustom: {
        light: '#ff0000',
        dark: '#880000',
      },
    },
  },
}
```

2. Add to colors.ts:

```typescript
export const colors = {
  // ... existing colors
  myCustom: {
    light: '#ff0000',
    dark: '#880000',
  },
};
```

3. Use in components:

```tsx
<div className="bg-myCustom-light dark:bg-myCustom-dark">Content</div>
```

## Testing Color Changes

After changing colors:

1. **Build**: `npm run build`
2. **Test light mode**: Toggle theme to light, check all pages
3. **Test dark mode**: Toggle theme to dark, check all pages
4. **Check contrast**: Ensure text is readable on new backgrounds
5. **Test highlights**: Select graves from list, check label colors
6. **Check map**: Verify grass and invalid cells look correct

## Troubleshooting

### Colors not updating?

1. Did you rebuild? Run `npm run build` or restart `npm run dev`
2. Did you update both files? Check both `tailwind.config.cjs` and `colors.ts`
3. Browser cache? Do a hard refresh (Ctrl+Shift+R or Cmd+Shift+R)

### Tailwind classes not working?

Make sure the color is in the `extend.colors` section of `tailwind.config.cjs` and you've rebuilt.

### SVG colors not working?

For SVG elements, you may need to use direct values from `colors.ts` instead of Tailwind classes.

## Summary

✅ **Two files to update**: `tailwind.config.cjs` and `src/lib/colors.ts`  
✅ **Must match**: Values in both files must be identical  
✅ **Rebuild required**: Run `npm run build` after changes  
✅ **Test both themes**: Check light and dark modes  
✅ **Organized by purpose**: Cemetery, highlights, text, grid

This centralized system makes it easy to maintain a consistent color scheme and customize the app's appearance!
