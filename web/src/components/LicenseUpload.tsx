import { useState } from 'react';
import type { LicenseInfo } from '@narrasync/shared';

interface Props {
  accept: string;
  submitLabel: string;
  busy?: boolean;
  onSubmit(file: File, license: LicenseInfo): void | Promise<void>;
  onCancel(): void;
}

/** File picker + provenance fields (source, license, commercial use) stored with every upload. */
export function LicenseUpload({ accept, submitLabel, busy, onSubmit, onCancel }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [source, setSource] = useState('');
  const [license, setLicense] = useState('');
  const [commercial, setCommercial] = useState(false);

  return (
    <form
      className="upload-form"
      onSubmit={(e) => {
        e.preventDefault();
        if (file) void onSubmit(file, { source, license, commercial });
      }}
    >
      <input type="file" accept={accept} onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      <input placeholder="Sumber (mis. rekaman sendiri, URL)" value={source} onChange={(e) => setSource(e.target.value)} />
      <input placeholder="Lisensi (mis. CC0, berbayar)" value={license} onChange={(e) => setLicense(e.target.value)} />
      <label className="check">
        <input type="checkbox" checked={commercial} onChange={(e) => setCommercial(e.target.checked)} />
        Boleh dipakai komersial
      </label>
      <div className="row">
        <button type="submit" className="btn btn--primary" disabled={!file || busy}>
          {busy ? 'Mengupload…' : submitLabel}
        </button>
        <button type="button" className="btn btn--ghost" onClick={onCancel}>
          Batal
        </button>
      </div>
    </form>
  );
}
