import { useMemo } from 'react';

import { CalculatedColumn } from '../types';
import { getColumnMetrics, getHorizontalRangeToRender, getViewportColumns } from '../utils';
import { DataGridProps } from '../DataGrid';
import { SELECT_COLUMN_KEY } from '../Columns';

type SharedDataGridProps<R, K extends keyof R, SR> =
  Pick<DataGridProps<R, K, SR>, 'columns'> &
  Required<Required<Pick<DataGridProps<R, K, SR>, | 'minColumnWidth' | 'defaultFormatter'>>>;

interface ViewportColumnsArgs<R, K extends keyof R, SR> extends SharedDataGridProps<R, K, SR> {
  viewportWidth: number;
  scrollLeft: number;
  columnWidths: ReadonlyMap<string, number>;
  groupBy?: readonly string[];
}

export function useViewportColumns<R, K extends keyof R, SR>({
  columns: rawColumns,
  minColumnWidth,
  columnWidths,
  viewportWidth,
  defaultFormatter,
  scrollLeft,
  groupBy
}: ViewportColumnsArgs<R, K, SR>) {
  rawColumns = useMemo(() => {
    if (!groupBy || groupBy.length === 0) return rawColumns;

    const selectColumn = rawColumns.find(c => c.key === SELECT_COLUMN_KEY);
    const groupByColumns = rawColumns
      .filter(c => groupBy.includes(c.key))
      .map(c => ({ ...c, frozen: true, rowGroup: true }))
      .sort((c1, c2) => groupBy.findIndex(k => k === c1.key) - groupBy.findIndex(k => k === c2.key));
    const remaningColumns = rawColumns.filter(c => !groupBy.includes(c.key) && c.key !== SELECT_COLUMN_KEY);
    const sortedColumns = [
      ...groupByColumns,
      ...remaningColumns
    ];

    if (selectColumn) {
      sortedColumns.unshift(selectColumn);
    }

    return sortedColumns;
  }, [groupBy, rawColumns]);

  const { columns, lastFrozenColumnIndex, totalColumnWidth } = useMemo(() => {
    return getColumnMetrics<R, SR>({
      columns: rawColumns,
      minColumnWidth,
      viewportWidth,
      columnWidths,
      defaultFormatter
    });
  }, [columnWidths, rawColumns, defaultFormatter, minColumnWidth, viewportWidth]);

  const [colOverscanStartIdx, colOverscanEndIdx] = useMemo((): [number, number] => {
    return getHorizontalRangeToRender(
      columns,
      lastFrozenColumnIndex,
      viewportWidth,
      scrollLeft
    );
  }, [scrollLeft, columns, lastFrozenColumnIndex, viewportWidth]);

  const viewportColumns = useMemo((): readonly CalculatedColumn<R, SR>[] => {
    return getViewportColumns(
      columns,
      colOverscanStartIdx,
      colOverscanEndIdx
    );
  }, [colOverscanEndIdx, colOverscanStartIdx, columns]);

  return { columns, viewportColumns, totalColumnWidth, lastFrozenColumnIndex };
}