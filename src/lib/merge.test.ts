import { mergeCemeteryData, detectSpatialConflicts } from './merge';
import type { CemeteryData, Grave } from '../types/cemetery';

describe('mergeCemeteryData', () => {
  const baseCemetery = {
    id: 'test-cem',
    name: 'Test Cemetery',
    grid: { rows: 10, cols: 10 },
    last_modified: '2024-01-01T00:00:00.000Z',
    modified_by: 'Alice',
  };

  const baseData: CemeteryData = {
    schema_version: '1.0.0',
    cemetery: baseCemetery,
    graves: [],
    change_log: [],
  };

  it('should add incoming new grave', () => {
    const local: CemeteryData = {
      ...baseData,
      graves: [
        {
          uuid: 'local-1',
          plot: 'A1',
          grid: { row: 0, col: 0 },
          properties: {
            name: 'John Doe',
            last_modified: '2024-01-01T10:00:00.000Z',
            modified_by: 'Alice',
          },
        },
      ],
    };

    const incoming: CemeteryData = {
      ...baseData,
      graves: [
        ...local.graves,
        {
          uuid: 'incoming-1',
          plot: 'A2',
          grid: { row: 0, col: 1 },
          properties: {
            name: 'Jane Smith',
            last_modified: '2024-01-01T11:00:00.000Z',
            modified_by: 'Bob',
          },
        },
      ],
    };

    const result = mergeCemeteryData(local, incoming);

    expect(result.added.length).toBe(1);
    expect(result.added[0].uuid).toBe('incoming-1');
    expect(result.updated.length).toBe(0);
    expect(result.conflicts.length).toBe(0);
  });

  it('should merge non-conflicting field changes', () => {
    const local: CemeteryData = {
      ...baseData,
      graves: [
        {
          uuid: 'grave-1',
          plot: 'A1',
          grid: { row: 0, col: 0 },
          properties: {
            name: 'John Doe',
            birth: '1920-01-01',
            last_modified: '2024-01-01T10:00:00.000Z',
            modified_by: 'Alice',
          },
        },
      ],
    };

    const incoming: CemeteryData = {
      ...baseData,
      graves: [
        {
          uuid: 'grave-1',
          plot: 'A1',
          grid: { row: 0, col: 0 },
          properties: {
            name: 'John Doe',
            birth: '1920-01-01',
            death: '2000-12-31', // Added death date
            last_modified: '2024-01-01T11:00:00.000Z',
            modified_by: 'Bob',
          },
        },
      ],
    };

    const result = mergeCemeteryData(local, incoming);

    expect(result.added.length).toBe(0);
    expect(result.updated.length).toBe(1);
    expect(result.updated[0].properties.death).toBe('2000-12-31');
    expect(result.conflicts.length).toBe(0);
  });

  it('should resolve conflicting field with LWW picking incoming', () => {
    const local: CemeteryData = {
      ...baseData,
      graves: [
        {
          uuid: 'grave-1',
          plot: 'A1',
          grid: { row: 0, col: 0 },
          properties: {
            name: 'John Doe',
            inscription: 'Beloved Father',
            last_modified: '2024-01-01T10:00:00.000Z',
            modified_by: 'Alice',
          },
        },
      ],
    };

    const incoming: CemeteryData = {
      ...baseData,
      graves: [
        {
          uuid: 'grave-1',
          plot: 'A1',
          grid: { row: 0, col: 0 },
          properties: {
            name: 'John Doe',
            inscription: 'Beloved Husband and Father',
            last_modified: '2024-01-01T11:00:00.000Z', // Later timestamp
            modified_by: 'Bob',
          },
        },
      ],
    };

    const result = mergeCemeteryData(local, incoming);

    expect(result.added.length).toBe(0);
    expect(result.updated.length).toBe(1);
    expect(result.updated[0].properties.inscription).toBe(
      'Beloved Husband and Father'
    );
    expect(result.conflicts.length).toBe(0);
  });

  it('should resolve deletion vs edit by timestamp', () => {
    const local: CemeteryData = {
      ...baseData,
      graves: [
        {
          uuid: 'grave-1',
          plot: 'A1',
          grid: { row: 0, col: 0 },
          properties: {
            name: 'John Doe',
            inscription: 'Updated inscription',
            last_modified: '2024-01-01T10:00:00.000Z',
            modified_by: 'Alice',
          },
        },
      ],
    };

    const incoming: CemeteryData = {
      ...baseData,
      graves: [
        {
          uuid: 'grave-1',
          plot: 'A1',
          grid: { row: 0, col: 0 },
          properties: {
            name: 'John Doe',
            deleted: true,
            last_modified: '2024-01-01T11:00:00.000Z', // Later - deletion wins
            modified_by: 'Bob',
          },
        },
      ],
    };

    const result = mergeCemeteryData(local, incoming);

    expect(result.updated.length).toBe(1);
    expect(result.updated[0].properties.deleted).toBe(true);
  });

  it('should create conflict when timestamps are identical', () => {
    const timestamp = '2024-01-01T10:00:00.000Z';

    const local: CemeteryData = {
      ...baseData,
      graves: [
        {
          uuid: 'grave-1',
          plot: 'A1',
          grid: { row: 0, col: 0 },
          properties: {
            name: 'John Doe',
            inscription: 'Local inscription',
            last_modified: timestamp,
            modified_by: 'Alice',
          },
        },
      ],
    };

    const incoming: CemeteryData = {
      ...baseData,
      graves: [
        {
          uuid: 'grave-1',
          plot: 'A1',
          grid: { row: 0, col: 0 },
          properties: {
            name: 'John Doe',
            inscription: 'Incoming inscription',
            last_modified: timestamp, // Same timestamp
            modified_by: 'Bob',
          },
        },
      ],
    };

    const result = mergeCemeteryData(local, incoming);

    expect(result.conflicts.length).toBeGreaterThan(0);
    const inscriptionConflict = result.conflicts.find(
      (c) => c.field === 'properties.inscription'
    );
    expect(inscriptionConflict).toBeDefined();
    expect(inscriptionConflict?.localValue).toBe('Local inscription');
    expect(inscriptionConflict?.incomingValue).toBe('Incoming inscription');
  });
});

