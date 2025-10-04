# Icon Setup

## Icon Files

The app icon has been set up in multiple sizes for different use cases:

### Location

All icon files are in `/public/` directory:

- `icon.png` - Original 1024x1024 source image
- `icon-16.png` - 16x16 favicon size
- `icon-32.png` - 32x32 favicon size
- `icon-192.png` - 192x192 PWA icon
- `icon-512.png` - 512x512 PWA icon
- `favicon.ico` - Multi-resolution .ico file (16x16 + 32x32)

### Usage

#### HTML (`index.html`)

- `favicon.ico` - Standard favicon
- `icon-16.png` - 16x16 PNG favicon
- `icon-32.png` - 32x32 PNG favicon
- `icon-192.png` - Apple touch icon

#### PWA Manifest (`public/manifest.json`)

- `icon-192.png` - For home screen (both regular and maskable)
- `icon-512.png` - For splash screen (both regular and maskable)

#### Service Worker (`public/service-worker.js`)

All icons are cached for offline use

## Updating the Icon

To update the app icon:

1. Replace `/public/icon.png` with your new 1024x1024 PNG image
2. Regenerate the icon sizes:
   ```fish
   cd public
   for size in 16 32 192 512
       convert icon.png -resize {$size}x{$size} icon-$size.png
   end
   convert icon-32.png icon-16.png favicon.ico
   ```
3. Clear browser cache and rebuild: `npm run build`

## Icon Specifications

### Requirements

- **Format**: PNG with transparency (RGBA)
- **Source Size**: 1024x1024 pixels recommended
- **Design**: Should work at small sizes (16x16)
- **Safe Zone**: Keep important elements in center 80% for maskable icons

### Generated Sizes

- 16x16: Browser tabs, bookmarks
- 32x32: Browser tabs (retina), taskbar
- 192x192: Android home screen, PWA install prompt
- 512x512: Splash screens, app drawer

## Browser Support

- ✅ Modern browsers: PNG icons with multiple sizes
- ✅ Legacy browsers: favicon.ico fallback
- ✅ iOS Safari: Apple touch icon
- ✅ Android Chrome: PWA manifest icons
- ✅ Desktop PWA: All platforms supported
