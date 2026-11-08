import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Flag, MessageCircle, Send, Trash2 } from 'lucide-react';
import { useAppContext } from '../../app/AppContext';
import { db } from '../../db/database';
import type { CommunityCommentCredential } from '../../domain/types';
import {
  COMMUNITY_NOTES_BOARD_KEY,
  countCommentCharacters,
  deleteCommunityComment,
  fetchReadingComments,
  getCommunityBrowserToken,
  reportReadingComment,
  saveCommunityCredential,
  submitReadingComment,
  CommunityResponseError,
  type PublicCommunityComment,
} from '../../domain/communityClient';

interface CommunityDiscussionProps {
  date?: string;
  reflectionId?: string;
  mode?: 'reflection' | 'board';
}

function makeToken(): string {
  return window.crypto.randomUUID();
}

export function CommunityDiscussion({ date, reflectionId, mode = 'reflection' }: CommunityDiscussionProps) {
  const isBoard = mode === 'board';
  const { notify } = useAppContext();
  const readingKey = isBoard
    ? COMMUNITY_NOTES_BOARD_KEY
    : `stillpoint:${date ?? ''}:${reflectionId ?? ''}`;
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState<PublicCommunityComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [text, setText] = useState('');
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const storedCredentials = useLiveQuery(() => db.communityCredentials.toArray(), []);
  const credentials = useMemo(() => new Map((storedCredentials ?? []).map((item) => [item.id, item])), [storedCredentials]);
  const textLength = countCommentCharacters(text);

  async function loadComments(showStatus = false) {
    setLoading(true);
    setError('');
    try {
      setComments(await fetchReadingComments(readingKey));
      setLoaded(true);
      if (showStatus) setStatus('Community notes are refreshed.');
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Community notes are temporarily unavailable.');
    } finally {
      setLoading(false);
    }
  }

  async function toggleDiscussion() {
    if (open) { setOpen(false); return; }
    setOpen(true);
    if (!loaded) await loadComments();
  }

  async function postComment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setStatus('');
    if (!consent) { setError('Please confirm you understand the note will be public and hosted before posting.'); return; }
    if (!text.trim() || textLength > 120) { setError('Write a note of 1–120 characters.'); return; }
    const browserToken = getCommunityBrowserToken();
    if (!browserToken) { setError('This browser could not save the private removal key. Enable site storage before posting.'); return; }

    const commentId = makeToken();
    const deletionToken = makeToken();
    const credential: CommunityCommentCredential = {
      id: commentId,
      readingKey,
      text: text.trim(),
      createdAt: new Date().toISOString(),
      deletionToken,
    };
    setBusy(true);
    try {
      // Keep the removal capability on-device before any hosted request is made.
      await saveCommunityCredential(credential);
      let posted: PublicCommunityComment;
      try {
        posted = await submitReadingComment({ commentId, readingKey, text: text.trim(), browserToken, deletionToken });
      } catch (postError) {
        if (postError instanceof CommunityResponseError) await db.communityCredentials.delete(commentId);
        throw postError;
      }
      const savedCredential = { ...credential, text: posted.text, createdAt: posted.createdAt };
      await saveCommunityCredential(savedCredential);
      setComments((current) => [...current, posted]);
      setText('');
      setConsent(false);
      setStatus(isBoard ? 'Your short note is now visible on the Community Notes board.' : 'Your short note is now visible with this original reading.');
      notify(isBoard ? 'Your community note was posted.' : 'Your optional community note was posted.');
    } catch (postError) {
      setError(postError instanceof CommunityResponseError ? postError.message : 'We could not confirm that your note was posted. Your private removal key was kept on this device; check the thread before trying again.');
    } finally {
      setBusy(false);
    }
  }

  async function reportComment(comment: PublicCommunityComment) {
    const browserToken = getCommunityBrowserToken();
    if (!browserToken) { setError('This browser could not save its private report limit.'); return; }
    setError('');
    setStatus('');
    try {
      setStatus(await reportReadingComment(comment.id, browserToken));
      await loadComments();
    } catch (reportError) {
      setError(reportError instanceof Error ? reportError.message : 'The report could not be submitted.');
    }
  }

  async function deleteComment(comment: PublicCommunityComment, credential: CommunityCommentCredential) {
    if (!window.confirm('Delete this public community note? The note will be removed from Stillpoint.')) return;
    setBusy(true);
    setError('');
    setStatus('');
    try {
      await deleteCommunityComment(credential);
      setComments((current) => current.filter((item) => item.id !== comment.id));
      setStatus('Your community note was deleted.');
      notify('Your community note was deleted from Stillpoint.');
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'The note could not be deleted right now.');
    } finally {
      setBusy(false);
    }
  }

  const sectionClass = `community-discussion${isBoard ? ' community-discussion--standalone' : ''}`;
  const threadLabel = isBoard ? 'Public notes on the Community Notes board' : 'Public notes for this reading';

  return (
    <section className={sectionClass} aria-labelledby="community-discussion-title">
      <div className="community-heading">
        <div>
          <p className="eyebrow">{isBoard ? 'Separate shared board' : 'Optional, shared space'}</p>
          <h3 id="community-discussion-title"><MessageCircle size={17} aria-hidden="true" /> {isBoard ? 'Community Notes board' : 'Community notes'}</h3>
          <p>{isBoard ? 'A shared space for short notes, separate from any single Stillpoint reflection.' : 'Short, account-free thoughts on this original Stillpoint reading. Posting is optional.'}</p>
        </div>
        <button className="button button-secondary button-small" type="button" aria-expanded={open} onClick={() => void toggleDiscussion()}>
          {open ? (isBoard ? 'Close board' : 'Close notes') : (isBoard ? 'Open board' : 'Open notes')}
        </button>
      </div>

      {!open && <p className="community-teaser">{isBoard
        ? 'The board is independent of the daily reflection thread. Choose “Open board” to fetch public notes; nothing is fetched until you open it.'
        : 'Opening this section loads public notes for today’s original reflection. Nothing from your private recovery profile or journal is sent.'}</p>}

      {open && <div className="community-body" aria-busy={loading || busy}>
        <aside className="community-disclosure" aria-label="Community privacy and safety information">
          <strong>Before you join</strong>
          {isBoard ? <>
            <p>Notes are public to other visitors and hosted online for up to 90 days. No account or name is required, but posting is pseudonymous—not guaranteed anonymous to the hosting service, which may process ordinary connection/security metadata. Only the short note and fixed Community Notes board identifier are sent; your sobriety date, recovery profile, journal, location, and meditation history are not.</p>
            <p>Do not share names, contact details, health information, or anything you would not want copied. Basic automated checks reject some links, personal contact details, and targeted harmful language; three reports from different browser-held tokens hide a note. These controls are limited, tokens can be reset, there is no guaranteed human review, and harmful posts cannot be fully prevented. Your deletion key is stored only in this browser; clearing site data can remove your ability to delete a note here.</p>
          </> : <>
            <p>Notes are public to other visitors and hosted online for up to 90 days. No account or name is required, but this is pseudonymous—not guaranteed anonymous to the hosting service, which may process ordinary connection/security metadata. Only this short note and the original reading’s date/id are sent; your sobriety date, recovery profile, journal, location, and meditation history are not.</p>
            <p>Do not share names, contact details, health information, or anything you would not want copied. Basic automated checks reject some links, personal contact details, and targeted harmful language; three reports from different browser-held tokens hide a note. These controls are limited, tokens can be reset, there is no guaranteed human review, and harmful posts cannot be fully prevented. Your deletion key is stored only in this browser; clearing site data can remove your ability to delete a note here.</p>
          </>}
        </aside>

        <div className="community-thread" aria-label={threadLabel}>
          <div className="community-thread-header"><strong>{comments.length} {comments.length === 1 ? 'note' : 'notes'}</strong><button type="button" className="text-button" onClick={() => void loadComments(true)} disabled={loading}>Refresh</button></div>
          {loading && <p className="fine-print" role="status">Loading public notes…</p>}
          {!loading && !error && comments.length === 0 && <p className="community-empty">No notes yet. A kind, brief thought can be enough.</p>}
          {comments.length > 0 && <ol className="community-list">
            {comments.map((comment) => {
              const credential = credentials.get(comment.id);
              return <li key={comment.id} className="community-comment">
                <div className="community-comment-meta"><span>Community member</span><time dateTime={comment.createdAt}>{new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(comment.createdAt))}</time></div>
                <p>{comment.text}</p>
                <div className="community-comment-actions">
                  {credential && <button type="button" className="text-button community-delete" disabled={busy} onClick={() => void deleteComment(comment, credential)}><Trash2 size={14} aria-hidden="true" /> Delete your note</button>}
                  <button type="button" className="text-button community-report" disabled={busy} onClick={() => void reportComment(comment)}><Flag size={14} aria-hidden="true" /> Report</button>
                </div>
              </li>;
            })}
          </ol>}
        </div>

        <form className="community-form" onSubmit={(event) => void postComment(event)}>
          <label className="field-label" htmlFor="community-note">{isBoard ? 'Add a community note' : 'Add a short note'}</label>
          <input id="community-note" type="text" autoComplete="off" maxLength={240} value={text} onChange={(event) => setText(Array.from(event.target.value).slice(0, 120).join(''))} aria-describedby="community-note-count community-note-guidance" placeholder={isBoard ? 'Share a brief, supportive thought with the community…' : 'Offer a kind thought about today’s reading…'} disabled={busy} />
          <div className="community-form-meta"><small id="community-note-guidance">120 characters maximum. No links, names, or contact details.</small><small id="community-note-count" aria-live="polite">{textLength}/120</small></div>
          <label className="community-consent"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} disabled={busy} /><span>I understand this note will be public and hosted, and I will avoid personal details.</span></label>
          <button className="button button-primary" type="submit" disabled={busy || !text.trim() || !consent}><Send size={15} aria-hidden="true" /> {busy ? 'Please wait…' : 'Post note'}</button>
        </form>
      </div>}
      {error && <p className="community-error" role="alert">{error}</p>}
      {status && <p className="community-status" role="status">{status}</p>}
    </section>
  );
}
