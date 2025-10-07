# Willow Creek Memorial Gardens - Complete Feature Showcase

This sample cemetery data file demonstrates **every feature** available in StoneByStone, making it the perfect test dataset for developers and the best example for new users.

## Quick Start

1. Open StoneByStone app
2. Go to Import/Export page
3. Import `willow-creek-example.cem.json`
4. Explore all features!

## What's Included

### 📊 Cemetery Overview

- **Name**: Willow Creek Memorial Gardens
- **Size**: 20 rows × 25 columns (irregular shape)
- **Total Graves**: 33 burials spanning 1878-2024
- **Groups**: 12 different organizational groups
- **Landmarks**: 14 various landmark types
- **Roads**: 11 paths with different colors and materials
- **Shape**: Non-rectangular boundary demonstrating custom grid shapes

### 🎯 Feature Demonstrations

#### ✅ Grid Shape Feature

The cemetery has a **custom non-rectangular shape** that demonstrates:

- Irregular boundaries (not a simple rectangle)
- Natural tapering at corners
- Realistic cemetery layout
- Empty cells outside the defined boundary

#### ✅ Groups Feature (12 Groups)

All 12 groups show different use cases:

1. **Thompson Family** (Blue #3b82f6)
   - 3 members: Margaret, Robert, David
   - Demonstrates multi-generational family plot
   - Includes WWII veteran and Vietnam veteran

2. **Foster Family** (Purple #8b5cf6)
   - 3 members: William Sr., Sarah, William Jr.
   - Town founder and descendants
   - Shows family legacy across generations

3. **WWII Veterans** (Red #ef4444)
   - 4 members: Robert Thompson, Sgt. Patterson, Capt. Morrison, Nurse Anderson
   - Cross-group membership example
   - Mix of Army, Navy, Air Corps

4. **O'Brien Family** (Green #10b981)
   - 3 members: James, Patricia, Sean
   - Musicians and artists theme
   - Custom headstones (guitar, piano)

5. **Chen Family** (Orange #f59e0b)
   - 3 members: Chen Wei, Li Mei, David
   - Bilingual inscriptions (Chinese/English)
   - Cultural heritage demonstration

6. **Johnson Family** (Cyan #06b6d4)
   - 3 members: Eleanor, Thomas, Robert
   - Medical professionals
   - Multiple group membership example

7. **Santos Family** (Pink #ec4899)
   - 3 members: Maria, Jose, Carmen
   - Spanish inscriptions
   - Educator in multiple groups

8. **First Responders** (Dark Red #dc2626)
   - 3 members: Firefighter McCarthy, Officer Rodriguez, Paramedic Wright
   - Emergency services heroes
   - Different service types

9. **Educators** (Purple #7c3aed)
   - 4 members: Dr. Johnson, Principal Thompson, Miller, Carmen Santos
   - Teachers and administrators
   - Cross-group memberships

10. **Infant & Child Memorials** (Yellow #fbbf24)
    - 3 members: Baby Rodriguez, Emma Wilson, Baby Williams
    - Sensitive memorial section
    - Special marker types

11. **19th Century Burials** (Gray #6b7280)
    - 5 members: Foster, Brown, Miller, O'Connor couple
    - Historic graves from 1800s
    - Weathered markers

12. **Veterans - All Wars** (Maroon #991b1b)
    - 6 members: All military service members
    - Civil War through Vietnam
    - Comprehensive veteran tracking

#### ✅ Missing/Optional Data

Demonstrates data flexibility:

- **Baby Charlotte Williams**: Born and died same day
- **Unknown Soldier**: No birth/death dates
- Various graves missing some fields
- Shows graceful handling of incomplete data

#### ✅ Multi-Group Membership

Several graves belong to multiple groups:

- **Robert Thompson**: Thompson Family, WWII Veterans, Veterans - All Wars
- **Dr. Eleanor Johnson**: Johnson Family, Educators
- **Carmen Santos**: Santos Family, Educators
- **Samuel Brown**: 19th Century Burials, Veterans - All Wars

#### ✅ Landmarks (14 Total)

Demonstrates all landmark types:

**Statues** (3):

- Angel of Hope (entrance)
- Eternal Peace Monument (veterans memorial)
- Children's Memorial Garden

**Benches** (3):

- Reflection Bench
- Sunset Viewing Bench
- Thompson Family Bench

**Trees** (3):

- Memorial Oak (150 years old)
- Weeping Willow
- Ancient Maple (200+ years)

**Pines** (2):

- Evergreen Grove
- Southern Pine Stand

**Buildings** (2):

- Cemetery Office
- Maintenance Shed

**Other** (1):

- Memorial Fountain

#### ✅ Roads & Paths (11 Total)

Demonstrates different materials and colors:

**Paved Roads** (Dark Gray #374151):

- Memorial Avenue (main N-S)
- Oak Tree Lane (main E-W)
- Willow Path (southern cross)
- Central Crossing

**Gravel Paths** (Gray #9ca3af):

- Veterans Way (curved path)
- Heritage Trail

**Brick Pavers** (Brown #b45309):

- Founders Walk (western boundary)

**Cobblestone** (Stone #78716c):

- Foster Lane (historic path)

**Decorative Pavers** (Cyan #06b6d4):

- Fountain Walk (blue pavers)

**Flagstone** (Medium Gray #6b7280):

- Thompson Way (family path)

**Mulch Path** (Dark Brown #92400e):

- Garden Path (natural path)

### 🌍 Cultural Diversity

Demonstrates multicultural cemetery:

- **Chinese**: Chen family with Chinese characters
- **Spanish**: Santos family with Spanish inscriptions
- **Arabic**: Al-Rashid with Quranic verse
- **Irish**: O'Connor family with Celtic themes
- Shows proper handling of non-ASCII characters

### 📅 Historical Span

Covers 146 years of history:

- **Oldest**: Samuel Washington Brown (1878-1952) - Civil War Veteran
- **Newest**: Baby Michael Rodriguez (2022)
- Shows evolution of cemetery over time

### 💼 Occupations Represented

Diverse community members:

- **Medical**: Doctors, nurses
- **Education**: Teachers, principals
- **First Responders**: Firefighters, police, EMTs
- **Military**: Various wars and branches
- **Clergy**: Reverend
- **Civic**: Town founders, mayors
- **Arts**: Musicians, artists

## Testing Workflows

### Group Exploration

1. Click **Groups** tab in sidebar
2. See all 12 groups with member counts
3. Search for "Family" to filter family groups
4. Sort by member count
5. Click **Thompson Family** → see 3 members highlighted on map
6. Click highlighted grave → view details
7. Click other member names to navigate
8. Use **Go To Location** button to center map

### Multi-Group Navigation

1. Find Robert Thompson (row 3, col 6)
2. See he belongs to 3 groups
3. Click each group name to see other members
4. Navigate between related graves

### Map Features

1. **Zoom**: Use +/- buttons or mouse wheel
2. **Pan**: Drag with mouse or touch
3. **Reset**: Click reset button
4. **Centering**: Use Go To Location from grave info

### Grid Shape

1. Notice irregular boundary shape
2. Try to place marker outside boundary (won't allow)
3. See how roads respect boundary
4. Observe natural cemetery contours

### Road Colors

1. Notice main roads are dark gray (paved)
2. See brick path in brown (Founders Walk)
3. Find blue decorative pavers (Fountain Walk)
4. Observe different road materials throughout

### Landmark Types

1. Click landmarks to see different icons
2. Statues, benches, trees, pines, buildings
3. Each has descriptive information

### Search & Filter

1. Search for "Thompson" in Graves tab
2. Search for "Veteran" in Groups tab
3. Find graves by name, inscription, notes
4. Filter by date ranges

### Missing Data Handling

1. Find Unknown Soldier (no dates)
2. Find graves with only some fields filled
3. See graceful display of missing data

### Cultural Features

1. Find Chen family graves (Chinese characters)
2. Find Santos family (Spanish inscriptions)
3. Find Al-Rashid (Arabic inscription)
4. All display correctly

## File Statistics

```
Graves:        33 (with detailed inscriptions)
Groups:        12 (covering all major categories)
Landmarks:     14 (all types represented)
Roads:         11 (various colors and materials)
Grid Size:     20×25 (500 potential cells)
Active Cells:  ~380 (irregular shape)
Date Range:    1878-2024 (146 years)
```

## Use Cases

### For Developers

- Test all features in one file
- Validate rendering performance
- Check data model compatibility
- Test edge cases (missing data, special characters)
- Verify group highlighting and navigation
- Test road color rendering
- Validate grid shape display

### For New Users

- Learn by example
- See real cemetery structure
- Understand grouping possibilities
- Explore all landmark types
- See various road configurations
- Learn navigation features

### For Documentation

- Screenshot source
- Tutorial demonstrations
- Feature showcase
- Best practices examples

### For Training

- Cemetery staff onboarding
- Volunteer training
- Feature introduction
- Workflow demonstrations

## Technical Notes

### Data Model Features

- ✅ JSON Schema 1.0.0 compliant
- ✅ All graves have UUID
- ✅ Grid positions (no deprecated plot field)
- ✅ Optional grave properties
- ✅ Group IDs for multi-membership
- ✅ Custom grid shape defined
- ✅ Road color customization
- ✅ Landmark type variety
- ✅ UTF-8 encoded (supports all characters)
- ✅ Change log included

### Performance Characteristics

- **Size**: ~35 KB
- **Load Time**: < 1 second
- **Render Time**: Instant
- **Group Queries**: Fast (33 graves, 12 groups)
- **Search**: Responsive
- **Map Rendering**: Smooth zoom/pan

### Compatibility

- ✅ Works on all modern browsers
- ✅ Mobile responsive
- ✅ Offline capable (PWA)
- ✅ Export/import compatible
- ✅ Merge-friendly (proper timestamps)

## Recommended Exploration Order

### First Visit (5 minutes)

1. Import file
2. View map - notice irregular shape
3. Click a few graves to see details
4. Try zoom/pan controls
5. Switch to Groups tab

### Deep Dive (15 minutes)

1. **Groups Tab**:
   - Browse all 12 groups
   - Click Thompson Family
   - See highlighted members on map
   - Navigate between family members
   - Try other groups (Veterans, Educators, etc.)

2. **Graves Tab**:
   - Search for "veteran"
   - Search for different names
   - Sort by different fields

3. **Map Exploration**:
   - Notice different road colors
   - Click landmarks (various icons)
   - Try Go To Location feature
   - Observe grid shape boundaries

### Advanced Features (30 minutes)

1. Test multi-group membership navigation
2. Explore all 11 different road styles
3. Visit all 14 landmarks
4. Find graves with missing data
5. Check cultural inscriptions (Chinese, Spanish, Arabic)
6. Navigate through 146 years of history
7. Use all toolbar features
8. Test search across different fields

## Feature Checklist

Use this to verify all features work correctly:

**Basic Features**:

- [ ] Cemetery loads successfully
- [ ] Map displays with irregular shape
- [ ] Zoom in/out works
- [ ] Pan around map works
- [ ] Reset view works

**Graves**:

- [ ] Click grave to view details
- [ ] See grave inscriptions
- [ ] See grave notes
- [ ] Navigate with Go To Location
- [ ] Search graves by name
- [ ] Graves display missing data gracefully

**Groups**:

- [ ] Groups tab shows 12 groups
- [ ] Group counts are correct
- [ ] Click group highlights members on map
- [ ] Search groups works
- [ ] Sort groups works
- [ ] Navigate between group members
- [ ] Multi-group membership displays correctly

**Landmarks**:

- [ ] 14 landmarks display
- [ ] Different icons for different types
- [ ] Click landmark to view details
- [ ] Landmarks at correct positions

**Roads**:

- [ ] 11 roads display
- [ ] Different colors show correctly
- [ ] Roads follow paths correctly
- [ ] Roads respect grid boundaries

**Grid Shape**:

- [ ] Non-rectangular shape displays
- [ ] Empty cells outside boundary
- [ ] Shape editing respects boundary
- [ ] Roads stay within boundary

**UI Features**:

- [ ] Tabbed sidebar (Graves/Groups)
- [ ] Search in both tabs
- [ ] Sort options work
- [ ] Highlighting persists
- [ ] Element info modal works
- [ ] Go To Location centers map

**Data Quality**:

- [ ] All UTF-8 characters display
- [ ] Chinese characters render
- [ ] Spanish characters render
- [ ] Arabic characters render
- [ ] Dates format correctly
- [ ] Missing data handled gracefully

## Version History

- **1.0** (2024-10-04): Original Willow Creek example with 20 graves
- **2.0** (2025-10-06): **Complete Feature Showcase**
  - Expanded to 33 graves
  - Added 12 groups demonstrating all use cases
  - Non-rectangular grid shape (irregular boundaries)
  - 11 roads with 6 different colors/materials
  - 14 landmarks (all types)
  - Multi-group memberships
  - Cultural diversity (Chinese, Spanish, Arabic)
  - Historical span (1878-2024)
  - All occupations represented
  - Complete feature demonstration

## Support

For questions or issues with this sample file:

- Check the main StoneByStone documentation
- Review the Groups Feature documentation
- See the Grid Shape documentation
- Open an issue on GitHub

## License

This sample data is released under CC0-1.0 (Public Domain). Use it freely for testing, training, and demonstration purposes.

---

**Status**: ✅ Complete Feature Showcase  
**Last Updated**: October 6, 2025  
**Purpose**: Comprehensive demonstration of all StoneByStone features
