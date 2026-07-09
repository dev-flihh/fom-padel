import { doc, updateDoc } from 'firebase/firestore';
import { getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage';
import { db, storage } from '../../firebase';
import { TOURNAMENTS_COLLECTION } from '../../services/firestoreCollections';
import { saveSharedMatch } from '../../services/sharedMatchRepository';
import type { TournamentRewind, TournamentRewindSlideRef } from '../../types';
import { REWIND_EXPORT_EXT, REWIND_EXPORT_MIME, type GeneratedRewindSlide } from './RewindFlow';

// Phase 2 hybrid persistence: player photos stay local-only, but the RENDERED
// JPEG slides are uploaded to Storage so shared viewers & History can replay the
// Rewind (PRD Section 9 + FR-4.4). Everything here is best-effort — a failed
// upload never blocks the host's own in-session viewer.

const uploadSlide = async (
  tournamentId: string,
  slide: GeneratedRewindSlide,
): Promise<TournamentRewindSlideRef | null> => {
  if (!slide.blob) return null;
  try {
    const path = `rewind/${tournamentId}/${slide.order}-${slide.type}.${REWIND_EXPORT_EXT}`;
    const target = storageRef(storage, path);
    await uploadBytes(target, slide.blob, { contentType: REWIND_EXPORT_MIME });
    const imageUrl = await getDownloadURL(target);
    return { type: slide.type, order: slide.order, imageUrl };
  } catch (err) {
    console.warn(`Rewind slide upload failed (${slide.type}):`, err);
    return null;
  }
};

export const persistRewindResult = async ({
  tournamentId,
  currentUid,
  shareId,
  ratio,
  slides,
}: {
  tournamentId: string;
  currentUid: string;
  shareId?: string;
  // Rasio generate terakhir — itulah yang direplay shared viewer & History.
  ratio?: TournamentRewind['ratio'];
  slides: GeneratedRewindSlide[];
}): Promise<TournamentRewind | null> => {
  if (!tournamentId || !currentUid || slides.length === 0) return null;

  const uploaded = (await Promise.all(slides.map((slide) => uploadSlide(tournamentId, slide))))
    .filter((slideRef): slideRef is TournamentRewindSlideRef => Boolean(slideRef));
  if (uploaded.length === 0) return null;

  const rewind: TournamentRewind = {
    generatedAt: Date.now(),
    generatedBy: currentUid,
    ratio: ratio || 'story',
    slides: uploaded.sort((a, b) => a.order - b.order),
  };

  // Shared snapshot: deep-merge tournament.rewind so shared viewers can replay.
  if (shareId) {
    try {
      await saveSharedMatch(shareId, { hostUid: currentUid, tournament: { rewind } }, { merge: true });
    } catch (err) {
      console.warn('Rewind shared snapshot update failed:', err);
    }
  }

  // Owned tournament doc: a finished match's tournamentId is the same
  // `tournaments/{id}` history doc the host owns, so History Detail can replay
  // later. Best-effort: fails closed if the doc doesn't exist / host isn't owner.
  try {
    await updateDoc(doc(db, TOURNAMENTS_COLLECTION, tournamentId), { rewind });
  } catch (err) {
    console.warn('Rewind history update failed:', err);
  }

  return rewind;
};
