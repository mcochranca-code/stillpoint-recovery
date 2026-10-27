import { useEffect, useMemo, useState } from 'react';
import { Download, Share2, Sprout, X } from 'lucide-react';
import type { MeetingListing } from '../data/meetings';
import { useDialogFocus } from '../app/useDialogFocus';
import {
  buildMeetingShareCardHtml,
  buildMeetingShareText,
  safeMeetingShareAddress,
  safeMeetingShareSourceUrl,
  sanitizeMeetingShareText,
} from '../domain/meeting-sharing';
import type { MeetingShareTheme } from '../domain/meeting-sharing';
import { downloadHtmlFile, shareHtmlCard, shareOrCopy } from '../domain/sharing';
import './MeetingShareDialog.css';

interface MeetingShareDialogProps {
  meetings: readonly MeetingListing[];
  onClose: () => void;
}

const externalLinkProps = { target: '_blank', rel: 'noopener noreferrer', referrerPolicy: 'no-referrer' as const };

function readThemeColor(name: string, property: 'color' | 'background-color', fallback: string): string {
  if (typeof document === 'undefined' || !document.body) return fallback;
  const probe = document.createElement('span');
  probe.style.position = 'absolute';
  probe.style.visibility = 'hidden';
  probe.style.setProperty(property, `var(${name})`);
  document.body.append(probe);
  const value = window.getComputedStyle(probe).getPropertyValue(property).trim();
  probe.remove();
  return value || fallback;
}

function currentTheme(): MeetingShareTheme {
  return {
    ink: readThemeColor('--ink', 'color', '#193c35'),
    muted: readThemeColor('--muted', 'color', '#5c7068'),
    primary: readThemeColor('--primary', 'color', '#245444'),
    primarySoft: readThemeColor('--primary-soft', 'background-color', '#e7eee7'),
    surface: readThemeColor('--surface', 'background-color', '#fffefa'),
    canvas: readThemeColor('--canvas', 'background-color', '#f7f4ea'),
    border: readThemeColor('--border', 'background-color', '#d6ded7'),
    sage: readThemeColor('--sage', 'color', '#8eaf93'),
    gold: readThemeColor('--gold', 'color', '#d3a34a'),
  };
}

function listedLocality(meeting: MeetingListing): string {
  return [meeting.city, meeting.county].map((value) => sanitizeMeetingShareText(value)).filter(Boolean).join(', ');
}

function modeLabel(meeting: MeetingListing): string {
  const labelled = sanitizeMeetingShareText(meeting.modalityLabel);
  if (labelled) return labelled;
  return meeting.mode === 'in-person' ? 'In person' : meeting.mode === 'hybrid' ? 'Hybrid' : 'Online';
}

