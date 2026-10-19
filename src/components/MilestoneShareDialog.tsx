import { useEffect, useMemo, useState } from 'react';
import { Download, Share2, X } from 'lucide-react';
import { useDialogFocus } from '../app/useDialogFocus';
import { buildMilestoneShareText, downloadTextFile, shareOrCopy } from '../domain/sharing';

export interface MilestoneShareTarget {
  id: string;
  label: string;
  dateLabel: string;
}

interface MilestoneShareDialogProps {
  milestone: MilestoneShareTarget | null;
  onClose: () => void;
}

export function MilestoneShareDialog({ milestone, onClose }: MilestoneShareDialogProps) {
  const dialogRef = useDialogFocus<HTMLElement>(Boolean(milestone), onClose);
  const [message, setMessage] = useState('A milestone I am glad to have reached.');
  const [includeLabel, setIncludeLabel] = useState(false);
  const [includeDate, setIncludeDate] = useState(false);
  const [status, setStatus] = useState('');

  useEffect(() => {
    setMessage('A milestone I am glad to have reached.');
    setIncludeLabel(false);
    setIncludeDate(false);
    setStatus('');
  }, [milestone?.id]);

  const preview = useMemo(() => milestone ? buildMilestoneShareText({
    message,
    label: milestone.label,
    dateLabel: milestone.dateLabel,
    includeLabel,
    includeDate,
  }) : '', [milestone, message, includeLabel, includeDate]);

  async function sharePreview() {
    if (!milestone) return;
    const result = await shareOrCopy({ title: 'A Stillpoint milestone', text: preview });
    if (result === 'shared') setStatus('Your preview was handed to the device share sheet. No other information was included.');
    else if (result === 'copied') setStatus('The preview text was copied. Only the text shown above was included.');
    else if (result === 'cancelled') setStatus('Sharing canceled. Nothing was sent.');
    else setStatus('Native sharing and clipboard are unavailable. You can download the preview text instead.');
  }

  function downloadPreview() {
    if (!milestone) return;
    downloadTextFile(`stillpoint-${milestone.id}-milestone.txt`, preview);
    setStatus('The preview text was prepared as a local download.');
  }

  if (!milestone) return null;

  return (
    <div className="dialog-backdrop share-dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="milestone-share-title" className="dialog-card share-dialog-card">
        <div className="card-header">
          <div><p className="eyebrow">Nothing leaves unless you choose</p><h2 id="milestone-share-title">Share a milestone</h2></div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close milestone share preview"><X size={18} /></button>
        </div>
        <p className="muted">Only the preview below can be shared or downloaded. Journals, contacts and private recovery details are never included.</p>
        <label className="field-label" htmlFor="milestone-share-message">Your message</label>
        <textarea id="milestone-share-message" rows={3} maxLength={280} value={message} onChange={(event) => setMessage(event.target.value)} />
        <fieldset className="share-options">
          <legend>Optional details</legend>
          <label className="toggle-row"><span><strong>Include milestone name</strong><small>{milestone.label}</small></span><input type="checkbox" checked={includeLabel} onChange={(event) => setIncludeLabel(event.target.checked)} /></label>
          <label className="toggle-row"><span><strong>Include reached date</strong><small>{milestone.dateLabel} · off by default</small></span><input type="checkbox" checked={includeDate} onChange={(event) => setIncludeDate(event.target.checked)} /></label>
        </fieldset>
        <div className="share-preview" aria-label="Exact share preview">
          <p className="eyebrow">Preview</p>
          <p>{preview || 'Add a short message to continue.'}</p>
        </div>
        <div className="action-row share-dialog-actions">
          <button className="button button-primary" type="button" onClick={() => void sharePreview()} disabled={!preview.trim()}><Share2 size={16} /> Share preview</button>
          <button className="button button-secondary" type="button" onClick={downloadPreview} disabled={!preview.trim()}><Download size={16} /> Download .txt</button>
          <button className="button button-quiet" type="button" onClick={onClose}>Cancel</button>
        </div>
        <p className="fine-print">Exact milestone dates and names are excluded until you select them. The app does not post automatically.</p>
        <p className="share-status" role="status">{status}</p>
      </section>
    </div>
  );
}
