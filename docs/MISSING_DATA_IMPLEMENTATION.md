# Missing Data Handling - Implementation Summary

## Changes Made (October 3, 2025)

### 1. Schema Updates (`schema/cemetery.schema.json`)

✅ **Made `change_log` array optional** at root level

- Allows importing files without change history
- Empty array `[]` is still valid

✅ **Improved date field validation**

- Accepts valid ISO date format (YYYY-MM-DD)
- Also accepts empty strings for unknown dates
- Better error messages for invalid formats

✅ **Added `additionalProperties: false`** to properties object

- Prevents schema drift
- Ensures data cleanliness

### 2. UI Component Updates

#### `GraveList.tsx`

- Shows "No name" in italics when name is missing
- Displays "?" for missing birth/death dates
- Only shows date line if at least one date exists

#### `GraveEditor.tsx`

- All text fields now convert empty strings to `undefined`
- Placeholder text indicates fields are optional
- Cleaner data model (omits fields rather than storing empty strings)

#### `MapGrid.tsx`

- Already handled: Falls back to plot ID if name is missing
- Tooltip works correctly with partial data

### 3. Validation Improvements (`lib/validator.ts`)

✅ **Enhanced error messages**:

- Date format errors suggest correct format
- UUID errors are more descriptive
- Path information helps locate problems

### 4. Sample Files

#### `samples/example.cem.json`

- **Fixed 4 invalid UUIDs** (variant bits)
- Complete dataset with all fields populated

#### `samples/minimal-example.cem.json` (NEW)

- Demonstrates minimal valid data
- 4 graves with varying levels of information:
  1. Only name
  2. Only dates
  3. Only inscription/notes
  4. Completely minimal (just required fields)

### 5. Documentation

#### `docs/DATA_FLEXIBILITY.md` (NEW)

- Complete guide to optional vs required fields
- UI behavior with missing data
- Best practices for data entry
- Example JSON snippets

#### `README.md`

- Updated feature list
- Added note about flexible data model
- References both example files

## Validation Rules

### Always Required

- UUID (v4 format)
- Plot identifier
- Grid position (row, col)
- Last modified timestamp
- Modified by user

### Always Optional

- Name
- Birth date
- Death date
- Inscription
- Notes
- Geometry (GPS)
- Deleted flag

### Special Cases

- Empty string `""` is valid for date fields
- Omitting optional fields is preferred over empty strings
- Change log can be empty array

## Testing

✅ Build passes with all changes
✅ TypeScript types already supported optional fields
✅ Minimal example demonstrates flexibility

## User Benefits

1. **Progressive data entry**: Start with basic info, add details later
2. **Multiple contributors**: Different people can fill different fields
3. **Merge-friendly**: Missing data doesn't create conflicts
4. **Real-world usage**: Handles partially legible or damaged markers
5. **Research workflow**: Initial survey → detailed pass → verification

## Technical Benefits

1. **Type safety maintained**: TypeScript optional types work correctly
2. **Schema validation**: Strict where needed, flexible where appropriate
3. **UI resilience**: No crashes or ugly placeholders with missing data
4. **Clean data model**: Undefined fields vs empty strings
5. **Forward compatible**: Easy to add new optional fields

## Next Steps (Suggested)

- [ ] Add bulk import with CSV support
- [ ] Create field completion statistics
- [ ] Add "incomplete data" filter in UI
- [ ] Generate data quality reports
- [ ] Add photo attachments (optional field)
