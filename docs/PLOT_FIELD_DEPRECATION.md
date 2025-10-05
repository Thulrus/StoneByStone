# Plot Field Deprecation

## Summary

The `plot` field for graves has been deprecated as of October 2025. This field was originally designed to store cemetery-specific plot identifiers (like "A-1", "Section B Plot 15"), but in practice it was redundant with the grid position and confused users.

## What Changed

### Schema Changes

- **TypeScript Types** (`src/types/cemetery.ts`): `plot` is now optional (`plot?: string`)
- **JSON Schema** (`schema/cemetery.schema.json`): `plot` is no longer required, marked as deprecated
- **Documentation**: Updated to reflect that plot is deprecated

### UI Changes

- **GraveEditor**: Removed the "Plot" input field entirely
- **GraveList**:
  - Removed "Plot: {plot}" display line
  - Removed plot from search functionality
  - Updated search placeholder to "Search by name or grid..."
- **MapGrid**: Changed tooltip from `grave.plot` to grid position fallback
- **CellSelectionModal**: Changed label fallback to use grid position instead of plot
- **CemeteryView**: Removed auto-generation of `plot: "{row}-{col}"` when creating graves

### Import/Export Changes

- **Export** (`src/lib/file.ts`): Automatically strips `plot` field from all graves
- **Import** (`src/lib/file.ts`):
  - Accepts `plot` field for backwards compatibility
  - Automatically strips it during normalization
  - Validation still allows it (won't cause errors)

## Migration Guide

### For Existing Users

**No action required!**

- Your existing data with `plot` fields will continue to work
- When you import old files, the plot field is accepted but stripped
- When you export data, plot fields are automatically removed
- The UI no longer shows or requires plot information

### For Developers

**Creating New Graves:**

```typescript
// OLD (deprecated)
const grave: Grave = {
  uuid: crypto.randomUUID(),
  plot: 'A-1', // Don't include this anymore
  grid: { row: 0, col: 0 },
  properties: {
    /* ... */
  },
};

// NEW (correct)
const grave: Grave = {
  uuid: crypto.randomUUID(),
  grid: { row: 0, col: 0 },
  properties: {
    /* ... */
  },
};
```

**Displaying Grave Information:**

```typescript
// OLD (deprecated)
<span>{grave.properties.name || grave.plot}</span>

// NEW (correct)
<span>
  {grave.properties.name || `Grave at (${grave.grid.row}, ${grave.grid.col})`}
</span>
```

## Rationale

### Why Deprecate?

1. **Redundancy**: The plot field duplicated information already stored in `grid.row` and `grid.col`
2. **Confusion**: Users found it unclear what to enter, leading to inconsistent data
3. **Auto-generation**: The app was auto-generating plot as `{row}-{col}` anyway
4. **Simplification**: Grid position is clearer and more direct

### Why Not Remove Completely?

We're taking a gradual deprecation approach:

1. **Backwards Compatibility**: Existing data files with plot fields continue to work
2. **Graceful Migration**: No breaking changes for users
3. **Validation**: Schema still accepts plot to prevent import errors
4. **Future Removal**: In a future major version, we can remove it entirely

## Required Fields (After Deprecation)

For graves, only these fields are now required:

- `uuid` - Unique identifier
- `grid.row` - Grid row position
- `grid.col` - Grid column position
- `properties.last_modified` - Timestamp
- `properties.modified_by` - User ID

All other fields (including name, dates, inscription) are optional.

## Testing

All existing tests continue to pass. The deprecation:

- ✅ Doesn't break validation
- ✅ Doesn't break imports of old data
- ✅ Doesn't break merging
- ✅ Doesn't break change logs
- ✅ Removes plot from exports
- ✅ Strips plot from imports

## Related Files

- `src/types/cemetery.ts` - Type definitions
- `schema/cemetery.schema.json` - JSON Schema
- `src/lib/file.ts` - Import/export logic
- `src/components/GraveEditor.tsx` - Grave creation/editing
- `src/components/GraveList.tsx` - Grave list display
- `src/components/MapGrid.tsx` - Map tooltips
- `src/components/CellSelectionModal.tsx` - Selection modal
- `src/pages/CemeteryView.tsx` - Main view
- `docs/DATA_FLEXIBILITY.md` - Data model documentation
- `README.md` - User documentation
- `.github/copilot-instructions.md` - Developer guidelines

## Future Considerations

In a future major version (2.0.0), we could:

1. Remove `plot` from the TypeScript interface entirely
2. Remove `plot` from the JSON Schema
3. Remove the `by-plot` index from IndexedDB
4. Update database version to migrate existing data
