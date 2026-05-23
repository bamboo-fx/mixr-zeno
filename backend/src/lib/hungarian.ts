/**
 * Hungarian algorithm for optimal assignment (maximization).
 * scoreMatrix[i][j] = score for pairing worker i with job j.
 * Returns assignment[i] = j meaning worker i is assigned to job j.
 * Handles non-square matrices by padding with zeros.
 *
 * Internally uses a flat 1-D array to avoid noUncheckedIndexedAccess issues.
 */
export function hungarian(scoreMatrix: number[][]): number[] {
  const rows = scoreMatrix.length;
  if (rows === 0) return [];

  const cols = scoreMatrix[0]?.length ?? 0;
  if (cols === 0) return new Array<number>(rows).fill(-1);

  const size = Math.max(rows, cols);

  // Compute max value for cost conversion (maximisation -> minimisation)
  let maxVal = 0;
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const v = scoreMatrix[i]?.[j] ?? 0;
      if (v > maxVal) maxVal = v;
    }
  }

  // Build flat cost matrix (size x size), padding extra cells with 0 cost
  const cost = new Float64Array(size * size);
  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      const raw = i < rows && j < cols ? (scoreMatrix[i]?.[j] ?? 0) : 0;
      cost[i * size + j] = maxVal - raw;
    }
  }

  const get = (i: number, j: number): number => cost[i * size + j] ?? 0;
  const set = (i: number, j: number, v: number): void => { cost[i * size + j] = v; };

  // Step 1: Subtract row minimums
  for (let i = 0; i < size; i++) {
    let rowMin = Infinity;
    for (let j = 0; j < size; j++) {
      const v = get(i, j);
      if (v < rowMin) rowMin = v;
    }
    for (let j = 0; j < size; j++) {
      set(i, j, get(i, j) - rowMin);
    }
  }

  // Step 2: Subtract column minimums
  for (let j = 0; j < size; j++) {
    let colMin = Infinity;
    for (let i = 0; i < size; i++) {
      const v = get(i, j);
      if (v < colMin) colMin = v;
    }
    for (let i = 0; i < size; i++) {
      set(i, j, get(i, j) - colMin);
    }
  }

  // Iteratively reduce until a complete assignment is found
  for (let iteration = 0; iteration < size * 3; iteration++) {
    // Try to find a complete assignment with augmenting paths
    const rowAssignment = new Int32Array(size).fill(-1);
    const colToRow = new Int32Array(size).fill(-1);

    for (let i = 0; i < size; i++) {
      const visited = new Uint8Array(size);
      augment(i, get, rowAssignment, colToRow, visited, size);
    }

    // Check completeness
    let complete = true;
    for (let i = 0; i < size; i++) {
      if (rowAssignment[i] === -1) { complete = false; break; }
    }
    if (complete) {
      return Array.from(rowAssignment.slice(0, rows)).map((j) => (j >= cols ? -1 : j));
    }

    // Find minimum cover via König's theorem
    const coveredRows = new Uint8Array(size); // 1 = covered
    const coveredCols = new Uint8Array(size); // 1 = covered
    const markedRows = new Uint8Array(size);  // 1 = marked (uncovered side)

    // Mark rows that are unassigned
    for (let i = 0; i < size; i++) {
      if (rowAssignment[i] === -1) markedRows[i] = 1;
    }

    // Propagate: marked row -> zero-columns -> assigned rows
    let changed = true;
    while (changed) {
      changed = false;
      for (let i = 0; i < size; i++) {
        if (!markedRows[i]) continue;
        for (let j = 0; j < size; j++) {
          if (!coveredCols[j] && get(i, j) === 0) {
            coveredCols[j] = 1;
            changed = true;
          }
        }
      }
      for (let j = 0; j < size; j++) {
        if (!coveredCols[j]) continue;
        for (let i = 0; i < size; i++) {
          if (rowAssignment[i] === j && !markedRows[i]) {
            markedRows[i] = 1;
            changed = true;
          }
        }
      }
    }

    // Cover lines: rows NOT marked, cols marked
    for (let i = 0; i < size; i++) coveredRows[i] = markedRows[i] ? 0 : 1;

    // Find minimum uncovered value
    let minVal = Infinity;
    for (let i = 0; i < size; i++) {
      if (coveredRows[i]) continue;
      for (let j = 0; j < size; j++) {
        if (coveredCols[j]) continue;
        const v = get(i, j);
        if (v < minVal) minVal = v;
      }
    }

    if (minVal === Infinity || minVal === 0) break;

    // Adjust: subtract from uncovered, add to doubly-covered
    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        if (!coveredRows[i] && !coveredCols[j]) {
          set(i, j, get(i, j) - minVal);
        } else if (coveredRows[i] && coveredCols[j]) {
          set(i, j, get(i, j) + minVal);
        }
      }
    }
  }

  // Final pass — best effort assignment
  const finalRowAssignment = new Int32Array(size).fill(-1);
  const finalColToRow = new Int32Array(size).fill(-1);
  for (let i = 0; i < size; i++) {
    const visited = new Uint8Array(size);
    augment(i, get, finalRowAssignment, finalColToRow, visited, size);
  }

  return Array.from(finalRowAssignment.slice(0, rows)).map((j) => (j >= cols ? -1 : j));
}

function augment(
  i: number,
  get: (i: number, j: number) => number,
  rowAssignment: Int32Array,
  colToRow: Int32Array,
  visited: Uint8Array,
  size: number,
): boolean {
  for (let j = 0; j < size; j++) {
    if (get(i, j) !== 0 || visited[j]) continue;
    visited[j] = 1;
    const occupant = colToRow[j] ?? -1;
    if (occupant === -1 || augment(occupant, get, rowAssignment, colToRow, visited, size)) {
      rowAssignment[i] = j;
      colToRow[j] = i;
      return true;
    }
  }
  return false;
}