/** Preview exactly the user-selected public schedule details before sharing. */
export function MeetingShareDialog({ meetings, onClose }: MeetingShareDialogProps) {
  const isOpen = meetings.length > 0;
  const dialogRef = useDialogFocus<HTMLElement>(isOpen, onClose);
  const [status, setStatus] = useState('');
  const theme = useMemo(currentTheme, []);
  const cardHtml = useMemo(() => buildMeetingShareCardHtml(meetings, theme), [meetings, theme]);
  const textPayload = useMemo(() => buildMeetingShareText(meetings), [meetings]);
  const selectedKey = meetings.map((meeting) => meeting.id).join('|');

  useEffect(() => { setStatus(''); }, [selectedKey]);

  async function shareCard() {
    const result = await shareHtmlCard(cardHtml, 'stillpoint-meeting-card.html', 'Stillpoint Recovery meeting card');
    if (result === 'shared') setStatus('The branded card was handed to your device share sheet. Stillpoint did not upload it.');
    else if (result === 'cancelled') setStatus('Sharing canceled. Nothing was sent or downloaded.');
    else {
      downloadHtmlFile('stillpoint-meeting-card.html', cardHtml);
      setStatus('File sharing is unavailable here, so the standalone card was downloaded to this device. Nothing was sent.');
    }
  }

  function downloadCard() {
    downloadHtmlFile('stillpoint-meeting-card.html', cardHtml);
    setStatus('The standalone branded HTML card was downloaded locally. Nothing was sent.');
  }

  async function shareText() {
    const result = await shareOrCopy({ title: 'Stillpoint Recovery meeting details', text: textPayload });
    if (result === 'shared') setStatus('Only the meeting details shown in the preview were handed to your device share sheet.');
    else if (result === 'copied') setStatus('The meeting details were copied to this device’s clipboard.');
    else if (result === 'cancelled') setStatus('Sharing canceled. Nothing was sent.');
    else setStatus('Native sharing and clipboard are unavailable in this browser. You can download the card instead.');
  }

  if (!isOpen) return null;

  return (
    <div className="dialog-backdrop share-dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="meeting-share-title"
        className="dialog-card share-dialog-card meeting-share-dialog"
      >
        <div className="card-header">
          <div><p className="eyebrow">Nothing leaves unless you choose</p><h2 id="meeting-share-title">Share selected meeting{meetings.length === 1 ? '' : 's'}</h2></div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close meeting share preview"><X size={18} aria-hidden="true" /></button>
        </div>
        <p className="muted">Review the card before sharing. It includes only these selected public schedule details—not your recovery records, search filters, attendance or location. Join links and credentials are intentionally omitted.</p>

        <section className="meeting-share-card-preview" aria-labelledby="meeting-share-preview-title">
          <div className="meeting-share-brand">
            <span className="meeting-share-mark" aria-hidden="true"><Sprout size={21} /></span>
            <span><strong>Stillpoint</strong><small>RECOVERY</small></span>
          </div>
          <div className="meeting-share-preview-heading">
            <p className="eyebrow">Local peer support</p>
            <h3 id="meeting-share-preview-title">{meetings.length === 1 ? 'A meeting to share' : `${meetings.length} meetings to share`}</h3>
          </div>
          <ul className="meeting-share-preview-list" aria-label="Selected meeting details">
            {meetings.map((meeting) => {
              const sourceUrl = safeMeetingShareSourceUrl(meeting.sourceUrl);
              const sourceTitle = sanitizeMeetingShareText(meeting.sourceTitle) || 'Official meeting source';
              const fellowshipLabel = sanitizeMeetingShareText(meeting.fellowshipLabel) || meeting.fellowship;
              const dayTime = [sanitizeMeetingShareText(meeting.dayName), sanitizeMeetingShareText(meeting.time)].filter(Boolean).join(' · ');
              const address = safeMeetingShareAddress(meeting.address);
              const scope = sanitizeMeetingShareText(meeting.scopeNote);
              const timeZone = sanitizeMeetingShareText(meeting.timeZoneNote);
              const checkedAt = sanitizeMeetingShareText(meeting.checkedAt);
              return (
                <li key={meeting.id}>
                  <article className="meeting-listing meeting-share-preview-listing" aria-label={`${sanitizeMeetingShareText(meeting.name)} share preview`}>
                    <div className="meeting-listing-top"><span className={`meeting-fellowship-badge ${meeting.fellowship.toLowerCase()}`}>{fellowshipLabel}</span><span>{modeLabel(meeting)} · {dayTime}</span></div>
                    <h3>{sanitizeMeetingShareText(meeting.name) || 'Peer-support meeting'}</h3>
                    {listedLocality(meeting) && <p className="meeting-format"><strong>Listed community:</strong> {listedLocality(meeting)}</p>}
                    {address && <p className="meeting-format"><strong>Address / access:</strong> {address}</p>}
                    {scope && <p className="meeting-format"><strong>Host city / directory scope:</strong> {scope}</p>}
                    {timeZone && <p className="meeting-format"><strong>Timezone / time note:</strong> {timeZone}</p>}
                    {checkedAt && <p className="meeting-format"><strong>Snapshot checked:</strong> {checkedAt}</p>}
                    <p className="meeting-format"><strong>Source:</strong> {sourceUrl ? <a href={sourceUrl} {...externalLinkProps}>{sourceTitle}</a> : sourceTitle}</p>
                  </article>
                </li>
              );
            })}
          </ul>
          <p className="meeting-share-note"><strong>Stillpoint Recovery</strong> · Schedule snapshots may be partial or outdated. Confirm time, venue and access with the official source before attending. Join links and credentials are not included.</p>
        </section>

        <p className="fine-print">The selection exists temporarily on this screen and is not saved to your recovery records. Nothing is shared until you choose a share action. The standalone card is an HTML file you can open, save or screenshot on your phone.</p>
        <div className="action-row share-dialog-actions meeting-share-actions">
          <button className="button button-primary" type="button" onClick={() => void shareCard()}><Share2 size={16} aria-hidden="true" /> Share card</button>
          <button className="button button-secondary" type="button" onClick={downloadCard}><Download size={16} aria-hidden="true" /> Download card</button>
          <button className="button button-secondary" type="button" onClick={() => void shareText()}><Share2 size={16} aria-hidden="true" /> Share text</button>
          <button className="button button-quiet" type="button" onClick={onClose}>Close</button>
        </div>
        <p className="share-status" role="status" aria-live="polite">{status}</p>
      </section>
    </div>
  );
}
