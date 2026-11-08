import { CommunityDiscussion } from '../today/CommunityDiscussion';

export function CommunityNotesPage() {
  return (
    <div className="page-stack community-notes-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">A separate shared space</p>
          <h1>Community Notes</h1>
          <p>Short supportive notes live here independently of any single Stillpoint reflection. You can read or post only if you choose.</p>
        </div>
      </header>
      <p className="fine-print">No account is required. Notes are public and hosted for up to 90 days; the board is unavailable when its optional service is not configured.</p>
      <CommunityDiscussion mode="board" />
    </div>
  );
}
