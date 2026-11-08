import { CommunityDiscussion } from '../today/CommunityDiscussion';
import { useAppContext } from '../../app/AppContext';

export function CommunityNotesPage() {
  const { preferences, updatePreferences, notify } = useAppContext();
  const enabled = preferences?.communityNotesEnabled === true;

  return (
    <div className="page-stack community-notes-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">A separate shared space</p>
          <h1>Community Notes</h1>
          <p>Short supportive notes live here independently of any single Stillpoint reflection. You can read or post only if you choose.</p>
        </div>
      </header>
      {!enabled ? <section className="card community-opt-in" aria-labelledby="community-opt-in-heading">
        <p className="eyebrow">Off by default</p>
        <h2 id="community-opt-in-heading">Community Notes are turned off</h2>
        <p>Nothing is fetched or shared while this feature is off. Enable it on this device only if you want the optional hosted board to appear in navigation.</p>
        <button className="button button-primary" type="button" onClick={() => void updatePreferences({ communityNotesEnabled: true }).then(() => notify('Community Notes are available on this device.'))}>Turn on Community Notes</button>
      </section> : <>
        <p className="fine-print">No account is required. Notes are public and hosted for up to 90 days; the board is unavailable when its optional service is not configured.</p>
        <CommunityDiscussion mode="board" />
      </>}
    </div>
  );
}
