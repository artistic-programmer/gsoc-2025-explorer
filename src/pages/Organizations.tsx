import { useApp } from '../state/store';
import { Notice, PageTitle } from '../components/ui';
import { OrgTable } from './shared';

export default function Organizations() {
  const { records, allRecords, mapping } = useApp();
  return (
    <div className="space-y-4">
      <PageTitle title="Organizations" subtitle={`${records.length} of ${allRecords.length} organizations match the current filters. Click a row for the detail panel (original CSV values, matched category tags, links).`} />
      {!mapping.metrics.length && (
        <Notice title="No contributor / repository metrics in this CSV">
          Columns such as stars, forks or accepted contributors are shown automatically when a numeric column with a matching name exists. None was detected here.
        </Notice>
      )}
      <div className="card p-3">
        <OrgTable records={records} pageSize={20} exportName="organizations-filtered" />
      </div>
    </div>
  );
}