describe('detectSpatialConflicts', () => {
  it('should detect graves at same grid position', () => {
    const graves: Grave[] = [
      {
        uuid: 'grave-1',
        plot: 'A1',
        grid: { row: 0, col: 0 },
        properties: {
          name: 'John Doe',
          last_modified: '2024-01-01T10:00:00.000Z',
          modified_by: 'Alice',
        },
      },
      {
        uuid: 'grave-2',
        plot: 'A1-dup',
        grid: { row: 0, col: 0 }, // Same position!
        properties: {
          name: 'Jane Smith',
          last_modified: '2024-01-01T11:00:00.000Z',
          modified_by: 'Bob',
        },
      },
    ];

    const conflicts = detectSpatialConflicts(graves);

    expect(conflicts.size).toBe(1);
    const conflict = conflicts.get('0,0');
    expect(conflict?.length).toBe(2);
  });

  it('should ignore deleted graves in spatial conflicts', () => {
    const graves: Grave[] = [
      {
        uuid: 'grave-1',
        plot: 'A1',
        grid: { row: 0, col: 0 },
        properties: {
          name: 'John Doe',
          deleted: true,
          last_modified: '2024-01-01T10:00:00.000Z',
          modified_by: 'Alice',
        },
      },
      {
        uuid: 'grave-2',
        plot: 'A2',
        grid: { row: 0, col: 0 },
        properties: {
          name: 'Jane Smith',
          last_modified: '2024-01-01T11:00:00.000Z',
          modified_by: 'Bob',
        },
      },
    ];

    const conflicts = detectSpatialConflicts(graves);

    expect(conflicts.size).toBe(0);
  });
});
