# UUID Fix for Willow Creek Example

## Issue

The Willow Creek example file had validation errors due to invalid UUID formats. The validator requires proper UUID v4 format matching the pattern:

```
^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$
```

## Problems Found

### 1. Invalid Group UUIDs (12 groups)

Used non-standard format: `group-0001-4000-8000-000000000001`

- Missing proper version number (4) in correct position
- Incorrect variant bits

### 2. Invalid Grave UUIDs (7 graves)

Used non-standard format with 'b' suffix: `a1b2c3d4-0001-4000-8000-000000000002b`

- Extra character makes it invalid
- Not proper UUID format

### 3. Cascade Effect

All `group_ids` in grave properties referenced the invalid group UUIDs

## Solution Applied

Created and ran a Python script that:

1. **Generated valid UUID v4s** for all 12 groups
2. **Updated group UUIDs** in the groups array
3. **Updated all group_ids references** in grave properties
4. **Fixed invalid grave UUIDs** (7 graves with 'b' suffix)
5. **Preserved all other data** including:
   - Names, dates, inscriptions
   - Grid positions
   - Landmark data
   - Road data
   - Grid shape

## UUIDs Changed

### Groups (12 total)

| Old (Invalid)                     | New (Valid UUID v4)                  |
| --------------------------------- | ------------------------------------ |
| group-0001-4000-8000-000000000001 | 46f7ed1f-f764-499c-9012-b84630f5c03b |
| group-0001-4000-8000-000000000002 | c790cf92-0fb4-4de3-bae6-64c3d7fac00e |
| group-0001-4000-8000-000000000003 | d1b71eb1-a75b-4997-9328-c34fca018b24 |
| group-0001-4000-8000-000000000004 | db143fac-50b4-4079-b8af-747af332f6e6 |
| group-0001-4000-8000-000000000005 | d7caebde-5769-49ad-97d9-bdf96276db55 |
| group-0001-4000-8000-000000000006 | 6247d557-2bc8-424b-8e15-47a711f39c92 |
| group-0001-4000-8000-000000000007 | f0b64818-3ca9-4351-996d-974cdd417c26 |
| group-0001-4000-8000-000000000008 | af6d4cd2-5826-4d93-90c5-8aee648de387 |
| group-0001-4000-8000-000000000009 | a9f0dac0-d321-462d-94fc-d69c1ec6fd43 |
| group-0001-4000-8000-000000000010 | 8ace3a00-fca8-4e7a-aefd-f8bf00768a4a |
| group-0001-4000-8000-000000000011 | b914de30-ca8b-4aff-b716-7d2efc546822 |
| group-0001-4000-8000-000000000012 | b05168f1-e7b2-45c7-99ba-ffea6fd7a236 |

### Graves (7 with invalid UUIDs)

| Old (Invalid)                         | New (Valid UUID v4)                  |
| ------------------------------------- | ------------------------------------ |
| a1b2c3d4-0001-4000-8000-000000000002b | 22672163-c3d7-4201-afb0-7141af070105 |
| a1b2c3d4-0001-4000-8000-000000000005b | 194fd93c-1038-47a7-936f-d1a5fe1ad3f9 |
| a1b2c3d4-0001-4000-8000-000000000007b | 8d8749ac-aedf-4e9d-806a-4102e927efc5 |
| a1b2c3d4-0001-4000-8000-000000000009b | 21dbf35a-e1ea-4974-8993-011bc7ed064e |
| a1b2c3d4-0001-4000-8000-000000000010b | bcbc2af1-f6ac-48ca-8e39-6a83174dfc32 |
| a1b2c3d4-0001-4000-8000-000000000012b | 48158dc1-eeb5-4ee3-a264-c06522aed0d2 |
| a1b2c3d4-0001-4000-8000-000000000015b | b69734fc-9969-453b-a018-324ceab92266 |

## Verification

✅ **JSON Syntax**: Valid  
✅ **UUID Format**: All UUIDs now match UUID v4 pattern  
✅ **Schema Compliance**: Should pass validation  
✅ **Data Integrity**: All relationships preserved  
✅ **File Size**: Unchanged (~51 KB)

## Impact

### What Changed

- All group UUIDs replaced with valid UUID v4s
- All grave `group_ids` updated to reference new group UUIDs
- 7 grave UUIDs fixed (removed 'b' suffix, replaced with valid UUIDs)

### What Stayed the Same

- All grave names, dates, inscriptions
- All group names, colors, descriptions
- All grid positions
- All landmarks
- All roads
- Grid shape definition
- File structure and content

## Testing

To verify the fix works:

1. **Import the file**:

   ```
   Go to Import/Export page
   Import samples/willow-creek-example.cem.json
   ```

2. **Should load without validation errors**

3. **Verify groups work**:
   - Click Groups tab
   - Should see all 12 groups
   - Click a group (e.g., Thompson Family)
   - Members should highlight on map

4. **Verify navigation**:
   - Click highlighted grave
   - Should see group memberships
   - Click group member names to navigate
   - Use "Go To Location" button

## Why This Happened

I initially created the group and grave UUIDs manually using a pattern-based approach rather than generating proper UUID v4s. The JSON Schema validator (AJV) correctly caught these invalid UUIDs and rejected the file.

## Lesson Learned

**Always use proper UUID generation** for UUIDs:

- Use `crypto.randomUUID()` in JavaScript
- Use `uuid.uuid4()` in Python
- Use `uuidgen` command line tool
- Never manually construct UUIDs

## Status

✅ **Fixed**: All UUIDs now valid UUID v4 format  
✅ **Tested**: JSON syntax validated  
✅ **Ready**: File ready for import and testing

---

**Fixed**: October 6, 2025  
**Script**: `/tmp/fix_uuids.py`  
**File**: `samples/willow-creek-example.cem.json`
