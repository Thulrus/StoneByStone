# Data Flexibility Guide

## Overview

StoneByStone is designed to accommodate incomplete or partial grave data. Not all information may be available when documenting a cemetery, and the system gracefully handles missing fields.

## Required vs Optional Fields

### Cemetery Level (Required)
- `id` - Unique identifier
- `name` - Cemetery name
- `grid.rows` - Number of rows
- `grid.cols` - Number of columns
- `last_modified` - ISO8601 timestamp
- `modified_by` - User identifier

### Grave Level

#### Required
- `uuid` - Unique identifier (UUID v4 format)
- `plot` - Plot identifier (can be any string like "A-1", "Section B Plot 15")
- `grid.row` - Grid row position (integer >= 0)
- `grid.col` - Grid column position (integer >= 0)
- `properties.last_modified` - ISO8601 timestamp
- `properties.modified_by` - User identifier

#### Optional (All Nullable)
- `properties.name` - Name of the deceased
- `properties.birth` - Birth date (YYYY-MM-DD or empty string)
- `properties.death` - Death date (YYYY-MM-DD or empty string)
- `properties.inscription` - Text on grave marker
- `properties.notes` - Additional observations
- `properties.deleted` - Boolean flag for soft deletion
- `geometry` - GeoJSON Point with GPS coordinates

## UI Behavior with Missing Data

### Display
- Missing name → Shows "No name" in italics
- Missing dates → Shows "?" placeholder
- Empty inscription/notes → Fields are blank

### Map View
- Tooltip shows name if available, otherwise plot identifier
- All graves display regardless of completeness

### Search
- Searches across all available fields
- Missing fields don't cause errors

## Example: Minimal Grave Record

```json
{
  "uuid": "12345678-1234-4567-8901-234567890abc",
  "plot": "Unknown-1",
  "grid": { "row": 0, "col": 0 },
  "properties": {
    "last_modified": "2025-10-03T12:00:00.000Z",
    "modified_by": "Surveyor"
  }
}
```

This is valid! The grave exists at a location but no other details are known yet.

## Example: Partial Information

```json
{
  "uuid": "12345678-1234-4567-8901-234567890abc",
  "plot": "A-5",
  "grid": { "row": 0, "col": 4 },
  "properties": {
    "death": "1892-03-15",
    "inscription": "Gone but not forgotten",
    "last_modified": "2025-10-03T12:00:00.000Z",
    "modified_by": "Surveyor"
  }
}
```

Valid! We know when they died and what's on the stone, but not their name or birth date.

## Data Entry Workflow

1. **Initial Survey**: Record plot and grid position only
2. **First Pass**: Add names if legible
3. **Detailed Pass**: Add dates, inscriptions
4. **Research Phase**: Add notes, confirm dates
5. **GPS Mapping**: Add geometry coordinates

Each step can be done independently, and data can be merged from multiple contributors.

## Validation

The JSON Schema validates:
- ✅ Required fields are present
- ✅ Date formats are correct (YYYY-MM-DD) or empty
- ✅ UUIDs match v4 specification
- ✅ Grid positions are non-negative integers

It does NOT require:
- ❌ Name to be filled in
- ❌ Birth or death dates
- ❌ Any descriptive text

## Best Practices

1. **Always fill in**:
   - Plot identifier (even if approximate like "Unknown-1")
   - Grid position (best estimate)
   - Your name in `modified_by`

2. **Use empty string for unknown dates**:
   ```json
   "birth": "",
   "death": ""
   ```

3. **Use notes for uncertainty**:
   ```json
   "notes": "Name partially illegible, possibly 'John Smith' or 'John Smythe'"
   ```

4. **Leave fields absent rather than using placeholder text**:
   ❌ `"name": "Unknown"`
   ✅ Don't include the name field at all

This allows later merging to add real data without overwriting placeholders.
