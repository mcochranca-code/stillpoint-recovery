import { useEffect, useState } from 'react';
import { Download, Share2, Sprout, X } from 'lucide-react';
import { useDialogFocus } from '../app/useDialogFocus';
import { buildMilestoneCardHtml, buildMilestoneShareText, downloadHtmlFile, downloadTextFile, shareHtmlCard, shareOrCopy } from '../domain/sharing';

export interface MilestoneShareTarget {
  id: string;
  label: string;
  dateLabel: string;
}

interface MilestoneShareDialogProps {
  milestone: MilestoneShareTarget | null;
  onClose: () => void;
}

/** Let the user preview and explicitly choose milestone details to share. */
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

  const shareOptions = milestone ? { message, label: milestone.label, dateLabel: milestone.dateLabel, includeLabel, includeDate } : null;
  const preview = shareOptions ? buildMilestoneShareText(shareOptions) : '';
  const cardHtml = shareOptions ? buildMilestoneCardHtml(shareOptions) : '';
  const cardTitle = includeLabel && milestone ? milestone.label.trim() : 'A moment worth keeping';

  async function sharePreview() {
    if (!milestone) return;
    const result = await shareOrCopy({ title: 'A Stillpoint milestone', text: preview });
    if (result === 'shared') setStatus('Your preview was handed to the device share sheet. No other information was included.');
    else if (result === 'copied') setStatus('The preview text was copied. Only the text shown above was included.');
    else if (result === 'cancelled') setStatus('Sharing canceled. Nothing was sent.');
    else setStatus('Native sharing and clipboard are unavailable. You can download the preview text instead.');
  }

  async function shareCard() {
    if (!milestone) return;
    const result = await shareHtmlCard(cardHtml);
    if (result === 'shared') setStatus('The Stillpoint HTML card was shared as a file. It contains only your message and any details you selected.');
    else if (result === 'cancelled') setStatus('Card sharing canceled. Nothing was sent or downloaded.');
    else {
      downloadHtmlFile('stillpoint-milestone-card.html', cardHtml);
      setStatus('This browser cannot share HTML files, so the card was downloaded locally instead. Nothing was sent.');
    }
  }

  function downloadCard() {
    if (!milestone) return;
    downloadHtmlFile('stillpoint-milestone-card.html', cardHtml);
    setStatus('A self-contained HTML card was prepared as a local download.');
  }

  function downloadPreview() {
    if (!milestone) return;
    downloadTextFile('stillpoint-milestone-preview.txt', preview);
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
        <section className="virtual-card-section" aria-labelledby="virtual-card-preview-heading">
          <div className="share-preview-heading"><p className="eyebrow" id="virtual-card-preview-heading">Virtual card preview</p><span>Private until you share or download</span></div>
          <article className="virtual-card-preview" aria-label="Stillpoint virtual milestone card preview">
            <div className="virtual-card-sun" aria-hidden="true" />
            <svg className="virtual-card-landscape" viewBox="0 0 620 280" preserveAspectRatio="none" aria-hidden="true"><path d="M0 142 Q122 44 246 122 T484 92 T740 110 V320 H0Z" fill="#c8d9c9" /><path d="M-40 188 Q106 92 226 168 T474 144 T720 172 V320 H-40Z" fill="#8eaf93" /><path d="M-24 226 Q128 156 259 213 T488 192 T720 220 V320 H-24Z" fill="#315f4b" /></svg>
            <div className="virtual-card-brand"><span className="virtual-card-mark"><Sprout size={22} aria-hidden="true" /></span><span><strong>Stillpoint</strong><small>RECOVERY</small></span></div>
            <div className="virtual-card-content"><p className="virtual-card-eyebrow">One day at a time</p><h3>{cardTitle}</h3><p className="virtual-card-message">{message.trim() || 'One day at a time, and this step is enough.'}</p>{includeDate && <p className="virtual-card-date">{milestone.dateLabel}</p>}</div>
            <div className="virtual-card-footer"><span>Your progress is yours.</span><span>Stillpoint Recovery</span></div>
          </article>
          <p className="fine-print">The HTML card is a standalone file with inline artwork and styling. It contains only the message and the optional details you select.</p>
        </section>
        <div className="share-preview" aria-label="Exact text-share preview">
          <p className="eyebrow">Text-only preview</p>
          <p>{preview || 'Add a short message to continue.'}</p>
        </div>
        <div className="action-row share-dialog-actions">
          <button className="button button-primary" type="button" onClick={() => void shareCard()} disabled={!preview.trim()}><Share2 size={16} /> Share HTML card</button>
          <button className="button button-secondary" type="button" onClick={downloadCard} disabled={!preview.trim()}><Download size={16} /> Download .html</button>
          <button className="button button-secondary" type="button" onClick={() => void sharePreview()} disabled={!preview.trim()}><Share2 size={16} /> Share text</button>
          <button className="button button-secondary" type="button" onClick={downloadPreview} disabled={!preview.trim()}><Download size={16} /> Download .txt</button>
          <button className="button button-quiet" type="button" onClick={onClose}>Cancel</button>
        </div>
        <p className="fine-print">Exact milestone names and dates are excluded until you select them. The app does not post automatically.</p>
        <p className="share-status" role="status">{status}</p>
      </section>
    </div>
  );
}
